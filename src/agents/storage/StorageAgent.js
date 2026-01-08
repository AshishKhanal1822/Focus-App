// src/agents/storage/StorageAgent.js
import { BaseAgent } from '../core/BaseAgent.js';
import LocalStorageAdapter from '../adapters/LocalStorageAdapter.js';
import IndexedDBAdapter from '../adapters/IndexedDBAdapter.js';

export class StorageAgent extends BaseAgent {
    constructor() {
        super();
        this.dbAdapter = new IndexedDBAdapter('FocusAppDB', 1, [
            { name: 'sessions', options: { keyPath: 'id', autoIncrement: true } }
        ]);
    }

    async init() {
        await this.dbAdapter.init();

        // Auto-save active session state when it changes
        this.on('FOCUS_STATE_UPDATED', (state) => {
            // We only persist if it's running or paused, not idle (unless we want to clear it)
            if (state.status !== 'idle') {
                this.persistActiveSession(state);
            } else {
                // Optional: clear active session on idle? 
                // Usually FocusManagerAgent clears it, so we replicate that or just save 'idle'
                this.clearActiveSession();
            }
        });

        // Auto-save history when session completes
        this.on('FOCUS_COMPLETED', (sessionSummary) => {
            if (sessionSummary) {
                this.saveCompletedSession({
                    ...sessionSummary,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // --- Public Methods ---

    /** Save general user settings */
    saveSettings(key, value) {
        const settings = LocalStorageAdapter.get('userSettings') || {};
        settings[key] = value;
        LocalStorageAdapter.set('userSettings', settings);
        this.emit('SETTINGS_UPDATED', settings);
    }

    /** Load all settings */
    loadSettings() {
        return LocalStorageAdapter.get('userSettings') || {};
    }

    /** Persist the current running countdown state */
    persistActiveSession(state) {
        LocalStorageAdapter.set('activeFocusSession', state);
    }

    /** Clear active session storage */
    clearActiveSession() {
        LocalStorageAdapter.remove('activeFocusSession');
    }

    /** Load the active session (recovery) */
    loadActiveSession() {
        return LocalStorageAdapter.get('activeFocusSession');
    }

    /** Save a completed session to history (IndexedDB) */
    async saveCompletedSession(sessionData) {
        try {
            await this.dbAdapter.add('sessions', sessionData);
            this.emit('HISTORY_UPDATED');
        } catch (e) {
            console.error('Failed to save session to history', e);
        }
    }

    /** Load session history */
    async getSessionHistory() {
        return await this.dbAdapter.getAll('sessions');
    }
}
