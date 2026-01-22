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

        if (supabaseUrl && supabaseKey) {
            try {
                this.supabase = createClient(supabaseUrl, supabaseKey);

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
                // Silently fail if initialization error occurs
            }
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

    async signInWithGoogle() {
        if (!this.supabase) return { error: 'Supabase not configured' };
        return await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
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

        // Use auth.getUser() to get fresh state from server
        // This ensures cross-device changes (like name) are reflected
        const { data: { user }, error } = await this.supabase.auth.getUser();
        if (error || !user) {
            // If offline or error, fallback to cache if available
            return this.cachedUser;
        }

        this.cachedUser = user;
        localStorage.setItem('supabase_user_cache', JSON.stringify(user));
        return user;
    }

    onAuthStateChange(callback) {
        if (!this.supabase) return null;
        return this.supabase.auth.onAuthStateChange(callback);
    }

    // --- Database Methods (Examples) ---

    async updateProfile(updates) {
        console.log("updateProfile called with:", Object.keys(updates));
        if (!this.supabase) return { error: { message: 'Supabase not configured' } };

        try {
            // 1. Get current user
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error("Session expired. Please sign out and sign in again.");

            // 2. Update Auth Metadata (for immediate UI update and basic info)
            const { avatar_url, full_name, ...otherUpdates } = updates;
            const authUpdates = {};
            if (full_name !== undefined) authUpdates.full_name = full_name;
            if (avatar_url !== undefined) authUpdates.avatar_url = avatar_url;

            if (Object.keys(authUpdates).length > 0) {
                await this.supabase.auth.updateUser({
                    data: authUpdates
                });
            }

            // 3. Update Profiles Table (for persistent cross-device storage)
            const { error: profileError } = await this.supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: full_name !== undefined ? full_name : undefined,
                    avatar_url: avatar_url !== undefined ? avatar_url : undefined,
                    updated_at: new Date().toISOString(),
                });

            if (profileError) {
                console.error("Profile table update failed:", profileError);
                // We continue because auth metadata might have worked
            }

            // Refresh cached user
            const { data: { user: updatedUser } } = await this.supabase.auth.getUser();
            this.cachedUser = updatedUser;
            if (updatedUser) {
                localStorage.setItem('supabase_user_cache', JSON.stringify(updatedUser));
            }

            return { data: { user: updatedUser }, error: null };

        } catch (e) {
            console.error("updateProfile logic error:", e);
            return { data: null, error: e };
        }
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
