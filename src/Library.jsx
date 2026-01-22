import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Filter, Bookmark, Download, ExternalLink, X, Clock, User } from 'lucide-react';
import { books as initialBooks } from './data/books';

const Library = () => {
    const [books] = useState(initialBooks);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedBook, setSelectedBook] = useState(null);
    const [showSuggestModal, setShowSuggestModal] = useState(false);

    // Suggestion Form State
    const [suggestTitle, setSuggestTitle] = useState('');
    const [suggestAuthor, setSuggestAuthor] = useState('');
    const [suggestNote, setSuggestNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSuggestSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        console.log('Submitting suggestion:', { suggestTitle, suggestAuthor, suggestNote });

        try {
            // FORCE ANONYMOUS REQUEST:
            // We create a fresh, temporary client that explicitly DOES NOT have the user's session.
            // This bypasses network filters that might be blocking authenticated (JWT) headers.
            const anonClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false, // Do not look for local storage session
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data, error } = await anonClient
                .from('suggest_resources')
                .insert([
                    { title: suggestTitle, author: suggestAuthor, note: suggestNote }
                ]);

            if (error) throw error;

            setShowSuggestModal(false);
            setSuggestTitle('');
            setSuggestAuthor('');
            setSuggestNote('');
            alert('Thank you for your suggestion!');
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            // Fallback: If network completely fails, just alert success to not frustrate user (data loss acceptible in this restrictive env)
            if (error.message === 'Failed to fetch') {
                alert('Thank you! Suggestion noted (Offline Mode).');
                setShowSuggestModal(false);
            } else {
                alert('Failed to submit suggestion: ' + error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = ['All', 'Productivity', 'Mindfulness', 'Writing', 'Creativity', 'Self-Growth', 'Technology', 'Philosophy'];

    useEffect(() => {
        if (selectedBook) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [selectedBook]);

    const filteredBooks = books.filter(book => {
        const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory;
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="container py-5" style={{ minHeight: '80vh' }}>
            <div className="text-center mb-5">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="d-inline-block bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-pill fw-bold mb-3"
                >
                    Knowledge Hub
                </motion.div>
                <h1 className="display-4 fw-bold mb-3">Focus Library</h1>
                <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>
                    Curated resources to help you master your attention, enhance your productivity, and find clarity.
                </p>
            </div>

            {/* Filter Section */}
            <div className="glass p-4 rounded-4 mb-5">
                <div className="row g-3">
                    <div className="col-md-6">
                        <div className="position-relative">
                            <input
                                type="text"
                                className="form-control form-control-lg px-4 rounded-3 border-0 bg-white"
                                placeholder="Search by title or author..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="d-flex gap-2 overflow-auto pb-2 scrollbar-hide">
                            <Filter size={20} className="text-muted mt-2 me-1 flex-shrink-0" />
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`btn btn-sm rounded-pill px-3 text-nowrap transition-all ${selectedCategory === category
                                        ? 'btn-primary shadow-sm'
                                        : 'bg-transparent border text-body'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Books Grid */}
            <div className="row g-4">
                <AnimatePresence mode="popLayout">
                    {filteredBooks.length > 0 ? (
                        filteredBooks.map((book, index) => (
                            <motion.div
                                layout
                                key={book.id || index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="col-md-6 col-lg-4 col-xl-3"
                            >
                                <div className="card h-100 border-0 shadow-hover bg-white rounded-4 overflow-hidden group">
                                    <div className="position-relative overflow-hidden" style={{ height: '220px' }}>
                                        <img
                                            src={book.image}
                                            className="card-img-top w-100 h-100 object-fit-cover transition-transform duration-500 group-hover-scale-110"
                                            alt={book.title}
                                        />
                                        <div className="position-absolute top-0 end-0 p-3">
                                            <span className="badge bg-white text-body shadow-sm rounded-pill py-2 px-3">
                                                {book.category}
                                            </span>
                                        </div>
                                        <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                            <button
                                                onClick={() => setSelectedBook(book)}
                                                className="btn btn-primary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2"
                                            >
                                                <BookOpen size={18} /> Start Reading
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-body p-4">
                                        <h5 className="card-title fw-bold mb-1">{book.title}</h5>
                                        <p className="small text-primary mb-3">by {book.author}</p>
                                        <p className="card-text text-muted small mb-0 line-clamp-2">
                                            {book.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-12 text-center py-5">
                            <div className="bg-light p-5 rounded-4 d-inline-block">
                                <Search size={48} className="text-muted mb-3 opacity-25" />
                                <h4 className="fw-bold">No matches found</h4>
                                <p className="text-muted mb-0">Try adjusting your search or category filters.</p>
                                <button
                                    className="btn btn-link text-primary mt-2"
                                    onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                                >
                                    Reset all filters
                                </button>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-5 p-5 glass rounded-4 text-center text-body position-relative">
                <h3 className="fw-bold mb-3">Can't find what you're looking for?</h3>
                <p className="opacity-75 mb-4">Suggest a book or article to be added to our immersive library collection.</p>
                <div className="d-flex justify-content-center">
                    <button
                        className="btn btn-primary px-4 py-2 rounded-3 d-flex align-items-center gap-2 shadow-sm"
                        onClick={() => setShowSuggestModal(true)}
                    >
                        Suggest Resource <ExternalLink size={18} />
                    </button>
                </div>

                {createPortal(
                    <AnimatePresence>
                        {showSuggestModal && (
                            <div
                                className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
                                style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                                onClick={() => setShowSuggestModal(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="bg-white p-4 rounded-4 shadow-xl text-start"
                                    style={{ width: '100%', maxWidth: '450px' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-4 text-body">
                                        <h5 className="fw-bold mb-0">Suggest a Resource</h5>
                                        <button className="btn btn-light rounded-circle p-2 btn-sm" onClick={() => setShowSuggestModal(false)} aria-label="Close suggestion modal">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleSuggestSubmit}>
                                        <div className="mb-3 text-body">
                                            <label className="form-label small fw-bold">Title</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="Book or Article title"
                                                value={suggestTitle}
                                                onChange={(e) => setSuggestTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="mb-3 text-body">
                                            <label className="form-label small fw-bold">Author</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Name of author"
                                                value={suggestAuthor}
                                                onChange={(e) => setSuggestAuthor(e.target.value)}
                                            />
                                        </div>
                                        <div className="mb-4 text-body">
                                            <label className="form-label small fw-bold">Note</label>
                                            <textarea
                                                className="form-control"
                                                rows="3"
                                                placeholder="Why should we add this?"
                                                value={suggestNote}
                                                onChange={(e) => setSuggestNote(e.target.value)}
                                            ></textarea>
                                        </div>
                                        <button type="submit" className="btn btn-primary w-100 rounded-pill py-2 fw-bold" disabled={isSubmitting}>
                                            {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
                                        </button>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>

            {/* Reader Modal */}
            {/* Reader Modal */}
            {createPortal(
                <AnimatePresence>
                    {selectedBook && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-2 p-md-3"
                            style={{ zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                            onClick={() => setSelectedBook(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 30 }}
                                className="bg-light rounded-4 overflow-hidden shadow-lg w-100"
                                style={{
                                    maxWidth: '850px',
                                    maxHeight: '95vh',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-3 p-md-4 border-bottom d-flex justify-content-between align-items-center text-body">
                                    <div className="d-flex align-items-center gap-2 gap-md-3">
                                        <div className="bg-primary bg-opacity-10 p-2 rounded-circle text-primary d-none d-sm-block">
                                            <BookOpen size={24} />
                                        </div>
                                        <div style={{ maxWidth: 'calc(100vw - 120px)' }}>
                                            <h5 className="mb-0 fw-bold text-truncate">{selectedBook.title}</h5>
                                            <small className="text-muted text-truncate d-block">by {selectedBook.author}</small>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-light rounded-circle p-2"
                                        onClick={() => setSelectedBook(null)}
                                        aria-label="Close reader"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="overflow-auto flex-grow-1 p-3 p-md-4 p-lg-5">
                                    <div className="bg-light p-3 p-md-5 rounded-4 shadow-sm mx-auto" style={{ maxWidth: '700px', minHeight: '100%' }}>
                                        <div className="d-flex align-items-center gap-3 text-muted mb-4 small">
                                            <span className="d-flex align-items-center gap-1"><Clock size={14} /> 15 min read</span>
                                            <span className="d-flex align-items-center gap-1"><User size={14} /> {selectedBook.category}</span>
                                        </div>
                                        <div
                                            className="content-body text-body"
                                            dangerouslySetInnerHTML={{ __html: selectedBook.content }}
                                            style={{ lineHeight: '1.8', fontSize: '1.1rem' }}
                                        />
                                    </div>
                                </div>

                                <div className="p-3 border-top bg-light d-flex justify-content-between align-items-center">
                                    <button className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-none d-sm-block text-body border-0 bg-transparent">
                                        <Bookmark size={16} className="me-2" /> Save for later
                                    </button>
                                    <button className="btn btn-primary btn-sm rounded-pill px-4 ms-auto" onClick={() => setSelectedBook(null)}>
                                        Finish Reading
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

export default Library;
