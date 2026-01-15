import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';

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

        try {
            // Check if user is logged in
            const user = await SupabaseAdapter.getUser();

            // Get the appropriate client
            // If user is logged in, use SupabaseAdapter's client (has proper session)
            // Otherwise use the original supabase client (works for anonymous)
            let clientToUse = supabase;

            if (user) {
                // User is logged in - try to use SupabaseAdapter's client
                // Use the helper method to safely get the client
                try {
                    const adapterClient = SupabaseAdapter.getClient();
                    if (adapterClient && typeof adapterClient === 'object' && typeof adapterClient.from === 'function') {
                        clientToUse = adapterClient;
                        console.log("Using SupabaseAdapter client for authenticated user");
                        // Ensure session is fresh
                        try {
                            await clientToUse.auth.getSession();
                        } catch (sessionErr) {
                            console.warn("Session check failed, continuing:", sessionErr);
                        }
                    } else {
                        throw new Error("Adapter client not available");
                    }
                } catch (adapterErr) {
                    // Fallback: use original client and ensure it has the session
                    console.log("SupabaseAdapter client not available, using original client:", adapterErr.message);
                    try {
                        // Refresh session to ensure it's loaded
                        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                        if (sessionError) {
                            console.warn("Session error:", sessionError);
                        }
                        if (!session && SupabaseAdapter.isConnected()) {
                            // Try to get session from adapter and set it
                            try {
                                const adapterClient = SupabaseAdapter.getClient();
                                if (adapterClient) {
                                    const adapterSession = await adapterClient.auth.getSession();
                                    if (adapterSession?.data?.session) {
                                        await supabase.auth.setSession({
                                            access_token: adapterSession.data.session.access_token,
                                            refresh_token: adapterSession.data.session.refresh_token
                                        });
                                    }
                                }
                            } catch (syncErr) {
                                console.warn("Could not sync session:", syncErr);
                            }
                        }
                    } catch (syncErr) {
                        console.warn("Could not check/sync session:", syncErr);
                    }
                }
            }

            // Prepare message data
            const messageData = { ...formData };

            // Verify client is ready
            if (!clientToUse || typeof clientToUse.from !== 'function') {
                throw new Error("Supabase client is not properly initialized");
            }

            // Insert the message
            // We do not use .select() here to avoid needing SELECT permissions on the table
            const { error } = await clientToUse
                .from("messages")
                .insert([messageData]);

            if (error) {
                console.error("Contact form error:", error);
                console.error("Error details:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                console.error("User logged in:", !!user);
                console.error("Client type:", clientToUse === SupabaseAdapter.getClient() ? "SupabaseAdapter" : "supabaseClient");

                setStatus("");
                alert(`Failed to send message: ${error.message || 'Please try again.'}`);
            } else {
                alert("Your message has been sent successfully!");
                setStatus("");
                setFormData({
                    name: "",
                    email: "",
                    message: ""
                });
            }
        } catch (err) {
            console.error("Unexpected error in contact form:", err);
            console.error("Error name:", err.name);
            console.error("Error message:", err.message);
            console.error("Error stack:", err.stack);
            setStatus("");
            alert(`An unexpected error occurred: ${err.message || 'Please try again.'}`);
        }
    }

    return (
        <div className="hero-gradient min-vh-100 py-5">
            <div className="container py-5 animate-fade-in">
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="glass p-5 text-center">
                            <h2 className="fw-bold mb-3">Connect With Us</h2>
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
