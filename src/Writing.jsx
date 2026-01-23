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
    const [title, setTitle] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showPrompts, setShowPrompts] = useState(false);
    const [savedStatus, setSavedStatus] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isCloudSynced, setIsCloudSynced] = useState(false);

    // Load from Cloud (Supabase) on mount
    useEffect(() => {
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        setWordCount(words);
    }, [text]);

    useEffect(() => {
        const loadContent = async () => {
            setIsLoading(true);
            try {
                // First check local backup
                const localDraft = localStorage.getItem('focus_writing_draft');
                const localTitle = localStorage.getItem('focus_writing_title');
                if (localDraft) setText(localDraft);
                if (localTitle) setTitle(localTitle);

                // Then try to fetch from cloud
                const user = await import('./agents/adapters/SupabaseAdapter.js').then(m => m.default.getUser());
                if (user) {
                    setIsCloudSynced(true);
                    const client = await import('./agents/adapters/SupabaseAdapter.js').then(m => m.default.getClient());
                    const { data, error } = await client
                        .from('writings')
                        .select('content, title, updated_at')
                        .eq('user_id', user.id)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (data) {
                        if (data.content) setText(data.content);
                        if (data.title) setTitle(data.title);
                        setLastSaved(new Date(data.updated_at));
                    }
                } else {
                    setIsCloudSynced(false);
                }
            } catch (e) {
                console.error("Error loading writing:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadContent();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setSavedStatus('Saving...');

        // 1. Save Local (Backup)
        localStorage.setItem('focus_writing_draft', text);
        localStorage.setItem('focus_writing_title', title);

        try {
            // 2. Save Cloud if logged in
            const SupabaseAdapter = await import('./agents/adapters/SupabaseAdapter.js').then(m => m.default);
            const user = await SupabaseAdapter.getUser();

            if (user) {
                const client = SupabaseAdapter.getClient();

                // Upsert by user_id so each user has a single latest writing entry
                const { error } = await client
                    .from('writings')
                    .upsert(
                        {
                            user_id: user.id,
                            content: text,
                            title: title,
                            updated_at: new Date().toISOString()
                        },
                        { onConflict: 'user_id' }
                    );

                if (error) throw error;
                const now = new Date();
                setLastSaved(now);
                setSavedStatus('Saved to Cloud!');
            } else {
                setSavedStatus('Saved Locally');
            }
        } catch (e) {
            console.error("Cloud save failed, queueing for sync:", e);
            setSavedStatus('Saved Locally (Sync Pending)');
            // Queue for background sync
            import('./agents/core/SyncAgent.js').then(m => {
                m.default.addToQueue('writing', 'save', { content: text, title: title });
            });
        } finally {
            setIsSaving(false);
            // Hide the status a short time after showing the final result
            setTimeout(() => setSavedStatus(''), 2000);
        }
    };

    const handleClear = async () => {
        if (window.confirm('Are you sure you want to clear your writing? This cannot be undone.')) {
            setText('');
            setTitle('');
            localStorage.removeItem('focus_writing_draft');
            localStorage.removeItem('focus_writing_title');

            // Also clear cloud?
            try {
                const SupabaseAdapter = await import('./agents/adapters/SupabaseAdapter.js').then(m => m.default);
                const user = await SupabaseAdapter.getUser();
                if (user) {
                    const client = SupabaseAdapter.getClient();
                    await client.from('writings').delete().eq('user_id', user.id);
                }
            } catch (e) { console.warn("Cloud clear failed", e); }
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
                            <div className="d-flex align-items-center gap-3 mb-2">
                                <h1 className="display-5 fw-bold d-flex align-items-center gap-3 mb-0">
                                    <PenTool className="text-primary" /> Open Space
                                </h1>
                                {isCloudSynced && <span className="badge bg-primary bg-opacity-25 text-primary">Cloud Synced</span>}
                            </div>
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
                    <div className="d-flex gap-3 align-items-center small text-muted flex-grow-1">
                        <input
                            type="text"
                            className="form-control form-control-sm border-0 bg-transparent shadow-none"
                            style={{ maxWidth: '200px', outline: 'none' }}
                            placeholder="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <span className="fw-bold text-primary">{wordCount} words</span>
                        {savedStatus && (
                            <span className="d-flex align-items-center gap-1 small">
                                {isSaving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
                                        <span className="text-primary">{savedStatus}</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} className="text-success" />
                                        <span className="text-success">{savedStatus}</span>
                                    </>
                                )}
                            </span>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm bg-light border-0 rounded-circle p-2 hover-scale text-body" onClick={handleSave} title="Save Draft" aria-label="Save Draft">
                            <Save size={18} className="opacity-75" />
                        </button>
                        <button className="btn btn-sm bg-light border-0 rounded-circle p-2 hover-scale text-body" onClick={handleClear} title="Clear" aria-label="Clear drafting space">
                            <Trash2 size={18} className="opacity-75" />
                        </button>
                        <div className="vr opacity-25 mx-1"></div>
                        <button className="btn btn-sm bg-light border-0 rounded-circle p-2 hover-scale text-body" onClick={toggleFullScreen} title="Toggle Fullscreen" aria-label="Toggle Fullscreen mode">
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
