import { books as initialBooks } from '../data/books';
import { eventBus } from '../agents/core/EventBus.js';

const KEYS = {
    ADMIN_SESSION: 'focus_admin_session',
    CUSTOM_BOOKS: 'focus_custom_books',
    BOOK_SUGGESTIONS: 'focus_book_suggestions',
    USER_REVIEWS: 'focus_user_reviews',
    CONTACT_MESSAGES: 'focus_contact_messages',
};

// Initial default reviews
const defaultReviews = [
    {
        id: 'def-1',
        name: 'Sarah Johnson',
        role: 'Freelance Writer',
        review_text: 'Focus has completely changed my workflow. The distraction-free writing space is a game-changer for my productivity.',
        rating: 5,
        is_approved: true,
        likes: 12,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
        id: 'def-2',
        name: 'Michael Chen',
        role: 'Student',
        review_text: 'I love how organized I feel now. The Reading Mode helps me get through my assignments faster than ever before.',
        rating: 5,
        is_approved: true,
        likes: 9,
        created_at: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
        id: 'def-3',
        name: 'Elena Rodriguez',
        role: 'Project Manager',
        review_text: 'A sleek, modern interface that just works. The team collaboration features are exactly what we needed.',
        rating: 4,
        is_approved: true,
        likes: 15,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
        id: 'def-4',
        name: 'David Kim',
        role: 'Software Engineer',
        review_text: 'The best todo app I have used. Simple but powerful. The dark mode is easy on the eyes during late night coding sessions.',
        rating: 5,
        is_approved: true,
        likes: 7,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
        id: 'def-5',
        name: 'Lisa Patel',
        role: 'Designer',
        review_text: 'Beautifully designed. It is rare to find a productivity tool that actually looks good and inspires you to work.',
        rating: 5,
        is_approved: true,
        likes: 11,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString()
    }
];

class AdminStore {
    // --- ADMIN AUTH ---
    isAdminLoggedIn() {
        return localStorage.getItem(KEYS.ADMIN_SESSION) === 'true';
    }

    loginAdmin(username, password) {
        const normalizedUser = (username || '').trim().toLowerCase();
        if ((normalizedUser === 'focusadmin' || normalizedUser === 'focusadmin@focus.app') && password === 'adminfocus') {
            localStorage.setItem(KEYS.ADMIN_SESSION, 'true');
            eventBus.emit('ADMIN_AUTH_CHANGED', true);
            return true;
        }
        return false;
    }

    logoutAdmin() {
        localStorage.removeItem(KEYS.ADMIN_SESSION);
        eventBus.emit('ADMIN_AUTH_CHANGED', false);
    }

    // --- BOOKS MANAGEMENT ---
    getBooks() {
        try {
            const custom = JSON.parse(localStorage.getItem(KEYS.CUSTOM_BOOKS) || '[]');
            return [...custom, ...initialBooks];
        } catch (e) {
            return initialBooks;
        }
    }

    getCustomBooks() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.CUSTOM_BOOKS) || '[]');
        } catch (e) {
            return [];
        }
    }

    addBook(bookData) {
        try {
            const custom = this.getCustomBooks();
            const newBook = {
                id: 'custom-' + Date.now(),
                title: bookData.title,
                author: bookData.author || 'Focus Author',
                category: bookData.category || 'Productivity',
                image: bookData.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
                description: bookData.description || '',
                content: bookData.content ? bookData.content.replace(/\n/g, '<br/>') : '<p>No content provided.</p>',
                isCustom: true,
                created_at: new Date().toISOString()
            };
            custom.unshift(newBook);
            localStorage.setItem(KEYS.CUSTOM_BOOKS, JSON.stringify(custom));
            eventBus.emit('BOOKS_UPDATED', this.getBooks());
            return newBook;
        } catch (e) {
            console.error('Failed to add book', e);
            return null;
        }
    }

    deleteBook(bookId) {
        try {
            const custom = this.getCustomBooks().filter(b => b.id !== bookId);
            localStorage.setItem(KEYS.CUSTOM_BOOKS, JSON.stringify(custom));
            eventBus.emit('BOOKS_UPDATED', this.getBooks());
            return true;
        } catch (e) {
            return false;
        }
    }

    // --- BOOK SUGGESTIONS ---
    getSuggestions() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.BOOK_SUGGESTIONS) || '[]');
        } catch (e) {
            return [];
        }
    }

    addSuggestion(suggestion) {
        try {
            const suggestions = this.getSuggestions();
            const newItem = {
                id: 'sug-' + Date.now(),
                title: suggestion.title,
                author: suggestion.author || '',
                note: suggestion.note || '',
                status: 'pending',
                created_at: new Date().toISOString()
            };
            suggestions.unshift(newItem);
            localStorage.setItem(KEYS.BOOK_SUGGESTIONS, JSON.stringify(suggestions));
            eventBus.emit('SUGGESTIONS_UPDATED', suggestions);
            return newItem;
        } catch (e) {
            console.error('Failed to add suggestion', e);
            return null;
        }
    }

    deleteSuggestion(id) {
        try {
            const suggestions = this.getSuggestions().filter(s => s.id !== id);
            localStorage.setItem(KEYS.BOOK_SUGGESTIONS, JSON.stringify(suggestions));
            eventBus.emit('SUGGESTIONS_UPDATED', suggestions);
            return true;
        } catch (e) {
            return false;
        }
    }

    // --- USER REVIEWS & APPROVALS ---
    getReviews() {
        try {
            const customReviews = JSON.parse(localStorage.getItem(KEYS.USER_REVIEWS) || 'null');
            if (!customReviews) {
                localStorage.setItem(KEYS.USER_REVIEWS, JSON.stringify(defaultReviews));
                return defaultReviews;
            }
            return customReviews;
        } catch (e) {
            return defaultReviews;
        }
    }

    getApprovedReviews() {
        const reviews = this.getReviews();
        return reviews.filter(r => r.is_approved !== false);
    }

    addReview(reviewData) {
        try {
            const reviews = this.getReviews();
            const newReview = {
                id: 'rev-' + Date.now(),
                name: reviewData.name || 'Anonymous User',
                role: reviewData.role || 'Community Member',
                review_text: reviewData.review_text || reviewData.text || '',
                text: reviewData.review_text || reviewData.text || '',
                rating: Number(reviewData.rating) || 5,
                is_approved: false, // requires admin/user approval or like to show publicly
                likes: 0,
                created_at: new Date().toISOString()
            };
            reviews.unshift(newReview);
            localStorage.setItem(KEYS.USER_REVIEWS, JSON.stringify(reviews));
            eventBus.emit('REVIEWS_UPDATED', reviews);
            return newReview;
        } catch (e) {
            console.error('Failed to add review', e);
            return null;
        }
    }

    toggleApproveReview(id) {
        try {
            const reviews = this.getReviews().map(r => {
                if (r.id === id) {
                    return { ...r, is_approved: !r.is_approved };
                }
                return r;
            });
            localStorage.setItem(KEYS.USER_REVIEWS, JSON.stringify(reviews));
            eventBus.emit('REVIEWS_UPDATED', reviews);
            return true;
        } catch (e) {
            return false;
        }
    }

    likeReview(id) {
        try {
            const reviews = this.getReviews().map(r => {
                if (r.id === id) {
                    const newLikes = (r.likes || 0) + 1;
                    // Liking a review automatically allows it to show on pages
                    return { ...r, likes: newLikes, is_approved: true };
                }
                return r;
            });
            localStorage.setItem(KEYS.USER_REVIEWS, JSON.stringify(reviews));
            eventBus.emit('REVIEWS_UPDATED', reviews);
            return true;
        } catch (e) {
            return false;
        }
    }

    deleteReview(id) {
        try {
            const reviews = this.getReviews().filter(r => r.id !== id);
            localStorage.setItem(KEYS.USER_REVIEWS, JSON.stringify(reviews));
            eventBus.emit('REVIEWS_UPDATED', reviews);
            return true;
        } catch (e) {
            return false;
        }
    }

    // --- CONTACT MESSAGES ---
    getContactMessages() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.CONTACT_MESSAGES) || '[]');
        } catch (e) {
            return [];
        }
    }

    addContactMessage(msgData) {
        try {
            const messages = this.getContactMessages();
            const newMsg = {
                id: 'msg-' + Date.now(),
                name: msgData.name,
                email: msgData.email,
                message: msgData.message,
                read: false,
                created_at: new Date().toISOString()
            };
            messages.unshift(newMsg);
            localStorage.setItem(KEYS.CONTACT_MESSAGES, JSON.stringify(messages));
            eventBus.emit('CONTACT_MESSAGES_UPDATED', messages);
            return newMsg;
        } catch (e) {
            console.error('Failed to add contact message', e);
            return null;
        }
    }

    toggleReadMessage(id) {
        try {
            const messages = this.getContactMessages().map(m => {
                if (m.id === id) {
                    return { ...m, read: !m.read };
                }
                return m;
            });
            localStorage.setItem(KEYS.CONTACT_MESSAGES, JSON.stringify(messages));
            eventBus.emit('CONTACT_MESSAGES_UPDATED', messages);
            return true;
        } catch (e) {
            return false;
        }
    }

    deleteContactMessage(id) {
        try {
            const messages = this.getContactMessages().filter(m => m.id !== id);
            localStorage.setItem(KEYS.CONTACT_MESSAGES, JSON.stringify(messages));
            eventBus.emit('CONTACT_MESSAGES_UPDATED', messages);
            return true;
        } catch (e) {
            return false;
        }
    }
}

export default new AdminStore();
