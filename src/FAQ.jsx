import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter';

const faqs = [
    {
        q: "Is Focus free to use?",
        a: "Yes! Focus is completely free and includes all features: Todo List, Focus Timer, Reading Library, and Writing tools. All your data syncs to the cloud when you create an account."
    },
    {
        q: "How does the cloud sync work?",
        a: "Our cloud sync automatically saves your data as you work and synchronizes it across all devices signed into your account, ensuring you never lose your progress."
    },
    {
        q: "Can I use Focus offline?",
        a: "Absolutely! Focus is a Progressive Web App (PWA), which means it's designed to work offline. Your changes will sync once you're back online."
    },
    {
        q: "Do I need to create an account?",
        a: "No! You can use Focus as a guest with local storage. However, creating a free account enables cloud sync, allowing you to access your data from any device."
    }
];

function FAQ() {
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        SupabaseAdapter.getUser().then(setUser);
        const { data: { subscription } } = SupabaseAdapter.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });
        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className="container py-5 mt-5">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold inline-flex align-items-center gap-3">
                            <HelpCircle className="text-primary" /> Frequently Asked Questions
                        </h2>
                        <p className="lead opacity-75">Got questions? We've got answers.</p>
                    </div>

                    <div className="accordion-custom">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                className="mb-3"
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <div className="card glass border-0 overflow-hidden">
                                    <button
                                        className="btn btn-link text-decoration-none text-start p-4 d-flex justify-content-between align-items-center w-100"
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target={`#faq-${index}`}
                                    >
                                        <span className="fw-bold fs-5 text-current">{faq.q}</span>
                                        <ChevronDown size={20} className="opacity-50" />
                                    </button>
                                    <div id={`faq-${index}`} className="collapse">
                                        <div className="card-body p-4 pt-0 opacity-75">
                                            {faq.a}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {!user && (
                        <div className="text-center mt-5">
                            <p className="opacity-75">Still have questions?</p>
                            <Link to="/contact" className="btn btn-primary px-4 rounded-pill">Contact Support</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FAQ;
