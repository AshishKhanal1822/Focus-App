// src/agents/focus/NotificationAgent.js
// Agent that listens for focus completion and shows a desktop notification.

import { BaseAgent } from '../core/BaseAgent.js';
import ServiceWorkerAdapter from '../adapters/ServiceWorkerAdapter.js';

export class NotificationAgent extends BaseAgent {
    constructor() {
        super();
        this.isFocusActive = false;
        this.hasSentWarning = false;
    }

    init() {
        // Track focus state to manage warnings and DND
        this.on('FOCUS_STATE_UPDATED', (state) => {
            const wasRunning = this.isFocusActive;
            this.isFocusActive = (state.status === 'running');

            // Send notification when a new session starts
            if (!wasRunning && this.isFocusActive) {
                this.hasSentWarning = false;
                this.handleFocusStarted();
            }

            // Check if we are near completion (e.g., 1 minute left)
            if (this.isFocusActive && !this.hasSentWarning) {
                const remainingMinutes = state.remainingMs / 60000;
                // If the total session is > 1 min and we have < 1 min left
                if (remainingMinutes > 0 && remainingMinutes <= 1) {
                    this.handleFocusNearCompletion();
                    this.hasSentWarning = true;
                }
            }
        });

        // Listen for the focus session completion event
        this.on('FOCUS_COMPLETED', this.handleFocusCompleted.bind(this));
    }

    async handleFocusStarted() {
        await ServiceWorkerAdapter.showNotification('Focus Session Started', {
            body: 'Timer is running! Stay focused and productive.',
            icon: '/pwa-192x192.png',
            tag: 'focus-start-notification'
        });
    }

    async handleFocusNearCompletion() {
        await ServiceWorkerAdapter.showNotification('Focus Session Ending Soon', {
            body: 'You have less than 1 minute remaining. Start wrapping up your current task!',
            icon: '/pwa-192x192.png',
            tag: 'focus-warning-notification'
        });
    }

    async handleFocusCompleted() {
        await ServiceWorkerAdapter.showNotification('Focus Session Complete', {
            body: 'Great job! Your focus timer has finished.',
            icon: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'focus-notification',
            renotify: true
        });
    }
}
