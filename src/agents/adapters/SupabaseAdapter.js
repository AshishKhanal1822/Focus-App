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
        const supabaseUrl = "https://kzeapjlkcdhyozkwvpww.supabase.co";
        const supabaseKey = "sb_publishable_40K3Mw_awc7aZGpJ8BrdCQ_jsFgsX44";

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
        if (!this.supabase) return { error: 'Supabase not configured' };

        // Update auth user metadata for immediate availability
        const { data: authData, error: authError } = await this.supabase.auth.updateUser({
            data: updates
        });

        if (authError) return { error: authError.message };

        // Also try to update profiles table if it exists
        try {
            const user = authData.user;
            await this.supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    ...updates,
                    updated_at: new Date(),
                });
        } catch (e) {
            console.warn("Profiles table update failed (may not exist):", e);
        }

        return { data: authData, error: null };
    }
}

// Singleton instance
export default new SupabaseAdapter();
