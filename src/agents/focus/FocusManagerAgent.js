// src/agents/focus/FocusManagerAgent.js
// Agent that manages a Pomodoro‑style focus session.
// It is framework‑agnostic and communicates via the EventBus.

import { BaseAgent } from '../core/BaseAgent.js';
import LocalStorageAdapter from '../adapters/LocalStorageAdapter.js';
import { dnd } from '../../utils/dnd.js';

export class FocusManagerAgent extends BaseAgent {
    constructor() {
        super();
        this.defaultDuration = 25;
        this.timerId = null;
        this.lastCancelTime = 0;
        this.wakeLock = null;
        this.isPaused = false;
        this.pausedEndTime = null; // stores endTime when paused to resume from
        this.handleVisibilityChange = () => {
            if (this.timerId && document.visibilityState === 'visible') {
                this.requestWakeLock();
            }
        };
    }

    /** Initialise listeners */
    init() {
        if (!super.init()) return;
        this.on('FOCUS_START', this.startSession.bind(this));
        this.on('FOCUS_CANCEL', this.cancelSession.bind(this));
        this.on('FOCUS_PAUSE', this.pauseSession.bind(this));
        this.on('FOCUS_RESUME', this.resumeFromPause.bind(this));
        const persisted = LocalStorageAdapter.get('activeFocusSession');
        if (persisted && persisted.remainingMs > 0) {
            this.resumeSession(persisted);
        }
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /** Start a new focus session */
    startSession({ durationMinutes = this.defaultDuration } = {}) {
        // Prevent accidental restart immediately after cancel (e.g. double clicks)
        if (Date.now() - this.lastCancelTime < 1500) return;

        // Skip if already running (prevents event duplication)
        if (this.timerId) return;

        this.clearTimer();
        this.currentDuration = durationMinutes; // Track current session length
        const totalMs = durationMinutes * 60 * 1000;
        const endTime = Date.now() + totalMs;
        // We emit update immediately; StorageAgent handles persistence
        this.emit('FOCUS_STATE_UPDATED', { status: 'running', remainingMs: totalMs, endTime });
        this.timerId = setInterval(() => this.tick(endTime), 1000);
        this.requestWakeLock();

        // Turn on DND
        dnd.hasDndPermission().then(granted => {
            if (granted) {
                dnd.enableDnd();
            } else {
                dnd.requestDndPermission();
            }
        });
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
        this.requestWakeLock();

        // Enable DND on session resume
        dnd.hasDndPermission().then(granted => {
            if (granted) {
                dnd.enableDnd();
            }
        });
    }

    /** Pause the current session */
    pauseSession() {
        if (!this.timerId || this.isPaused) return;
        this.clearTimer();
        this.isPaused = true;
        // Store current remaining time
        const remainingMs = Math.max(this.pausedEndTime ? this.pausedEndTime - Date.now() : 0, 0);
        this.emit('FOCUS_STATE_UPDATED', { status: 'paused', remainingMs, endTime: this.pausedEndTime });
        this.emit('FOCUS_PAUSED', { pausedAt: Date.now() });
    }

    /** Resume from pause */
    resumeFromPause() {
        if (!this.isPaused || !this.pausedEndTime) return;
        const remainingMs = Math.max(this.pausedEndTime - Date.now(), 0);
        if (remainingMs <= 0) {
            this.cancelSession();
            return;
        }
        const newEndTime = Date.now() + remainingMs;
        this.pausedEndTime = newEndTime;
        this.isPaused = false;
        this.emit('FOCUS_STATE_UPDATED', { status: 'running', remainingMs, endTime: newEndTime });
        this.emit('FOCUS_RESUMED', { resumedAt: Date.now() });
        this.timerId = setInterval(() => this.tick(newEndTime), 1000);
        this.requestWakeLock();
    }

    /** Cancel the current session */
    cancelSession() {
        this.clearTimer();
        this.releaseWakeLock();
        this.lastCancelTime = Date.now();
        this.currentDuration = null;
        this.isPaused = false;
        this.pausedEndTime = null;
        this.emit('FOCUS_STATE_UPDATED', { status: 'idle', remainingMs: 0 });
        dnd.disableDnd();
    }

    /** Internal tick – called each second */
    tick(endTime) {
        const remainingMs = Math.max(endTime - Date.now(), 0);
        this.pausedEndTime = endTime; // keep updated for pause-resume
        this.emit('FOCUS_STATE_UPDATED', { status: remainingMs ? 'running' : 'completed', remainingMs, endTime });
        if (remainingMs === 0) {
            this.clearTimer();
            this.releaseWakeLock();
            this.isPaused = false;
            this.pausedEndTime = null;
            dnd.disableDnd();
            this.emit('FOCUS_COMPLETED', { duration: this.currentDuration || this.defaultDuration, completedAt: new Date() });
        }
    }

    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Screen Wake Lock acquired');
            } catch (err) {
                console.warn(`Wake Lock error: ${err.message}`);
            }
        }
    }

    releaseWakeLock() {
        if (this.wakeLock !== null) {
            this.wakeLock.release().catch(() => {});
            this.wakeLock = null;
            console.log('Screen Wake Lock released');
        }
    }

    /** Helper to clear interval */
    clearTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    /** Clean up */
    destroy() {
        this.clearTimer();
        this.releaseWakeLock();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        super.destroy();
    }
}
