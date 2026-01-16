// src/components/NavFocusTimer.jsx
import React from 'react';
import { useAgentEvent } from '../hooks/useAgentEvent';
import { eventBus } from '../agents/core/EventBus.js';

export default function NavFocusTimer() {
    const state = useAgentEvent('FOCUS_STATE_UPDATED', { status: 'idle', remainingMs: 0 });

    const minutes = Math.floor(state.remainingMs / 60000);
    const seconds = Math.floor((state.remainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0');

    const handleStart = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        eventBus.emit('FOCUS_START', { durationMinutes: 25 });
    };

    const handleCancel = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        eventBus.emit('FOCUS_CANCEL');
    };

    if (state.status === 'running') {
        return (
            <div className="d-flex align-items-center gap-2 glass px-3 py-1 rounded-pill">
                <span className="fw-bold text-primary small">
                    {minutes}:{seconds}
                </span>
                <button
                    type="button"
                    className="btn btn-sm btn-link p-2 text-danger text-decoration-none small fw-bold"
                    onClick={handleCancel}
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            className="btn btn-sm btn-outline-primary rounded-pill px-3"
            onClick={handleStart}
        >
            Start 25-min Focus
        </button>
    );
}
