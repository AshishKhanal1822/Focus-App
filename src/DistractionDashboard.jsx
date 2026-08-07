// src/DistractionDashboard.jsx
// Distraction Analysis Dashboard — shows focus scores, interruption trends, and AI recommendations
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  ChevronLeft, ShieldAlert, Zap, Clock, Activity,
  TrendingDown, TrendingUp, Lightbulb, Brain, AlertTriangle,
  CheckCircle2
} from "lucide-react";
import SupabaseAdapter from "./agents/adapters/SupabaseAdapter.js";
import { supabase } from "./supabaseClient.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSec(s) {
  if (!s || s === 0) return "0 min";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function scoreColor(score) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function scoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

// ─── AI Recommendation Engine ───────────────────────────────────────────────

function generateRecommendations(sessions) {
  const tips = [];
  if (!sessions || sessions.length === 0) {
    tips.push({
      icon: Lightbulb,
      color: "#6366f1",
      bg: "rgba(99,102,241,0.08)",
      title: "Start Your First Session",
      text: "Complete a focus session to unlock personalized distraction analysis and recommendations."
    });
    return tips;
  }

  const avgInterruptions = sessions.reduce((a, s) => a + (s.interruption_count || 0), 0) / sessions.length;
  const avgPauses = sessions.reduce((a, s) => a + (s.pause_count || 0), 0) / sessions.length;
  const avgIdleSec = sessions.reduce((a, s) => a + (s.idle_seconds || 0), 0) / sessions.length;
  const avgScore = sessions.reduce((a, s) => a + (s.focus_score || 0), 0) / sessions.length;
  const completedSessions = sessions.filter(s => s.status === "completed");
  const completionRate = sessions.length > 0 ? completedSessions.length / sessions.length : 0;

  const shortSessions = sessions.filter(s => (s.planned_duration_minutes || 0) <= 20);
  const longSessions = sessions.filter(s => (s.planned_duration_minutes || 0) > 30);
  const shortAvgScore = shortSessions.length > 0
    ? shortSessions.reduce((a, s) => a + (s.focus_score || 0), 0) / shortSessions.length : 0;
  const longAvgScore = longSessions.length > 0
    ? longSessions.reduce((a, s) => a + (s.focus_score || 0), 0) / longSessions.length : 0;

  if (avgInterruptions >= 2) {
    tips.push({
      icon: ShieldAlert,
      color: "#ef4444",
      bg: "rgba(239,68,68,0.08)",
      title: "High Interruption Rate",
      text: `Your sessions are interrupted ${avgInterruptions.toFixed(1)}x on average. Try enabling Do Not Disturb mode and closing extra browser tabs before starting.`
    });
  }

  if (avgIdleSec > 180) {
    tips.push({
      icon: AlertTriangle,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      title: "Long Idle Periods Detected",
      text: `You are inactive for ${formatSec(avgIdleSec)} on average during sessions. Try shorter ${Math.max(15, Math.round(sessions[0]?.planned_duration_minutes * 0.6) || 20)}-minute intervals to maintain momentum.`
    });
  }

  if (avgPauses >= 3) {
    tips.push({
      icon: TrendingDown,
      color: "#f97316",
      bg: "rgba(249,115,22,0.08)",
      title: "Frequent Pausing",
      text: `You pause ${avgPauses.toFixed(1)}x per session. Try setting up your environment (water, phone away, closed door) before starting to reduce interruptions.`
    });
  }

  if (shortSessions.length >= 2 && shortAvgScore > longAvgScore + 10) {
    tips.push({
      icon: TrendingUp,
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
      title: "You Perform Better in Short Sessions",
      text: `Your focus score is ${Math.round(shortAvgScore - longAvgScore)} points higher in sessions under 20 min. Consider using 15-20 minute Pomodoro blocks for your best work.`
    });
  }

  if (completionRate < 0.6 && sessions.length >= 3) {
    tips.push({
      icon: AlertTriangle,
      color: "#ef4444",
      bg: "rgba(239,68,68,0.08)",
      title: "Low Session Completion Rate",
      text: `Only ${Math.round(completionRate * 100)}% of your sessions are completed. Try reducing session length until you consistently finish before increasing duration.`
    });
  }

  if (avgScore >= 80) {
    tips.push({
      icon: CheckCircle2,
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
      title: "Excellent Focus Quality!",
      text: `Your average score is ${Math.round(avgScore)}/100. You have strong focus discipline. Try extending sessions by 5 minutes to push your limits further.`
    });
  }

  if (tips.length === 0) {
    tips.push({
      icon: Lightbulb,
      color: "#6366f1",
      bg: "rgba(99,102,241,0.08)",
      title: "Looking Good!",
      text: "Your distraction metrics are within normal ranges. Keep building consistent focus habits to unlock more personalized insights."
    });
  }

  return tips.slice(0, 4);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DistractionDashboard() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(SupabaseAdapter.cachedUser);

  useEffect(() => {
    const unsub = SupabaseAdapter.subscribe(u => setUser(u));
    return unsub;
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    let dbSessions = [];
    try {
      if (user) {
        const { data, error } = await supabase
          .from("focus_sessions")
          .select("*")
          .eq("user_id", user.id)
          .neq("status", "in_progress")
          .order("started_at", { ascending: false })
          .limit(30);
        if (!error && data) dbSessions = data;
      }
    } catch (e) {
      console.warn("[DistractionDashboard] db fetch warning:", e);
    }

    // Merge with local storage history
    let localSessions = [];
    try {
      const localKey = user ? `focus_sessions_local_history_${user.id}` : 'focus_sessions_local_history';
      localSessions = JSON.parse(localStorage.getItem(localKey) || '[]');
    } catch (e) {}

    // Combine and deduplicate
    const combinedMap = {};
    [...dbSessions, ...localSessions].forEach(s => {
      if (s.id && !combinedMap[s.id]) {
        combinedMap[s.id] = s;
      }
    });

    const finalSessions = Object.values(combinedMap).sort((a, b) => 
      new Date(b.started_at) - new Date(a.started_at)
    );

    setSessions(finalSessions);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [user?.id]);

  const loadDemoData = () => {
    const sample = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startedAt = d.toISOString();
      const planned = [25, 30, 45, 25, 20, 50, 25][i];
      const interruptions = [1, 3, 0, 2, 4, 1, 0][i];
      const pauses = [1, 2, 0, 1, 3, 0, 1][i];
      const idleSec = [120, 300, 0, 180, 450, 60, 0][i];
      const completed = i !== 2 && i !== 4;
      const score = Math.max(35, 100 - (interruptions * 5) - (pauses * 3) - Math.round(idleSec / 60) * 2 - (completed ? 0 : 15));

      sample.push({
        id: `demo_${Date.now()}_${i}`,
        planned_duration_minutes: planned,
        actual_duration_minutes: completed ? planned : Math.round(planned * 0.5),
        status: completed ? 'completed' : 'cancelled',
        interruption_count: interruptions,
        total_interruption_seconds: interruptions * 45,
        pause_count: pauses,
        total_pause_seconds: pauses * 90,
        idle_seconds: idleSec,
        focus_score: score,
        started_at: startedAt,
        ended_at: new Date(d.getTime() + planned * 60000).toISOString()
      });
    }
    const localKey = user ? `focus_sessions_local_history_${user.id}` : 'focus_sessions_local_history';
    localStorage.setItem(localKey, JSON.stringify(sample));
    setSessions(sample);
  };

  const clearDemoData = () => {
    const localKey = user ? `focus_sessions_local_history_${user.id}` : 'focus_sessions_local_history';
    localStorage.removeItem(localKey);
    fetchSessions();
  };

  // ─── Derived Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!sessions.length) return { avgScore: 0, totalInterruptions: 0, totalDistractionSec: 0, completionRate: 0 };
    const avgScore = Math.round(sessions.reduce((a, s) => a + (s.focus_score || 0), 0) / sessions.length);
    const totalInterruptions = sessions.reduce((a, s) => a + (s.interruption_count || 0), 0);
    const totalDistractionSec = sessions.reduce((a, s) =>
      a + (s.total_interruption_seconds || 0) + (s.total_pause_seconds || 0) + (s.idle_seconds || 0), 0);
    const completionRate = Math.round((sessions.filter(s => s.status === "completed").length / sessions.length) * 100);
    return { avgScore, totalInterruptions, totalDistractionSec, completionRate };
  }, [sessions]);

  // ─── Chart Data ─────────────────────────────────────────────────────────

  const last7DaysChartData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

      const daySessions = sessions.filter(s => s.started_at?.startsWith(dateStr));
      const avgScore = daySessions.length > 0
        ? Math.round(daySessions.reduce((a, s) => a + (s.focus_score || 0), 0) / daySessions.length) : 0;
      const interruptions = daySessions.reduce((a, s) => a + (s.interruption_count || 0), 0);
      const pauses = daySessions.reduce((a, s) => a + (s.pause_count || 0), 0);
      const focusSec = daySessions.reduce((a, s) => a + ((s.actual_duration_minutes || 0) * 60), 0);
      const distractionSec = daySessions.reduce((a, s) =>
        a + (s.total_interruption_seconds || 0) + (s.total_pause_seconds || 0) + (s.idle_seconds || 0), 0);

      result.push({ day: dayName, score: avgScore, interruptions, pauses, focusMins: Math.round(focusSec / 60), distractionMins: Math.round(distractionSec / 60) });
    }
    return result;
  }, [sessions]);

  const recommendations = useMemo(() => generateRecommendations(sessions), [sessions]);

  if (isLoading) {
    return (
      <div className="container py-5 text-center mt-5">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
        <p className="mt-3 text-muted">Analyzing your focus sessions...</p>
      </div>
    );
  }

  const CHART_THEME = {
    score: "#6366f1",
    interruptions: "#ef4444",
    pauses: "#f59e0b",
    focus: "#10b981",
    distraction: "#f43f5e"
  };

  const scoreCol = scoreColor(stats.avgScore);

  return (
    <div className="container py-4" style={{ minHeight: "80vh" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <Link to="/dashboard" className="btn btn-link p-0 text-decoration-none text-muted mb-2 d-inline-flex align-items-center gap-1">
            <ChevronLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="fw-bold fs-2 mb-1 d-flex align-items-center gap-2">
            <div className="p-2 rounded-circle" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Brain size={22} style={{ color: "#6366f1" }} />
            </div>
            Distraction Analysis
          </h1>
          <p className="text-muted mb-0">AI-powered focus quality insights based on your real session data.</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Link to="/dashboard" className="btn btn-outline-primary rounded-pill px-3 py-2 d-flex align-items-center gap-2 small shadow-sm">
            <Activity size={16} /> View Productivity Dashboard
          </Link>
          <span className="badge rounded-pill px-3 py-2 fw-semibold" style={{ background: `${scoreCol}18`, color: scoreCol, fontSize: "0.9rem" }}>
            Overall: {stats.avgScore}/100 — {scoreLabel(stats.avgScore)}
          </span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card border-0 glass rounded-4 p-5 text-center shadow-sm">
          <Brain size={48} className="mx-auto mb-3 text-muted opacity-50" />
          <h3 className="fs-4 fw-bold mb-2">No Sessions Recorded Yet</h3>
          <p className="text-muted mb-4" style={{ maxWidth: 500, margin: "0 auto 1.5rem" }}>
            Complete a focus session using the timer and your real-time tab switching, idle time, and focus score will appear here automatically. Or preview with sample data right now:
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/" className="btn btn-primary rounded-pill px-4">Start a Focus Session</Link>
            <button onClick={loadDemoData} className="btn btn-outline-primary rounded-pill px-4">
              ✨ Load Demo Data &amp; Charts
            </button>
          </div>
        </div>
      ) : (
        <>
          {sessions.some(s => s.id && s.id.startsWith('demo_')) && (
            <div className="alert alert-info d-flex justify-content-between align-items-center rounded-3 mb-4 py-2 px-3">
              <span className="small">Showing <strong>Sample Demo Data</strong> for testing.</span>
              <button onClick={clearDemoData} className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-3">Clear Demo Data</button>
            </div>
          )}
          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            {[
              {
                label: "Avg Focus Score",
                value: `${stats.avgScore}/100`,
                sub: scoreLabel(stats.avgScore),
                icon: Zap,
                color: scoreCol,
                bg: `${scoreCol}14`
              },
              {
                label: "Total Interruptions",
                value: stats.totalInterruptions,
                sub: `across ${sessions.length} sessions`,
                icon: ShieldAlert,
                color: "#ef4444",
                bg: "rgba(239,68,68,0.1)"
              },
              {
                label: "Total Distraction Time",
                value: formatSec(stats.totalDistractionSec),
                sub: "pauses + idle + tab-switching",
                icon: Clock,
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.1)"
              },
              {
                label: "Completion Rate",
                value: `${stats.completionRate}%`,
                sub: `${sessions.filter(s => s.status === "completed").length} of ${sessions.length} finished`,
                icon: Activity,
                color: "#10b981",
                bg: "rgba(16,185,129,0.1)"
              }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="col-md-6 col-lg-3">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="card border-0 rounded-4 shadow-sm glass p-3 h-100"
                    style={{ borderLeft: `4px solid ${card.color}` }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-muted fw-semibold text-uppercase" style={{ fontSize: "0.72rem" }}>{card.label}</span>
                      <div className="rounded-circle p-2" style={{ background: card.bg, color: card.color }}>
                        <Icon size={15} />
                      </div>
                    </div>
                    <div className="fw-bold fs-3" style={{ color: card.color }}>{card.value}</div>
                    <div className="small text-muted">{card.sub}</div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Charts Row 1 */}
          <div className="row g-4 mb-4">
            {/* Daily Focus Score */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm glass rounded-4 p-4 h-100">
                <h2 className="fs-5 fw-bold mb-1">Daily Focus Score</h2>
                <p className="small text-muted mb-3">Average score per day (last 7 days)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={last7DaysChartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
                      formatter={(v) => [`${v}/100`, "Focus Score"]}
                    />
                    <Bar dataKey="score" name="Focus Score" fill={CHART_THEME.score} radius={[5, 5, 0, 0]}
                      label={{ position: "top", fontSize: 11, fill: CHART_THEME.score, formatter: v => v > 0 ? v : "" }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distraction Trend */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm glass rounded-4 p-4 h-100">
                <h2 className="fs-5 fw-bold mb-1">Distraction Trend</h2>
                <p className="small text-muted mb-3">Interruptions and pauses per day</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={last7DaysChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="interruptions" name="Interruptions" stroke={CHART_THEME.interruptions} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="pauses" name="Pauses" stroke={CHART_THEME.pauses} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 + AI Recommendations */}
          <div className="row g-4 mb-4">
            {/* Focus vs Distraction Time */}
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm glass rounded-4 p-4 h-100">
                <h2 className="fs-5 fw-bold mb-1">Focus vs Distraction Time</h2>
                <p className="small text-muted mb-3">Minutes of productive focus vs distraction per day</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={last7DaysChartData}>
                    <defs>
                      <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_THEME.focus} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_THEME.focus} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="distractGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_THEME.distraction} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_THEME.distraction} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit=" min" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
                      formatter={(v, name) => [`${v} min`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="focusMins" name="Focus Time" stroke={CHART_THEME.focus} fill="url(#focusGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="distractionMins" name="Distraction Time" stroke={CHART_THEME.distraction} fill="url(#distractGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm glass rounded-4 p-4 h-100">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="p-2 rounded-circle" style={{ background: "rgba(99,102,241,0.12)" }}>
                    <Lightbulb size={17} style={{ color: "#6366f1" }} />
                  </div>
                  <div>
                    <h2 className="fs-5 fw-bold mb-0">Recommendations</h2>
                    <p className="mb-0 text-muted" style={{ fontSize: "0.73rem" }}>Based on your real patterns</p>
                  </div>
                </div>
                <div className="d-flex flex-column gap-2">
                  {recommendations.map((rec, i) => {
                    const Icon = rec.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="d-flex gap-2 align-items-start p-3 rounded-3"
                        style={{ background: rec.bg, border: `1px solid ${rec.color}22` }}
                      >
                        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 30, height: 30, background: `${rec.color}18`, color: rec.color }}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <h4 className="fs-6 fw-semibold mb-1" style={{ color: rec.color, fontSize: "0.82rem" }}>{rec.title}</h4>
                          <p className="small text-muted mb-0" style={{ lineHeight: 1.4, fontSize: "0.78rem" }}>{rec.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div className="card border-0 shadow-sm glass rounded-4 p-4">
            <h2 className="fs-5 fw-bold mb-3">Recent Sessions</h2>
            <div className="table-responsive">
              <table className="table table-borderless align-middle small">
                <thead>
                  <tr className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>
                    <th>Date</th>
                    <th>Planned</th>
                    <th>Actual</th>
                    <th>Status</th>
                    <th>Interruptions</th>
                    <th>Pauses</th>
                    <th>Idle</th>
                    <th>Focus Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((s, i) => {
                    const col = scoreColor(s.focus_score || 0);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <td>{new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                        <td>{s.planned_duration_minutes} min</td>
                        <td>{s.actual_duration_minutes ?? "—"} min</td>
                        <td>
                          <span className={`badge rounded-pill ${s.status === "completed" ? "bg-success bg-opacity-10 text-success" : "bg-danger bg-opacity-10 text-danger"}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>{s.interruption_count ?? 0}</td>
                        <td>{s.pause_count ?? 0}</td>
                        <td>{formatSec(s.idle_seconds)}</td>
                        <td>
                          <span className="fw-bold" style={{ color: col }}>{s.focus_score ?? "—"}/100</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
