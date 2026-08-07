import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Plus, Trash2, CheckCircle2, XCircle, Heart,
    MessageSquare, Mail, Lightbulb, Shield, LogOut, ArrowRight,
    Star, Search, Sparkles, Check, Users, Activity, UserPlus,
    ShieldAlert, BarChart3, Database, HardDrive, Cpu, Clock, RefreshCw
} from 'lucide-react';
import adminStore from './utils/adminStore';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import { useNavigate } from 'react-router-dom';

const categories = ['Productivity', 'Mindfulness', 'Writing', 'Creativity', 'Self-Growth', 'Technology', 'Philosophy'];

export default function Admin() {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(adminStore.isAdminLoggedIn());
    const [activeTab, setActiveTab] = useState('analytics');

    // Real-time analytics state
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState({
        totalUsers: 0,
        activeUsersToday: 0,
        newRegistrationsWeek: 0,
        retentionRate: 0,
        dbStatus: 'checking',
        storageUsed: null,
        activeSessions: 0,
        responseTime: null,
        failedLogins: 0,
    });
    const [aiInsights, setAiInsights] = useState([]);
    const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
    const [userProfiles, setUserProfiles] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [lastActivityMap, setLastActivityMap] = useState({});
    const [inactivityFilter, setInactivityFilter] = useState('all');
    const [deletingUserId, setDeletingUserId] = useState(null);

    const fetchAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        const client = SupabaseAdapter.getClient();
        if (!client) {
            setAnalyticsData(prev => ({ ...prev, dbStatus: 'offline' }));
            setAnalyticsLoading(false);
            return;
        }

        try {
            const start = Date.now();

            // Parallel queries for efficiency
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

            const [
                profilesResult,
                todayStatsResult,
                weekStatsResult,
                allStatsResult,
                connectionTest,
            ] = await Promise.allSettled([
                // Total users: use RPC function to bypass RLS, fallback to direct query
                client.rpc('get_all_profiles'),
                // Active today: users who have a stats entry for today
                client.from('user_daily_stats').select('user_id', { count: 'exact' }).eq('date', today),
                // New registrations this week
                client.from('profiles').select('id', { count: 'exact' }).gte('updated_at', weekAgo + 'T00:00:00'),
                // All time stats for insights
                client.from('user_daily_stats').select('user_id, focus_time_seconds, focus_sessions_completed, writing_time_seconds, screen_time_seconds, date').order('date', { ascending: false }).limit(500),
                // Connection test
                client.from('profiles').select('id').limit(1),
            ]);

            const responseTime = Date.now() - start;

            // Extract profiles: RPC returns data array directly, or fallback to direct query
            let profileRows = [];
            let totalUsers = 0;
            if (profilesResult.status === 'fulfilled' && !profilesResult.value.error && profilesResult.value.data) {
                profileRows = profilesResult.value.data;
                totalUsers = profileRows.length;
            } else {
                // RPC function might not exist yet — fallback to direct table query (RLS-limited)
                console.warn('RPC get_all_profiles failed or not found, falling back to direct query:', profilesResult.value?.error?.message);
                const fallback = await client.from('profiles').select('id, updated_at, full_name, email, avatar_url', { count: 'exact' });
                if (!fallback.error) {
                    profileRows = fallback.data || [];
                    totalUsers = fallback.count || profileRows.length;
                }
            }
            setUserProfiles(profileRows);

            // Build last-activity map from user_daily_stats
            const activityMap = {};
            const allStats = allStatsResult.status === 'fulfilled' ? (allStatsResult.value.data || []) : [];
            allStats.forEach(s => {
                if (!activityMap[s.user_id] || s.date > activityMap[s.user_id]) {
                    activityMap[s.user_id] = s.date;
                }
            });
            setLastActivityMap(activityMap);

            const activeUsersToday = todayStatsResult.status === 'fulfilled' ? (todayStatsResult.value.count || 0) : 0;
            const newRegistrationsWeek = weekStatsResult.status === 'fulfilled' ? (weekStatsResult.value.count || 0) : 0;
            const dbOnline = connectionTest.status === 'fulfilled' && !connectionTest.value.error;

            // Calculate retention: users who were active last week / total users
            const lastWeekActiveSet = new Set(
                allStats
                    .filter(s => s.date >= weekAgo && s.date < today)
                    .map(s => s.user_id)
            );
            const retentionRate = totalUsers > 0
                ? Math.round((lastWeekActiveSet.size / totalUsers) * 100)
                : 0;

            // Generate real AI insights from actual data
            const totalFocusSeconds = allStats.reduce((acc, s) => acc + (s.focus_time_seconds || 0), 0);
            const totalSessions = allStats.reduce((acc, s) => acc + (s.focus_sessions_completed || 0), 0);
            const avgFocusMinutes = totalSessions > 0 ? Math.round((totalFocusSeconds / 60) / totalSessions) : 0;
            const writersCount = new Set(allStats.filter(s => s.writing_time_seconds > 60).map(s => s.user_id)).size;
            const writingPct = totalUsers > 0 ? Math.round((writersCount / totalUsers) * 100) : 0;

            // Week-over-week active user comparison
            const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
            const prevWeekActiveSet = new Set(
                allStats.filter(s => s.date >= twoWeeksAgo && s.date < weekAgo).map(s => s.user_id)
            );
            const wowChange = prevWeekActiveSet.size > 0
                ? Math.round(((lastWeekActiveSet.size - prevWeekActiveSet.size) / prevWeekActiveSet.size) * 100)
                : null;

            const generatedInsights = [];
            if (wowChange !== null) {
                generatedInsights.push(
                    wowChange >= 0
                        ? `User activity increased by ${wowChange}% compared to the previous week (${lastWeekActiveSet.size} vs ${prevWeekActiveSet.size} active users).`
                        : `User activity decreased by ${Math.abs(wowChange)}% compared to the previous week.`
                );
            }
            if (avgFocusMinutes > 0) {
                generatedInsights.push(
                    `Average focus session length is ${avgFocusMinutes} minutes. ${avgFocusMinutes >= 20 && avgFocusMinutes <= 30 ? '25-minute sessions remain most popular.' : avgFocusMinutes > 30 ? 'Users prefer longer, deeper work sessions.' : 'Short burst sessions are trending.'}`
                );
            }
            if (writingPct > 0) {
                generatedInsights.push(`${writingPct}% of users actively use the Writing Workspace feature.`);
            }
            if (retentionRate > 0) {
                generatedInsights.push(
                    retentionRate >= 60
                        ? `User retention is strong at ${retentionRate}%. Most users are returning regularly.`
                        : `User retention is at ${retentionRate}%. Consider adding engagement prompts or push notifications.`
                );
            }
            if (newRegistrationsWeek > 0) {
                generatedInsights.push(`${newRegistrationsWeek} new users registered this week${totalUsers > 0 ? `, representing ${Math.round((newRegistrationsWeek / totalUsers) * 100)}% growth` : ''}.`);
            }
            if (generatedInsights.length === 0) {
                generatedInsights.push('Not enough data yet to generate insights. Insights will appear as users interact with the app.');
            }

            setAnalyticsData({
                totalUsers,
                activeUsersToday,
                newRegistrationsWeek,
                retentionRate,
                dbStatus: dbOnline ? 'online' : 'error',
                storageUsed: null, // Supabase storage API requires service role key
                activeSessions: lastWeekActiveSet.size,
                responseTime,
                failedLogins: 0, // Not accessible without server-side auth logs
            });
            setAiInsights(generatedInsights);
        } catch (e) {
            console.error('Analytics fetch error:', e);
            setAnalyticsData(prev => ({ ...prev, dbStatus: 'error' }));
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    const handleRefreshInsights = async () => {
        setIsRefreshingInsights(true);
        await fetchAnalytics();
        setIsRefreshingInsights(false);
    };

    // Delete a user profile via RPC with direct delete fallback
    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${userName || 'this user'}"? This action cannot be undone.`)) return;
        setDeletingUserId(userId);
        try {
            const client = SupabaseAdapter.getClient();
            if (!client) return;

            let { error } = await client.rpc('delete_user_profile', { target_user_id: userId });
            
            // If RPC is missing or fails, attempt direct delete fallback
            if (error) {
                console.warn('RPC delete_user_profile failed, attempting direct table deletion:', error.message);
                await client.from('user_daily_stats').delete().eq('user_id', userId);
                const directRes = await client.from('profiles').delete().eq('id', userId);
                error = directRes.error;
            }

            if (error) {
                console.error('Delete user error:', error);
                alert(`Failed to delete user: ${error.message}`);
            } else {
                setUserProfiles(prev => prev.filter(u => u.id !== userId));
            }
        } catch (e) {
            console.error('Delete user exception:', e);
            alert('Failed to delete user. Check console for details.');
        } finally {
            setDeletingUserId(null);
        }
    };

    // Helper: calculate inactivity from last activity or updated_at date
    const getInactivity = (userOrId) => {
        const userId = typeof userOrId === 'object' ? userOrId?.id : userOrId;
        const updatedDate = typeof userOrId === 'object' ? userOrId?.updated_at : null;
        const lastDate = lastActivityMap[userId] || updatedDate;
        
        if (!lastDate) return { label: 'Never active', days: Infinity, color: 'secondary' };
        const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
        if (days <= 0) return { label: 'Active today', days: 0, color: 'success' };
        if (days <= 7) return { label: `${days}d ago`, days, color: 'success' };
        if (days <= 30) return { label: `${Math.floor(days / 7)}w ago`, days, color: 'warning' };
        if (days <= 365) return { label: `${Math.floor(days / 30)}mo ago`, days, color: 'danger' };
        return { label: `${Math.floor(days / 365)}y ago`, days, color: 'danger' };
    };

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
            fetchAnalytics();
        }
    }, [fetchAnalytics]);

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
                    className={`btn rounded-pill px-4 py-2 text-nowrap d-flex align-items-center gap-2 ${activeTab === 'analytics' ? 'btn-primary' : 'btn-light border'}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    <BarChart3 size={18} /> Overview
                </button>
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

            {/* TAB 0: OVERVIEW & ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="animate-fade-in">
                    {/* Header Summary */}
                    <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div>
                            <h2 className="fw-bold fs-4 mb-0">Platform Overview & Telemetry</h2>
                            <p className="small text-muted mb-0">Live stats, system health diagnostics, and behavioral AI Insights.</p>
                        </div>
                        {analyticsLoading && (
                            <div className="d-flex align-items-center gap-2 text-muted small">
                                <div className="spinner-border spinner-border-sm" role="status"><span className="visually-hidden">Loading...</span></div>
                                Fetching live data...
                            </div>
                        )}
                    </div>

                    {/* Key Metrics Row */}
                    <div className="row g-4 mb-4">
                        <div className="col-md-6 col-lg-3">
                            <div className="card glass border-0 rounded-4 p-4 h-100 position-relative overflow-hidden">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="small text-muted fw-semibold uppercase tracking-wider">Total Users</span>
                                    <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                                        <Users size={20} />
                                    </div>
                                </div>
                                {analyticsLoading ? (
                                    <div className="placeholder-glow"><span className="placeholder col-6 rounded-3" style={{ height: '2.5rem' }}></span></div>
                                ) : (
                                    <h3 className="display-6 fw-bold mb-1">{analyticsData.totalUsers.toLocaleString()}</h3>
                                )}
                                <p className="small text-muted mb-0">All registered accounts</p>
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <div className="card glass border-0 rounded-4 p-4 h-100 position-relative overflow-hidden">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="small text-muted fw-semibold uppercase tracking-wider">Active Users Today</span>
                                    <div className="p-2 rounded-circle bg-success bg-opacity-10 text-success">
                                        <Activity size={20} />
                                    </div>
                                </div>
                                {analyticsLoading ? (
                                    <div className="placeholder-glow"><span className="placeholder col-6 rounded-3" style={{ height: '2.5rem' }}></span></div>
                                ) : (
                                    <h3 className="display-6 fw-bold mb-1">{analyticsData.activeUsersToday.toLocaleString()}</h3>
                                )}
                                <p className="small text-muted mb-0">Sessions recorded today</p>
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <div className="card glass border-0 rounded-4 p-4 h-100 position-relative overflow-hidden">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="small text-muted fw-semibold uppercase tracking-wider">New Registrations</span>
                                    <div className="p-2 rounded-circle bg-info bg-opacity-10 text-info">
                                        <UserPlus size={20} />
                                    </div>
                                </div>
                                {analyticsLoading ? (
                                    <div className="placeholder-glow"><span className="placeholder col-6 rounded-3" style={{ height: '2.5rem' }}></span></div>
                                ) : (
                                    <h3 className="display-6 fw-bold mb-1">{analyticsData.newRegistrationsWeek.toLocaleString()}</h3>
                                )}
                                <p className="small text-muted mb-0">Registered this week</p>
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <div className="card glass border-0 rounded-4 p-4 h-100 position-relative overflow-hidden">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="small text-muted fw-semibold uppercase tracking-wider">User Retention</span>
                                    <div className="p-2 rounded-circle bg-warning bg-opacity-10 text-warning">
                                        <BarChart3 size={20} />
                                    </div>
                                </div>
                                {analyticsLoading ? (
                                    <div className="placeholder-glow"><span className="placeholder col-6 rounded-3" style={{ height: '2.5rem' }}></span></div>
                                ) : (
                                    <h3 className="display-6 fw-bold mb-1">{analyticsData.retentionRate}%</h3>
                                )}
                                <span className={`badge rounded-pill align-self-start mt-1 px-2 py-1 small bg-${analyticsData.retentionRate >= 50 ? 'success' : 'warning'}`}>
                                    {analyticsData.retentionRate >= 60 ? 'Healthy' : analyticsData.retentionRate >= 30 ? 'Moderate' : 'Low'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Row: System Health Telemetry & AI Insights */}
                    <div className="row g-4 mb-4">
                        {/* System Health Telemetry */}
                        <div className="col-lg-7">
                            <div className="card glass border-0 rounded-4 p-4 h-100">
                                <h3 className="fs-5 fw-bold mb-4 d-flex align-items-center gap-2">
                                    <Cpu size={20} className="text-primary" /> System Health & Telemetry
                                </h3>
                                
                                <div className="d-flex flex-column gap-3">
                                    {/* Database Status */}
                                    <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className={`p-2 bg-${analyticsData.dbStatus === 'online' ? 'success' : analyticsData.dbStatus === 'checking' ? 'secondary' : 'danger'} bg-opacity-10 text-${analyticsData.dbStatus === 'online' ? 'success' : analyticsData.dbStatus === 'checking' ? 'secondary' : 'danger'} rounded-circle`}>
                                                <Database size={18} />
                                            </div>
                                            <div>
                                                <div className="fw-semibold small">Database Status</div>
                                                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>Supabase connection state</div>
                                            </div>
                                        </div>
                                        <span className={`badge bg-${analyticsData.dbStatus === 'online' ? 'success' : analyticsData.dbStatus === 'checking' ? 'secondary' : 'danger'} rounded-pill px-3 py-2`}>
                                            {analyticsData.dbStatus === 'online' ? 'Online' : analyticsData.dbStatus === 'checking' ? 'Checking...' : 'Error'}
                                        </span>
                                    </div>

                                    {/* Storage Used */}
                                    <div className="p-3 bg-light rounded-4">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle">
                                                    <HardDrive size={18} />
                                                </div>
                                                <div>
                                                    <div className="fw-semibold small">Total Storage Used</div>
                                                    <div className="small text-muted" style={{ fontSize: '0.75rem' }}>Tracked across {analyticsData.totalUsers} user profiles</div>
                                                </div>
                                            </div>
                                            <span className="small fw-bold text-muted">{analyticsData.totalUsers} profiles</span>
                                        </div>
                                        <div className="progress rounded-pill" style={{ height: '8px' }}>
                                            <div className="progress-bar bg-primary rounded-pill" role="progressbar" style={{ width: `${Math.min((analyticsData.totalUsers / 5000) * 100, 100)}%` }} aria-valuenow={analyticsData.totalUsers} aria-valuemin="0" aria-valuemax="5000"></div>
                                        </div>
                                        <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>{analyticsData.totalUsers} / 5,000 capacity</div>
                                    </div>

                                    {/* Active Sessions & Response Time */}
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-4 h-100">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="p-2 bg-info bg-opacity-10 text-info rounded-circle">
                                                        <Activity size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="fw-semibold small" style={{ fontSize: '0.85rem' }}>Weekly Active</div>
                                                        <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Users active this week</div>
                                                    </div>
                                                </div>
                                                {analyticsLoading ? (
                                                    <div className="placeholder-glow"><span className="placeholder col-8 rounded-2" style={{ height: '1.5rem' }}></span></div>
                                                ) : (
                                                    <span className="fw-bold fs-5">{analyticsData.activeSessions}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-4 h-100">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="p-2 bg-secondary bg-opacity-10 text-secondary rounded-circle">
                                                        <Clock size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="fw-semibold small" style={{ fontSize: '0.85rem' }}>DB Response</div>
                                                        <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Round-trip latency</div>
                                                    </div>
                                                </div>
                                                {analyticsLoading ? (
                                                    <div className="placeholder-glow"><span className="placeholder col-8 rounded-2" style={{ height: '1.5rem' }}></span></div>
                                                ) : (
                                                    <span className={`fw-bold fs-5 text-${analyticsData.responseTime && analyticsData.responseTime < 300 ? 'success' : 'warning'}`}>
                                                        {analyticsData.responseTime ? `${analyticsData.responseTime}ms` : 'N/A'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Failed Logins */}
                                    <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2 bg-warning bg-opacity-10 text-warning rounded-circle">
                                                <ShieldAlert size={18} />
                                            </div>
                                            <div>
                                                <div className="fw-semibold small">Failed Login Attempts</div>
                                                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>Requires server-side auth logs access</div>
                                            </div>
                                        </div>
                                        <span className="badge bg-secondary rounded-pill px-3 py-2">Restricted</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Insights Card */}
                        <div className="col-lg-5">
                            <div className="card glass border-0 rounded-4 p-4 h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))' }}>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h3 className="fs-5 fw-bold mb-0 d-flex align-items-center gap-2">
                                        AI Insights <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill small" style={{ fontSize: '0.7rem' }}>Advanced</span>
                                    </h3>
                                    <button 
                                        type="button"
                                        className="btn btn-sm btn-light rounded-circle p-2 shadow-sm d-flex align-items-center justify-content-center"
                                        onClick={handleRefreshInsights}
                                        disabled={isRefreshingInsights}
                                        title="Refresh AI Insights"
                                    >
                                        <RefreshCw size={14} className={isRefreshingInsights ? 'animate-spin' : ''} />
                                    </button>
                                </div>

                                <div className="d-flex flex-column gap-3">
                                    {isRefreshingInsights ? (
                                        <div className="d-flex flex-column align-items-center justify-content-center py-5 my-4">
                                            <div className="spinner-border text-primary mb-3" role="status">
                                                <span className="visually-hidden">Analyzing statistics...</span>
                                            </div>
                                            <p className="small text-muted">Analyzing user behavior telemetry...</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence mode="popLayout">
                                            {aiInsights.map((insight, idx) => (
                                                <motion.div 
                                                    key={idx}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                                                    className="d-flex align-items-start gap-3 p-3 bg-white bg-opacity-40 rounded-4 border border-white"
                                                >
                                                    <div className="p-2 bg-warning bg-opacity-10 text-warning rounded-circle mt-1">
                                                        <Sparkles size={14} />
                                                    </div>
                                                    <p className="mb-0 small fw-medium" style={{ lineHeight: '1.4', color: 'var(--text-color)' }}>{insight}</p>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Registered Users Table */}
                    <div className="card glass border-0 rounded-4 p-4 mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                            <h3 className="fs-5 fw-bold mb-0 d-flex align-items-center gap-2">
                                <Users size={20} className="text-primary" /> Registered Users
                                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill small ms-1">{userProfiles.length}</span>
                            </h3>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <select
                                    className="form-select form-select-sm rounded-pill border-0 bg-light"
                                    value={inactivityFilter}
                                    onChange={(e) => setInactivityFilter(e.target.value)}
                                    style={{ width: 'auto', minWidth: '150px' }}
                                >
                                    <option value="all">All Users</option>
                                    <option value="active">Active (≤7 days)</option>
                                    <option value="week">Inactive 1+ week</option>
                                    <option value="month">Inactive 1+ month</option>
                                    <option value="3months">Inactive 3+ months</option>
                                    <option value="never">Never active</option>
                                </select>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-pill border-0 bg-light px-3"
                                    placeholder="Search name or email..."
                                    value={userSearchTerm}
                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                    style={{ maxWidth: '220px', width: '100%' }}
                                />
                            </div>
                        </div>

                        {analyticsLoading ? (
                            <div className="d-flex justify-content-center py-4">
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Loading users...</span>
                                </div>
                            </div>
                        ) : userProfiles.length === 0 ? (
                            <div className="text-center py-4">
                                <Users size={36} className="text-muted mb-2" />
                                <p className="small text-muted mb-0">No user profiles found in the database.</p>
                            </div>
                        ) : (
                            <div className="table-responsive" style={{ overflowX: 'auto' }}>
                                <table className="table table-hover align-middle mb-0" style={{ minWidth: '700px' }}>
                                    <thead>
                                        <tr className="text-muted small">
                                            <th className="border-0 pb-2 fw-semibold">#</th>
                                            <th className="border-0 pb-2 fw-semibold">User</th>
                                            <th className="border-0 pb-2 fw-semibold">Email</th>
                                            <th className="border-0 pb-2 fw-semibold">Last Active</th>
                                            <th className="border-0 pb-2 fw-semibold">Joined</th>
                                            <th className="border-0 pb-2 fw-semibold text-end">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userProfiles
                                            .filter(u => {
                                                if (!userSearchTerm.trim()) return true;
                                                const q = userSearchTerm.toLowerCase();
                                                return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                                            })
                                            .filter(u => {
                                                if (inactivityFilter === 'all') return true;
                                                const info = getInactivity(u);
                                                if (inactivityFilter === 'active') return info.days <= 7;
                                                if (inactivityFilter === 'week') return info.days > 7;
                                                if (inactivityFilter === 'month') return info.days > 30;
                                                if (inactivityFilter === '3months') return info.days > 90;
                                                if (inactivityFilter === 'never') return info.days === Infinity;
                                                return true;
                                            })
                                            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                                            .map((user, idx) => {
                                                const inactivity = getInactivity(user);
                                                return (
                                                <tr key={user.id}>
                                                    <td className="small text-muted">{idx + 1}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            {user.avatar_url ? (
                                                                <img
                                                                    src={user.avatar_url}
                                                                    alt={user.full_name || 'User'}
                                                                    className="rounded-circle"
                                                                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                                                                    {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span className="fw-medium small">{user.full_name || 'Unnamed'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="small text-muted">{user.email || '—'}</td>
                                                    <td>
                                                        <span className={`badge bg-${inactivity.color} bg-opacity-10 text-${inactivity.color} rounded-pill px-2 py-1 small`}>
                                                            {inactivity.label}
                                                        </span>
                                                    </td>
                                                    <td className="small text-muted">
                                                        {user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                    </td>
                                                    <td className="text-end">
                                                        <button
                                                            className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1"
                                                            onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                                            disabled={deletingUserId === user.id}
                                                            style={{ fontSize: '0.75rem' }}
                                                        >
                                                            {deletingUserId === user.id ? (
                                                                <div className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }} role="status"></div>
                                                            ) : (
                                                                <Trash2 size={12} />
                                                            )}
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                        {/* All books are now editable and deletable */}
                                    </div>
                                    <div className="card-body p-3 d-flex flex-column">
                                        <h3 className="fs-5 fw-bold mb-1">{b.title}</h3>
                                        <p className="small text-primary mb-2">by {b.author}</p>
                                        <p className="small text-muted line-clamp-2 mb-3 flex-grow-1">{b.description}</p>
                                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                            <span className="small text-muted">ID: {b.id}</span>
                                            <button
                                                className="btn btn-sm btn-outline-danger rounded-circle p-2"
                                                onClick={() => handleDeleteBook(b.id)}
                                                title="Delete book"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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

                    <div className="table-responsive glass rounded-4 p-3" style={{ overflowX: 'auto' }}>
                        <table className="table table-hover align-middle mb-0 responsive-admin-table">
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
