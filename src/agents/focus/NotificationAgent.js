// src/agents/focus/NotificationAgent.js
// Agent that listens for focus completion and shows a desktop notification.

import { BaseAgent } from '../core/BaseAgent.js';
import ServiceWorkerAdapter from '../adapters/ServiceWorkerAdapter.js';

export class NotificationAgent extends BaseAgent {
    constructor() {
        super();
        this.isFocusActive = false;
    }

    init() {
        // Track focus state to enable DND for other potential notifications
        this.on('FOCUS_STATE_UPDATED', (state) => {
            this.isFocusActive = (state.status === 'running');
        });

        // Listen for the focus session completion event
        this.on('FOCUS_COMPLETED', this.handleFocusCompleted.bind(this));
    }

    async handleFocusCompleted() {
        // Session completion notification is the only one allowed during/at-end-of focus
        await ServiceWorkerAdapter.showNotification('Focus Session Complete', {
            body: 'Great job! Your focus timer has finished.',
            icon: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'focus-notification',
            renotify: true
        });
    }
}
