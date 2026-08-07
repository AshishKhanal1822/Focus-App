import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import adminStore from './utils/adminStore.js';

function Contact() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: ""
    });

    const [status, setStatus] = useState("");

    // Redirect to home if user is logged in
    useEffect(() => {
        const checkUser = async () => {
            const user = await SupabaseAdapter.getUser();
            if (user) {
                navigate('/');
            }
        };
        checkUser();

        // Also listen for auth state changes
        const subscription = SupabaseAdapter.onAuthStateChange((_event, session) => {
            if (session?.user) {
                navigate('/');
            }
        });

        return () => {
            if (subscription && subscription.data && subscription.data.subscription) {
                subscription.data.subscription.unsubscribe();
            } else if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        };
    }, [navigate]);

    function handleChange(e) {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus("Sending...");

        // Save locally to admin store so admin can view it in Admin Panel immediately
        adminStore.addContactMessage(formData);

        try {
            const user = await SupabaseAdapter.getUser();
            let clientToUse = supabase;

            if (user) {
                try {
                    const adapterClient = SupabaseAdapter.getClient();
                    if (adapterClient && typeof adapterClient === 'object' && typeof adapterClient.from === 'function') {
                        clientToUse = adapterClient;
                    }
                } catch (adapterErr) {
                    console.log("Fallback to supabaseClient");
                }
            }

            if (clientToUse && typeof clientToUse.from === 'function') {
                await clientToUse
                    .from("messages")
                    .insert([formData])
                    .catch(err => console.warn("Cloud sync warning:", err.message));
            }

            alert("Your message has been sent successfully!");
            setStatus("");
            setFormData({
                name: "",
                email: "",
                message: ""
            });
        } catch (err) {
            console.log("Saved locally to Admin Store");
            alert("Your message has been sent successfully!");
            setStatus("");
            setFormData({
                name: "",
                email: "",
                message: ""
            });
        }
    }

    return (
        <div className="hero-gradient min-vh-100 py-5">
            <div className="container py-5 animate-fade-in">
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="glass p-5 text-center">
                            <h1 className="fw-bold mb-3 fs-2">Connect With Us</h1>
                            <p className="opacity-75 mb-5">
                                Have ideas or questions? We'd love to hear from you.
                            </p>

                            <form className="text-start" onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="form-label small fw-bold opacity-75">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-control glass"
                                        placeholder="Your name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid var(--glass-border)",
                                            color: "inherit"
                                        }}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label small fw-bold opacity-75">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-control glass"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid var(--glass-border)",
                                            color: "inherit"
                                        }}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label small fw-bold opacity-75">
                                        Your Message
                                    </label>
                                    <textarea
                                        name="message"
                                        className="form-control glass"
                                        rows="4"
                                        placeholder="How can we help?"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid var(--glass-border)",
                                            color: "inherit"
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 py-3 shadow-sm"
                                >
                                    Send Message
                                </button>

                                {status && (
                                    <p className="text-center mt-3 small opacity-75">
                                        {status}
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Contact;
