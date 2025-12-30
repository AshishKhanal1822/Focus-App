import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Filter, Bookmark, Download, ExternalLink } from 'lucide-react';

const books = [
    {
        title: 'The Art of Focus',
        author: 'Elena Thorne',
        category: 'Productivity',
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Master the science of attention in a distractable world.'
    },
    {
        title: 'Deep Writing',
        author: 'Marcus J. Pen',
        category: 'Writing',
        image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Unleashing your best words through immersion and flow.'
    },
    {
        title: 'Silent Wisdom',
        author: 'Sophia Chen',
        category: 'Mindfulness',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Finding clarity in the noise of modern life.'
    },
    {
        title: 'The Creative Spark',
        author: 'Leo Aris',
        category: 'Creativity',
        image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Igniting invention when you need it most.'
    },
    {
        title: 'Atomic Progress',
        author: 'James Clear-ish',
        category: 'Self-Growth',
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Small changes that lead to massive results.'
    },
    {
        title: 'Digital Minimalism',
        author: 'Carl Newport',
        category: 'Technology',
        image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Reclaiming your life from your devices.'
    }
];

function Library() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', ...new Set(books.map(b => b.category))];

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'All' || book.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="container py-5">
            <div className="row mb-5 align-items-center">
                <div className="col-lg-6">
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="display-4 fw-bold mb-3"
                    >
                        Immersive <span className="text-primary">Library</span>
                    </motion.h1>
                    <p className="lead opacity-75">Curated resources to deepen your understanding and sharpen your mind.</p>
                </div>
                <div className="col-lg-6">
                    <div className="d-flex gap-3">
                        <div className="input-group glass rounded-pill px-3 py-1 flex-grow-1">
                            <span className="input-group-text bg-transparent border-0 text-muted">
                                <Search size={18} />
                            </span>
                            <input
                                type="text"
                                className="form-control bg-transparent border-0 py-2 shadow-none"
                                placeholder="Search collection..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2">
                            <Filter size={18} /> Filter
                        </button>
                    </div>
                </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-5">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`btn btn-sm rounded-pill px-4 py-2 ${activeCategory === cat ? 'btn-primary' : 'btn-light glass text-current'}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="row g-4">
                {filteredBooks.map((book, index) => (
                    <motion.div
                        key={index}
                        className="col-md-6 col-lg-4"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                        <div className="card glass h-100 overflow-hidden border-0">
                            <div className="position-relative overflow-hidden" style={{ height: '200px' }}>
                                <img
                                    src={book.image}
                                    alt={book.title}
                                    className="w-100 h-100 object-fit-cover transition-transform hover-scale"
                                />
                                <div className="position-absolute top-0 end-0 m-3">
                                    <span className="badge bg-primary rounded-pill px-3 py-2 shadow">{book.category}</span>
                                </div>
                            </div>
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-1">{book.title}</h5>
                                <p className="small text-muted mb-3 flex-grow-1">by {book.author}</p>
                                <p className="small opacity-75 mb-4">{book.description}</p>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-sm btn-outline-primary flex-grow-1 rounded-3 d-flex align-items-center justify-content-center gap-2">
                                        <BookOpen size={16} /> Read Now
                                    </button>
                                    <button className="btn btn-sm btn-light glass text-current rounded-3">
                                        <Bookmark size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredBooks.length === 0 && (
                <div className="text-center py-5 opacity-50">
                    <BookOpen size={48} className="mb-3" />
                    <h4>No results found for "{searchTerm}"</h4>
                    <p>Try searching for something else or clearing your filters.</p>
                    <button className="btn btn-link" onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}>
                        Clear all filters
                    </button>
                </div>
            )}

            <div className="mt-5 p-5 glass rounded-4 text-center">
                <h3 className="fw-bold mb-3">Cant find what you're looking for?</h3>
                <p className="opacity-75 mb-4">Suggest a book or article to be added to our immersive library collection.</p>
                <div className="d-flex justify-content-center gap-3">
                    <button className="btn btn-primary px-4 py-2 rounded-3 d-flex align-items-center gap-2">
                        Suggest Resource <ExternalLink size={18} />
                    </button>
                    <button className="btn btn-outline-secondary px-4 py-2 rounded-3 d-flex align-items-center gap-2 border-2">
                        Download Catalog <Download size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Library;
