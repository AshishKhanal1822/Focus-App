// src/Dashboard.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Clock, BookOpen, PenTool, CheckSquare, 
    Calendar, BarChart2, Award, ChevronLeft, Brain, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Flame
} from 'lucide-react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import { eventBus } from './agents/core/EventBus.js';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const [viewMode, setViewMode] = useState('weekly'); // 'daily' | 'weekly'
    const [activeMetric, setActiveMetric] = useState('focus_time'); // 'screen_time' | 'focus_time' | 'reading_time' | 'writing_time' | 'tasks_completed'
    const [stats, setStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(SupabaseAdapter.cachedUser);
    // Live in-session buffer from StatsAgent — fills in data not yet flushed to DB
    const [liveBuffer, setLiveBuffer] = useState(null);
    const liveTodayRef = useRef(null);

    useEffect(() => {
        const unsubscribe = SupabaseAdapter.subscribe((u) => {
            setUser(u);
        });
        return unsubscribe;
    }, []);

    // Subscribe to live STATS_UPDATED so in-progress buffer values show in real-time
    useEffect(() => {
        const unsub = eventBus.on('STATS_UPDATED', ({ date, buffer }) => {
            liveTodayRef.current = { date, buffer };
            setLiveBuffer({ date, buffer: { ...buffer } });
        });
        return unsub;
    }, []);

    // When StatsAgent flushes its buffer to storage, accumulate into our local stats
    // state and clear the live buffer (it was just committed, so the persisted copy is now canonical).
    useEffect(() => {
        const unsub = eventBus.on('STATS_FLUSHED', ({ date, flushed }) => {
            // Merge flushed increments into the stats array so todayBase stays accurate
            setStats(prev => {
                const idx = prev.findIndex(s => s.date === date);
                if (idx === -1) {
                    // No existing entry for today — create one from the flushed data
                    return [...prev, { date, ...flushed }];
                }
                // Add flushed increments to the existing entry
                const updated = { ...prev[idx] };
                for (const key of Object.keys(flushed)) {
                    if (key in updated) updated[key] = (updated[key] || 0) + (flushed[key] || 0);
                }
                const next = [...prev];
                next[idx] = updated;
                return next;
            });
            // Clear the live buffer — the data is now in `stats` (persisted state)
            setLiveBuffer(prev => (prev?.date === date ? null : prev));
            liveTodayRef.current = null;
        });
        return unsub;
    }, []);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            let dbData = null;
            if (user) {
                const client = SupabaseAdapter.getClient();
                if (client) {
                    const { data, error } = await client
                        .from('user_daily_stats')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('date', { ascending: true });
                    
                    if (!error && data) {
                        dbData = data;
                    } else if (error) {
                        console.warn("Error fetching cloud stats:", error);
                    }
                }
            }

            // Fallback & local merge
            const localKey = user ? `focus_stats_local_history_${user.id}` : 'focus_stats_local_history';
            const localHistory = localStorage.getItem(localKey);
            const parsedLocal = localHistory ? JSON.parse(localHistory) : {};

            const mergedMap = {};

            // 1. Load database stats
            if (dbData) {
                dbData.forEach(row => {
                    mergedMap[row.date] = {
                        screen_time_seconds: row.screen_time_seconds || 0,
                        reading_time_seconds: row.reading_time_seconds || 0,
                        focus_time_seconds: row.focus_time_seconds || 0,
                        writing_time_seconds: row.writing_time_seconds || 0,
                        tasks_completed: row.tasks_completed || 0,
                        words_written: row.words_written || 0,
                        focus_sessions_completed: row.focus_sessions_completed || 0
                    };
                });
            }

            // 2. Merge local history only for days NOT already covered by cloud data.
            // For time-based metrics we take max (safe since they are cumulative totals).
            // For tasks_completed: when cloud data exists, treat cloud as authoritative to avoid
            // double-counting caused by local incremental saves being summed again on top.
            Object.entries(parsedLocal).forEach(([date, localStats]) => {
                if (!mergedMap[date]) {
                    // No cloud record — use local data entirely (offline mode)
                    mergedMap[date] = { ...localStats };
                } else {
                    // Cloud record exists — use max for time metrics (handles partial offline sync)
                    mergedMap[date].screen_time_seconds = Math.max(mergedMap[date].screen_time_seconds, localStats.screen_time_seconds || 0);
                    mergedMap[date].reading_time_seconds = Math.max(mergedMap[date].reading_time_seconds, localStats.reading_time_seconds || 0);
                    mergedMap[date].focus_time_seconds = Math.max(mergedMap[date].focus_time_seconds, localStats.focus_time_seconds || 0);
                    mergedMap[date].writing_time_seconds = Math.max(mergedMap[date].writing_time_seconds, localStats.writing_time_seconds || 0);
                    mergedMap[date].words_written = Math.max(mergedMap[date].words_written, localStats.words_written || 0);
                    mergedMap[date].focus_sessions_completed = Math.max(mergedMap[date].focus_sessions_completed, localStats.focus_sessions_completed || 0);
                    // tasks_completed: cloud is authoritative when available — do NOT take max
                    // to prevent local incremental cache from inflating the count.
                    // (Cloud already has the accurate running total via RPC increments/decrements)
                }
            });

            // Map back to array
            const statsArray = Object.entries(mergedMap).map(([date, data]) => ({
                date,
                ...data
            })).sort((a, b) => a.date.localeCompare(b.date));

            setStats(statsArray);
        } catch (e) {
            console.error("Failed to fetch stats", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user?.id]);

    // Helpers to generate last 7 days list
    const getLast7Days = () => {
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const offset = d.getTimezoneOffset();
            const localDate = new Date(d.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];
            result.push(dateStr);
        }
        return result;
    };

    const getTodayStr = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const todayStr = getTodayStr();
    const last7Days = getLast7Days();

    // Map stats array to exactly last 7 days list (guarantees 7 items in chart)
    const weeklyData = useMemo(() => {
        return last7Days.map(dateStr => {
            const existing = stats.find(s => s.date === dateStr);
            const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
            return existing ? { ...existing, dayName } : {
                date: dateStr,
                dayName,
                screen_time_seconds: 0,
                reading_time_seconds: 0,
                focus_time_seconds: 0,
                writing_time_seconds: 0,
                tasks_completed: 0,
                words_written: 0,
                focus_sessions_completed: 0
            };
        });
    }, [stats, last7Days]);

    // Today's Stats — merge flushed DB/local data with the live in-session buffer
    const todayBase = useMemo(() => {
        return stats.find(s => s.date === todayStr) || {
            screen_time_seconds: 0,
            reading_time_seconds: 0,
            focus_time_seconds: 0,
            writing_time_seconds: 0,
            tasks_completed: 0,
            words_written: 0,
            focus_sessions_completed: 0
        };
    }, [stats, todayStr]);

    // Add any buffered (not yet flushed) stats from the current session
    const liveBuf = (liveBuffer?.date === todayStr) ? liveBuffer.buffer : null;
    const todayStats = useMemo(() => {
        return liveBuf ? {
            screen_time_seconds:      todayBase.screen_time_seconds      + (liveBuf.screen_time_seconds      || 0),
            reading_time_seconds:     todayBase.reading_time_seconds     + (liveBuf.reading_time_seconds     || 0),
            focus_time_seconds:       todayBase.focus_time_seconds       + (liveBuf.focus_time_seconds       || 0),
            writing_time_seconds:     todayBase.writing_time_seconds     + (liveBuf.writing_time_seconds     || 0),
            tasks_completed:          todayBase.tasks_completed          + (liveBuf.tasks_completed          || 0),
            words_written:            todayBase.words_written            + (liveBuf.words_written            || 0),
            focus_sessions_completed: todayBase.focus_sessions_completed + (liveBuf.focus_sessions_completed || 0),
        } : todayBase;
    }, [todayBase, liveBuf]);

    // Calculate Weekly Totals / Averages
    const {
        totalScreenTimeSec,
        totalReadingTimeSec,
        totalFocusTimeSec,
        totalWritingTimeSec,
        totalTasksCompleted,
        totalWordsWritten,
        totalFocusSessions
    } = useMemo(() => ({
        totalScreenTimeSec: weeklyData.reduce((acc, curr) => acc + curr.screen_time_seconds, 0),
        totalReadingTimeSec: weeklyData.reduce((acc, curr) => acc + curr.reading_time_seconds, 0),
        totalFocusTimeSec: weeklyData.reduce((acc, curr) => acc + curr.focus_time_seconds, 0),
        totalWritingTimeSec: weeklyData.reduce((acc, curr) => acc + curr.writing_time_seconds, 0),
        totalTasksCompleted: weeklyData.reduce((acc, curr) => acc + curr.tasks_completed, 0),
        totalWordsWritten: weeklyData.reduce((acc, curr) => acc + curr.words_written, 0),
        totalFocusSessions: weeklyData.reduce((acc, curr) => acc + curr.focus_sessions_completed, 0)
    }), [weeklyData]);

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        }
        return `${mins} min`;
    };

    const metricsConfig = {
        screen_time: {
            title: 'Screen Time',
            todayVal: formatDuration(todayStats.screen_time_seconds),
            weeklyVal: formatDuration(totalScreenTimeSec),
            avgVal: formatDuration(Math.round(totalScreenTimeSec / 7)),
            icon: Activity,
            color: '#6366f1',
            lightColor: 'rgba(99, 102, 241, 0.1)',
            chartKey: 'screen_time_seconds',
            yAxisFormatter: (v) => `${Math.round(v / 60)}m`
        },
        focus_time: {
            title: 'Focus Sessions',
            todayVal: `${formatDuration(todayStats.focus_time_seconds)} (${todayStats.focus_sessions_completed || 0} sess)`,
            weeklyVal: `${formatDuration(totalFocusTimeSec)} (${totalFocusSessions || 0} sess)`,
            avgVal: `${formatDuration(Math.round(totalFocusTimeSec / 7))}`,
            icon: Clock,
            color: '#f43f5e',
            lightColor: 'rgba(244, 63, 94, 0.1)',
            chartKey: 'focus_time_seconds',
            yAxisFormatter: (v) => `${Math.round(v / 60)}m`
        },
        reading_time: {
            title: 'Reading Time',
            todayVal: formatDuration(todayStats.reading_time_seconds),
            weeklyVal: formatDuration(totalReadingTimeSec),
            avgVal: formatDuration(Math.round(totalReadingTimeSec / 7)),
            icon: BookOpen,
            color: '#10b981',
            lightColor: 'rgba(16, 185, 129, 0.1)',
            chartKey: 'reading_time_seconds',
            yAxisFormatter: (v) => `${Math.round(v / 60)}m`
        },
        writing_time: {
            title: 'Writing Time',
            todayVal: `${formatDuration(todayStats.writing_time_seconds)} (${todayStats.words_written || 0} words)`,
            weeklyVal: `${formatDuration(totalWritingTimeSec)} (${totalWordsWritten || 0} words)`,
            avgVal: `${formatDuration(Math.round(totalWritingTimeSec / 7))}`,
            icon: PenTool,
            color: '#8b5cf6',
            lightColor: 'rgba(139, 92, 246, 0.1)',
            chartKey: 'writing_time_seconds',
            yAxisFormatter: (v) => `${Math.round(v / 60)}m`
        },
        tasks_completed: {
            title: 'Tasks Completed',
            todayVal: `${todayStats.tasks_completed || 0} tasks`,
            weeklyVal: `${totalTasksCompleted || 0} tasks`,
            avgVal: `${(totalTasksCompleted / 7).toFixed(1)}/day`,
            icon: CheckSquare,
            color: '#f59e0b',
            lightColor: 'rgba(245, 158, 11, 0.1)',
            chartKey: 'tasks_completed',
            yAxisFormatter: (v) => `${v}`
        }
    };

    // Calculate maximum value for chart scaling
    const activeKey = metricsConfig[activeMetric].chartKey;
    const maxVal = Math.max(...weeklyData.map(d => d[activeKey] || 0), 60); // min max height scaling unit

    // SVG Chart dimensions
    const chartWidth = 600;
    const chartHeight = 240;
    const paddingLeft = 40;
    const paddingRight = 10;
    const paddingTop = 20;
    const paddingBottom = 30;
    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;

    // --- AI INSIGHTS ENGINE ---
    // Analyzes real session data and generates personalized, actionable advice
    const generateInsights = () => {
        const insights = [];

        // --- Focus Pattern Analysis ---
        const focusDays = weeklyData.filter(d => d.focus_time_seconds > 0);
        const weekendDays = weeklyData.filter(d => {
            const day = new Date(d.date + 'T00:00:00').getDay(); // 0=Sun, 6=Sat
            return day === 0 || day === 6;
        });
        const weekdayFocusDays = weeklyData.filter(d => {
            const day = new Date(d.date + 'T00:00:00').getDay();
            return day >= 1 && day <= 5 && d.focus_time_seconds > 0;
        });
        const weekendFocusDays = weeklyData.filter(d => {
            const day = new Date(d.date + 'T00:00:00').getDay();
            return (day === 0 || day === 6) && d.focus_time_seconds > 0;
        });

        const avgFocusSec = focusDays.length > 0
            ? focusDays.reduce((a, d) => a + d.focus_time_seconds, 0) / focusDays.length
            : 0;
        const avgFocusMin = Math.round(avgFocusSec / 60);

        // Tip: average focus session length
        if (avgFocusMin > 0 && avgFocusMin < 30) {
            insights.push({
                icon: TrendingUp,
                color: '#f43f5e',
                bg: 'rgba(244,63,94,0.08)',
                title: 'Build Session Stamina',
                text: `Your average focus session is ${avgFocusMin} min. Try extending to 25 min for deeper concentration using the Pomodoro technique.`
            });
        } else if (avgFocusMin >= 30 && avgFocusMin <= 50) {
            insights.push({
                icon: Flame,
                color: '#f97316',
                bg: 'rgba(249,115,22,0.08)',
                title: 'Strong Focus Rhythm',
                text: `Your average session is ${avgFocusMin} min — a great range! Try taking a 10-min break after each session to maintain peak output.`
            });
        } else if (avgFocusMin > 50) {
            insights.push({
                icon: AlertCircle,
                color: '#eab308',
                bg: 'rgba(234,179,8,0.08)',
                title: 'Watch for Fatigue',
                text: `Your average session is ${avgFocusMin} min. Productivity often drops after 50 min. Try splitting into two 40-min blocks for better retention.`
            });
        }

        // Tip: weekday vs weekend consistency
        if (weekdayFocusDays.length > 0 && weekendFocusDays.length === 0 && weekendDays.length > 0) {
            insights.push({
                icon: Calendar,
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.08)',
                title: 'Weekend Gap Detected',
                text: `You complete more sessions on weekdays. Even one short session on weekends will build momentum and strengthen your streak.`
            });
        } else if (weekendFocusDays.length > 0 && weekdayFocusDays.length === 0) {
            insights.push({
                icon: Calendar,
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.08)',
                title: 'Weekday Potential',
                text: `You're active on weekends but quiet on weekdays. Adding even one session Monday–Friday will significantly boost your weekly output.`
            });
        } else if (weekdayFocusDays.length >= 3 && weekendFocusDays.length >= 1) {
            insights.push({
                icon: TrendingUp,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                title: 'Great Weekly Balance',
                text: `You're active ${weekdayFocusDays.length} weekday(s) and ${weekendFocusDays.length} weekend day(s) this week. Consistency across all days accelerates long-term learning.`
            });
        }

        // Tip: focus streak (consecutive days)
        let streak = 0;
        for (let i = weeklyData.length - 1; i >= 0; i--) {
            if (weeklyData[i].focus_sessions_completed > 0) streak++;
            else break;
        }
        if (streak >= 3) {
            insights.push({
                icon: Flame,
                color: '#f43f5e',
                bg: 'rgba(244,63,94,0.08)',
                title: `${streak}-Day Streak!`,
                text: `You've been consistent for ${streak} days in a row. Keep it up — habits form fastest when you protect your streak!`
            });
        } else if (streak === 0 && totalFocusSessions > 0) {
            insights.push({
                icon: AlertCircle,
                color: '#eab308',
                bg: 'rgba(234,179,8,0.08)',
                title: 'Restart Your Streak',
                text: `You had ${totalFocusSessions} session(s) this week but broke your daily streak. Start a session today to rebuild momentum!`
            });
        }

        // Tip: best day of the week
        const bestDay = [...weeklyData].sort((a, b) => b.focus_time_seconds - a.focus_time_seconds)[0];
        if (bestDay && bestDay.focus_time_seconds > 0) {
            const bestDayName = new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
            insights.push({
                icon: Lightbulb,
                color: '#6366f1',
                bg: 'rgba(99,102,241,0.08)',
                title: 'Peak Day Identified',
                text: `${bestDayName} is your most productive day with ${Math.round(bestDay.focus_time_seconds / 60)} min of focus. Schedule your hardest tasks on your best day.`
            });
        }

        // Tip: reading habit
        if (totalReadingTimeSec < 600 && totalFocusSessions > 2) {
            insights.push({
                icon: BookOpen,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                title: 'Try Deep Reading',
                text: `You have strong focus but low reading time. Pairing focused reading sessions with your focus blocks can compound your learning output.`
            });
        } else if (totalReadingTimeSec >= 3600) {
            insights.push({
                icon: BookOpen,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                title: 'Reading Champion',
                text: `You've read for ${formatDuration(totalReadingTimeSec)} this week. Readers who combine note-taking while reading retain 40% more content.`
            });
        }

        // Tip: writing output
        if (totalWordsWritten > 500) {
            insights.push({
                icon: PenTool,
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.08)',
                title: 'Prolific Writer',
                text: `${totalWordsWritten} words this week! Writing regularly reinforces memory. Try setting a daily word-count goal to stay consistent.`
            });
        }

        // Fallback if no data yet
        if (insights.length === 0) {
            insights.push({
                icon: Lightbulb,
                color: '#6366f1',
                bg: 'rgba(99,102,241,0.08)',
                title: 'Start Your Journey',
                text: `Complete a few focus sessions and reading blocks — your personalized AI insights will appear here based on your real patterns!`
            });
        }

        return insights.slice(0, 4); // show top 4 most relevant
    };

    const smartInsights = generateInsights();

    return (
        <div className="container py-5" style={{ minHeight: '80vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <Link to="/" className="btn btn-link p-0 text-decoration-none text-muted mb-2 d-inline-flex align-items-center gap-1">
                        <ChevronLeft size={16} /> Back to Home
                    </Link>
                    <h1 className="display-5 fw-bold mb-0">Productivity Dashboard</h1>
                    <p className="text-muted mb-0">AI-powered insights based on your real usage patterns.</p>
                </div>
                
                <div className="d-flex gap-2 align-items-center flex-wrap">
                    <Link 
                        to="/distraction" 
                        className="btn btn-outline-primary rounded-pill px-3 py-2 d-flex align-items-center gap-2 small shadow-sm"
                    >
                        <Brain size={16} /> Focus &amp; Distraction Analysis
                    </Link>
                    <div className="btn-group bg-white rounded-3 shadow-sm p-1 border">
                        <button 
                            className={`btn btn-sm rounded-2 border-0 ${viewMode === 'daily' ? 'btn-primary' : 'bg-transparent text-body'}`}
                            onClick={() => setViewMode('daily')}
                        >
                            Today
                        </button>
                        <button 
                            className={`btn btn-sm rounded-2 border-0 ${viewMode === 'weekly' ? 'btn-primary' : 'bg-transparent text-body'}`}
                            onClick={() => setViewMode('weekly')}
                        >
                            This Week
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            {isLoading && stats.length === 0 ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Metrics Grid */}
                    <div className="row g-3 mb-5">
                        {Object.entries(metricsConfig).map(([key, config]) => {
                            const Icon = config.icon;
                            const isSelected = activeMetric === key;
                            return (
                                <div key={key} className="col-md-4 col-lg-2-4">
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        onClick={() => setActiveMetric(key)}
                                        className={`card h-100 border-0 cursor-pointer rounded-4 transition-all shadow-sm ${
                                            isSelected ? 'glass shadow-md' : 'bg-white'
                                        }`}
                                        style={{
                                            borderLeft: `4px solid ${config.color}`,
                                            background: isSelected ? `${config.lightColor}` : '',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div className="card-body p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="small text-muted fw-bold text-uppercase">{config.title}</span>
                                                <div 
                                                    className="p-2 rounded-circle"
                                                    style={{ backgroundColor: config.lightColor, color: config.color }}
                                                >
                                                    <Icon size={16} />
                                                </div>
                                            </div>
                                            <h3 className="fw-bold mb-1 fs-4">
                                                {viewMode === 'daily' ? config.todayVal : config.weeklyVal}
                                            </h3>
                                            <div className="small text-muted">
                                                Avg: <span className="fw-semibold text-body">{config.avgVal}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Chart & Insights */}
                    <div className="row g-4">
                        {/* Weekly SVG Chart */}
                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm glass rounded-4 p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <BarChart2 size={20} className="text-primary" />
                                        <h2 className="fs-5 fw-bold mb-0">Activity History (Last 7 Days)</h2>
                                    </div>
                                    <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2 small fw-bold">
                                        Active: {metricsConfig[activeMetric].title}
                                    </span>
                                </div>

                                <div className="w-100 overflow-auto">
                                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-100" style={{ minWidth: '500px' }}>
                                        {/* Chart Grid Lines */}
                                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                                            const y = paddingTop + (1 - ratio) * graphHeight;
                                            const gridVal = ratio * maxVal;
                                            return (
                                                <g key={index}>
                                                    <line 
                                                        x1={paddingLeft} 
                                                        y1={y} 
                                                        x2={chartWidth - paddingRight} 
                                                        y2={y} 
                                                        stroke="rgba(0,0,0,0.06)" 
                                                        strokeDasharray="4 4"
                                                    />
                                                    <text 
                                                        x={paddingLeft - 8} 
                                                        y={y + 4} 
                                                        textAnchor="end" 
                                                        className="small text-muted" 
                                                        style={{ fontSize: '0.65rem', fill: 'var(--text-muted)' }}
                                                    >
                                                        {metricsConfig[activeMetric].yAxisFormatter(gridVal)}
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {/* Bars */}
                                        {weeklyData.map((d, index) => {
                                            const val = d[activeKey] || 0;
                                            const barW = 32;
                                            const barSpacing = graphWidth / 7;
                                            const x = paddingLeft + index * barSpacing + (barSpacing - barW) / 2;
                                            const barH = maxVal > 0 ? (val / maxVal) * graphHeight : 0;
                                            const y = chartHeight - paddingBottom - barH;

                                            return (
                                                <g key={index} className="chart-bar-group">
                                                    <rect 
                                                        x={x} 
                                                        y={paddingTop} 
                                                        width={barW} 
                                                        height={graphHeight} 
                                                        fill="transparent" 
                                                    />
                                                    <motion.rect
                                                        x={x}
                                                        width={barW}
                                                        rx="5"
                                                        initial={{ height: 0, y: chartHeight - paddingBottom }}
                                                        animate={{ height: barH, y }}
                                                        transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                                                        fill={metricsConfig[activeMetric].color}
                                                        style={{ 
                                                            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05))',
                                                            opacity: 0.85
                                                        }}
                                                        whileHover={{ opacity: 1, scaleY: 1.02, originY: 1 }}
                                                    />
                                                    <text
                                                        x={x + barW / 2}
                                                        y={chartHeight - 8}
                                                        textAnchor="middle"
                                                        className="small text-muted fw-semibold"
                                                        style={{ fontSize: '0.75rem', fill: 'var(--text-muted)' }}
                                                    >
                                                        {d.dayName}
                                                    </text>
                                                    {val > 0 && (
                                                        <text
                                                            x={x + barW / 2}
                                                            y={y - 6}
                                                            textAnchor="middle"
                                                            className="small fw-bold"
                                                            style={{ fontSize: '0.65rem', fill: metricsConfig[activeMetric].color }}
                                                        >
                                                            {activeMetric === 'tasks_completed' ? val : `${Math.round(val / 60)}m`}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* AI Personalized Insights Panel */}
                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm glass rounded-4 p-4 h-100">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <div className="p-2 rounded-circle" style={{ background: 'rgba(99,102,241,0.12)' }}>
                                        <Brain size={18} style={{ color: '#6366f1' }} />
                                    </div>
                                    <div>
                                        <h2 className="fs-5 fw-bold mb-0">AI Insights</h2>
                                        <p className="small text-muted mb-0" style={{ fontSize: '0.75rem' }}>Based on your real usage patterns</p>
                                    </div>
                                </div>

                                <div className="d-flex flex-column gap-2 mt-3">
                                    {smartInsights.map((insight, i) => {
                                        const Icon = insight.icon;
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: 16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1, duration: 0.4 }}
                                                className="d-flex gap-3 align-items-start p-3 rounded-3"
                                                style={{ background: insight.bg, border: `1px solid ${insight.color}22` }}
                                            >
                                                <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                    style={{ width: 34, height: 34, background: `${insight.color}18`, color: insight.color }}
                                                >
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="fs-6 fw-semibold mb-1" style={{ color: insight.color }}>{insight.title}</h4>
                                                    <p className="small text-muted mb-0" style={{ lineHeight: 1.45 }}>{insight.text}</p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
