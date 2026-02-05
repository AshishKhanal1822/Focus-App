// src/components/NavProfile.jsx
import React, { useState, useEffect, useRef } from 'react';
import SupabaseAdapter from '../agents/adapters/SupabaseAdapter.js';
import Profile from './Profile.jsx';
import { useNavigate } from 'react-router-dom';
import { eventBus } from '../agents/core/EventBus.js';

export default function NavProfile() {
    const [user, setUser] = useState(SupabaseAdapter.cachedUser);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(!SupabaseAdapter.cachedUser);
    const [localAvatar, setLocalAvatar] = useState(localStorage.getItem('user_avatar_local'));
    const [imgError, setImgError] = useState(false);
    const dropdownRef = useRef(null);
    const previousUserRef = useRef(user);
    const navigate = useNavigate();

    // Authoritative derived state
    const avatarUrl = user?.user_metadata?.avatar_url || localStorage.getItem('user_avatar_local');
    const initials = user?.email ? user.email[0].toUpperCase() : 'U';

    useEffect(() => {
        // Authoritative cross-component user sync
        const unsubscribe = SupabaseAdapter.subscribe((enrichedUser) => {
            setUser(enrichedUser);
            setLoading(false);
            setImgError(false); // Reset error when user changes
            if (enrichedUser) {
                // Keep local storage manual fallback in sync too for first-load speed
                const cloudUrl = enrichedUser.user_metadata?.avatar_url;
                if (cloudUrl && typeof cloudUrl === 'string' && cloudUrl.startsWith('http')) {
                    localStorage.setItem('user_avatar_local', cloudUrl);
                }

                // Only close dropdown on initial login transition (null -> user)
                if (!previousUserRef.current) {
                    setIsOpen(false);
                }
            }
            previousUserRef.current = enrichedUser;
        });

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        // Listen for external trigger to show login
        const handleShowLogin = () => {
            setIsOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        eventBus.on('SHOW_LOGIN', handleShowLogin);

        return () => {
            unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
            eventBus.off('SHOW_LOGIN', handleShowLogin);
        };
    }, []);

    const handleLogout = async () => {
        try {
            console.log("Logout triggered in NavProfile...");
            // Close dropdown immediately
            setIsOpen(false);

            // Trigger signout - this now handles its own internal timeouts and clearing
            await SupabaseAdapter.signOut();

            // Explicitly clear local state in case events are slow
            setUser(null);
            setLocalAvatar(null);

            // Yield briefly to let any listener state settle
            setTimeout(() => {
                window.location.href = '/';
            }, 100);
        } catch (error) {
            console.error("Logout error in NavProfile:", error);
            window.location.href = '/';
        }
    };

    if (loading) return <div className="ms-3" style={{ width: '38px' }}></div>;

    return (
        <div className="dropdown ms-3 position-relative" ref={dropdownRef}>
            {/* Trigger: Login Button or Avatar */}
            {!user ? (
                <button
                    className="btn btn-sm btn-primary ms-3 rounded-pill px-3"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    Login
                </button>
            ) : (
                <div
                    className="d-flex align-items-center text-decoration-none dropdown-toggle-split cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ cursor: 'pointer' }}
                >
                    <div
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center overflow-hidden border border-2 border-white"
                        style={{ width: '38px', height: '38px' }}
                    >
                        {avatarUrl && !imgError ? (
                            <img
                                src={avatarUrl}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                fetchpriority="high"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <span className="small text-white text-uppercase fw-bold">
                                {initials}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Dropdown Content */}
            {isOpen && (
                <div
                    className="dropdown-menu show position-absolute end-0 mt-2 glass shadow-lg border-0 p-0 overflow-hidden"
                    style={{
                        minWidth: 'min(90vw, 350px)',
                        right: 0,
                        zIndex: 1100
                    }}
                >
                    <div className="p-2">
                        <div className="d-flex justify-content-between align-items-center mb-2 px-2 pt-2">
                            <h6 className="fw-bold mb-0">{user ? 'My Profile' : 'Login / Setup'}</h6>
                            <button
                                className="btn-close btn-sm"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close profile menu"
                            ></button>
                        </div>
                        <div style={{ maxHeight: 'min(70vh, 500px)', overflowY: 'auto' }}>
                            <Profile initialUser={user} />
                            {user && (
                                <div className="p-2 border-top border-light mt-2">
                                    <button
                                        className="btn btn-sm btn-outline-danger w-100"
                                        onClick={handleLogout}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
