// src/agents/core/SyncAgent.js
import { BaseAgent } from './BaseAgent.js';
import SupabaseAdapter from '../adapters/LocalStorageAdapter.js'; // We'll use local storage to store queue
import RealSupabase from '../adapters/SupabaseAdapter.js';
import { eventBus } from './EventBus.js';

export class SyncAgent extends BaseAgent {
    constructor() {
        super();
        this.queueKey = 'sync_pending_queue';
        this.isSyncing = false;
    }

    async init() {
        // Listen for online status
        window.addEventListener('online', () => {
            console.log('App is online. Triggering sync...');
            this.processQueue();
        });

        // Periodic check every 30 seconds just in case 'online' event missed or was already online
        setInterval(() => this.processQueue(), 30000);

        // UI can also manually trigger sync
        this.on('SYNC_REQUESTED', () => this.processQueue());

        // Process when user state changes (e.g. login)
        RealSupabase.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                this.processQueue();
            }
        });

        // Process immediately on start
        this.processQueue();
    }

    /** Add an item to the sync queue */
    addToQueue(type, action, data) {
        const queue = this.getQueue();
        queue.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            type,
            action,
            data,
            timestamp: new Date().toISOString(),
            retryCount: 0
        });
        localStorage.setItem(this.queueKey, JSON.stringify(queue));

        // If online, try processing immediately
        if (navigator.onLine) {
            this.processQueue();
        }
    }

    getQueue() {
        const stored = localStorage.getItem(this.queueKey);
        return stored ? JSON.parse(stored) : [];
    }

    async processQueue() {
        if (this.isSyncing || !navigator.onLine || !RealSupabase.isConnected()) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        const user = await RealSupabase.getUser();
        if (!user) return; // Can't sync if not logged in

        this.isSyncing = true;
        console.log(`Processing sync queue: ${queue.length} items`);

        const failedItems = [];
        const succeededIds = [];

        for (const item of queue) {
            try {
                const success = await this.syncItem(item, user.id);
                if (success) {
                    succeededIds.push(item.id);
                } else {
                    item.retryCount++;
                    failedItems.push(item);
                }
            } catch (e) {
                console.error(`Sync failed for item ${item.id}:`, e);
                item.retryCount++;
                failedItems.push(item);
            }
        }

        // Update queue with only failed items (that haven't exceeded retry limit)
        const finalQueue = failedItems.filter(item => item.retryCount < 10);
        localStorage.setItem(this.queueKey, JSON.stringify(finalQueue));

        if (succeededIds.length > 0) {
            console.log(`Sync complete. ${succeededIds.length} items synced.`);
            eventBus.emit('SYNC_COMPLETED', { count: succeededIds.length });
        }

        this.isSyncing = false;
    }

    async syncItem(item, userId) {
        const client = RealSupabase.getClient();
        if (!client) return false;

        switch (item.type) {
            case 'todo':
                return await this.syncTodo(item, userId, client);
            case 'writing':
                return await this.syncWriting(item, userId, client);
            default:
                console.warn(`Unknown sync type: ${item.type}`);
                return true; // Mark as done to remove from queue
        }
    }

    async syncTodo(item, userId, client) {
        const { action, data } = item;

        if (action === 'add') {
            const { error } = await client
                .from('tasks')
                .insert([{ ...data, user_id: userId }]);
            return !error;
        }

        if (action === 'update') {
            const { error } = await client
                .from('tasks')
                .update(data.updates)
                .eq('id', data.id)
                .eq('user_id', userId);
            return !error;
        }

        if (action === 'delete') {
            const { error } = await client
                .from('tasks')
                .delete()
                .eq('id', data.id)
                .eq('user_id', userId);
            return !error;
        }

        return true;
    }

    async syncWriting(item, userId, client) {
        const { data } = item;

        // Upsert strategy for writing
        const { data: existing } = await client
            .from('writings')
            .select('id')
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (existing) {
            const { error } = await client
                .from('writings')
                .update({ content: data.content, title: data.title, updated_at: new Date() })
                .eq('id', existing.id);
            return !error;
        } else {
            const { error } = await client
                .from('writings')
                .insert([{ user_id: userId, content: data.content, title: data.title }]);
            return !error;
        }
    }
}

export default new SyncAgent();
