import React from 'react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter';
import { useNavigate } from 'react-router-dom';
import { eventBus } from './agents/core/EventBus';
import Todo from './Todo';
import Features from './Features';
import Testimonials from './Testimonials';
import { motion } from 'framer-motion';
import { ArrowRight, PenTool, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';

function Home() {
    const navigate = useNavigate();
    const [user, setUser] = React.useState(SupabaseAdapter.cachedUser);
    const [loading, setLoading] = React.useState(!SupabaseAdapter.cachedUser);

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: "easeOut" }
        }
    };

    return (
        <div className="hero-gradient pb-5">
            {/* Hero Section */}
            <motion.div
                className="container pt-5 pb-5 text-center"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <motion.div variants={itemVariants} className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary bg-opacity-10 text-primary small fw-bold mb-4">
                    <Sparkles size={14} />
                    <span>The next generation of productivity</span>
                </motion.div>

                <motion.h1 variants={itemVariants} className="display-2 fw-bold mb-3 mt-2 text-gradient">
                    Master Your Focus
                </motion.h1>

                <motion.p variants={itemVariants} className="lead text-muted mb-5 mx-auto" style={{ maxWidth: '700px', fontSize: '1.25rem' }}>
                    A premium workspace meticulously crafted to help you organize thoughts,
                    deepen your reading, and sharpen your writing.
                </motion.p>

                <motion.div variants={itemVariants} className="d-flex justify-content-center gap-3">
                    {!loading && !user && (
                        <button
                            className="btn btn-primary btn-lg shadow-lg px-5 hover-scale"
                            onClick={() => eventBus.emit('SHOW_LOGIN')}
                        >
                            Get Started <ArrowRight size={18} className="ms-2" />
                        </button>
                    )}
                    <button
                        className="btn btn-outline-primary btn-lg px-5 shadow-sm hover-scale"
                        onClick={() => navigate('/features')}
                    >
                        Explore
                    </button>
                </motion.div>
            </motion.div>

            <div className="container mt-5">
                <div className="row g-4">
                    {/* Writing Card */}
                    <div className="col-md-6">
                        <motion.div
                            className="card glass h-100 overflow-hidden border-0"
                            whileHover={{ y: -10 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div className="position-relative">
                                <img
                                    src="https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=1000"
                                    srcSet="https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=600 600w, https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=1000 1000w, https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=1500 1500w"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    alt="Writing"
                                    className="custom-img"
                                    fetchPriority="high"
                                    loading="eager"
                                />
                                <div className="position-absolute top-0 end-0 m-3">
                                    <div className="p-2 rounded-circle glass shadow-sm">
                                        <PenTool size={20} className="text-primary" />
                                    </div>
                                </div>
                            </div>
                            <div className="card-body p-4 d-flex flex-column">
                                <h2 className="fw-bold mb-2">Deep Writing</h2>
                                <p className="text-muted flex-grow-1 mb-4">
                                    Unleash your creativity in a distraction-free zone meticulously designed to help you maintain a perfect flow state.
                                </p>
                                <button
                                    className="btn btn-sm btn-primary rounded-pill px-4 self-start"
                                    onClick={() => navigate('/writing')}
                                >
                                    Open Workspace
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Reading Card */}
                    <div className="col-md-6">
                        <motion.div
                            className="card glass h-100 overflow-hidden border-0"
                            whileHover={{ y: -10 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div className="position-relative">
                                <img src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1000"
                                    alt="Reading"
                                    className="custom-img" />
                                <div className="position-absolute top-0 end-0 m-3">
                                    <div className="p-2 rounded-circle glass shadow-sm">
                                        <BookOpen size={20} className="text-secondary" />
                                    </div>
                                </div>
                            </div>
                            <div className="card-body p-4 d-flex flex-column">
                                <h2 className="fw-bold mb-2">Immersive Reading</h2>
                                <p className="text-muted flex-grow-1 mb-4">
                                    Focus on every word with specialized tools built for deep reading, academic research, and cognitive absorption.
                                </p>
                                <button
                                    className="btn btn-sm btn-primary rounded-pill px-4 self-start"
                                    onClick={() => navigate('/library')}
                                >
                                    Enter Library
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Todo Section */}
                <motion.div
                    className="row justify-content-center mt-5 pt-4"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <div className="col-lg-8">
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                                <CheckCircle2 size={24} />
                            </div>
                            <h2 className="fw-bold mb-0">Daily Focus</h2>
                        </div>
                        <Todo />
                    </div>
                </motion.div>
            </div>

            {/* Additional Sections */}
            <section id="features" className="mt-5 pt-5">
                <Features />
            </section>

            <section id="testimonials" className="mt-5 py-5">
                <Testimonials />
            </section>
        </div>
    );
}

export default Home;
