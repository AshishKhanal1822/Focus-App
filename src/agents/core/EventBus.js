// src/agents/core/EventBus.js
// Tiny event bus – framework agnostic

class EventBus {
    constructor() {
        this.listeners = {};
    }

    /** Register a listener for a specific event type */
    on(eventType, callback) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = new Set();
        }
        this.listeners[eventType].add(callback);
        // Return an unsubscribe function
        return () => this.off(eventType, callback);
    }

    /** Unregister a listener */
    off(eventType, callback) {
        const set = this.listeners[eventType];
        if (set) {
            set.delete(callback);
            if (set.size === 0) delete this.listeners[eventType];
        }
    }

    /** Emit an event to all listeners */
    emit(eventType, payload) {
        const set = this.listeners[eventType];
        if (set) {
            // Clone to avoid mutation during iteration
            [...set].forEach((cb) => {
                try {
                    cb(payload);
                } catch (e) {
                    // Fail gracefully
                }
            });
        }
    }
}

// Export a singleton instance for the whole app
export const eventBus = new EventBus();
