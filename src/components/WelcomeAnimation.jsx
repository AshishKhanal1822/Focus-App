import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';

export default function WelcomeAnimation({ user, onComplete }) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        // Show animation for 1.5 seconds
        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 500); // Wait for exit animation
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    const displayName = user?.email?.split('@')[0] || 'User';

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 9999,
                        pointerEvents: 'none'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -20 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 25,
                            duration: 0.6
                        }}
                        className="text-center"
                        style={{ pointerEvents: 'none' }}
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ 
                                delay: 0.2,
                                type: "spring",
                                stiffness: 200,
                                damping: 15
                            }}
                            className="mb-4"
                        >
                            <div className="position-relative d-inline-block">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ 
                                        duration: 2, 
                                        repeat: Infinity, 
                                        ease: "linear" 
                                    }}
                                    className="position-absolute"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: -1
                                    }}
                                >
                                    <Sparkles size={80} className="text-primary opacity-25" />
                                </motion.div>
                                <CheckCircle 
                                    size={64} 
                                    className="text-success"
                                    style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 255, 0, 0.3))' }}
                                />
                            </div>
                        </motion.div>
                        
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="fw-bold mb-2 text-gradient"
                            style={{ fontSize: '2rem' }}
                        >
                            Welcome back, {displayName}!
                        </motion.h2>
                        
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-muted mb-0"
                        >
                            Let's get things done
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
