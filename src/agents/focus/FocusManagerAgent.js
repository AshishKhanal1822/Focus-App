// src/agents/focus/FocusManagerAgent.js
// Agent that manages a Pomodoro‑style focus session.
// It is framework‑agnostic and communicates via the EventBus.

import { BaseAgent } from '../core/BaseAgent.js';
import LocalStorageAdapter from '../adapters/LocalStorageAdapter.js';

export class FocusManagerAgent extends BaseAgent {
    constructor() {
        super();
        // Default session length in minutes
        this.defaultDuration = 25;
        this.timerId = null;
    }

    /** Initialise listeners */
    init() {
        // UI can request a new session
        this.on('FOCUS_START', this.startSession.bind(this));
        // UI can request to stop / cancel
        this.on('FOCUS_CANCEL', this.cancelSession.bind(this));
        // Restore any persisted session on load
        const persisted = LocalStorageAdapter.get('activeFocusSession');
        if (persisted && persisted.remainingMs > 0) {
            this.resumeSession(persisted);
        }
    }

    /** Start a new focus session */
    startSession({ durationMinutes = this.defaultDuration } = {}) {
        this.clearTimer();
        this.currentDuration = durationMinutes; // Track current session length
        const totalMs = durationMinutes * 60 * 1000;
        const endTime = Date.now() + totalMs;
        // We emit update immediately; StorageAgent handles persistence
        this.emit('FOCUS_STATE_UPDATED', { status: 'running', remainingMs: totalMs, endTime });
        this.timerId = setInterval(() => this.tick(endTime), 1000);
    }

    /** Resume a persisted session */
    resumeSession({ endTime, remainingMs, durationMinutes }) {
        const now = Date.now();
        const msLeft = Math.max(endTime - now, 0);
        if (msLeft <= 0) return; // already expired

        // Try to recover duration, otherwise guess based on remaining (not perfect but safe)
        this.currentDuration = durationMinutes || Math.ceil(remainingMs / 60000);

        this.emit('FOCUS_STATE_UPDATED', { status: 'running', remainingMs: msLeft, endTime });
        this.timerId = setInterval(() => this.tick(endTime), 1000);
    }

    /** Cancel the current session */
    cancelSession() {
        this.clearTimer();
        // StorageAgent will see status: 'idle' and clear/update storage
        this.emit('FOCUS_STATE_UPDATED', { status: 'idle', remainingMs: 0 });
    }

    /** Internal tick – called each second */
    tick(endTime) {
        const remainingMs = Math.max(endTime - Date.now(), 0);
        this.emit('FOCUS_STATE_UPDATED', { status: remainingMs ? 'running' : 'completed', remainingMs, endTime });
        if (remainingMs === 0) {
            this.clearTimer();
            // Pass stats for the history log
            this.emit('FOCUS_COMPLETED', { duration: this.currentDuration || this.defaultDuration, completedAt: new Date() });
        }
    }

    /** Helper to clear interval */
    clearTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}
