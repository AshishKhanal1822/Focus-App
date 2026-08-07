import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Plus, Trash2, CheckCircle2, XCircle, Heart,
    MessageSquare, Mail, Lightbulb, Shield, LogOut, ArrowRight,
    Star, Search, Sparkles, Check
} from 'lucide-react';
import adminStore from './utils/adminStore';
import { useNavigate } from 'react-router-dom';

const categories = ['Productivity', 'Mindfulness', 'Writing', 'Creativity', 'Self-Growth', 'Technology', 'Philosophy'];

export default function Admin() {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(adminStore.isAdminLoggedIn());
    const [activeTab, setActiveTab] = useState('books');

    // Data states
    const [books, setBooks] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [messages, setMessages] = useState([]);

    // Add Book Form state
    const [showAddBookModal, setShowAddBookModal] = useState(false);
    const [bookForm, setBookForm] = useState({
        title: '',
        author: '',
        category: 'Productivity',
        image: '',
        description: '',
        content: ''
    });

    // Add Review Form state
    const [showAddReviewModal, setShowAddReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        name: '',
        role: '',
        review_text: '',
        rating: 5
    });

    // Search / Filter states
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!adminStore.isAdminLoggedIn()) {
            setIsAdmin(false);
        } else {
            setIsAdmin(true);
            refreshAllData();
        }
    }, []);

    const refreshAllData = () => {
        setBooks(adminStore.getBooks());
        setReviews(adminStore.getReviews());
        setSuggestions(adminStore.getSuggestions());
        setMessages(adminStore.getContactMessages());
    };

    const handleLogout = () => {
        adminStore.logoutAdmin();
        setIsAdmin(false);
        navigate('/');
    };

    const handleCreateBook = (e) => {
        e.preventDefault();
        if (!bookForm.title || !bookForm.description) return;
        adminStore.addBook(bookForm);
        setBookForm({
            title: '',
            author: '',
            category: 'Productivity',
            image: '',
            description: '',
            content: ''
        });
        setShowAddBookModal(false);
        refreshAllData();
    };

    const handleDeleteBook = (id) => {
        if (window.confirm('Are you sure you want to delete this custom book?')) {
            adminStore.deleteBook(id);
            refreshAllData();
        }
    };

    const handleCreateReview = (e) => {
        e.preventDefault();
        if (!reviewForm.name || !reviewForm.review_text) return;
        const newRev = adminStore.addReview(reviewForm);
        if (newRev) {
            adminStore.toggleApproveReview(newRev.id); // auto approve admin-created review
        }
        setReviewForm({ name: '', role: '', review_text: '', rating: 5 });
        setShowAddReviewModal(false);
        refreshAllData();
    };

    const handleToggleApproveReview = (id) => {
        adminStore.toggleApproveReview(id);
        refreshAllData();
    };

    const handleDeleteReview = (id) => {
        if (window.confirm('Delete this review?')) {
            adminStore.deleteReview(id);
            refreshAllData();
        }
    };

    const handleDeleteSuggestion = (id) => {
        adminStore.deleteSuggestion(id);
        refreshAllData();
    };

    const handleConvertSuggestionToBook = (sug) => {
        setBookForm({
            title: sug.title,
            author: sug.author || 'Suggested Author',
            category: 'Productivity',
            image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
            description: sug.note || `A great book recommendation: ${sug.title}`,
            content: `<h2>${sug.title}</h2><p>Suggested by community member. ${sug.note || ''}</p>`
        });
        setActiveTab('books');
        setShowAddBookModal(true);
    };

    const handleToggleReadMsg = (id) => {
        adminStore.toggleReadMessage(id);
        refreshAllData();
    };

    const handleDeleteMsg = (id) => {
        adminStore.deleteContactMessage(id);
        refreshAllData();
    };

    if (!isAdmin) {
        return (
            <div className="container py-5 mt-5 text-center">
                <div className="glass p-5 rounded-4 max-w-md mx-auto" style={{ maxWidth: '500px' }}>
                    <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-circle d-inline-block mb-3">
                        <Shield size={40} />
                    </div>
                    <h2 className="fw-bold mb-2">Admin Access Required</h2>
                    <p className="text-muted mb-4">
                        Please log in with username <code>focusadmin</code> and password <code>adminfocus</code> to view the Admin Panel.
                    </p>
                    <button
                        className="btn btn-primary rounded-pill px-4"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('SHOW_LOGIN'));
                            navigate('/');
                        }}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5 mt-3 min-vh-100">
            {/* Admin Header Banner */}
            <div className="glass p-4 rounded-4 mb-4 shadow-sm">
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-3 rounded-4 bg-primary text-white shadow">
                            <Shield size={32} />
                        </div>
                        <div>
                            <div className="d-flex align-items-center gap-2">
                                <h1 className="fw-bold fs-3 mb-0">Focus Admin Control Center</h1>
                                <span className="badge bg-danger rounded-pill px-3 py-1">SuperAdmin</span>
                            </div>
                            <p className="text-muted small mb-0 mt-1">
                                Manage books, user reviews & approval, book suggestions, and contact messages.
                            </p>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-danger btn-sm rounded-pill px-3 d-flex align-items-center gap-1"
                            onClick={handleLogout}
                        >
                            <LogOut size={14} /> Logout Admin
                        </button>
                    </div>
                </div>
            </div>


            {/* Navigation Tabs */}
            <div className="d-flex overflow-auto border-bottom mb-4 pb-2 gap-2 scrollbar-hide">
                <button
                    className={`btn rounded-pill px-4 py-2 text-nowrap d-flex align-items-center gap-2 ${activeTab === 'books' ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => setActiveTab('books')}
                >
                    <BookOpen size={18} /> Books ({books.length})
                </button>
                <button
                    className={`btn rounded-pill px-4 py-2 text-nowrap d-flex align-items-center gap-2 ${activeTab === 'reviews' ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    <Star size={18} /> Reviews & Approvals ({reviews.length})
                </button>
                <button
                    className={`btn rounded-pill px-4 py-2 text-nowrap d-flex align-items-center gap-2 ${activeTab === 'suggestions' ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => setActiveTab('suggestions')}
                >
                    <Lightbulb size={18} /> Book Suggestions ({suggestions.length})
                </button>
                <button
                    className={`btn rounded-pill px-4 py-2 text-nowrap d-flex align-items-center gap-2 ${activeTab === 'messages' ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => setActiveTab('messages')}
                >
                    <Mail size={18} /> Contact Submissions ({messages.length})
                </button>
            </div>

            {/* TAB 1: BOOKS MANAGEMENT */}
            {activeTab === 'books' && (
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 className="fw-bold fs-4 mb-0">Library Book Collection</h2>
                            <p className="small text-muted mb-0">Books added here immediately appear on the Main Page / Library.</p>
                        </div>
                        <button
                            className="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm"
                            onClick={() => setShowAddBookModal(true)}
                        >
                            <Plus size={18} /> Add New Book
                        </button>
                    </div>

                    <div className="row g-4">
                        {books.map((b) => (
                            <div key={b.id} className="col-md-6 col-lg-4">
                                <div className="card glass border-0 rounded-4 overflow-hidden h-100">
                                    <div className="position-relative" style={{ height: '180px' }}>
                                        <img
                                            src={b.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                                            alt={b.title}
                                            className="w-100 h-100 object-fit-cover"
                                        />
                                        <span className="position-absolute top-0 end-0 m-2 badge bg-primary rounded-pill">
                                            {b.category}
                                        </span>
                                        {b.isCustom && (
                                            <span className="position-absolute top-0 start-0 m-2 badge bg-warning text-dark rounded-pill">
                                                ★ Added by Admin
                                            </span>
                                        )}
                                    </div>
                                    <div className="card-body p-3 d-flex flex-column">
                                        <h3 className="fs-5 fw-bold mb-1">{b.title}</h3>
                                        <p className="small text-primary mb-2">by {b.author}</p>
                                        <p className="small text-muted line-clamp-2 mb-3 flex-grow-1">{b.description}</p>
                                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                            <span className="small text-muted">ID: {b.id}</span>
                                            {b.isCustom ? (
                                                <button
                                                    className="btn btn-sm btn-outline-danger rounded-circle p-2"
                                                    onClick={() => handleDeleteBook(b.id)}
                                                    title="Delete custom book"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) : (
                                                <span className="small text-secondary italic">Built-in</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: REVIEWS & APPROVALS */}
            {activeTab === 'reviews' && (
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 className="fw-bold fs-4 mb-0">User Reviews & Moderation</h2>
                            <p className="small text-muted mb-0">Approve or like reviews to allow them to display on the Testimonials & Main pages.</p>
                        </div>
                        <button
                            className="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm"
                            onClick={() => setShowAddReviewModal(true)}
                        >
                            <Plus size={18} /> Add Review
                        </button>
                    </div>

                    <div className="table-responsive glass rounded-4 p-3">
                        <table className="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Reviewer</th>
                                    <th>Review Text</th>
                                    <th>Rating</th>
                                    <th>Likes</th>
                                    <th>Page Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <div className="fw-bold">{r.name}</div>
                                            <div className="small text-muted">{r.role || 'User'}</div>
                                        </td>
                                        <td style={{ maxWidth: '350px' }}>
                                            <p className="mb-0 small">{r.review_text || r.text}</p>
                                        </td>
                                        <td>
                                            <div className="d-flex text-warning">
                                                {[...Array(r.rating || 5)].map((_, i) => (
                                                    <Star key={i} size={14} fill="currentColor" />
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1">
                                                <Heart size={12} className="me-1" fill="currentColor" />
                                                {r.likes || 0}
                                            </span>
                                        </td>
                                        <td>
                                            {r.is_approved !== false ? (
                                                <span className="badge bg-success rounded-pill px-3 py-2">
                                                    ✓ Allowed on Pages
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary rounded-pill px-3 py-2">
                                                    Pending Approval
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className={`btn btn-sm rounded-pill ${r.is_approved !== false ? 'btn-outline-warning' : 'btn-success'}`}
                                                    onClick={() => handleToggleApproveReview(r.id)}
                                                >
                                                    {r.is_approved !== false ? 'Hide from pages' : 'Allow on pages'}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger rounded-circle p-2"
                                                    onClick={() => handleDeleteReview(r.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: BOOK SUGGESTIONS */}
            {activeTab === 'suggestions' && (
                <div>
                    <div className="mb-4">
                        <h2 className="fw-bold fs-4 mb-0">User Book Suggestions</h2>
                        <p className="small text-muted">Suggestions submitted by users via the Library page.</p>
                    </div>

                    {suggestions.length === 0 ? (
                        <div className="text-center p-5 glass rounded-4 text-muted">
                            <Lightbulb size={48} className="opacity-25 mb-3" />
                            <h4>No book suggestions submitted yet.</h4>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {suggestions.map((sug) => (
                                <div key={sug.id} className="col-md-6">
                                    <div className="card glass border-0 rounded-4 p-4 h-100">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <span className="badge bg-info text-dark rounded-pill mb-2">Book Suggestion</span>
                                                <h3 className="fs-5 fw-bold mb-1">{sug.title}</h3>
                                                <p className="text-primary small mb-0">Author: {sug.author || 'Unknown'}</p>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-outline-danger rounded-circle p-2"
                                                onClick={() => handleDeleteSuggestion(sug.id)}
                                                title="Delete Suggestion"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="card-text text-muted small mb-4">{sug.note || 'No additional note provided.'}</p>
                                        <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                                            <span className="small text-muted">
                                                {new Date(sug.created_at).toLocaleDateString()}
                                            </span>
                                            <button
                                                className="btn btn-sm btn-primary rounded-pill px-3 d-flex align-items-center gap-1"
                                                onClick={() => handleConvertSuggestionToBook(sug)}
                                            >
                                                <Plus size={14} /> Add as Book
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: CONTACT SUBMISSIONS */}
            {activeTab === 'messages' && (
                <div>
                    <div className="mb-4">
                        <h2 className="fw-bold fs-4 mb-0">Contact Section Details & Submissions</h2>
                        <p className="small text-muted">All messages submitted by visitors through the Contact form.</p>
                    </div>

                    {messages.length === 0 ? (
                        <div className="text-center p-5 glass rounded-4 text-muted">
                            <Mail size={48} className="opacity-25 mb-3" />
                            <h4>No contact form messages received yet.</h4>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`card glass border-0 rounded-4 p-4 transition-all ${!msg.read ? 'border-start border-4 border-primary' : ''}`}
                                >
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                                                <Mail size={20} />
                                            </div>
                                            <div>
                                                <h3 className="fs-6 fw-bold mb-0">{msg.name}</h3>
                                                <a href={`mailto:${msg.email}`} className="small text-primary text-decoration-none">{msg.email}</a>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="small text-muted me-2">
                                                {new Date(msg.created_at).toLocaleString()}
                                            </span>
                                            <button
                                                className={`btn btn-sm rounded-pill ${msg.read ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                                                onClick={() => handleToggleReadMsg(msg.id)}
                                            >
                                                {msg.read ? 'Mark Unread' : 'Mark Read'}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger rounded-circle p-2"
                                                onClick={() => handleDeleteMsg(msg.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-light rounded-3 text-body">
                                        <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ADD BOOK MODAL */}
            {showAddBookModal && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
                    style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowAddBookModal(false)}
                >
                    <div
                        className="bg-white p-4 rounded-4 shadow-xl text-start w-100 overflow-auto"
                        style={{ maxWidth: '600px', maxHeight: '90vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-4 text-body">
                            <h3 className="fw-bold mb-0 fs-5">Add Book to Main Page & Library</h3>
                            <button className="btn-close" onClick={() => setShowAddBookModal(false)}></button>
                        </div>

                        <form onSubmit={handleCreateBook}>
                            <div className="mb-3 text-body">
                                <label className="form-label small fw-bold">Book Title *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g. Deep Concentration"
                                    value={bookForm.title}
                                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                                />
                            </div>

                            <div className="row g-3 mb-3 text-body">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Author Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Dr. Alex Vance"
                                        value={bookForm.author}
                                        onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Category</label>
                                    <select
                                        className="form-select"
                                        value={bookForm.category}
                                        onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-3 text-body">
                                <label className="form-label small fw-bold">Cover Image URL (Optional)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="https://images.unsplash.com/..."
                                    value={bookForm.image}
                                    onChange={(e) => setBookForm({ ...bookForm, image: e.target.value })}
                                />
                            </div>

                            <div className="mb-3 text-body">
                                <label className="form-label small fw-bold">Short Description *</label>
                                <textarea
                                    className="form-control"
                                    rows="2"
                                    required
                                    placeholder="Brief summary of the book..."
                                    value={bookForm.description}
                                    onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="mb-4 text-body">
                                <label className="form-label small fw-bold">Book Reader Content (HTML supported)</label>
                                <textarea
                                    className="form-control"
                                    rows="5"
                                    placeholder="Enter full text content or HTML for reader mode..."
                                    value={bookForm.content}
                                    onChange={(e) => setBookForm({ ...bookForm, content: e.target.value })}
                                ></textarea>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 rounded-pill py-2 fw-bold">
                                Publish Book Directly to Main Page
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD REVIEW MODAL */}
            {showAddReviewModal && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
                    style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowAddReviewModal(false)}
                >
                    <div
                        className="bg-white p-4 rounded-4 shadow-xl text-start w-100"
                        style={{ maxWidth: '500px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-4 text-body">
                            <h3 className="fw-bold mb-0 fs-5">Add & Approve User Review</h3>
                            <button className="btn-close" onClick={() => setShowAddReviewModal(false)}></button>
                        </div>

                        <form onSubmit={handleCreateReview}>
                            <div className="mb-3 text-body">
                                <label className="form-label small fw-bold">Reviewer Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="Full Name"
                                    value={reviewForm.name}
                                    onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                                />
                            </div>

                            <div className="mb-3 text-body">
                                <label className="form-label small fw-bold">Title / Role</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Content Creator, Student"
                                    value={reviewForm.role}
                                    onChange={(e) => setReviewForm({ ...reviewForm, role: e.target.value })}
                                />
                            </div>

                            <div className="mb-3 text-body">
                                <label className="form-label small fw-bold">Review Text *</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    required
                                    placeholder="Write feedback..."
                                    value={reviewForm.review_text}
                                    onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="mb-4 text-body">
                                <label className="form-label small fw-bold">Rating (1 to 5 Stars)</label>
                                <div className="d-flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={28}
                                            className="cursor-pointer"
                                            fill={star <= reviewForm.rating ? '#fbbf24' : 'none'}
                                            color="#fbbf24"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 rounded-pill py-2 fw-bold">
                                Add & Feature Review
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
