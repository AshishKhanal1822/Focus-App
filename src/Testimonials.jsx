import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const testimonials = [
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

function Testimonials() {
    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h2 className="display-5 fw-bold">Loved by Focused People</h2>
                <p className="lead opacity-75">See what our community has to say about their experience.</p>
            </div>

            <div className="row g-4">
                {testimonials.map((testi, index) => (
                    <motion.div
                        key={index}
                        className="col-md-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
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
            </div>

            <div className="text-center mt-5">
                <button className="btn btn-outline-primary px-4 rounded-pill">View All Stories</button>
            </div>
        </div>
    );
}

export default Testimonials;
