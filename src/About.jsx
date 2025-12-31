import React from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

function About() {
    return (
        <div className="container py-5">
            <div className="row align-items-center g-5">
                <div className="col-lg-6">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="display-4 fw-bold mb-4">Our Mission: <span className="text-primary">Redefining Focus</span></h2>
                        <p className="lead opacity-75 mb-4">
                            In a world full of distractions, we believe that the ability to focus is a superpower.
                            Our goal is to provide you with the cleanest, most intuitive tools to help you do your best work.
                        </p>
                        <div className="d-flex flex-column gap-3 mb-5">
                            <div className="d-flex align-items-center gap-3 p-3 glass rounded-3">
                                <Users size={24} className="text-info" />
                                <div>
                                    <h6 className="fw-bold mb-0">User-Centric</h6>
                                    <p className="small opacity-75 mb-0">Built based on feedback from thousands of users.</p>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-3 p-3 glass rounded-3">
                                <Target size={24} className="text-success" />
                                <div>
                                    <h6 className="fw-bold mb-0">Purpose Driven</h6>
                                    <p className="small opacity-75 mb-0">Every feature is designed with a clear goal in mind.</p>
                                </div>
                            </div>
                        </div>
                        <Link to="/get-started" className="btn btn-primary px-5 py-3 rounded-pill shadow-lg">Join Our Journey</Link>
                    </motion.div>
                </div>
                <div className="col-lg-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="position-relative"
                    >
                        <img
                            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                            alt="Team Collaboration"
                            className="img-fluid rounded-4 shadow-2xl glass-img"
                        />
                        <div className="position-absolute bottom-0 start-0 m-4 p-4 glass rounded-4 d-none d-md-block" style={{ maxWidth: '250px' }}>
                            <Rocket className="text-warning mb-2" size={32} />
                            <h5 className="fw-bold mb-0 text-white">10M+ Tasks</h5>
                            <p className="small opacity-75 mb-0 text-white">Completed by our users worldwide.</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default About;
