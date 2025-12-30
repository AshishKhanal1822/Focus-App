import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Smartphone, Globe, MessageSquare, Star } from 'lucide-react';

const features = [
    {
        icon: <Zap className="text-warning" />,
        title: 'Lightning Fast',
        description: 'Experience instant response times and smooth transitions throughout the app.',
        buttonText: 'Learn Speed'
    },
    {
        icon: <Shield className="text-success" />,
        title: 'Secure by Design',
        description: 'Your data is encrypted and stored safely, ensuring your privacy is always protected.',
        buttonText: 'View Security'
    },
    {
        icon: <Smartphone className="text-info" />,
        title: 'Mobile First',
        description: 'Access your tasks and notes from any device with our fully responsive design.',
        buttonText: 'Try Mobile'
    },
    {
        icon: <Globe className="text-primary" />,
        title: 'Global Sync',
        description: 'Keep your workspace synced across all your browsers and machines instantly.',
        buttonText: 'Explore Sync'
    },
    {
        icon: <MessageSquare className="text-secondary" />,
        title: 'Collaborative',
        description: 'Share your focus boards with team members and work together seamlessly.',
        buttonText: 'Start Team'
    },
    {
        icon: <Star className="text-danger" />,
        title: 'Premium Quality',
        description: 'Enjoy a hand-crafted interface built for professional productivity.',
        buttonText: 'Go Premium'
    }
];

function Features() {
    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="display-5 fw-bold"
                >
                    Powerful Features
                </motion.h2>
                <p className="lead opacity-75">Everything you need to stay focused and productive.</p>
            </div>

            <div className="row g-4">
                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        className="col-md-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        <div
                            className="card glass h-100 p-4 border-0 hover-lift cursor-pointer"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            <div className="feature-icon mb-3">
                                {feature.icon}
                            </div>
                            <h4 className="fw-bold mb-3">{feature.title}</h4>
                            <p className="opacity-75 mb-4 small">{feature.description}</p>
                            <button className="btn btn-outline-primary mt-auto rounded-3 w-100">
                                {feature.buttonText}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default Features;
