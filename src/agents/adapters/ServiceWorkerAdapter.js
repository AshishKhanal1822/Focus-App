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
            console.error('Failed to get service worker registration', e);
            return null;
        }
    }

    /** Show a notification via the service worker (works even when page is not focused) */
    static async showNotification(title, options = {}) {
        const registration = await this.getRegistration();
        if (!registration) return;
        try {
            await registration.showNotification(title, options);
        } catch (e) {
            console.error('showNotification error', e);
        }
    }
}

export default ServiceWorkerAdapter;
