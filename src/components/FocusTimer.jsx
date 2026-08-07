// src/components/FocusTimer.jsx
// UI component that shows the current focus session state.
// It uses the useAgentEvent hook to listen for "FOCUS_STATE_UPDATED" events.

import React, { useState } from 'react';
import './FocusTimer.css';
import FocusHistory from './FocusHistory.jsx';
import { useAgentEvent } from '../hooks/useAgentEvent';
import { eventBus } from '../agents/core/EventBus.js';
import { Play, Square, Coffee, Brain, Armchair, Clock, Pause } from 'lucide-react';

export default function FocusTimer() {
    // Payload shape: { status: 'idle'|'running'|'completed', remainingMs: number }
    const state = useAgentEvent('FOCUS_STATE_UPDATED', { status: 'idle', remainingMs: 0 });
    const [mode, setMode] = useState('focus'); // focus, short, long

    const modes = {
        focus: { label: 'Focus', minutes: 25, color: 'text-primary', icon: <Brain size={18} /> },
        short: { label: 'Short Break', minutes: 5, color: 'text-success', icon: <Coffee size={18} /> },
        long: { label: 'Long Break', minutes: 15, color: 'text-info', icon: <Armchair size={18} /> }
    };

    const minutes = Math.floor(state.remainingMs / 60000);
    const seconds = Math.floor((state.remainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0');

    const handleStart = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        eventBus.emit('FOCUS_START', { durationMinutes: modes[mode].minutes });
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen request failed:", err);
        }
    };

    const handleCancel = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        eventBus.emit('FOCUS_CANCEL');
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.warn("Exit fullscreen failed:", err);
        }
    };

    const handlePause = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (state.status === 'paused') {
            eventBus.emit('FOCUS_RESUME');
        } else {
            eventBus.emit('FOCUS_PAUSE');
        }
    };

    const handleModeSelect = (m) => {
        if (state.status !== 'running') {
            setMode(m);
        }
    };

    return (
        <div id="focus-session-timer" className="focus-timer glass rounded-4 overflow-hidden mb-4 shadow-sm">
            {/* Header / Mode Selector */}
            <div className="p-1 bg-white bg-opacity-20 d-flex justify-content-between align-items-center border-bottom border-white border-opacity-10">
                {Object.keys(modes).map((m) => (
                    <button
                        key={m}
                        onClick={() => handleModeSelect(m)}
                        className={`btn btn-sm border-0 rounded-pill d-flex align-items-center gap-2 px-3 py-2 transition-all ${mode === m ? 'bg-white shadow-sm fw-bold text-body' : 'text-muted hover-bg-white-10'}`}
                        disabled={state.status === 'running' || state.status === 'paused'}
                        style={{ fontSize: '0.85rem' }}
                    >
                        <span className={mode === m ? modes[m].color : ''}>{modes[m].icon}</span>
                        {modes[m].label}
                    </button>
                ))}
            </div>

            <div className="p-4 text-center">
                {/* Timer Display */}
                <div className="mb-4 position-relative">
                    <div className="display-1 fw-bold font-monospace" style={{ letterSpacing: '-2px' }}>
                        {(state.status === 'running' || state.status === 'paused') ? (
                            <>
                                <span className={state.status === 'paused' ? 'text-warning' : ''}>{minutes}:{seconds}</span>
                                {state.status === 'paused' && (
                                    <div className="small text-warning fw-semibold mt-1" style={{ fontSize: '0.8rem', letterSpacing: '0.1em' }}>⏸ PAUSED</div>
                                )}
                            </>
                        ) : (
                            <span className="opacity-50">
                                {modes[mode].minutes}:00
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls */}
                {(state.status === 'running' || state.status === 'paused') ? (
                    <div className="d-flex gap-2 justify-content-center flex-wrap">
                        <button
                            type="button"
                            className={`btn btn-lg rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm ${
                                state.status === 'paused' ? 'btn-success text-white' : 'btn-warning text-dark'
                            }`}
                            onClick={handlePause}
                        >
                            {state.status === 'paused' ? <><Play size={18} fill="currentColor" /> Resume</> : <><Pause size={18} /> Pause</>}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger btn-lg rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm"
                            onClick={handleCancel}
                        >
                            <Square size={18} fill="currentColor" /> Stop
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className={`btn btn-lg rounded-pill px-5 d-flex align-items-center gap-2 mx-auto hover-scale shadow-lg ${mode === 'focus' ? 'btn-primary' : 'btn-success text-white'}`}
                        onClick={handleStart}
                    >
                        <Play size={20} fill="currentColor" /> Start {modes[mode].label}
                    </button>
                )}
            </div>

            <div className="px-3 pb-3">
                <div className="accordion accordion-flush bg-transparent" id="historyAccordion">
                    <div className="accordion-item bg-transparent border-0">
                        <h2 className="accordion-header">
                            <button className="accordion-button collapsed bg-transparent shadow-none small text-muted py-2" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseHistory">
                                <Clock size={14} className="me-2" /> Recent Sessions
                            </button>
                        </h2>
                        <div id="flush-collapseHistory" className="accordion-collapse collapse">
                            <div className="accordion-body p-0 pt-2">
                                <FocusHistory />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
