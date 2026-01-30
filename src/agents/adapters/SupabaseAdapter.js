// src/agents/adapters/SupabaseAdapter.js
import { createClient } from '@supabase/supabase-js';

class SupabaseAdapter {
    constructor() {
        this.supabase = null;
        this.subscribers = new Set();
        // Try to recover from local storage for instant first-frame layout
        const savedUser = localStorage.getItem('supabase_user_cache');
        this.cachedUser = savedUser ? JSON.parse(savedUser) : null;
        this._enrichmentPromise = null;
        this.init();
    }

    init() {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            try {
                this.supabase = createClient(supabaseUrl, supabaseKey);

                // Track auth state for caching and notification
                this.supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log(`Auth Event: ${event}`, session?.user?.id);

                    if (event === 'SIGNED_OUT') {
                        this.cachedUser = null;
                        this._userFetchPromise = null;
                        localStorage.removeItem('supabase_user_cache');
                        localStorage.removeItem('user_avatar_local');
                        this.notifySubscribers(null);
                        return;
                    }

                    // For login/refresh/initial events
                    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        // IMMEDATE NOTIFICATION: Don't wait for DB enrichment for the UI to react.
                        // This makes the Welcome Animation and state changes instant.
                        if (session?.user) {
                            console.log(`Immediate Auth Notification (Optimistic) for ${event}`);
                            // If we already have enriched data in cache for this user, keep that enrichment
                            if (this.cachedUser?.id === session.user.id && this.cachedUser.user_metadata?._is_enriched) {
                                // User matches cache - keep cache but update auth fields from session if needed
                                this.cachedUser = {
                                    ...this.cachedUser,
                                    ...session.user,
                                    user_metadata: {
                                        ...session.user.user_metadata,
                                        ...this.cachedUser.user_metadata
                                    }
                                };
                            } else {
                                this.cachedUser = session.user;
                            }
                            this.notifySubscribers(this.cachedUser);
                        }

                        // Then fetch full profile (Avatar, Name from DB) and notify again with "Enriched" data
                        // This happens in background
                        const user = await this.getUser(true);
                        this.notifySubscribers(user);
                    } else if (event === 'USER_UPDATED') {
                        // User metadata changed (e.g. from updateProfile)
                        const user = await this.getUser(true);
                        this.notifySubscribers(user);
                    }
                });

                // Real-time cross-device sync handled via subscribeToProfile
                console.log("Supabase initialized successfully.");
                // BFCache (Back/Forward Cache) Optimization:
                // WebSockets prevent the page from being stored in the browser's bfcache.
                // We disconnect on hide and reconnect on show to improve navigation speed.
                window.addEventListener('pagehide', () => {
                    if (this.supabase) {
                        console.log("BFcache: Page hidden, disconnecting Realtime");
                        this.supabase.realtime.disconnect();
                    }
                });

                window.addEventListener('pageshow', (event) => {
                    if (this.supabase && event.persisted) {
                        console.log("BFcache: Page restored, reconnecting Realtime");
                        this.supabase.realtime.connect();
                    }
                });
            } catch (err) {
                console.error("Supabase init error:", err);
            }
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        // Immediately provide current state
        callback(this.cachedUser);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers(user) {
        this.subscribers.forEach(cb => {
            try { cb(user); } catch (e) { console.error("Subscriber error:", e); }
        });
    }

    isConnected() {
        return !!this.supabase;
    }

    async testConnection() {
        if (!this.supabase) return { success: false, error: 'Supabase not initialized' };
        try {
            // Test connection using the profiles table which is critical for the app
            const { error } = await this.supabase.from('profiles').select('id').limit(1);
            if (error) {
                // Ignore 406 Not Acceptable if it's just an empty table, but catch real connection errors
                if (error.code !== 'PGRST116' && error.code !== '42P01') {
                    throw error;
                }
            }
            return { success: true };
        } catch (e) {
            console.warn("Connection test warning (non-critical):", e.message);
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
        console.log("SignOut initiated...");
        this.cachedUser = null;
        this._userFetchPromise = null;

        // 1. Immediately clear all possible local identifiers
        const localKeys = [
            'supabase_user_cache',
            'user_avatar_local',
            'sb-access-token',
            'sb-refresh-token'
        ];
        localKeys.forEach(k => localStorage.removeItem(k));

        // 2. Aggressively clear any key with 'sb-' or 'supabase'
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.toLowerCase().includes('sb-') || key.toLowerCase().includes('supabase'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn("Storage clearing partially failed", e);
        }

        if (!this.supabase) return { success: true };

        try {
            // 3. Attempt network signout but don't hang the UI
            // We give the network 2 seconds to confirm, then we move on anyway
            await Promise.race([
                this.supabase.auth.signOut(),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
            ]).catch(err => console.warn("Network signout delayed/failed, proceeding locally:", err));

            return { success: true };
        } catch (e) {
            return { success: true, error: e.message };
        }
    }

    async getUser(force = false) {
        if (!this.supabase) return this.cachedUser;

        // Dedup active fetches - even forced ones should wait if there's a promise already running
        // unless we explicitly want to restart (rare).
        if (this._userFetchPromise) return this._userFetchPromise;

        this._userFetchPromise = (async () => {
            try {
                // 1. Get fresh user from Auth with timeout
                // We use a short timeout (2s) because for critical operations we'd rather be optimistic than hang
                const { data: { user }, error } = await Promise.race([
                    this.supabase.auth.getUser(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000))
                ]).catch(e => ({ data: { user: null }, error: e }));

                if (error || !user) {
                    // Check if it's a network/unexpected error vs a real auth error
                    const isAuthError = error?.message === 'Auth session missing!' || error?.message?.includes('Invalid Refresh Token');

                    if (!isAuthError && this.cachedUser) {
                        console.warn("Auth check failed (network/unknown), falling back to cache:", error?.message);
                        this._userFetchPromise = null;
                        return this.cachedUser;
                    }

                    this._userFetchPromise = null;
                    if (error && !isAuthError) {
                        console.warn("Auth.getUser error:", error.message);
                    }
                    return null;
                }

                // 2. Fetch profile from DB with retries
                let profile = null;
                let retries = 2;

                while (retries > 0 && !profile) {
                    try {
                        const { data, error: profileError } = await Promise.race([
                            this.supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
                            new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
                        ]);

                        if (profileError) {
                            console.warn(`Profile fetch attempt failed (${retries} left):`, {
                                code: profileError.code,
                                message: profileError.message
                            });
                        } else if (data) {
                            console.log("Profile data found in DB:", data);
                            profile = data;
                            break;
                        } else {
                            console.log(`Profile fetch attempt [${retries}] returned no data for user ${user.id}`);
                        }
                    } catch (e) {
                        console.warn(`Profile enrichment timeout (${retries} left)`);
                    }
                    if (!profile) {
                        retries--;
                        if (retries > 0) await new Promise(r => setTimeout(r, 500));
                    }
                }

                if (!profile) {
                    console.log("No profile found. Attempting lazy profile creation...");
                    const initialData = {
                        id: user.id,
                        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                        email: user.email,
                        avatar_url: user.user_metadata?.avatar_url,
                        updated_at: new Date().toISOString()
                    };

                    const { data: newData, error: createError } = await this.supabase
                        .from('profiles')
                        .upsert(initialData, { onConflict: 'id' })
                        .select()
                        .single();

                    if (!createError) {
                        console.log("Lazy profile sync/creation successful:", newData);
                        profile = newData;
                    } else {
                        console.warn("Lazy profile sync failed:", createError.message);
                    }
                }

                // Enrichment: STRICT priority for Database values over Auth Metadata
                const dbName = profile?.full_name;
                const dbAvatar = profile?.avatar_url;

                // If DB has a value (even empty string), use it. Fallback to Auth only if DB is null/undefined.
                const finalName = (dbName !== null && dbName !== undefined) ? dbName : (user.user_metadata?.full_name || user.email.split('@')[0]);

                // For avatar: If DB has a value, use it. If DB is null, fallback to Auth (Google).
                // This allows removing an avatar by setting it to empty string in DB.
                const finalAvatar = (dbAvatar !== null && dbAvatar !== undefined) ? dbAvatar : user.user_metadata?.avatar_url;

                user.user_metadata = {
                    ...user.user_metadata,
                    full_name: finalName,
                    avatar_url: finalAvatar,
                    _is_enriched: true
                };

                console.log(`User ${user.id} enriched. Avatar Source: ${dbAvatar ? 'DB' : 'Auth/Google'}. URL: ${finalAvatar}`);

                this.cachedUser = user;
                localStorage.setItem('supabase_user_cache', JSON.stringify(user));

                // Sync local storage fallback
                if (finalAvatar) {
                    localStorage.setItem('user_avatar_local', finalAvatar);
                } else {
                    localStorage.removeItem('user_avatar_local');
                }

                this._userFetchPromise = null;
                return user;
            } catch (e) {
                console.error("getUser critical failure:", e);
                this._userFetchPromise = null;
                return this.cachedUser;
            }
        })();

        return this._userFetchPromise;
    }

    onAuthStateChange(callback) {
        if (!this.supabase) return null;
        return this.supabase.auth.onAuthStateChange(callback);
    }

    // --- Database Methods (Examples) ---

    async updateProfile(updates) {
        console.log("updateProfile initiated:", Object.keys(updates));
        if (!this.supabase) return { error: { message: 'Supabase not configured' } };

        try {
            // 1. Resolve user ID as fast as possible from cache
            const user = this.cachedUser;
            if (!user?.id) throw new Error("No active session found in cache.");

            const { avatar_url, full_name } = updates;

            // 2. CONSTRUCT UPDATED USER IMMEDIATELY (Optimistic Update)
            const authUpdates = {};
            if (full_name !== undefined) authUpdates.full_name = full_name;
            if (avatar_url !== undefined) authUpdates.avatar_url = avatar_url;

            const updatedUser = {
                ...user,
                user_metadata: {
                    ...user.user_metadata,
                    ...authUpdates
                }
            };

            // Update local state and storage INSTANTLY
            this.cachedUser = updatedUser;
            localStorage.setItem('supabase_user_cache', JSON.stringify(updatedUser));
            this.notifySubscribers(updatedUser);

            // 3. FIRE AND FORGET CLOUD UPDATES (Background Sync)
            const cloudSync = async () => {
                try {
                    console.log("Cloud Sync starting for user:", user.id);

                    // Verify session is still valid
                    const { data: { session } } = await this.supabase.auth.getSession();
                    if (!session) {
                        console.error("Cloud Sync aborted: No active session found.");
                        return;
                    }

                    // Update Auth Metadata first as it's the fastest
                    if (Object.keys(authUpdates).length > 0) {
                        console.log("Updating Auth Metadata...");
                        const { error: authError } = await this.supabase.auth.updateUser({ data: authUpdates });
                        if (authError) console.warn("Auth Metadata update warning:", authError.message);
                    }

                    const dbUpdates = {
                        id: user.id,
                        updated_at: new Date().toISOString(),
                        ...(full_name !== undefined && { full_name }),
                        ...(avatar_url !== undefined && { avatar_url })
                    };

                    console.log(`Syncing to DB [${user.id}]:`, dbUpdates);

                    // Use upsert with select() to verify what was written
                    const { data: dbData, error: dbError } = await this.supabase
                        .from('profiles')
                        .upsert(dbUpdates, { onConflict: 'id' })
                        .select();

                    if (dbError) {
                        console.error("DATABASE UPDATE FAILED:", {
                            message: dbError.message,
                            code: dbError.code
                        });
                        return { error: dbError };
                    }

                    if (!dbData || dbData.length === 0) {
                        console.error("DATABASE UPDATE WARNING: Success reported but 0 rows affected/returned. RLS might be blocking or ID mismatch.");
                    } else {
                        console.log("Cloud sync successful. Rows updated:", dbData.length, "Data:", dbData[0]);

                        // Valid update - Enrich and notify
                        const final = await this.getUser(true);
                        this.notifySubscribers(final);
                    }
                } catch (e) {
                    console.error("Cloud sync exception:", e);
                }
            };

            cloudSync();
            return { data: { user: updatedUser }, error: null };

        } catch (e) {
            console.error("updateProfile failed:", e);
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
                .maybeSingle();

            if (error) return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    // Subscribe to real-time changes for cross-device sync
    subscribeToProfile(userId, onUpdate) {
        if (!this.supabase || !userId) return null;

        return this.supabase
            .channel(`profile_sync_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    console.log("Real-time profile update received:", payload.new);
                    // Update cache and notify everyone
                    if (this.cachedUser && this.cachedUser.id === userId) {
                        const updatedUser = {
                            ...this.cachedUser,
                            user_metadata: {
                                ...this.cachedUser.user_metadata,
                                full_name: payload.new.full_name || this.cachedUser.user_metadata.full_name,
                                avatar_url: payload.new.avatar_url || this.cachedUser.user_metadata.avatar_url,
                                _is_enriched: true
                            }
                        };
                        this.cachedUser = updatedUser;
                        localStorage.setItem('supabase_user_cache', JSON.stringify(updatedUser));
                        this.notifySubscribers(updatedUser);
                    }
                }
            )
            .subscribe();
    }
}

// Singleton instance
export default new SupabaseAdapter();
