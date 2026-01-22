// src/agents/adapters/ServiceWorkerAdapter.js
// Thin wrapper around the Service Worker registration to show notifications.

class ServiceWorkerAdapter {
    /** Ensure the service worker is ready and return the registration */
    static async getRegistration() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service workers not supported in this browser');
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            return registration;
        } catch (e) {
            return null;
        }
    }

    // Track fallback notification objects locally so they can be cleared
    static fallbackNotifications = new Map();

    /** Show a notification with fallback for better mobile reliability */
    static async showNotification(title, options = {}) {
        // Prepare options with mobile-friendly defaults
        const notificationOptions = {
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            silent: false,
            ...options
        };

        // 1. Try Service Worker (Best for background/PWA)
        const registration = await this.getRegistration();
        if (registration && registration.showNotification) {
            try {
                // If tag is present but renotify isn't explicitly set, default renotify to true for agents
                if (notificationOptions.tag && notificationOptions.renotify === undefined) {
                    notificationOptions.renotify = true;
                }
                await registration.showNotification(title, notificationOptions);
                return;
            } catch (e) {
                // SW notification failed, trying fallback
            }
        }

        // 2. Fallback to standard Browser Notification (Good for immediate feedback)
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                // If there's an existing fallback with this tag, close it first
                if (notificationOptions.tag && this.fallbackNotifications.has(notificationOptions.tag)) {
                    this.fallbackNotifications.get(notificationOptions.tag).close();
                }

                const n = new Notification(title, notificationOptions);

                // Track it if it has a tag
                if (notificationOptions.tag) {
                    this.fallbackNotifications.set(notificationOptions.tag, n);
                    n.onclose = () => this.fallbackNotifications.delete(notificationOptions.tag);
                }

                // Auto-close fallback notification after 5 seconds to prevent tray clutter on mobile
                if (!notificationOptions.requireInteraction) {
                    setTimeout(() => n.close(), 5000);
                }
            } catch (e) {
                console.error('Standard notification failed', e);
            }
        }
    }

    /** Clear existing notifications by tag */
    static async clearNotifications(tag) {
        // Clear Service Worker notifications
        const registration = await this.getRegistration();
        if (registration && registration.getNotifications) {
            try {
                const notifications = await registration.getNotifications({ tag });
                notifications.forEach(n => n.close());
            } catch (e) {
                console.warn('Failed to clear SW notifications', e);
            }
        }

        // Clear Fallback notifications
        if (tag && this.fallbackNotifications.has(tag)) {
            this.fallbackNotifications.get(tag).close();
            this.fallbackNotifications.delete(tag);
        }
    }
}

export default ServiceWorkerAdapter;
