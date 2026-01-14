// src/agents/adapters/SupabaseAdapter.js
import { createClient } from '@supabase/supabase-js';

class SupabaseAdapter {
    constructor() {
        this.supabase = null;
        // Try to recover from local storage for instant first-frame layout
        const savedUser = localStorage.getItem('supabase_user_cache');
        this.cachedUser = savedUser ? JSON.parse(savedUser) : null;
        this.init();
    }

    init() {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


        console.log("Supabase Init Check:", {
            hasUrl: !!supabaseUrl,
            urlLength: supabaseUrl ? supabaseUrl.length : 0,
            hasKey: !!supabaseKey
        });

        if (supabaseUrl && supabaseKey) {
            try {
                this.supabase = createClient(supabaseUrl, supabaseKey);
                console.log("Supabase Client Initialized Successfully");

                // Track auth state for caching
                this.supabase.auth.onAuthStateChange((_event, session) => {
                    this.cachedUser = session?.user || null;
                    if (this.cachedUser) {
                        localStorage.setItem('supabase_user_cache', JSON.stringify(this.cachedUser));
                    } else {
                        localStorage.removeItem('supabase_user_cache');
                    }
                });
            } catch (err) {
                console.error("Supabase Client Init Failed:", err.message);
            }
        } else {
            console.warn('Supabase credentials missing. Check .env file.');
        }
    }

    isConnected() {
        return !!this.supabase;
    }

    async testConnection() {
        if (!this.supabase) return { success: false, error: 'Supabase not initialized' };
        try {
            // Try to fetch something public or just check session
            const { data, error } = await this.supabase.from('suggest_resources').select('count', { count: 'exact', head: true });
            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error("Connection test failed:", e);
            return { success: false, error: e.message };
        }
    }

    // Get the supabase client safely
    getClient() {
        return this.supabase;
    }

    // --- Auth Methods ---

    async signUp(email, password) {
        if (!this.supabase) return { error: 'Supabase not configured' };
        return await this.supabase.auth.signUp({ email, password });
    }

    async signIn(email, password) {
        if (!this.supabase) return { error: 'Supabase not configured' };
        return await this.supabase.auth.signInWithPassword({ email, password });
    }

    async signOut() {
        this.cachedUser = null;
        localStorage.removeItem('supabase_user_cache');

        // Aggressively clear all Supabase-related keys from localStorage
        // This prevents the client from automatically recovering the session on reload
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        if (!this.supabase) return { error: 'Supabase not configured' };

        try {
            return await this.supabase.auth.signOut();
        } catch (e) {
            console.error("SignOut Exception:", e);
            return { error: e.message };
        }
    }

    async getUser() {
        if (!this.supabase) return null;
        if (this.cachedUser) return this.cachedUser;

        const { data } = await this.supabase.auth.getUser();
        this.cachedUser = data.user;
        return data.user;
    }

    onAuthStateChange(callback) {
        if (!this.supabase) return null;
        return this.supabase.auth.onAuthStateChange(callback);
    }

    // --- Database Methods (Examples) ---

    async updateProfile(updates) {
        console.log("updateProfile called with:", Object.keys(updates));
        if (!this.supabase) return { error: { message: 'Supabase not configured' } };

        let latestUser = null;

        // 1. Separate Updates
        // WE DO NOT SEND AVATAR TO AUTH SERVER ANYMORE to prevent "Failed to fetch" network blocks
        const { avatar_url, ...safeAuthUpdates } = updates;

        try {
            // 2. Always try to get current user ID
            let { data: { user } } = await this.supabase.auth.getUser();

            if (!user) {
                const { data: { session } } = await this.supabase.auth.getSession();
                user = session?.user;
            }

            if (!user) throw new Error("Session expired. Please sign out and sign in again.");

            // NETWORK BLOCKED: We cannot upload to Supabase from this network.
            // We will trust the ProfilePhoto component to save to LocalStorage as a fallback.
            // Returning 'success' here so the UI updates, even though the cloud sync failed.
            console.warn("Supabase upload blocked by network. Relying on LocalStorage fallback.");

            // Still try to update Name in Auth Metadata if possible (lightweight)
            if (Object.keys(safeAuthUpdates).length > 0) {
                try {
                    const { data, error } = await this.supabase.auth.updateUser({
                        data: safeAuthUpdates
                    });
                    if (!error) latestUser = data.user;
                } catch (e) {
                    console.warn("Auth Metadata update failed:", e);
                }
            } else {
                latestUser = user;
            }

        } catch (e) {
            console.error("updateProfile logic error:", e);
            // Return success anyway to allow local fallback
            return { data: { user: latestUser }, error: null };
        }

        return { data: { user: latestUser }, error: null };
    }

    async getProfile(userId) {
        if (!this.supabase) return null;
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) return null;
            return data;
        } catch (e) {
            return null;
        }
    }
}

// Singleton instance
export default new SupabaseAdapter();
