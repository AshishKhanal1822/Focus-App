import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';

function GetStarted() {
    return (
        <div className="container py-5 mt-5">
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card glass p-5 border-0 text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="display-4 fw-bold mb-4">Ready to Transform Your Workflow?</h2>
                            <p className="lead opacity-75 mb-5 mx-auto" style={{ maxWidth: '700px' }}>
                                Join thousands of users who have elevated their productivity with Focus.
                                Start your journey today.
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

                            <div className="d-flex flex-column flex-md-row gap-3 justify-content-center align-items-center">
                                <div className="input-group" style={{ maxWidth: '400px' }}>
                                    <span className="input-group-text glass border-0 text-muted">
                                        <Mail size={18} />
                                    </span>
                                    <input
                                        type="email"
                                        className="form-control glass border-0 py-3"
                                        placeholder="Enter your email"
                                    />
                                </div>
                                <button className="btn btn-primary btn-lg px-5 d-flex align-items-center gap-2 shadow-lg">
                                    Start Now <ArrowRight size={20} />
                                </button>
                            </div>

                            <p className="small opacity-50 mt-4">
                                By signing up, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GetStarted;
