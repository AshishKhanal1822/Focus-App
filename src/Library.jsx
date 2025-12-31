import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Filter, Bookmark, Download, ExternalLink, X, Clock, User } from 'lucide-react';

const books = [
    {
        title: 'The Art of Focus',
        author: 'Elena Thorne',
        category: 'Productivity',
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Master the science of attention in a distractable world.',
        content: `
            <h2>The Myth of Multitasking</h2>
            <p>In a world that constantly demands our attention, the ability to focus is a superpower. We are often led to believe that doing more things at once means being more productive. However, research suggests the exact opposite.</p>
            <p><strong>Multitasking is a lie.</strong> When you think you are multitasking, you are actually task-switching rapidly. This switching comes with a cognitive cost—often referred to as 'attention residue'. Whenever you switch from Task A to Task B, your attention doesn't immediately follow—a residue of your attention remains stuck thinking about the original task.</p>
            <h3>Strategies for Deep Focus</h3>
            <ul>
                <li><strong>Eliminate Distractions:</strong> Turn off notifications. Put your phone in another room. Create a sanctuary for your mind.</li>
                <li><strong>Time Blocking:</strong> Dedicate specific blocks of time to deep work. 90 minutes is often cited as an optimal duration.</li>
                <li><strong>Restorative Breaks:</strong> Your brain needs downtime. Go for a walk without your phone. Let your mind wander.</li>
            </ul>
            <p>True productivity is not about how much you do, but how well you do it. Quality requires focus. And focus requires saying 'no' to the good so you can say 'yes' to the great.</p>
        `
    },
    {
        title: 'Deep Writing',
        author: 'Marcus J. Pen',
        category: 'Writing',
        image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Unleashing your best words through immersion and flow.',
        content: `
            <h2>Enter the Flow State</h2>
            <p>Writing is more than just putting words on a page; it is an act of translation. You are translating abstract thoughts and feelings into concrete symbols that others can understand. To do this effectively, one must enter a state of flow.</p>
            <p>Flow is that magical zone where time seems to vanish. The world outside falls away, and there is only you and the page. But how do we summon this state?</p>
            <h3>Rituals of the Greats</h3>
            <p>Many famous writers had strict rituals. Hemingway wrote standing up. Maya Angelou rented a hotel room to write in. These weren't superstitions; they were triggers. They signaled to the brain that it was time to work.</p>
            <p>Start by creating your own ritual. Maybe it's a cup of tea, a specific playlist, or five minutes of meditation before you start. Consistency is key.</p>
        `
    },
    {
        title: 'Silent Wisdom',
        author: 'Sophia Chen',
        category: 'Mindfulness',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Finding clarity in the noise of modern life.',
        content: `
            <h2>The Power of Silence</h2>
            <p>We live in a noisy world. External noise—traffic, notifications, conversations—is constant. But internal noise—worry, planning, regretting—is often even louder.</p>
            <p>Silence is not just the absence of sound; it is the presence of awareness. When we stop talking and stop doing, we start being.</p>
            <h3>Practicing Stillness</h3>
            <p>You don't need to retreat to a mountain cave to find silence. You can find it in the gap between breaths. You can find it in the pause between thoughts.</p>
            <p>Try this: Sit comfortably for just two minutes. Close your eyes. Listen to the furthest sound you can hear. Then the nearest. Then listen to the sound of your own breath. In that listening, there is peace.</p>
        `
    },
    {
        title: 'The Creative Spark',
        author: 'Leo Aris',
        category: 'Creativity',
        image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Igniting invention when you need it most.',
        content: `
            <h2>Creativity is a Muscle</h2>
            <p>Many believe creativity is a talent you are born with. This is false. Creativity is a muscle that can be strengthened with exercise.</p>
            <p>The more you create, the more creative you become. The fear of "running out of ideas" is unfounded. Ideas breed ideas.</p>
            <h3>The Combinatorial Nature of Creativity</h3>
            <p>Nothing is original. All creative work is building on what came before. As Steve Jobs said, "Creativity is just connecting things."</p>
            <p>To be more creative, broaden your inputs. Read widely. Travel. Talk to people different from you. The more dots you have to connect, the more interesting your connections will be.</p>
        `
    },
    {
        title: 'Atomic Progress',
        author: 'James Clear-ish',
        category: 'Self-Growth',
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Small changes that lead to massive results.',
        content: `
            <h2>The 1% Rule</h2>
            <p>If you get 1% better every day for a year, you will end up thirty-seven times better by the time you are done. This is the power of compound interest applied to self-improvement.</p>
            <p>We often overestimate what we can do in a day and underestimate what we can do in a year. Forget about massive overnight success. Focus on the small, daily wins.</p>
            <h3>Systems vs. Goals</h3>
            <p>Goals are about the results you want to achieve. Systems are about the processes that lead to those results. Winners and losers have the same goals. The difference is in their systems.</p>
        `
    },
    {
        title: 'Digital Minimalism',
        author: 'Cal Newport',
        category: 'Technology',
        image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Reclaiming your life from your devices.',
        content: `
            <h2>The Attention Economy</h2>
            <p>Tech companies are not building tools for you to use; they are building slot machines to use you. Their goal is to capture your attention and sell it to advertisers.</p>
            <p>Digital minimalism is a philosophy that helps you question what digital tools add value to your life. It's about being intentional with your technology use.</p>
            <h3>Reclaiming Leisure</h3>
            <p>We have forgotten how to be bored. Boredom is the breeding ground for ideas. When we fill every spare moment with scrolling, we rob ourselves of the opportunity to think.</p>
        `
    },
    {
        title: 'Stoic Mindset',
        author: 'Marcus Aurelius',
        category: 'Philosophy',
        image: 'https://images.unsplash.com/photo-1595150893047-97d3aa002a28?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Ancient wisdom for modern resilience.',
        content: `
            <h2>The Dichotomy of Control</h2>
            <p>The core of Stoicism is understanding what is in your control and what is not. You control your thoughts, your actions, and your character. You do not control external events, other people's opinions, or the past.</p>
            <p>Suffering arises when we try to control the uncontrollable. Peace is found in accepting what is, and doing our best with what we have.</p>
            <h3>Amor Fati</h3>
            <p>Love your fate. Don't just bear what happens to you—love it. Everything that happens is fuel for your growth. The obstacle is the way.</p>
        `
    },
    {
        title: 'Code Craft',
        author: 'Robert C. Martin',
        category: 'Technology',
        image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Writing code that humans can understand.',
        content: `
            <h2>Clean Code</h2>
            <p>Code is read far more often than it is written. Therefore, clarity is the most important attribute of code. A clever one-liner that no one understands is a liability, not an asset.</p>
            <h3>Naming Matters</h3>
            <p>Choosing good names is 90% of programming. A variable named 'd' tells you nothing. A variable named 'daysSinceCreation' tells you a story. Take the time to name things well.</p>
            <p>Leave the campground cleaner than you found it. Every time you touch a file, try to improve it slightly. Over time, this leads to a healthy, maintainable codebase.</p>
        `
    },
    {
        title: 'The Sleep Revolution',
        author: 'Arianna Huffington',
        category: 'Health',
        image: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
        description: 'Transforming your life, one night at a time.',
        content: `
            <h2>Sleep is Not Optional</h2>
            <p>We wear sleep deprivation as a badge of honor. "I'll sleep when I'm dead," we say. But the truth is, if you don't sleep, you'll get there faster.</p>
            <p>Sleep is when your body repairs itself and your brain consolidates memories. It is the foundation of health, happiness, and productivity.</p>
            <h3>Sleep Hygiene</h3>
            <p>Keep your bedroom cool and dark. Avoid screens for an hour before bed. Create a routine that signals to your body that it is time to rest.</p>
        `
    }
];

function Library() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedBook, setSelectedBook] = useState(null);
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);

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
                        <div className="card glass h-100 overflow-hidden border-0 hover-lift">
                            <div className="position-relative overflow-hidden" style={{ height: '220px' }}>
                                <img
                                    src={book.image}
                                    alt={book.title}
                                    className="w-100 h-100 object-fit-cover transition-transform hover-scale"
                                />
                                <div className="position-absolute top-0 end-0 m-3">
                                    <span className="badge bg-primary rounded-pill px-3 py-2 shadow">{book.category}</span>
                                </div>
                                <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-gradient-to-t from-black to-transparent" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>

                                </div>
                            </div>
                            <div className="card-body p-4 d-flex flex-column">
                                <h5 className="fw-bold mb-1">{book.title}</h5>
                                <p className="small text-muted mb-3">by {book.author}</p>
                                <p className="small opacity-75 mb-4 flex-grow-1">{book.description}</p>
                                <div className="d-flex gap-2 mt-auto">
                                    <button
                                        className="btn btn-sm btn-outline-primary flex-grow-1 rounded-3 d-flex align-items-center justify-content-center gap-2"
                                        onClick={() => setSelectedBook(book)}
                                    >
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
                    <div className="position-relative">
                        <AnimatePresence>
                            {showSuggestModal && (
                                <>
                                    <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1040 }} onClick={() => setShowSuggestModal(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="position-absolute bottom-100 start-50 translate-middle-x mb-2 bg-white p-4 rounded-4 shadow-lg"
                                        style={{ zIndex: 1050, width: '90vw', maxWidth: '400px' }}
                                    >
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                            <h5 className="fw-bold mb-0">Suggest a Resource</h5>
                                            <button className="btn btn-light rounded-circle p-2 btn-sm" onClick={() => setShowSuggestModal(false)}><X size={16} /></button>
                                        </div>
                                        <form onSubmit={(e) => { e.preventDefault(); setShowSuggestModal(false); alert('Thank you for your suggestion!'); }}>
                                            <div className="mb-2">
                                                <label className="form-label small fw-bold">Title</label>
                                                <input type="text" className="form-control form-control-sm" required />
                                            </div>
                                            <div className="mb-2">
                                                <label className="form-label small fw-bold">Author</label>
                                                <input type="text" className="form-control form-control-sm" />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label small fw-bold">Note</label>
                                                <textarea className="form-control form-control-sm" rows="2"></textarea>
                                            </div>
                                            <button type="submit" className="btn btn-primary w-100 rounded-pill btn-sm">Submit</button>
                                        </form>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                        <button
                            className="btn btn-primary px-4 py-2 rounded-3 d-flex align-items-center gap-2"
                            onClick={() => setShowSuggestModal(!showSuggestModal)}
                        >
                            Suggest Resource <ExternalLink size={18} />
                        </button>
                    </div>

                    <div className="position-relative">
                        <AnimatePresence>
                            {showDownloadModal && (
                                <>
                                    <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1040 }} onClick={() => setShowDownloadModal(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="position-absolute bottom-100 start-50 translate-middle-x mb-2 bg-white p-4 rounded-4 shadow-lg text-center"
                                        style={{ zIndex: 1050, width: '300px' }}
                                    >
                                        <div className="mb-3">
                                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-inline-block text-primary mb-2">
                                                <Download size={24} />
                                            </div>
                                            <h6 className="fw-bold">Download Catalog</h6>
                                        </div>
                                        <div className="d-grid gap-2">
                                            <button className="btn btn-outline-primary btn-sm rounded-3" onClick={() => { alert('Downloading PDF...'); setShowDownloadModal(false); }}>
                                                PDF (2.4 MB)
                                            </button>
                                            <button className="btn btn-outline-primary btn-sm rounded-3" onClick={() => { alert('Downloading CSV...'); setShowDownloadModal(false); }}>
                                                CSV (150 KB)
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                        <button
                            className="btn btn-outline-secondary px-4 py-2 rounded-3 d-flex align-items-center gap-2 border-2"
                            onClick={() => setShowDownloadModal(!showDownloadModal)}
                        >
                            Download Catalog <Download size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reader Modal */}
            <AnimatePresence>
                {selectedBook && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
                        style={{ zIndex: 1050, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
                        onClick={() => setSelectedBook(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-4 overflow-hidden shadow-lg w-100"
                            style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                                        <BookOpen size={24} />
                                    </div>
                                    <div>
                                        <h5 className="mb-0 fw-bold">{selectedBook.title}</h5>
                                        <small className="text-muted">by {selectedBook.author}</small>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-light rounded-circle p-2"
                                    onClick={() => setSelectedBook(null)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-auto p-4 p-md-5" style={{ background: '#f8fafc' }}>
                                <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm mx-auto" style={{ maxWidth: '700px' }}>
                                    <div className="d-flex align-items-center gap-3 text-muted mb-4 small">
                                        <span className="d-flex align-items-center gap-1"><Clock size={14} /> 5 min read</span>
                                        <span className="d-flex align-items-center gap-1"><User size={14} /> {selectedBook.category}</span>
                                    </div>
                                    <div
                                        className="content-body"
                                        dangerouslySetInnerHTML={{ __html: selectedBook.content }}
                                        style={{ lineHeight: '1.8', fontSize: '1.1rem' }}
                                    />

                                    <div className="mt-5 pt-4 border-top">
                                        <p className="small text-muted text-center fst-italic">
                                            This is a snippet from the full book. To read more, please purchase the full copy or visit your local library.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 border-top bg-white d-flex justify-content-between align-items-center">
                                <button className="btn btn-light btn-sm rounded-pill px-3">
                                    <Bookmark size={16} className="me-2" /> Save for later
                                </button>
                                <button className="btn btn-primary btn-sm rounded-pill px-4" onClick={() => setSelectedBook(null)}>
                                    Finish Reading
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


        </div>
    );
}

export default Library;
