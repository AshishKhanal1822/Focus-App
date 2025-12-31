import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const initialTestimonials = [
    {
        name: 'Sarah Johnson',
        role: 'Freelance Writer',
        text: 'Focus has completely changed my workflow. The distraction-free writing space is a game-changer for my productivity.',
        rating: 5
    },
    {
        name: 'Michael Chen',
        role: 'Student',
        text: 'I love how organized I feel now. The Reading Mode helps me get through my assignments faster than ever before.',
        rating: 5
    },
    {
        name: 'Elena Rodriguez',
        role: 'Project Manager',
        text: 'A sleek, modern interface that just works. The team collaboration features are exactly what we needed.',
        rating: 4
    }
];

const moreTestimonials = [
    {
        name: 'David Kim',
        role: 'Software Engineer',
        text: 'The best todo app I have used. Simple but powerful. The dark mode is easy on the eyes during late night coding sessions.',
        rating: 5
    },
    {
        name: 'Lisa Patel',
        role: 'Designer',
        text: 'Beautifully designed. It is rare to find a productivity tool that actually looks good and inspires you to work.',
        rating: 5
    },
    {
        name: 'James Wilson',
        role: 'Entrepreneur',
        text: 'Keeps me on track with my daily goals. The progress tracking features are motivating.',
        rating: 4
    }
];

function Testimonials() {
    const [showAll, setShowAll] = useState(false);
    const testimonials = showAll ? [...initialTestimonials, ...moreTestimonials] : initialTestimonials;

    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h2 className="display-5 fw-bold">Loved by Focused People</h2>
                <p className="lead opacity-75">See what our community has to say about their experience.</p>
            </div>

            <div className="row g-4">
                <AnimatePresence>
                    {testimonials.map((testi, index) => (
                        <motion.div
                            key={index}
                            className="col-md-4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="card glass h-100 p-4 border-0">
                                <Quote className="text-primary opacity-25 mb-3" size={40} />
                                <p className="fs-5 mb-4 italic">"{testi.text}"</p>
                                <div className="mt-auto">
                                    <div className="d-flex text-warning mb-2">
                                        {[...Array(testi.rating)].map((_, i) => (
                                            <Star key={i} size={16} fill="currentColor" />
                                        ))}
                                    </div>
                                    <h6 className="fw-bold mb-0">{testi.name}</h6>
                                    <p className="small opacity-75 mb-0">{testi.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="text-center mt-5">
                {!showAll && (
                    <button
                        className="btn btn-outline-primary px-4 rounded-pill"
                        onClick={() => setShowAll(true)}
                    >
                        View All Stories
                    </button>
                )}
                {showAll && (
                    <button
                        className="btn btn-outline-secondary px-4 rounded-pill"
                        onClick={() => setShowAll(false)}
                    >
                        Show Less
                    </button>
                )}
            </div>
        </div>
    );
}

export default Testimonials;
