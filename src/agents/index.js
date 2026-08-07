// src/agents/index.js
// Singleton registry for background agents to ensure strictly one set of agent instances exists

import { FocusManagerAgent } from './focus/FocusManagerAgent.js';
import { NotificationAgent } from './focus/NotificationAgent.js';
import { StorageAgent } from './storage/StorageAgent.js';
import { AuthAgent } from './auth/AuthAgent.js';
import { StatsAgent } from './stats/StatsAgent.js';
import { DistractionAgent } from './distraction/DistractionAgent.js';
import SyncAgent from './core/SyncAgent.js';

let initialized = false;
let initPromise = null;

export const agents = {
    focusAgent: new FocusManagerAgent(),
    notificationAgent: new NotificationAgent(),
    storageAgent: new StorageAgent(),
    authAgent: new AuthAgent(),
    statsAgent: new StatsAgent(),
    distractionAgent: new DistractionAgent(),
    syncAgent: SyncAgent
};

export async function initAppAgents() {
    if (initialized) return agents;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        await Promise.all([
            agents.storageAgent.init(),
            agents.authAgent.init(),
            agents.focusAgent.init(),
            agents.notificationAgent.init(),
            agents.statsAgent.init(),
            agents.distractionAgent.init(),
            agents.syncAgent.init()
        ]);
        initialized = true;
        return agents;
    })();

    return initPromise;
}
