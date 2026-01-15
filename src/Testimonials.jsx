import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star, Plus, X } from 'lucide-react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter';

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
    const [showModal, setShowModal] = useState(false);
    const [user, setUser] = useState(null);
    const [cloudReviews, setCloudReviews] = useState([]);
    const [formData, setFormData] = useState({ name: '', role: '', review_text: '', rating: 5 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    useEffect(() => {
        SupabaseAdapter.getUser().then(setUser);
        loadCloudReviews();

        const { data: { subscription } } = SupabaseAdapter.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const loadCloudReviews = async () => {
        try {
            const client = SupabaseAdapter.getClient();
            const { data } = await client
                .from('reviews')
                .select('*')
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (data) {
                setCloudReviews(data.map(r => ({
                    name: r.name,
                    role: r.role,
                    text: r.review_text,
                    rating: r.rating
                })));
            }
        } catch (e) {
            console.error('Failed to load reviews:', e);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user) {
            setSubmitMessage('Please login to submit a review');
            return;
        }

        setIsSubmitting(true);
        try {
            const client = SupabaseAdapter.getClient();
            const { error } = await client
                .from('reviews')
                .insert([{
                    user_id: user.id,
                    name: formData.name,
                    role: formData.role,
                    review_text: formData.review_text,
                    rating: formData.rating
                }]);

            if (error) throw error;

            setSubmitMessage('Thank you! Your review is pending approval.');
            setFormData({ name: '', role: '', review_text: '', rating: 5 });
            setTimeout(() => {
                setShowModal(false);
                setSubmitMessage('');
            }, 2000);
        } catch (error) {
            console.error('Review submission failed:', error);
            setSubmitMessage('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const allTestimonials = [...cloudReviews, ...initialTestimonials, ...moreTestimonials];
    const testimonials = showAll ? allTestimonials : allTestimonials.slice(0, 3);

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

            <div className="text-center mt-5 d-flex gap-3 justify-content-center">
                <button
                    className="btn btn-primary px-4 rounded-pill d-flex align-items-center gap-2"
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={18} /> Write a Review
                </button>

                {!showAll && allTestimonials.length > 3 && (
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

            {/* Review Modal */}
            {showModal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)}>
                    <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content glass border-0">
                            <div className="modal-header border-0">
                                <h5 className="modal-title fw-bold">Write Your Review</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleSubmitReview}>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Your Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Your Role/Title (Optional)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            placeholder="e.g., Student, Developer"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Your Review</label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            value={formData.review_text}
                                            onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Rating</label>
                                        <div className="d-flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={32}
                                                    className="cursor-pointer"
                                                    fill={star <= formData.rating ? '#fbbf24' : 'none'}
                                                    color="#fbbf24"
                                                    onClick={() => setFormData({ ...formData, rating: star })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {submitMessage && (
                                        <div className={`alert ${submitMessage.includes('Thank') ? 'alert-success' : 'alert-info'}`}>
                                            {submitMessage}
                                        </div>
                                    )}
                                    <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Testimonials;
