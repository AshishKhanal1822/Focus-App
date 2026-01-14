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
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const avatarUrl = localAvatar || user?.user_metadata?.avatar_url;
    const initials = user?.email ? user.email[0].toUpperCase() : 'U';

    useEffect(() => {
        const handleProfileUpdate = () => {
            setLocalAvatar(localStorage.getItem('user_avatar_local'));
        };

        // Listen to event bus for immediate updates
        eventBus.on('PROFILE_UPDATED', handleProfileUpdate);

        // Listen to storage for cross-tab updates
        window.addEventListener('storage', handleProfileUpdate);

        return () => {
            eventBus.off('PROFILE_UPDATED', handleProfileUpdate);
            window.removeEventListener('storage', handleProfileUpdate);
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        // Check initial user
        SupabaseAdapter.getUser()
            .then(u => {
                if (mounted) {
                    setUser(u);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("NavProfile init user check failed", err);
                if (mounted) setLoading(false);
            });

        // Listen to real auth changes
        let sub = null;
        try {
            const result = SupabaseAdapter.onAuthStateChange((_event, session) => {
                if (mounted) {
                    setUser(session?.user || null);
                    if (_event === 'SIGNED_IN') {
                        setIsOpen(false);
                    }
                }
            });
            if (result && result.data && result.data.subscription) {
                sub = result.data.subscription;
            } else if (result && result.unsubscribe) {
                sub = result;
            }
        } catch (error) {
            console.warn("NavProfile auth subscription error:", error);
        }

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

        const handleProfileUpdate = async () => {
            const u = await SupabaseAdapter.getUser();
            if (mounted) setUser(u);
        };

        eventBus.on('SHOW_LOGIN', handleShowLogin);
        eventBus.on('PROFILE_UPDATED', handleProfileUpdate);

        return () => {
            mounted = false;
            if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
            eventBus.off('SHOW_LOGIN', handleShowLogin);
            eventBus.off('PROFILE_UPDATED', handleProfileUpdate);
        };
    }, []);

    const handleLogout = async () => {
        try {
            // Close dropdown immediately
            setIsOpen(false);

            // Trigger signout
            await SupabaseAdapter.signOut();

            // Explicitly clear local state in case events are slow
            setUser(null);

            // Redirect to home and reload to ensure all agents/state are reset
            window.location.href = '/';
        } catch (error) {
            console.error("Logout failed:", error);
            // Fallback to home anyway
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
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                <div className="dropdown-menu show position-absolute end-0 mt-2 glass shadow-lg border-0 p-0 overflow-hidden" style={{ minWidth: '320px', right: 0, zIndex: 1050 }}>
                    <div className="p-2">
                        <div className="d-flex justify-content-between align-items-center mb-2 px-2 pt-2">
                            <h6 className="fw-bold mb-0">{user ? 'My Profile' : 'Login / Setup'}</h6>
                            <button className="btn-close btn-sm" onClick={() => setIsOpen(false)}></button>
                        </div>
                        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
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
