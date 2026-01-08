// src/agents/core/BaseAgent.js
// Abstract base class for all agents. Provides convenient access to the EventBus
// and a simple lifecycle (init / destroy).

import { eventBus } from './EventBus.js';

export class BaseAgent {
    constructor() {
        this.subscriptions = [];
    }

    /** Called once after construction – override to set up listeners */
    init() {
        // Example: this.on('FOO', this.handleFoo);
    }

    /** Helper to subscribe to an event and keep track for later cleanup */
    on(eventType, handler) {
        const unsubscribe = eventBus.on(eventType, handler);
        this.subscriptions.push(unsubscribe);
    }

    /** Emit an event via the shared EventBus */
    emit(eventType, payload) {
        eventBus.emit(eventType, payload);
    }

    /** Clean up all listeners when the agent is disposed */
    destroy() {
        this.subscriptions.forEach((off) => off());
        this.subscriptions = [];
    }
}
