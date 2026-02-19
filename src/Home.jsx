
import React, { Suspense, lazy } from 'react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter';
import { useNavigate } from 'react-router-dom';
import { eventBus } from './agents/core/EventBus';
const Todo = lazy(() => import('./Todo'));
import { motion } from 'framer-motion';
import { ArrowRight, PenTool, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import { MusicSection } from './components/MusicPlayer';

// Lazy load below-the-fold content
const FAQ = lazy(() => import('./FAQ'));
const Testimonials = lazy(() => import('./Testimonials'));

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

    const hoverContentVariants = {
        initial: {
            opacity: 0,
            height: 0,
            overflow: 'hidden',
        },
        hover: {
            opacity: 1,
            height: 'auto',
            transition: {
                duration: 0.3,
                ease: "easeOut"
            }
        }
    };

    const cardVariants = {
        initial: { y: 0 },
        hover: { y: -10 }
    };

    return (
        <div className="hero-gradient pb-5">
            {/* Hero Section */}
            <motion.div
                className="container pt-5 pb-5 text-center"
                initial={{ opacity: 1 }}
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
                        onClick={() => {
                            document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        Explore
                    </button>
                </motion.div>
            </motion.div>

            <div className="container mt-5">
                <div className="row g-4 justify-content-center">
                    {/* Writing Card */}
                    <div className="col-lg-5 col-md-6">
                        <motion.div
                            className="card glass overflow-hidden border-0 position-relative"
                            variants={cardVariants}
                            initial="initial"
                            whileHover="hover"
                            style={{ height: '480px' }}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fm=webp&fit=crop&q=60&w=1000"
                                alt="Creative Writing Workspace"
                                className="w-100 h-100 object-fit-cover"
                                loading="eager"
                            />

                            {/* Overlay Content */}
                            <motion.div
                                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end p-5"
                                initial={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }}
                                whileHover={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)' }}
                                style={{ zIndex: 2 }}
                            >
                                <div className="position-absolute top-0 end-0 m-3">
                                    <div className="p-2 rounded-circle glass shadow-sm">
                                        <PenTool size={20} className="text-white" />
                                    </div>
                                </div>

                                <h2 className="text-white fw-bold mb-3 display-6">Deep Writing</h2>
                                <motion.div variants={hoverContentVariants}>
                                    <p className="text-white opacity-75 mb-4 lead" style={{ fontSize: '1.1rem' }}>
                                        Unleash your creativity in a distraction-free zone meticulously designed to help you maintain a perfect flow state.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg rounded-pill px-5 shadow-lg"
                                        onClick={() => navigate('/writing')}
                                    >
                                        Open Workspace
                                    </button>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Reading Card */}
                    <div className="col-lg-5 col-md-6">
                        <motion.div
                            className="card glass overflow-hidden border-0 position-relative"
                            variants={cardVariants}
                            initial="initial"
                            whileHover="hover"
                            style={{ height: '480px' }}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fm=webp&fit=crop&q=60&w=1000"
                                alt="Immersive Reading Experience"
                                className="w-100 h-100 object-fit-cover"
                                loading="lazy"
                            />

                            {/* Overlay Content */}
                            <motion.div
                                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end p-5"
                                initial={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }}
                                whileHover={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)' }}
                                style={{ zIndex: 2 }}
                            >
                                <div className="position-absolute top-0 end-0 m-3">
                                    <div className="p-2 rounded-circle glass shadow-sm">
                                        <BookOpen size={20} className="text-white" />
                                    </div>
                                </div>

                                <h2 className="text-white fw-bold mb-3 display-6">Immersive Reading</h2>
                                <motion.div variants={hoverContentVariants}>
                                    <p className="text-white opacity-75 mb-4 lead" style={{ fontSize: '1.1rem' }}>
                                        Focus on every word with specialized tools built for deep reading, academic research, and cognitive absorption.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg rounded-pill px-5 shadow-lg"
                                        onClick={() => navigate('/library')}
                                    >
                                        Enter Library
                                    </button>
                                </motion.div>
                            </motion.div>
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
                        <Suspense fallback={<div className="text-center py-4"><div className="spinner-border text-primary spinner-border-sm"></div></div>}>
                            <Todo />
                        </Suspense>
                    </div>
                </motion.div>
            </div>

            <MusicSection />

            {/* Additional Sections */}
            <Suspense fallback={<div className="py-5 text-center text-muted">Loading content...</div>}>
                <section id="faq" className="mt-5 pt-5">
                    <FAQ />
                </section>

                <section id="testimonials" className="mt-5 py-5">
                    <Testimonials />
                </section>
            </Suspense>
        </div>
    );
}

export default Home;
