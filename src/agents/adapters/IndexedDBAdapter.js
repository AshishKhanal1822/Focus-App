// src/agents/adapters/IndexedDBAdapter.js
// Wrapper for IndexedDB operations using promises.

class IndexedDBAdapter {
    constructor(dbName, version, stores) {
        this.dbName = dbName;
        this.version = version;
        this.stores = stores; // Array of store names or objects with options
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.stores.forEach((store) => {
                    const name = typeof store === 'string' ? store : store.name;
                    const options = typeof store === 'string' ? { keyPath: 'id', autoIncrement: true } : store.options;
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, options);
                    }
                });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB init error', event);
                reject(event.target.error);
            };
        });
    }

    async add(storeName, data) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

export default IndexedDBAdapter;
