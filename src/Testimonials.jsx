import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star, Plus, X, Heart } from 'lucide-react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter';
import adminStore from './utils/adminStore';
import { eventBus } from './agents/core/EventBus';

function Testimonials() {
    const [showAll, setShowAll] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [user, setUser] = useState(null);
    const [allReviews, setAllReviews] = useState(adminStore.getApprovedReviews());
    const [formData, setFormData] = useState({ name: '', role: '', review_text: '', rating: 5 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    useEffect(() => {
        SupabaseAdapter.getUser().then(setUser);
        setAllReviews(adminStore.getApprovedReviews());

        const unsub = eventBus.on('REVIEWS_UPDATED', () => {
            setAllReviews(adminStore.getApprovedReviews());
        });

        const { data: { subscription } } = SupabaseAdapter.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => {
            unsub();
            subscription.unsubscribe();
        };
    }, []);

    const handleLikeReview = (id) => {
        if (id) {
            adminStore.likeReview(id);
            setAllReviews(adminStore.getApprovedReviews());
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Save to local adminStore (pending admin or user approval/like)
            adminStore.addReview({
                name: formData.name,
                role: formData.role,
                review_text: formData.review_text,
                rating: formData.rating
            });

            // Try Cloud insert if connected
            if (user) {
                const client = SupabaseAdapter.getClient();
                await client
                    .from('reviews')
                    .insert([{
                        user_id: user.id,
                        name: formData.name,
                        role: formData.role,
                        review_text: formData.review_text,
                        rating: formData.rating
                    }]).catch(err => console.warn('Supabase review notice:', err.message));
            }

            setSubmitMessage('Thank you! Your review is submitted and pending approval.');
            setFormData({ name: '', role: '', review_text: '', rating: 5 });
            setTimeout(() => {
                setShowModal(false);
                setSubmitMessage('');
            }, 2000);
        } catch (error) {
            console.error('Review submission failed:', error);
            setSubmitMessage('Review saved locally.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const testimonials = showAll ? allReviews : allReviews.slice(0, 3);

    return (
        <div className="container py-5 mt-5">
            <div className="text-center mb-5">
                <h2 className="display-5 fw-bold">Loved by Focused People</h2>
                <p className="lead opacity-75">See what our community has to say about their experience.</p>
            </div>

            <div className="row g-4">
                <AnimatePresence>
                    {testimonials.map((testi, index) => (
                        <motion.div
                            key={testi.id || index}
                            className="col-md-4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="card glass h-100 p-4 border-0 position-relative" style={{ color: 'var(--text-body)' }}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <Quote className="text-primary opacity-25" size={36} />
                                    <button
                                        className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 d-flex align-items-center gap-1"
                                        onClick={() => handleLikeReview(testi.id)}
                                        title="Like & approve this review"
                                    >
                                        <Heart size={14} fill="currentColor" />
                                        <span className="small">{testi.likes || 0}</span>
                                    </button>
                                </div>
                                <p className="fs-5 mb-4 italic" style={{ color: 'var(--text-body)' }}>"{testi.review_text || testi.text}"</p>
                                <div className="mt-auto">
                                    <div className="d-flex text-warning mb-2">
                                        {[...Array(testi.rating || 5)].map((_, i) => (
                                            <Star key={i} size={16} fill="currentColor" />
                                        ))}
                                    </div>
                                    <h3 className="fs-6 fw-bold mb-0" style={{ color: 'var(--text-body)' }}>{testi.name}</h3>
                                    <p className="small opacity-75 mb-0" style={{ color: 'var(--text-muted)' }}>{testi.role}</p>
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

                {!showAll && allReviews.length > 3 && (
                    <button
                        className="btn btn-outline-primary px-4 rounded-pill"
                        onClick={() => setShowAll(true)}
                    >
                        View All Stories ({allReviews.length})
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
                        <div className="modal-content glass border-0" style={{ color: 'var(--text-body)', background: 'var(--glass-bg)' }}>
                            <div className="modal-header border-0">
                                <h3 className="modal-title fs-5 fw-bold">Write Your Review</h3>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleSubmitReview}>
                                    <div className="mb-3">
                                        <label htmlFor="rev-name" className="form-label fw-bold">Your Name</label>
                                        <input
                                            id="rev-name"
                                            type="text"
                                            className="form-control"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="rev-role" className="form-label fw-bold">Your Role/Title (Optional)</label>
                                        <input
                                            id="rev-role"
                                            type="text"
                                            className="form-control"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            placeholder="e.g., Student, Developer"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="rev-text" className="form-label fw-bold">Your Review</label>
                                        <textarea
                                            id="rev-text"
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
