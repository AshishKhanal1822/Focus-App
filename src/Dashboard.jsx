// src/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Clock, BookOpen, PenTool, CheckSquare, 
    Calendar, RefreshCw, BarChart2, Award, ChevronLeft
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
            const localHistory = localStorage.getItem('focus_stats_local_history');
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
    const weeklyData = last7Days.map(dateStr => {
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

    // Today's Stats — merge flushed DB/local data with the live in-session buffer
    const todayBase = stats.find(s => s.date === todayStr) || {
        screen_time_seconds: 0,
        reading_time_seconds: 0,
        focus_time_seconds: 0,
        writing_time_seconds: 0,
        tasks_completed: 0,
        words_written: 0,
        focus_sessions_completed: 0
    };
    // Add any buffered (not yet flushed) stats from the current session
    const liveBuf = (liveBuffer?.date === todayStr) ? liveBuffer.buffer : null;
    const todayStats = liveBuf ? {
        screen_time_seconds:      todayBase.screen_time_seconds      + (liveBuf.screen_time_seconds      || 0),
        reading_time_seconds:     todayBase.reading_time_seconds     + (liveBuf.reading_time_seconds     || 0),
        focus_time_seconds:       todayBase.focus_time_seconds       + (liveBuf.focus_time_seconds       || 0),
        writing_time_seconds:     todayBase.writing_time_seconds     + (liveBuf.writing_time_seconds     || 0),
        tasks_completed:          todayBase.tasks_completed          + (liveBuf.tasks_completed          || 0),
        words_written:            todayBase.words_written            + (liveBuf.words_written            || 0),
        focus_sessions_completed: todayBase.focus_sessions_completed + (liveBuf.focus_sessions_completed || 0),
    } : todayBase;

    // Calculate Weekly Totals / Averages
    const totalScreenTimeSec = weeklyData.reduce((acc, curr) => acc + curr.screen_time_seconds, 0);
    const totalReadingTimeSec = weeklyData.reduce((acc, curr) => acc + curr.reading_time_seconds, 0);
    const totalFocusTimeSec = weeklyData.reduce((acc, curr) => acc + curr.focus_time_seconds, 0);
    const totalWritingTimeSec = weeklyData.reduce((acc, curr) => acc + curr.writing_time_seconds, 0);
    const totalTasksCompleted = weeklyData.reduce((acc, curr) => acc + curr.tasks_completed, 0);
    const totalWordsWritten = weeklyData.reduce((acc, curr) => acc + curr.words_written, 0);
    const totalFocusSessions = weeklyData.reduce((acc, curr) => acc + curr.focus_sessions_completed, 0);

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

    return (
        <div className="container py-5" style={{ minHeight: '80vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <Link to="/" className="btn btn-link p-0 text-decoration-none text-muted mb-2 d-inline-flex align-items-center gap-1">
                        <ChevronLeft size={16} /> Back to Home
                    </Link>
                    <h1 className="display-5 fw-bold mb-0">Productivity Dashboard</h1>
                    <p className="text-muted mb-0">Personal stats based on your active usage</p>
                </div>
                
                <div className="d-flex gap-2">
                    <button 
                        className="btn btn-light rounded-circle p-2 shadow-sm border"
                        onClick={fetchStats}
                        title="Refresh Stats"
                        aria-label="Refresh Statistics"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
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

                        {/* Productivity Insights */}
                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm bg-white rounded-4 p-4 h-100">
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <Award size={20} className="text-accent" />
                                    <h2 className="fs-5 fw-bold mb-0">Insights & Milestones</h2>
                                </div>

                                <div className="d-flex flex-column gap-3">
                                    <div className="d-flex gap-3 align-items-start p-3 bg-light rounded-3">
                                        <span className="fs-3">🎯</span>
                                        <div>
                                            <h4 className="fs-6 fw-bold mb-1">Consistency Streak</h4>
                                            <p className="small text-muted mb-0">
                                                You completed <strong>{totalFocusSessions} focus sessions</strong> this week. That's a great step towards your cognitive endurance!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-3 align-items-start p-3 bg-light rounded-3">
                                        <span className="fs-3">📚</span>
                                        <div>
                                            <h4 className="fs-6 fw-bold mb-1">Deep Reading Habit</h4>
                                            <p className="small text-muted mb-0">
                                                You spent <strong>{formatDuration(totalReadingTimeSec)}</strong> reading in the library. Developing deep focus through text trains your attention spans.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-3 align-items-start p-3 bg-light rounded-3">
                                        <span className="fs-3">✍️</span>
                                        <div>
                                            <h4 className="fs-6 fw-bold mb-1">Creative Output</h4>
                                            <p className="small text-muted mb-0">
                                                Your writing productivity reached <strong>{totalWordsWritten} words</strong> this week. Strive to build writing discipline daily.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
