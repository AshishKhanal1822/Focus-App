import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import adminStore from './utils/adminStore.js';
import readingStore from './utils/readingStore.js';
import { eventBus } from './agents/core/EventBus.js';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Filter, Download, ExternalLink, X, Clock, User, Music, CheckCircle, Check, Sparkles } from 'lucide-react';
import { MusicSection } from './components/MusicPlayer';

const Library = () => {
    const [books, setBooks] = useState(adminStore.getBooks());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedBook, setSelectedBook] = useState(null);
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [user, setUser] = useState(SupabaseAdapter.cachedUser);

    // Reading progress per book for current user
    const [readingProgress, setReadingProgress] = useState(readingStore.getAllProgress(user?.id));
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [completedToastBook, setCompletedToastBook] = useState(null);

    // Suggestion Form State
    const [suggestTitle, setSuggestTitle] = useState('');
    const [suggestAuthor, setSuggestAuthor] = useState('');
    const [suggestNote, setSuggestNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = SupabaseAdapter.subscribe((u) => {
            setUser(u);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        setReadingProgress(readingStore.getAllProgress(user?.id));
    }, [user?.id]);

    useEffect(() => {
        const unsub = eventBus.on('READING_PROGRESS_UPDATED', ({ userId }) => {
            if (!userId || userId === (user?.id || 'guest')) {
                setReadingProgress(readingStore.getAllProgress(user?.id));
            }
        });
        return unsub;
    }, [user?.id]);

    useEffect(() => {
        const unsub = eventBus.on('BOOKS_UPDATED', (updatedBooks) => {
            setBooks(updatedBooks);
        });
        return unsub;
    }, []);

    const handleSuggestSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        console.log('Submitting suggestion:', { suggestTitle, suggestAuthor, suggestNote });

        // Save locally via adminStore
        adminStore.addSuggestion({
            title: suggestTitle,
            author: suggestAuthor,
            note: suggestNote
        });

        try {
            const anonClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            await anonClient
                .from('suggest_resources')
                .insert([
                    { title: suggestTitle, author: suggestAuthor, note: suggestNote }
                ]).catch(err => console.warn('Supabase suggestion sync notice:', err.message));
        } catch (error) {
            console.log('Suggestion saved to local admin storage.');
        } finally {
            setShowSuggestModal(false);
            setSuggestTitle('');
            setSuggestAuthor('');
            setSuggestNote('');
            setIsSubmitting(false);
            alert('Thank you for your book suggestion!');
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

    // Reading Time Stats Tracker & Session Time counter
    useEffect(() => {
        if (!selectedBook) {
            setSessionSeconds(0);
            return;
        }

        setSessionSeconds(0);
        let secondsElapsed = 0;
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                secondsElapsed++;
                setSessionSeconds(prev => prev + 1);
                if (secondsElapsed >= 10) {
                    eventBus.emit('STATS_INCREMENT', { reading_time_seconds: 10 });
                    secondsElapsed = 0;
                }
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            if (secondsElapsed > 0) {
                eventBus.emit('STATS_INCREMENT', { reading_time_seconds: secondsElapsed });
            }
        };
    }, [selectedBook]);

    const flushCurrentReadingTime = () => {
        if (selectedBook && sessionSeconds > 0) {
            readingStore.addTime(user?.id, selectedBook.id, sessionSeconds);
        }
    };

    const handleCloseReader = () => {
        flushCurrentReadingTime();
        setSelectedBook(null);
    };

    const handleFinishReading = () => {
        if (!selectedBook) return;
        flushCurrentReadingTime();
        readingStore.markCompleted(user?.id, selectedBook.id);
        const bookTitle = selectedBook.title;
        setSelectedBook(null);
        setCompletedToastBook(bookTitle);
        setTimeout(() => {
            setCompletedToastBook(null);
        }, 4000);
    };

    const formatTimeSpent = (totalSeconds) => {
        if (!totalSeconds || totalSeconds < 5) return null;
        if (totalSeconds < 60) return `${totalSeconds}s read`;
        const mins = Math.floor(totalSeconds / 60);
        if (mins < 60) return `${mins} min read`;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return remMins > 0 ? `${hrs}h ${remMins}m read` : `${hrs}h read`;
    };

    const formatSessionTimer = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const filteredBooks = books.filter(book => {
        const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory;
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="container py-5" style={{ minHeight: '80vh' }}>
            {/* Completion Toast Notification */}
            <AnimatePresence>
                {completedToastBook && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="position-fixed top-0 start-50 translate-middle-x mt-4 p-3 rounded-4 shadow-lg text-white d-flex align-items-center gap-3"
                        style={{
                            zIndex: 10500,
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            maxWidth: '90vw'
                        }}
                    >
                        <div className="bg-white bg-opacity-25 p-2 rounded-circle d-flex align-items-center justify-content-center">
                            <Sparkles size={24} className="text-white" />
                        </div>
                        <div>
                            <h6 className="fw-bold mb-0">Book Completed! 🎉</h6>
                            <small className="opacity-90">Great job finishing "{completedToastBook}"</small>
                        </div>
                        <button
                            className="btn btn-sm btn-link text-white opacity-75 ms-2 p-0 text-decoration-none"
                            onClick={() => setCompletedToastBook(null)}
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

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
                        filteredBooks.map((book, index) => {
                            const prog = readingProgress[book.id];
                            const isCompleted = prog?.completed;
                            const timeSpentStr = formatTimeSpent(prog?.timeSpentSeconds);

                            return (
                                <motion.div
                                    layout
                                    key={book.id || index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="col-md-6 col-lg-4 col-xl-3"
                                >
                                    <div className="card h-100 border-0 shadow-hover bg-white rounded-4 overflow-hidden group position-relative">
                                        <div className="position-relative overflow-hidden" style={{ height: '220px' }}>
                                            <img
                                                src={book.image}
                                                className="card-img-top w-100 h-100 object-fit-cover transition-transform duration-500 group-hover-scale-110"
                                                alt={book.title}
                                            />
                                            {/* Status badges */}
                                            <div className="position-absolute top-0 start-0 p-3 d-flex flex-column gap-1 align-items-start">
                                                {isCompleted && (
                                                    <span className="badge bg-success text-white shadow-sm rounded-pill py-1 px-3 d-flex align-items-center gap-1 fw-bold">
                                                        <CheckCircle size={13} /> Completed
                                                    </span>
                                                )}
                                                {timeSpentStr && (
                                                    <span className="badge bg-dark bg-opacity-75 backdrop-blur text-white shadow-sm rounded-pill py-1 px-3 d-flex align-items-center gap-1 small">
                                                        <Clock size={12} /> {timeSpentStr}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="position-absolute top-0 end-0 p-3">
                                                <span className="badge bg-white text-body shadow-sm rounded-pill py-2 px-3">
                                                    {book.category}
                                                </span>
                                            </div>

                                            <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                                <button
                                                    onClick={() => setSelectedBook(book)}
                                                    className={`btn w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 ${
                                                        isCompleted ? 'btn-outline-light bg-white text-dark shadow-sm fw-semibold' : 'btn-primary'
                                                    }`}
                                                >
                                                    <BookOpen size={18} />
                                                    {isCompleted ? 'Read Again' : prog?.timeSpentSeconds ? 'Continue Reading' : 'Start Reading'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="card-body p-4">
                                            <h2 className="card-title fw-bold mb-1 fs-5">{book.title}</h2>
                                            <p className="small text-primary mb-3">by {book.author}</p>
                                            <p className="card-text text-muted small mb-0 line-clamp-2">
                                                {book.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-12 text-center py-5">
                            <div className="bg-light p-5 rounded-4 d-inline-block">
                                <Search size={48} className="text-muted mb-3 opacity-25" />
                                <h2 className="fw-bold fs-4">No matches found</h2>
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

            <MusicSection />

            <div className="mt-5 p-5 glass rounded-4 text-center text-body position-relative">
                <h2 className="fw-bold mb-3 fs-3">Can't find what you're looking for?</h2>
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
                                        <h2 className="fw-bold mb-0 fs-5">Suggest a Resource</h2>
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
            {createPortal(
                <AnimatePresence>
                    {selectedBook && (() => {
                        const bookProg = readingProgress[selectedBook.id];
                        const totalSpentSecs = (bookProg?.timeSpentSeconds || 0) + sessionSeconds;
                        const isCompleted = bookProg?.completed;
                        const totalTimeStr = formatTimeSpent(totalSpentSecs) || `${totalSpentSecs}s spent`;

                        return (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-2 p-md-3"
                                style={{ zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                                onClick={handleCloseReader}
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
                                            <div style={{ maxWidth: 'calc(100vw - 160px)' }}>
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <h2 className="mb-0 fw-bold text-truncate fs-5">{selectedBook.title}</h2>
                                                    {isCompleted && (
                                                        <span className="badge bg-success rounded-pill px-2 py-1 small d-inline-flex align-items-center gap-1 text-white">
                                                            <CheckCircle size={12} /> Completed
                                                        </span>
                                                    )}
                                                </div>
                                                <small className="text-muted text-truncate d-block">by {selectedBook.author}</small>
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-light rounded-circle p-2"
                                            onClick={handleCloseReader}
                                            aria-label="Close reader"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="overflow-auto flex-grow-1 p-3 p-md-4 p-lg-5">
                                        <div className="bg-light p-3 p-md-5 rounded-4 shadow-sm mx-auto" style={{ maxWidth: '700px', minHeight: '100%' }}>
                                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 text-muted mb-4 pb-3 border-bottom small">
                                                <div className="d-flex align-items-center gap-3">
                                                    <span className="d-flex align-items-center gap-1">
                                                        <Clock size={14} /> 15 min read
                                                    </span>
                                                    <span className="d-flex align-items-center gap-1">
                                                        <User size={14} /> {selectedBook.category}
                                                    </span>
                                                </div>

                                                {/* Live reading session badge */}
                                                <div className="d-flex align-items-center gap-2 ms-auto">
                                                    <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-1.5 rounded-pill d-flex align-items-center gap-1.5">
                                                        <span className="spinner-grow spinner-grow-sm text-primary me-1" style={{ width: '8px', height: '8px' }} role="status"></span>
                                                        <span>Session: {formatSessionTimer(sessionSeconds)}</span>
                                                    </span>
                                                    <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-1.5 rounded-pill" title="Total accumulated reading time on this book">
                                                        Total: {totalTimeStr}
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                className="content-body text-body"
                                                dangerouslySetInnerHTML={{ __html: selectedBook.content }}
                                                style={{ lineHeight: '1.8', fontSize: '1.1rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3 border-top bg-light d-flex justify-content-between align-items-center gap-2">
                                        <button className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-none d-sm-block text-body border-0 bg-transparent" onClick={() => window.dispatchEvent(new CustomEvent('music-toggle'))}>
                                            <Music size={16} className="me-2" /> Soundscapes
                                        </button>

                                        <div className="d-flex align-items-center gap-2 ms-auto">
                                            <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={handleCloseReader}>
                                                Close
                                            </button>
                                            <button 
                                                className={`btn btn-sm rounded-pill px-4 d-flex align-items-center gap-2 ${
                                                    isCompleted ? 'btn-success' : 'btn-primary shadow-sm'
                                                }`} 
                                                onClick={handleFinishReading}
                                            >
                                                <CheckCircle size={16} />
                                                {isCompleted ? 'Marked Completed' : 'Finish Reading'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

export default Library;
