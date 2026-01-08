// src/components/FocusHistory.jsx
import React, { useState, useEffect } from 'react';
import { StorageAgent } from '../agents/storage/StorageAgent.js';

export default function FocusHistory() {
    const [history, setHistory] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    // We instantiate a throwaway StorageAgent to read history.
    // In a stricter setup, we might emit a REQUEST_HISTORY event and wait for RESPONSE_HISTORY,
    // but direct read for view-only components is acceptable for simplicity in this architecture.
    useEffect(() => {
        if (isOpen) {
            const storage = new StorageAgent();
            // We don't need to init() the agent fully (listeners), just the DB
            storage.dbAdapter.init().then(async () => {
                const data = await storage.getSessionHistory();
                // Sort newest first
                setHistory(data.reverse());
            });
        }
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                className="btn btn-sm btn-outline-light opacity-75"
                onClick={() => setIsOpen(true)}
            >
                Show History
            </button>
        );
    }

    return (
        <div className="glass p-3 rounded mt-3 slide-in-bottom">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Session History</h6>
                <button
                    className="btn btn-sm btn-link text-decoration-none text-muted"
                    onClick={() => setIsOpen(false)}
                >
                    Close
                </button>
            </div>

            {history.length === 0 ? (
                <p className="small opacity-50 mb-0">No completed sessions yet.</p>
            ) : (
                <div className="overflow-auto" style={{ maxHeight: '200px' }}>
                    {history.map((session, i) => (
                        <div key={i} className="d-flex justify-content-between small border-bottom border-light mb-2 pb-2">
                            <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                            <span>{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="fw-bold">{session.duration} min</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
