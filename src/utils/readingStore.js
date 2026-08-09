import { eventBus } from '../agents/core/EventBus.js';
import SupabaseAdapter from '../agents/adapters/SupabaseAdapter.js';

const PREFIX = 'focus_reading_progress_';

class ReadingStore {
    constructor() {
        this.subscribedUserId = null;
        this.initAuthListener();
    }

    initAuthListener() {
        SupabaseAdapter.subscribe((user) => {
            if (user?.id) {
                if (this.subscribedUserId !== user.id) {
                    this.subscribedUserId = user.id;
                    this.fetchCloudProgress(user);
                }
            } else {
                this.subscribedUserId = null;
            }
        });
    }

    getKey(userId) {
        return `${PREFIX}${userId || 'guest'}`;
    }

    getAllProgress(userId) {
        try {
            const key = this.getKey(userId);
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error reading progress:', e);
            return {};
        }
    }

    getProgress(userId, bookId) {
        const all = this.getAllProgress(userId);
        return all[bookId] || {
            bookId: String(bookId),
            timeSpentSeconds: 0,
            completed: false,
            completedAt: null,
            lastReadAt: null
        };
    }

    mergeProgress(localMap = {}, cloudMap = {}) {
        const merged = { ...localMap };
        for (const [bId, cloudProg] of Object.entries(cloudMap || {})) {
            if (!cloudProg) continue;
            const locProg = merged[bId] || {
                bookId: String(bId),
                timeSpentSeconds: 0,
                completed: false,
                completedAt: null,
                lastReadAt: null
            };

            merged[bId] = {
                bookId: String(bId),
                timeSpentSeconds: Math.max(locProg.timeSpentSeconds || 0, cloudProg.timeSpentSeconds || 0),
                completed: Boolean(locProg.completed || cloudProg.completed),
                completedAt: locProg.completedAt || cloudProg.completedAt || null,
                lastReadAt: (locProg.lastReadAt && cloudProg.lastReadAt) 
                    ? (new Date(locProg.lastReadAt) > new Date(cloudProg.lastReadAt) ? locProg.lastReadAt : cloudProg.lastReadAt)
                    : (locProg.lastReadAt || cloudProg.lastReadAt || null)
            };
        }
        return merged;
    }

    async fetchCloudProgress(user) {
        if (!user?.id) return;
        try {
            let localAll = this.getAllProgress(user.id);
            let cloudMap = user.user_metadata?.reading_progress || {};

            // Also check DB table user_reading_progress if available
            const client = SupabaseAdapter.getClient();
            if (client) {
                try {
                    const { data: dbRows } = await client
                        .from('user_reading_progress')
                        .select('*')
                        .eq('user_id', user.id);

                    if (dbRows && Array.isArray(dbRows)) {
                        dbRows.forEach(row => {
                            if (row.book_id) {
                                cloudMap[row.book_id] = {
                                    bookId: String(row.book_id),
                                    timeSpentSeconds: Number(row.time_spent_seconds) || 0,
                                    completed: Boolean(row.completed),
                                    completedAt: row.completed_at || null,
                                    lastReadAt: row.last_read_at || row.updated_at || null
                                };
                            }
                        });
                    }
                } catch (dbErr) {
                    // Ignore DB table missing error, metadata fallback handles sync
                }
            }

            const mergedAll = this.mergeProgress(localAll, cloudMap);
            const key = this.getKey(user.id);
            localStorage.setItem(key, JSON.stringify(mergedAll));
            eventBus.emit('READING_PROGRESS_UPDATED', { userId: user.id, all: mergedAll });
        } catch (e) {
            console.warn('Could not fetch cloud reading progress:', e);
        }
    }

    async syncToCloud(userId, bookId, progress, allProgress) {
        if (!userId || userId === 'guest') return;
        const client = SupabaseAdapter.getClient();
        if (!client) return;

        try {
            // 1. Sync via Auth Metadata (fastest, guaranteed across all devices on login)
            client.auth.updateUser({
                data: { reading_progress: allProgress }
            }).catch(err => console.warn('Auth metadata sync notice:', err.message));

            // 2. Sync to Supabase DB table if it exists
            client.from('user_reading_progress').upsert([{
                user_id: userId,
                book_id: String(bookId),
                time_spent_seconds: progress.timeSpentSeconds,
                completed: progress.completed,
                completed_at: progress.completedAt,
                last_read_at: progress.lastReadAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            }], { onConflict: 'user_id,book_id' })
            .catch(err => console.warn('Supabase DB reading progress sync notice:', err.message));
        } catch (e) {
            console.warn('Sync to cloud exception:', e);
        }
    }

    addTime(userId, bookId, seconds) {
        if (!seconds || seconds <= 0) return this.getProgress(userId, bookId);
        try {
            const key = this.getKey(userId);
            const all = this.getAllProgress(userId);
            const current = all[bookId] || {
                bookId: String(bookId),
                timeSpentSeconds: 0,
                completed: false,
                completedAt: null,
                lastReadAt: null
            };

            const updated = {
                ...current,
                timeSpentSeconds: current.timeSpentSeconds + seconds,
                lastReadAt: new Date().toISOString()
            };

            all[bookId] = updated;
            localStorage.setItem(key, JSON.stringify(all));
            eventBus.emit('READING_PROGRESS_UPDATED', { userId, bookId, progress: updated, all });
            
            this.syncToCloud(userId, bookId, updated, all);
            return updated;
        } catch (e) {
            console.error('Error adding reading time:', e);
            return this.getProgress(userId, bookId);
        }
    }

    markCompleted(userId, bookId) {
        try {
            const key = this.getKey(userId);
            const all = this.getAllProgress(userId);
            const current = all[bookId] || {
                bookId: String(bookId),
                timeSpentSeconds: 0,
                completed: false,
                completedAt: null,
                lastReadAt: null
            };

            const updated = {
                ...current,
                completed: true,
                completedAt: new Date().toISOString(),
                lastReadAt: new Date().toISOString()
            };

            all[bookId] = updated;
            localStorage.setItem(key, JSON.stringify(all));
            eventBus.emit('READING_PROGRESS_UPDATED', { userId, bookId, progress: updated, all });

            this.syncToCloud(userId, bookId, updated, all);
            return updated;
        } catch (e) {
            console.error('Error marking book as completed:', e);
            return this.getProgress(userId, bookId);
        }
    }

    resetProgress(userId, bookId) {
        try {
            const key = this.getKey(userId);
            const all = this.getAllProgress(userId);
            if (all[bookId]) {
                delete all[bookId];
                localStorage.setItem(key, JSON.stringify(all));
                eventBus.emit('READING_PROGRESS_UPDATED', { userId, bookId, progress: null, all });
                this.syncToCloud(userId, bookId, { timeSpentSeconds: 0, completed: false }, all);
            }
        } catch (e) {
            console.error('Error resetting book progress:', e);
        }
    }
}

export default new ReadingStore();
