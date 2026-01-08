import React, { useState, useEffect } from 'react';
import SupabaseAdapter from '../agents/adapters/SupabaseAdapter.js';
import ProfilePhoto from './ProfilePhoto.jsx';
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

    const refreshUser = async () => {
        const u = await SupabaseAdapter.getUser();
        setUser(u);
    };

    useEffect(() => {
        if (initialUser !== undefined) {
            setUser(initialUser);
        }
    }, [initialUser]);

    useEffect(() => {
        let mounted = true;
        async function checkUser() {
            try {
                const u = await SupabaseAdapter.getUser();
                if (mounted) setUser(u);
            } catch (e) {
                console.error("Auth check failed:", e);
            }
        }
        checkUser();

        let sub = null;
        try {
            const result = SupabaseAdapter.onAuthStateChange((_event, session) => {
                if (mounted) setUser(session?.user || null);
            });
            if (result?.data?.subscription) {
                sub = result.data.subscription;
            } else if (result?.unsubscribe) {
                sub = result;
            }
        } catch (e) {
            console.warn("Supabase auth subscription failed:", e);
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
            }
        }
        setLoading(false);
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };

    if (user) {
        const avatarUrl = user.user_metadata?.avatar_url;
        const displayName = user.email.split('@')[0];

        return (
            <motion.div
                className="p-3"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <div className="text-center mb-3">
                    <ProfilePhoto user={user} onUploadSuccess={refreshUser} />

                    <h4 className="fw-bold mb-0 mt-3 text-gradient">{displayName}</h4>
                    <p className="text-muted small mb-0">Standard Account</p>
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
        );
    }

    const isConnected = SupabaseAdapter.isConnected();

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
