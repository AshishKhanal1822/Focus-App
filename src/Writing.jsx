import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Save, Trash2, Maximize2, Minimize2, Sparkles, Copy, Check } from 'lucide-react';

const prompts = [
    "What is one thing you would change about the world today?",
    "Describe your perfect morning routine.",
    "Write a letter to your future self, 5 years from now.",
    "What does 'success' mean to you?",
    "Describe a moment where you felt completely at peace.",
    "If you could have dinner with any historical figure, who would it be and why?"
];

function Writing() {
    const [text, setText] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showPrompts, setShowPrompts] = useState(false);
    const [savedStatus, setSavedStatus] = useState('');

    useEffect(() => {
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        setWordCount(words);
    }, [text]);

    useEffect(() => {
        const savedText = localStorage.getItem('focus_writing_draft');
        if (savedText) {
            setText(savedText);
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('focus_writing_draft', text);
        setSavedStatus('Saved!');
        setTimeout(() => setSavedStatus(''), 2000);
    };

    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear your writing? This cannot be undone.')) {
            setText('');
            localStorage.removeItem('focus_writing_draft');
        }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const insertPrompt = (prompt) => {
        setText(prev => prev + (prev ? '\n\n' : '') + `Prompt: ${prompt}\n\n`);
        setShowPrompts(false);
    };

    return (
        <div className={`min-vh-100 d-flex flex-column ${isFullScreen ? 'bg-white' : 'container py-5'}`}>
            <AnimatePresence>
                {!isFullScreen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="d-flex justify-content-between align-items-center mb-4"
                    >
                        <div>
                            <h1 className="display-5 fw-bold d-flex align-items-center gap-3">
                                <PenTool className="text-primary" /> Open Space
                            </h1>
                            <p className="opacity-75">A distraction-free zone for your thoughts.</p>
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2"
                                onClick={() => setShowPrompts(!showPrompts)}
                            >
                                <Sparkles size={18} /> Need Inspiration?
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPrompts && !isFullScreen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="glass p-4 rounded-4">
                            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                <Sparkles size={16} className="text-warning" /> Writing Prompts
                            </h5>
                            <div className="d-flex flex-wrap gap-2 text-primary">
                                {prompts.map((p, i) => (
                                    <button
                                        key={i}
                                        className="btn btn-sm btn-light glass text-start"
                                        onClick={() => insertPrompt(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                layout
                className={`flex-grow-1 glass rounded-4 overflow-hidden d-flex flex-column shadow-sm ${isFullScreen ? 'rounded-0 border-0 vh-100' : ''}`}
                style={{ minHeight: '60vh' }}
            >
                {/* Toolbar */}
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white bg-opacity-50">
                    <div className="d-flex gap-3 align-items-center small text-muted">
                        <span className="fw-bold text-primary">{wordCount} words</span>
                        {savedStatus && <span className="text-success d-flex align-items-center gap-1"><Check size={14} /> {savedStatus}</span>}
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm bg-light border-0 rounded-circle p-2 hover-scale text-body" onClick={handleSave} title="Save Draft">
                            <Save size={18} className="opacity-75" />
                        </button>
                        <button className="btn btn-sm bg-light border-0 rounded-circle p-2 hover-scale text-body" onClick={handleClear} title="Clear">
                            <Trash2 size={18} className="opacity-75" />
                        </button>
                        <div className="vr opacity-25 mx-1"></div>
                        <button className="btn btn-sm bg-light border-0 rounded-circle p-2 hover-scale text-body" onClick={toggleFullScreen} title="Toggle Fullscreen">
                            {isFullScreen ? <Minimize2 size={18} className="opacity-75" /> : <Maximize2 size={18} className="opacity-75" />}
                        </button>
                    </div>
                </div>

                {/* Editor */}
                <textarea
                    className="form-control border-0 bg-transparent flex-grow-1 p-4 p-md-5 fs-5 shadow-none"
                    style={{ resize: 'none', outline: 'none' }}
                    placeholder="Start writing..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                />
            </motion.div>
        </div>
    );
}

export default Writing;
