import React, { useState, useEffect, useRef } from 'react';
import SupabaseAdapter from '../agents/adapters/SupabaseAdapter.js';
import ProfilePhoto from './ProfilePhoto.jsx';
import WelcomeAnimation from './WelcomeAnimation.jsx';
import { motion } from 'framer-motion';
import {
    User, Mail, ShieldCheck,
    Settings, ChevronRight,
} from 'lucide-react';

export default function Profile({ initialUser = null }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');
    const [user, setUser] = useState(initialUser);
    const [loading, setLoading] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [welcomeUser, setWelcomeUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const previousUserRef = useRef(null);

    const handleUpdateName = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setIsUpdating(true);
        const { error } = await SupabaseAdapter.updateProfile({ full_name: newName });
        if (error) {
            console.error("Name update failed", error);
            alert("Failed to update name");
        } else {
            setIsEditing(false);
            refreshUser();
        }
        setIsUpdating(false);
    };

    const refreshUser = async () => {
        console.log("Refreshing user data...");
        const u = await SupabaseAdapter.getUser();
        if (u) {
            const profile = await SupabaseAdapter.getProfile(u.id);
            console.log("Fetched profile:", profile);
            if (profile) {
                u.user_metadata = { ...u.user_metadata, ...profile };
            }
        }
        setUser(u);
    };

    // Sync with prop if parent updates
    useEffect(() => {
        if (initialUser !== undefined) {
            setUser(initialUser);
        }
    }, [initialUser]);

    // Sync auth state
    useEffect(() => {
        let mounted = true;

        async function checkUser() {
            try {
                const u = await SupabaseAdapter.getUser();
                if (mounted && u) {
                    // Try to fetch extended profile
                    const profile = await SupabaseAdapter.getProfile(u.id);
                    if (profile) {
                        // Merge profile data into user metadata for display consistency
                        u.user_metadata = { ...u.user_metadata, ...profile };
                    }
                    setUser(u);
                }
            } catch (e) {
                console.error("Auth check failed:", e);
            }
        }
        checkUser();

        let sub = null;
        try {
            const result = SupabaseAdapter.onAuthStateChange((_event, session) => {
                if (mounted) {
                    const newUser = session?.user || null;
                    const previousUser = previousUserRef.current;

                    // Show welcome animation if user just logged in (was null, now has user)
                    if (!previousUser && newUser && _event === 'SIGNED_IN') {
                        setWelcomeUser(newUser);
                        setShowWelcome(true);
                    }

                    previousUserRef.current = newUser;
                    setUser(newUser);
                }
            });
            // Handle both structure types just in case SDK version differs
            if (result && result.data && result.data.subscription) {
                sub = result.data.subscription;
            } else if (result && result.unsubscribe) {
                sub = result;
            }
        } catch (e) {
            console.warn("Supabase auth subscription failed (Config missing?):", e);
        }

        return () => {
            mounted = false;
            if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
        };
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { data, error } = isLogin
            ? await SupabaseAdapter.signIn(email, password)
            : await SupabaseAdapter.signUp(email, password);

        if (error) {
            setMessage(error.message);
        } else {
            if (!isLogin && !data.session) {
                setMessage('Check your email for confirmation link!');
            } else {
                setMessage('Success!');
                // Show welcome animation on successful login
                if (isLogin && data.user) {
                    setWelcomeUser(data.user);
                    setShowWelcome(true);
                }
            }
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await SupabaseAdapter.signInWithGoogle();
        if (error) {
            setMessage(error.message);
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };

    // Logged In View
    if (user) {
        const displayName = user.user_metadata?.full_name || user.email.split('@')[0];

        return (
            <>
                {showWelcome && welcomeUser && (
                    <WelcomeAnimation
                        user={welcomeUser}
                        onComplete={() => {
                            setShowWelcome(false);
                            setWelcomeUser(null);
                        }}
                    />
                )}
                <motion.div
                    className="p-3"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <div className="text-center mb-3">
                        <ProfilePhoto user={user} onUploadSuccess={refreshUser} />

                        {isEditing ? (
                            <form onSubmit={handleUpdateName} className="mt-3 d-flex flex-column align-items-center gap-2">
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{ maxWidth: '200px' }}
                                    autoFocus
                                />
                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-xs btn-primary py-1 px-3 rounded-pill" disabled={isUpdating}>
                                        {isUpdating ? '...' : 'Save'}
                                    </button>
                                    <button type="button" className="btn btn-xs btn-outline-secondary py-1 px-3 rounded-pill" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="d-flex align-items-center justify-content-center gap-2 mt-3 group cursor-pointer" onClick={() => { setNewName(displayName); setIsEditing(true); }}>
                                <h4 className="fw-bold mb-0 text-gradient pointer-events-none">{displayName}</h4>
                                <Settings size={14} className="text-muted opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        <p className="text-muted small mb-0 mt-1">Standard Account</p>
                    </div>

                    <div className="list-group list-group-flush border-0 mb-1">
                        <motion.div variants={itemVariants} className="list-group-item bg-transparent border-0 px-0 d-flex align-items-center justify-content-between py-2 cursor-pointer hover-scale">
                            <div className="d-flex align-items-center gap-2">
                                <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                                    <Mail size={16} />
                                </div>
                                <div>
                                    <div className="small fw-semibold">Email</div>
                                    <div className="small text-muted" style={{ fontSize: '0.75rem' }}>{user.email}</div>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-muted" />
                        </motion.div>
                    </div>

                    <div className="mt-3 pt-3 border-top border-light d-flex align-items-center justify-content-center gap-2 text-muted small opacity-50">
                        <ShieldCheck size={12} />
                        <span style={{ fontSize: '0.7rem' }}>Cloud sync active</span>
                    </div>
                </motion.div>
            </>
        );
    }

    // Checking Connection
    const isConnected = SupabaseAdapter.isConnected();
    const [connectionStatus, setConnectionStatus] = useState('checking');

    useEffect(() => {
        async function checkConnection() {
            const { success, error } = await SupabaseAdapter.testConnection();
            setConnectionStatus(success ? 'connected' : 'error');
            if (!success) {
                console.warn("Supabase connection check failed:", error);
            }
        }
        checkConnection();
    }, []);

    // Login View
    return (
        <motion.div
            className="p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="text-center mb-4">
                <div className="p-3 rounded-circle d-inline-block bg-primary bg-opacity-10 text-primary mb-3">
                    <User size={32} />
                </div>
                <h3 className="fw-bold mb-1">{isLogin ? 'Welcome Back' : 'Join Focus'}</h3>

                {connectionStatus === 'error' && (
                    <div className="alert alert-danger small mt-2 py-2">
                        Unable to connect to database. <br />
                        Please check your internet or correct the API Key in .env.
                    </div>
                )}

                <p className="text-muted small">The most powerful way to stay productive</p>
            </div>

            {!isConnected && (
                <div className="alert alert-warning small p-3 mb-4 glass border-warning border-opacity-25" style={{ background: 'rgba(255, 193, 7, 0.05)' }}>
                    <div className="d-flex gap-2">
                        <span>⚠️</span>
                        <div>
                            <strong className="d-block mb-1 text-warning">Backend Disconnected</strong>
                            <span className="opacity-75">Connect your Supabase instance to sync across devices.</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="d-grid gap-2 mb-3">
                <button
                    type="button"
                    className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-2 py-2 glass border-opacity-25 hover-scale"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-color, inherit)'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>
            </div>

            <div className="d-flex align-items-center mb-3">
                <div className="flex-grow-1 border-top border-secondary border-opacity-25"></div>
                <span className="mx-2 text-muted small opacity-75">OR</span>
                <div className="flex-grow-1 border-top border-secondary border-opacity-25"></div>
            </div>

            <form onSubmit={handleAuth} className="d-flex flex-column gap-3">
                <div className="position-relative">
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="form-control form-control-lg px-4"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="position-relative">
                    <input
                        type="password"
                        placeholder="Password"
                        className="form-control form-control-lg px-4"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`alert ${message.includes('Success') ? 'alert-success' : 'alert-danger'} py-2 small mb-0 border-0 glass overflow-hidden`}
                    >
                        {message}
                    </motion.div>
                )}

                <button type="submit" className="btn btn-primary w-100 py-3 mt-2" disabled={loading}>
                    {loading ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : null}
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>

                <div className="text-center mt-3">
                    <button
                        type="button"
                        className="btn btn-link text-decoration-none small text-muted hover-scale"
                        onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
                    >
                        {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
