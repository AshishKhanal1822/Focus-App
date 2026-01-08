// src/agents/adapters/LocalStorageAdapter.js
// Simple wrapper around window.localStorage for agents.

class LocalStorageAdapter {
    /** Retrieve a JSON‑parsed value from localStorage */
    static get(key) {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('LocalStorage get error', e);
            return null;
        }
    }

    /** Store a value (will be JSON‑stringified) */
    static set(key, value) {
        try {
            const raw = JSON.stringify(value);
            window.localStorage.setItem(key, raw);
        } catch (e) {
            console.error('LocalStorage set error', e);
        }
    }

    /** Remove a key */
    static remove(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (e) {
            console.error('LocalStorage remove error', e);
        }
    }
}

export default LocalStorageAdapter;
