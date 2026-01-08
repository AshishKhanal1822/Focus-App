import React from 'react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter';
import { useNavigate } from 'react-router-dom';
import { eventBus } from './agents/core/EventBus';
import Todo from './Todo';
import Features from './Features';
import About from './About';
import Testimonials from './Testimonials';
import FAQ from './FAQ';
import Library from './Library';

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

    return (
        <div className="hero-gradient pb-5">
            {/* Hero Section */}
            <div className="container pt-5 pb-5 text-center animate-fade-in">
                <h1 className="display-3 fw-bold mb-3 mt-4">
                    Master Your <span className="text-primary">Focus</span>
                </h1>
                <p className="lead opacity-75 mb-5 mx-auto" style={{ maxWidth: '600px' }}>
                    A premium workspace designed to help you organize tasks,
                    deepen your reading, and sharpen your writing.
                </p>
                <div className="d-flex justify-content-center gap-3">
                    {!loading && !user && (
                        <button
                            className="btn btn-primary shadow-lg px-4 py-2 fs-5"
                            onClick={() => eventBus.emit('SHOW_LOGIN')}
                        >
                            Get Started
                        </button>
                    )}
                    <button
                        className="btn btn-outline-secondary px-4 rounded-3 border-2"
                        onClick={() => {
                            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        Explore
                    </button>
                </div>
            </div>

            <div className="container mt-5">
                <div className="row g-4">
                    {/* Writing Card */}
                    <div className="col-md-6">
                        <div className="card glass h-100 overflow-hidden">
                            <img
                                src="https://bestselfmedia.com/wp-content/uploads/2017/12/aaron-burden-64849.jpg"
                                alt="Writing"
                                className="custom-img"
                            />
                            <div className="card-body p-4 text-center">
                                <h4 className="fw-bold mb-2">Deep Writing</h4>
                                <p className="opacity-75 small">Unleash your creativity in a distraction-free zone.</p>
                                <button
                                    className="btn btn-sm btn-outline-primary mt-2 rounded-pill px-4"
                                    onClick={() => navigate('/writing')}
                                >
                                    Open Space
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Reading Card */}
                    <div className="col-md-6">
                        <div className="card glass h-100 overflow-hidden">
                            <img src="https://img.freepik.com/free-vector/boy-with-curly-hair-reading-book_1308-139994.jpg?semt=ais_hybrid&w=740&q=80"
                                alt="Reading"
                                className="custom-img" />
                            <div className="card-body p-4 text-center">
                                <h4 className="fw-bold mb-2">Immersive Reading</h4>
                                <p className="opacity-75 small">Focus on every word with our specialized tools.</p>
                                <button
                                    className="btn btn-sm btn-outline-primary mt-2 rounded-pill px-4"
                                    onClick={() => navigate('/library')}
                                >
                                    Enter Library
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Todo Section */}
                <div className="row justify-content-center mt-5">
                    <div className="col-lg-8">
                        <Todo />
                    </div>
                </div>
            </div>

            {/* Additional Sections */}
            <section id="features" className="mt-5">
                <Features />
            </section>

            <section id="about" className="mt-5 bg-glass-subtle py-5">
                <About />
            </section>


            <section id="testimonials" className="mt-5 py-5">
                <Testimonials />
            </section>

            <section id="library" className="mt-5 bg-glass-subtle py-5">
                <Library />
            </section>

            <section id="faq" className="mt-5 py-5">
                <FAQ />
            </section>
        </div>
    );
}

export default Home;
