// src/agents/auth/AuthAgent.js
import { BaseAgent } from '../core/BaseAgent.js';
import SupabaseAdapter from '../adapters/SupabaseAdapter.js';

export class AuthAgent extends BaseAgent {
    constructor() {
        super();
        this.user = null;
    }

    async init() {
        // Check initial user
        this.user = await SupabaseAdapter.getUser();
        this.emitAuthState();

        // Listen for auth changes
        SupabaseAdapter.onAuthStateChange((event, session) => {
            this.user = session?.user || null;
            this.emitAuthState();
        });

        // Listen for requests (if UI sends them via EventBus, though direct Adapter calls are okay for login forms)
        this.on('AUTH_LOGIN', this.handleLogin.bind(this));
        this.on('AUTH_LOGOUT', this.handleLogout.bind(this));
    }

    emitAuthState() {
        this.emit('AUTH_STATE_CHANGED', { user: this.user });
    }

    async handleLogin({ email, password }) {
        const { data, error } = await SupabaseAdapter.signIn(email, password);
        if (error) {
            this.emit('AUTH_ERROR', { message: error.message });
        }
    }

    async handleLogout() {
        await SupabaseAdapter.signOut();
        // Success is handled by onAuthStateChange
    }
}
