// src/components/FocusTimer.jsx
// UI component that shows the current focus session state.
// It uses the useAgentEvent hook to listen for "FOCUS_STATE_UPDATED" events.

import React from 'react';
import './FocusTimer.css';
import FocusHistory from './FocusHistory.jsx';
import { useAgentEvent } from '../hooks/useAgentEvent';
import { eventBus } from '../agents/core/EventBus.js';

export default function FocusTimer() {
    // Payload shape: { status: 'idle'|'running'|'completed', remainingMs: number }
    const state = useAgentEvent('FOCUS_STATE_UPDATED', { status: 'idle', remainingMs: 0 });

    const minutes = Math.floor(state.remainingMs / 60000);
    const seconds = Math.floor((state.remainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0');

    const handleStart = () => {
        eventBus.emit('FOCUS_START', { durationMinutes: 25 });
    };

    const handleCancel = () => {
        eventBus.emit('FOCUS_CANCEL');
    };

    return (
        <div id="focus-session-timer" className="focus-timer glass p-3 rounded mb-4">
            <h5 className="fw-bold mb-2">Focus Session</h5>
            {state.status === 'running' ? (
                <div className="d-flex align-items-center justify-content-between">
                    <span className="fs-4">
                        {minutes}:{seconds}
                    </span>
                    <button className="btn btn-outline-danger btn-sm" onClick={handleCancel}>
                        Cancel
                    </button>
                </div>
            ) : (
                <button className="btn btn-primary" onClick={handleStart}>
                    Start 25‑min Focus
                </button>
            )}

            <div className="mt-3 border-top pt-3 border-white-10">
                <FocusHistory />
            </div>
        </div>
    );
}
