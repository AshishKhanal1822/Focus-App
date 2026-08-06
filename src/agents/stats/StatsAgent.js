// src/agents/stats/StatsAgent.js
import { BaseAgent } from '../core/BaseAgent.js';
import SupabaseAdapter from '../adapters/SupabaseAdapter.js';
import SyncAgent from '../core/SyncAgent.js';
import LocalStorageAdapter from '../adapters/LocalStorageAdapter.js';

export class StatsAgent extends BaseAgent {
    constructor() {
        super();
        this.todayStr = this.getTodayStr();
        this.screenTimeTicker = null;
        this.activeScreenSeconds = 0;
        this.flushInterval = null;
        this.lastActiveTime = Date.now();
        this.isWindowFocused = true;

        // Stats buffer for the current session to batch writes
        this.buffer = {
            screen_time_seconds: 0,
            reading_time_seconds: 0,
            focus_time_seconds: 0,
            writing_time_seconds: 0,
            tasks_completed: 0,
            words_written: 0,
            focus_sessions_completed: 0
        };
    }

    getTodayStr() {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    }

    init() {
        if (!super.init()) return;
        // Listen to stats increments from other components
        this.on('STATS_INCREMENT', this.handleStatsIncrement.bind(this));
        
        // Listen to Focus Manager session completion
        this.on('FOCUS_COMPLETED', this.handleFocusCompleted.bind(this));

        // Listen for visibility and focus events
        window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('focus', this.handleFocus.bind(this));
        window.addEventListener('blur', this.handleBlur.bind(this));
        window.addEventListener('beforeunload', this.flush.bind(this));

        // Start screen time tracking
        this.startScreenTimeTracker();

        // Periodically flush buffer (every 10 seconds)
        this.flushInterval = setInterval(() => this.flush(), 10000);

        // Daily transition checker (in case user keeps app open past midnight)
        this.dateChecker = setInterval(() => {
            const today = this.getTodayStr();
            if (today !== this.todayStr) {
                this.flush();
                this.todayStr = today;
            }
        }, 60000);
    }

    startScreenTimeTracker() {
        this.screenTimeTicker = setInterval(() => {
            const now = Date.now();
            const isVisible = document.visibilityState === 'visible';
            const isUserActive = now - this.lastActiveTime < 5 * 60 * 1000;

            if (isVisible && this.isWindowFocused && isUserActive) {
                this.activeScreenSeconds++;
                if (this.activeScreenSeconds >= 10) {
                    this.buffer.screen_time_seconds += this.activeScreenSeconds;
                    this.activeScreenSeconds = 0;
                    this.emitStatsUpdated();
                }
            }
        }, 1000);

        // Setup user activity listeners to detect active usage
        const recordActivity = () => { this.lastActiveTime = Date.now(); };
        window.addEventListener('mousemove', recordActivity, { passive: true });
        window.addEventListener('keydown', recordActivity, { passive: true });
        window.addEventListener('click', recordActivity, { passive: true });
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            this.flush();
        } else {
            this.lastActiveTime = Date.now();
        }
    }

    handleFocus() {
        this.isWindowFocused = true;
        this.lastActiveTime = Date.now();
    }

    handleBlur() {
        this.isWindowFocused = false;
        this.flush();
    }

    handleStatsIncrement(increments) {
        if (!increments) return;
        let changed = false;
        for (const [key, val] of Object.entries(increments)) {
            if (key in this.buffer) {
                this.buffer[key] += val;
                // Prevent in-memory buffer from going negative for discrete counters
                if (key === 'tasks_completed' && this.buffer[key] < 0) {
                    this.buffer[key] = 0;
                }
                changed = true;
            }
        }
        if (changed) {
            this.emitStatsUpdated();
        }
    }

    handleFocusCompleted({ duration }) {
        const seconds = Math.round(duration * 60);
        this.handleStatsIncrement({
            focus_time_seconds: seconds,
            focus_sessions_completed: 1
        });
    }

    emitStatsUpdated() {
        this.emit('STATS_UPDATED', {
            date: this.todayStr,
            buffer: { ...this.buffer }
        });
    }

    /** Flush the buffer to local cache and sync to Supabase */
    async flush() {
        if (this.activeScreenSeconds > 0) {
            this.buffer.screen_time_seconds += this.activeScreenSeconds;
            this.activeScreenSeconds = 0;
        }

        const hasData = Object.values(this.buffer).some(v => v > 0);
        if (!hasData) return;

        const currentBuffer = { ...this.buffer };
        
        // Reset buffer immediately
        this.buffer = {
            screen_time_seconds: 0,
            reading_time_seconds: 0,
            focus_time_seconds: 0,
            writing_time_seconds: 0,
            tasks_completed: 0,
            words_written: 0,
            focus_sessions_completed: 0
        };

        // 1. Save locally
        this.saveToLocalHistory(this.todayStr, currentBuffer);

        // 2. Sync to Supabase
        const user = SupabaseAdapter.cachedUser;
        if (user) {
            if (navigator.onLine) {
                try {
                    const client = SupabaseAdapter.getClient();
                    const { error } = await client.rpc('increment_user_stats', {
                        p_user_id: user.id,
                        p_date: this.todayStr,
                        p_screen_time: currentBuffer.screen_time_seconds,
                        p_reading_time: currentBuffer.reading_time_seconds,
                        p_focus_time: currentBuffer.focus_time_seconds,
                        p_writing_time: currentBuffer.writing_time_seconds,
                        p_tasks_completed: currentBuffer.tasks_completed,
                        p_words_written: currentBuffer.words_written,
                        p_focus_sessions: currentBuffer.focus_sessions_completed
                    });

                    if (error) {
                        console.warn("Direct stats save failed, queueing for sync:", error);
                        SyncAgent.addToQueue('stats', 'increment', { date: this.todayStr, ...currentBuffer });
                    }
                } catch (err) {
                    console.warn("Exception while direct syncing stats, queueing:", err);
                    SyncAgent.addToQueue('stats', 'increment', { date: this.todayStr, ...currentBuffer });
                }
            } else {
                SyncAgent.addToQueue('stats', 'increment', { date: this.todayStr, ...currentBuffer });
            }
        }

        // Notify Dashboard that data has been committed so it re-reads from storage.
        // Do NOT emit STATS_UPDATED here — the buffer is now empty (reset above) and
        // emitting it would wipe the focus time that was just displayed in the Dashboard.
        this.emit('STATS_FLUSHED', { date: this.todayStr, flushed: currentBuffer });
    }

    saveToLocalHistory(dateStr, increments) {
        const historyKey = 'focus_stats_local_history';
        const history = LocalStorageAdapter.get(historyKey) || {};
        
        if (!history[dateStr]) {
            history[dateStr] = {
                screen_time_seconds: 0,
                reading_time_seconds: 0,
                focus_time_seconds: 0,
                writing_time_seconds: 0,
                tasks_completed: 0,
                words_written: 0,
                focus_sessions_completed: 0
            };
        }

        for (const [key, val] of Object.entries(increments)) {
            if (key in history[dateStr]) {
                history[dateStr][key] += val;
                // Prevent negative counts for non-time metrics
                if (key === 'tasks_completed' && history[dateStr][key] < 0) {
                    history[dateStr][key] = 0;
                }
            }
        }

        const dates = Object.keys(history).sort();
        if (dates.length > 30) {
            delete history[dates[0]];
        }

        LocalStorageAdapter.set(historyKey, history);
    }

    destroy() {
        this.flush();
        clearInterval(this.screenTimeTicker);
        clearInterval(this.flushInterval);
        clearInterval(this.dateChecker);
        window.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('focus', this.handleFocus);
        window.removeEventListener('blur', this.handleBlur);
        window.removeEventListener('beforeunload', this.flush);
        super.destroy();
    }
}
