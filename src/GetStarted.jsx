import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eventBus } from './agents/core/EventBus.js';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';

function GetStarted() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [user, setUser] = useState(SupabaseAdapter.cachedUser);
    const [loading, setLoading] = useState(!SupabaseAdapter.cachedUser);
    const navigate = useNavigate();

    React.useEffect(() => {
        let mounted = true;
        SupabaseAdapter.getUser().then(u => {
            if (mounted) {
                setUser(u);
                setLoading(false);
            }
        });

        const { data: { subscription } } = SupabaseAdapter.onAuthStateChange((_event, session) => {
            if (mounted) {
                setUser(session?.user || null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleJoin = (e) => {
        e.preventDefault();
        eventBus.emit('SHOW_LOGIN');
    };

    return (
        <div className="container py-5 mt-5">
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card glass p-5 border-0 text-center position-relative overflow-hidden">
                        {loading ? (
                            <div className="py-5">
                                <Loader2 className="animate-spin mx-auto text-primary" size={48} />
                                <p className="mt-3 opacity-50">Checking status...</p>
                            </div>
                        ) : user ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-5"
                            >
                                <CheckCircle className="text-success mb-4" size={64} />
                                <h1 className="display-4 fw-bold mb-3">You're All Set!</h1>
                                <p className="lead opacity-75 mb-5 mx-auto" style={{ maxWidth: '600px' }}>
                                    You're already a member of the Focus community.
                                    Continue your journey and master your workflow.
                                </p>
                                <button
                                    className="btn btn-primary btn-lg px-5 shadow-lg"
                                    onClick={() => navigate('/')}
                                >
                                    Go to Home
                                </button>
                            </motion.div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {!isJoined ? (
                                    <motion.div
                                        key="form"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <h1 className="display-4 fw-bold mb-4">Ready to Transform Your Workflow?</h1>
                                        <p className="lead opacity-75 mb-5 mx-auto" style={{ maxWidth: '700px' }}>
                                            Join thousands of users who have elevated their productivity with Focus.
                                            Start your journey today. Start today!
                                        </p>

                                        <div className="row g-4 text-start justify-content-center mb-5">
                                            {[
                                                'Organize tasks with ease',
                                                'Deep focus writing mode',
                                                'Immersive reading tools',
                                                'Cross-device synchronization'
                                            ].map((item, i) => (
                                                <div key={i} className="col-md-5 d-flex align-items-center gap-2">
                                                    <CheckCircle className="text-success" size={20} />
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <form onSubmit={handleJoin} className="d-flex flex-column flex-md-row gap-3 justify-content-center align-items-center">
                                            <div className="input-group" style={{ maxWidth: '400px' }}>
                                                <span className="input-group-text glass border-0 text-muted">
                                                    <Mail size={18} />
                                                </span>
                                                <input
                                                    type="email"
                                                    className="form-control glass border-0 py-3 shadow-none text-current"
                                                    placeholder="Enter your email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-lg px-5 d-flex align-items-center gap-2 shadow-lg"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <><Loader2 className="animate-spin" size={20} /> Processing...</>
                                                ) : (
                                                    <>Start Now <ArrowRight size={20} /></>
                                                )}
                                            </button>
                                        </form>

                                        <p className="small opacity-50 mt-4">
                                            By signing up, you agree to our Terms of Service and Privacy Policy.
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="py-5"
                                    >
                                        <div className="d-inline-flex p-4 rounded-circle bg-success bg-opacity-10 text-success mb-4">
                                            <CheckCircle size={64} />
                                        </div>
                                        <h1 className="display-4 fw-bold mb-3">Welcome to Focus!</h1>
                                        <h2 className="text-success mb-4 fs-4">Successfully joined our journey.</h2>
                                        <div className="glass p-4 rounded-4 mx-auto mb-4 d-inline-block shadow-sm">
                                            <div className="d-flex align-items-center gap-3 text-start">
                                                <div className="p-3 rounded-3 bg-primary bg-opacity-10 text-primary">
                                                    <Mail size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="fw-bold mb-1 fs-6">Check your inbox!</h3>
                                                    <p className="small opacity-75 mb-0">We've sent a welcome email to <strong>{email}</strong>.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <p className="opacity-75">Redirecting you to profile...</p>
                                            <div className="progress mx-auto" style={{ height: '4px', maxWidth: '200px' }}>
                                                <motion.div
                                                    className="progress-bar bg-primary"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 3, ease: "linear" }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}

                        {/* Background Sparks for Success */}
                        {isJoined && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.1 }}
                                className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="position-absolute"
                                        initial={{
                                            x: Math.random() * 800,
                                            y: Math.random() * 400,
                                            scale: 0
                                        }}
                                        animate={{
                                            scale: [0, 1, 0],
                                            y: [null, -100]
                                        }}
                                        transition={{
                                            duration: 2 + Math.random() * 2,
                                            repeat: Infinity,
                                            delay: Math.random() * 2
                                        }}
                                    >
                                        <Sparkles className="text-primary" size={24} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GetStarted;
