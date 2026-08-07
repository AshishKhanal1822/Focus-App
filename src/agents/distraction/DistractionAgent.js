// src/agents/distraction/DistractionAgent.js
// Tracks focus session quality: app interruptions, idle time, and pauses.
// Follows the existing BaseAgent + EventBus pattern.

import { BaseAgent } from '../core/BaseAgent.js';
import SupabaseAdapter from '../adapters/SupabaseAdapter.js';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity = idle

/** Calculate focus score 0-100 from session metrics */
export function calculateFocusScore({ interruptionCount, pauseCount, idleMinutes, wasCompleted }) {
    const raw = 100
        - (interruptionCount * 5)
        - (pauseCount * 3)
        - (idleMinutes * 2)
        - (wasCompleted ? 0 : 15);
    return Math.max(0, Math.min(100, Math.round(raw)));
}

export class DistractionAgent extends BaseAgent {
    constructor() {
        super();
        this._session = null;
        this._handleVisibility = this._onVisibilityChange.bind(this);
        this._handleActivity = this._onUserActivity.bind(this);
        this._idleTimer = null;
        this._idleStartTime = null;
        this._lastActivityTime = Date.now();
    }

    init() {
        if (!super.init()) return;
        this.on('FOCUS_START', this._onFocusStart.bind(this));
        this.on('FOCUS_PAUSED', this._onFocusPaused.bind(this));
        this.on('FOCUS_RESUMED', this._onFocusResumed.bind(this));
        this.on('FOCUS_CANCEL', () => this._onFocusEnd(false));
        this.on('FOCUS_COMPLETED', () => this._onFocusEnd(true));
    }

    // --- Session Lifecycle --------------------------------------------------

    _onFocusStart({ durationMinutes }) {
        this._session = {
            sessionId: `local_${Date.now()}`,
            dbId: null,
            startTime: Date.now(),
            plannedDurationMinutes: durationMinutes,
            interruptionCount: 0,
            totalInterruptionMs: 0,
            _leftAt: null,
            pauseCount: 0,
            totalPauseMs: 0,
            _pausedAt: null,
            idleMs: 0,
            events: []
        };
        this._attachListeners();
        this._resetIdleTimer();
        this._emitUpdate();
        this._createSessionInDB(durationMinutes);
    }

    _onFocusEnd(wasCompleted) {
        if (!this._session) return;

        if (this._session._leftAt !== null) {
            this._session.totalInterruptionMs += Date.now() - this._session._leftAt;
            this._session._leftAt = null;
        }
        if (this._session._pausedAt !== null) {
            this._session.totalPauseMs += Date.now() - this._session._pausedAt;
            this._session._pausedAt = null;
        }
        if (this._idleStartTime !== null) {
            this._session.idleMs += Date.now() - this._idleStartTime;
            this._idleStartTime = null;
        }

        const actualDurationMs = Date.now() - this._session.startTime;
        const idleMinutes = Math.round(this._session.idleMs / 60000);
        const score = calculateFocusScore({
            interruptionCount: this._session.interruptionCount,
            pauseCount: this._session.pauseCount,
            idleMinutes,
            wasCompleted
        });

        const finalSession = { ...this._session, wasCompleted, actualDurationMs, idleMinutes, score };
        this._emitUpdate(finalSession);
        this._saveToLocalStorage(finalSession);
        this._finalizeSessionInDB(finalSession);
        this._detachListeners();
        this._clearIdleTimer();
        this._session = null;
    }

    _saveToLocalStorage(finalSession) {
        try {
            const user = SupabaseAdapter.cachedUser;
            const historyKey = user ? `focus_sessions_local_history_${user.id}` : 'focus_sessions_local_history';
            const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            const record = {
                id: finalSession.sessionId,
                planned_duration_minutes: finalSession.plannedDurationMinutes,
                actual_duration_minutes: Math.round(finalSession.actualDurationMs / 60000),
                status: finalSession.wasCompleted ? 'completed' : 'cancelled',
                interruption_count: finalSession.interruptionCount,
                total_interruption_seconds: Math.round(finalSession.totalInterruptionMs / 1000),
                pause_count: finalSession.pauseCount,
                total_pause_seconds: Math.round(finalSession.totalPauseMs / 1000),
                idle_seconds: Math.round(finalSession.idleMs / 1000),
                focus_score: finalSession.score,
                started_at: new Date(finalSession.startTime).toISOString(),
                ended_at: new Date().toISOString()
            };
            history.unshift(record);
            localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 50)));
        } catch (e) {
            console.warn('[DistractionAgent] Local save error:', e);
        }
    }

    _onFocusPaused() {
        if (!this._session || this._session._pausedAt !== null) return;
        this._session.pauseCount++;
        this._session._pausedAt = Date.now();
        this._session.events.push({ type: 'PAUSE', ts: Date.now() });
        this._clearIdleTimer();
        this._emitUpdate();
    }

    _onFocusResumed() {
        if (!this._session || this._session._pausedAt === null) return;
        const duration = Date.now() - this._session._pausedAt;
        this._session.totalPauseMs += duration;
        this._session.events.push({ type: 'RESUME', ts: Date.now(), durationMs: duration });
        this._session._pausedAt = null;
        this._resetIdleTimer();
        this._emitUpdate();
    }

    // --- Visibility API -----------------------------------------------------

    _onVisibilityChange() {
        if (!this._session) return;
        if (document.visibilityState === 'hidden') {
            this._session._leftAt = Date.now();
            this._session.interruptionCount++;
            this._session.events.push({ type: 'APP_LEFT', ts: Date.now() });
            this._clearIdleTimer();
        } else {
            if (this._session._leftAt !== null) {
                const duration = Date.now() - this._session._leftAt;
                this._session.totalInterruptionMs += duration;
                this._session.events.push({ type: 'APP_RETURNED', ts: Date.now(), durationMs: duration });
                this._session._leftAt = null;
                this._logDistractionEvent('APP_LEFT', duration);
            }
            this._resetIdleTimer();
        }
        this._emitUpdate();
    }

    // --- Idle Detection -----------------------------------------------------

    _onUserActivity() {
        const now = Date.now();
        if (this._idleStartTime !== null && this._session) {
            const idleDuration = now - this._idleStartTime;
            this._session.idleMs += idleDuration;
            this._session.events.push({ type: 'IDLE', ts: this._idleStartTime, durationMs: idleDuration });
            this._logDistractionEvent('IDLE', idleDuration);
            this._idleStartTime = null;
            this._emitUpdate();
        }
        this._lastActivityTime = now;
        this._resetIdleTimer();
    }

    _resetIdleTimer() {
        this._clearIdleTimer();
        if (!this._session) return;
        this._idleTimer = setTimeout(() => {
            if (this._session && this._session._pausedAt === null) {
                this._idleStartTime = Date.now();
            }
        }, IDLE_TIMEOUT_MS);
    }

    _clearIdleTimer() {
        if (this._idleTimer) { clearTimeout(this._idleTimer); this._idleTimer = null; }
    }

    // --- Listeners ----------------------------------------------------------

    _attachListeners() {
        document.addEventListener('visibilitychange', this._handleVisibility);
        window.addEventListener('mousemove', this._handleActivity, { passive: true });
        window.addEventListener('keydown', this._handleActivity, { passive: true });
        window.addEventListener('touchstart', this._handleActivity, { passive: true });
        window.addEventListener('click', this._handleActivity, { passive: true });
    }

    _detachListeners() {
        document.removeEventListener('visibilitychange', this._handleVisibility);
        window.removeEventListener('mousemove', this._handleActivity);
        window.removeEventListener('keydown', this._handleActivity);
        window.removeEventListener('touchstart', this._handleActivity);
        window.removeEventListener('click', this._handleActivity);
    }

    // --- Emit ---------------------------------------------------------------

    _emitUpdate(overrides = null) {
        const s = overrides || this._session;
        if (!s) { this.emit('DISTRACTION_SESSION_UPDATED', null); return; }
        this.emit('DISTRACTION_SESSION_UPDATED', {
            sessionId: s.sessionId,
            interruptionCount: s.interruptionCount,
            pauseCount: s.pauseCount,
            totalInterruptionMs: s.totalInterruptionMs,
            totalPauseMs: s.totalPauseMs,
            idleMs: s.idleMs,
            wasCompleted: s.wasCompleted,
            score: s.score
        });
    }

    // --- Supabase ------------------------------------------------------------

    async _createSessionInDB(plannedDurationMinutes) {
        const user = SupabaseAdapter.cachedUser;
        if (!user || !navigator.onLine) return;
        try {
            const client = SupabaseAdapter.getClient();
            const { data, error } = await client
                .from('focus_sessions')
                .insert({
                    user_id: user.id,
                    planned_duration_minutes: plannedDurationMinutes,
                    started_at: new Date(this._session.startTime).toISOString(),
                    status: 'in_progress'
                })
                .select('id')
                .single();
            if (!error && data && this._session) this._session.dbId = data.id;
        } catch (e) {
            console.warn('[DistractionAgent] DB session create failed:', e.message);
        }
    }

    async _finalizeSessionInDB(finalSession) {
        const user = SupabaseAdapter.cachedUser;
        if (!user || !navigator.onLine) return;
        try {
            const client = SupabaseAdapter.getClient();
            const actualMinutes = Math.round(finalSession.actualDurationMs / 60000);

            let targetId = finalSession.dbId;

            if (targetId) {
                await client.from('focus_sessions').update({
                    actual_duration_minutes: actualMinutes,
                    status: finalSession.wasCompleted ? 'completed' : 'cancelled',
                    interruption_count: finalSession.interruptionCount,
                    total_interruption_seconds: Math.round(finalSession.totalInterruptionMs / 1000),
                    pause_count: finalSession.pauseCount,
                    total_pause_seconds: Math.round(finalSession.totalPauseMs / 1000),
                    idle_seconds: Math.round(finalSession.idleMs / 1000),
                    focus_score: finalSession.score,
                    ended_at: new Date().toISOString()
                }).eq('id', targetId);
            } else {
                // Insert full record if create on start was missed or failed
                const { data } = await client.from('focus_sessions').insert({
                    user_id: user.id,
                    planned_duration_minutes: finalSession.plannedDurationMinutes,
                    actual_duration_minutes: actualMinutes,
                    status: finalSession.wasCompleted ? 'completed' : 'cancelled',
                    interruption_count: finalSession.interruptionCount,
                    total_interruption_seconds: Math.round(finalSession.totalInterruptionMs / 1000),
                    pause_count: finalSession.pauseCount,
                    total_pause_seconds: Math.round(finalSession.totalPauseMs / 1000),
                    idle_seconds: Math.round(finalSession.idleMs / 1000),
                    focus_score: finalSession.score,
                    started_at: new Date(finalSession.startTime).toISOString(),
                    ended_at: new Date().toISOString()
                }).select('id').single();

                if (data) targetId = data.id;
            }

            if (targetId) {
                const logRows = finalSession.events
                    .filter(e => ['APP_LEFT', 'IDLE', 'PAUSE', 'RESUME'].includes(e.type))
                    .map(e => ({
                        user_id: user.id,
                        session_id: targetId,
                        event_type: e.type,
                        duration_seconds: e.durationMs ? Math.round(e.durationMs / 1000) : 0,
                        created_at: new Date(e.ts).toISOString()
                    }));
                if (logRows.length > 0) {
                    await client.from('distraction_logs').insert(logRows);
                }
            }
        } catch (e) {
            console.warn('[DistractionAgent] DB session finalize failed:', e.message);
        }
    }

    async _logDistractionEvent(type, durationMs) {
        const user = SupabaseAdapter.cachedUser;
        if (!user || !this._session?.dbId || !navigator.onLine) return;
        try {
            const client = SupabaseAdapter.getClient();
            await client.from('distraction_logs').insert({
                user_id: user.id,
                session_id: this._session.dbId,
                event_type: type,
                duration_seconds: Math.round(durationMs / 1000),
                created_at: new Date().toISOString()
            });
        } catch (e) { /* non-critical */ }
    }

    destroy() {
        this._detachListeners();
        this._clearIdleTimer();
        this._session = null;
        super.destroy();
    }
}
