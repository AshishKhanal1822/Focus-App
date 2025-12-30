import React from 'react';

function Contact() {
    return (
        <div className="hero-gradient min-vh-100 py-5">
            <div className="container py-5 animate-fade-in">
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="glass p-5 text-center">
                            <h2 className="fw-bold mb-3">Connect With Us</h2>
                            <p className="opacity-75 mb-5">Have ideas or questions? We'd love to hear from you.</p>

                            <form className="text-start">
                                <div className="mb-4">
                                    <label className="form-label small fw-bold opacity-75">Full Name</label>
                                    <input type="text" className="form-control glass"
                                        placeholder="Your name"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'inherit' }} />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label small fw-bold opacity-75">Email Address</label>
                                    <input type="email" className="form-control glass"
                                        placeholder="name@example.com"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'inherit' }} />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label small fw-bold opacity-75">Your Message</label>
                                    <textarea className="form-control glass" rows="4"
                                        placeholder="How can we help?"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'inherit' }}></textarea>
                                </div>
                                <button type="submit" className="btn btn-primary w-100 py-3 shadow-sm">
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Contact;
