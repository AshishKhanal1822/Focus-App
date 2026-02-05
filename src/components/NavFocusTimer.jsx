// src/components/NavFocusTimer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAgentEvent } from '../hooks/useAgentEvent';
import { eventBus } from '../agents/core/EventBus.js';
import { Clock } from 'lucide-react';

export default function NavFocusTimer() {
    const state = useAgentEvent('FOCUS_STATE_UPDATED', { status: 'idle', remainingMs: 0 });
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState(25);
    const dropdownRef = useRef(null);

    const minutes = Math.floor(state.remainingMs / 60000);
    const seconds = Math.floor((state.remainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0');

    const durationOptions = [5, 15, 25, 45, 60];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStart = (duration) => {
        eventBus.emit('FOCUS_START', { durationMinutes: duration });
        setShowDropdown(false);
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
        <div className="position-relative" ref={dropdownRef}>
            <button
                type="button"
                className="btn btn-sm btn-outline-primary rounded-pill px-3 d-flex align-items-center gap-2"
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <Clock size={16} />
                <span>Start Focus</span>
            </button>

            {showDropdown && (
                <div
                    className="dropdown-menu show position-absolute mt-2 glass shadow-lg border-0 p-2"
                    style={{
                        minWidth: '180px',
                        zIndex: 1100,
                        left: '50%',
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="small text-muted mb-2 px-2 fw-semibold">Select Duration</div>
                    {durationOptions.map((duration) => (
                        <button
                            key={duration}
                            type="button"
                            className={`dropdown-item rounded px-3 py-2 d-flex align-items-center justify-content-between ${selectedDuration === duration ? 'active' : ''
                                }`}
                            onClick={() => {
                                setSelectedDuration(duration);
                                handleStart(duration);
                            }}
                        >
                            <span>{duration} minutes</span>
                            {selectedDuration === duration && (
                                <span className="badge bg-primary rounded-pill">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
