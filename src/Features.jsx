import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, Cloud, Clock, Music, PenTool, BookOpen } from 'lucide-react';

function Features() {
    const features = [
        {
            icon: <WifiOff className="text-warning" />,
            title: 'Offline Mode',
            description: 'Work seamlessly without internet connection. Your data is safely stored in IndexedDB and LocalStorage.'
        },
        {
            icon: <Cloud className="text-primary" />,
            title: 'Cloud Save',
            description: 'Sync your focus time, writing statistics, and reading logs automatically with Supabase when online.'
        },
        {
            icon: <Clock className="text-info" />,
            title: 'Focus Timer',
            description: 'Keep track of your deep focus blocks with a customizable countdown timer.'
        },
        {
            icon: <Music className="text-success" />,
            title: 'Ambient Soundscape',
            description: 'Play soothing background music and ambient sounds to block out external noise.'
        },
        {
            icon: <PenTool className="text-danger" />,
            title: 'Writing Workspace',
            description: 'Unleash your creative output using our distraction-free, rich writing space.'
        },
        {
            icon: <BookOpen className="text-secondary" />,
            title: 'Library Reader',
            description: 'Access a community collection of books and read them in a clean, focused environment.'
        }
    ];

    return (
        <div className="container py-5 mt-5">
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
                        <div className="card glass h-100 p-4 border-0 hover-lift text-center">
                            <div className="feature-icon mb-3 d-flex justify-content-center">
                                <div className="p-3 rounded-circle bg-opacity-10" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                    {React.cloneElement(feature.icon, { size: 32 })}
                                </div>
                            </div>
                            <h3 className="fs-5 fw-bold mb-3">{feature.title}</h3>
                            <p className="opacity-75 mb-0">{feature.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default Features;
