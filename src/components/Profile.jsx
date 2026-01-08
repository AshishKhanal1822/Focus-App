import React, { useState, useEffect } from 'react';
import SupabaseAdapter from '../agents/adapters/SupabaseAdapter.js';
import ProfilePhoto from './ProfilePhoto.jsx';

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
            }
        }
        setLoading(false);
    };

    if (user) {
        const avatarUrl = user.user_metadata?.avatar_url;

        return (
            <div className="p-3">
                <div className="text-center">
                    {avatarUrl ? (
                        <div className="mb-3">
                            <img
                                src={avatarUrl}
                                alt="Profile"
                                className="rounded-circle border border-3 border-primary shadow-sm"
                                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                            />
                        </div>
                    ) : (
                        <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-inline-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '80px', height: '80px' }}>
                            <span className="fs-2 fw-bold text-uppercase">
                                {user.email ? user.email[0] : 'U'}
                            </span>
                        </div>
                    )}

                    <h4 className="fw-bold mb-1">Welcome Back</h4>
                    <p className="opacity-75 small mb-3">{user.email}</p>

                    <ProfilePhoto onUploadSuccess={refreshUser} />

                    <div className="mt-4 pt-3 border-top border-light">
                        <p className="small text-muted mb-0">Cloud sync is active.</p>
                    </div>
                </div>
            </div>
        );
    }

    const isConnected = SupabaseAdapter.isConnected();

    return (
        <div className="p-3">
            <h3 className="fw-bold mb-3">{isLogin ? 'Login' : 'Sign Up'}</h3>

            {!isConnected && (
                <div className="alert alert-warning small p-2 mb-3 border-0 bg-warning bg-opacity-10 text-warning">
                    ⚠️ <strong>Backend Disconnected</strong><br />
                    Supabase connection keys are missing or invalid in .env file.
                </div>
            )}

            <form onSubmit={handleAuth} className="d-flex flex-column gap-3">
                <input
                    type="email"
                    placeholder="Email"
                    className="form-control form-control-lg border-0"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="form-control form-control-lg border-0"
                    style={{ backgroundColor: 'white', color: 'black' }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />

                {message && <div className={`alert ${message.includes('Success') ? 'alert-success' : 'alert-danger'} py-2 small mb-0`}>{message}</div>}

                <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={loading}>
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>

                <div className="text-center mt-2">
                    <button
                        type="button"
                        className="btn btn-link text-decoration-none small opacity-75"
                        onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                    </button>
                </div>
            </form>
        </div>
    );
}
