import React, { useState, useEffect } from 'react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import SyncAgent from './agents/core/SyncAgent.js';

function Todo() {
    const [tasks, setTasks] = useState([]);
    const [input, setInput] = useState('');
    const [isCloud, setIsCloud] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load & Auth Subscription
    useEffect(() => {
        let mounted = true;
        let lastUserId = null;

        const unsubscribe = SupabaseAdapter.subscribe(async (user) => {
            if (!mounted) return;

            // Only re-fetch if user ID changed
            if (user?.id !== lastUserId) {
                lastUserId = user?.id || null;
                setIsLoading(true);

                try {
                    if (user) {
                        setIsCloud(true);
                        const { data } = await SupabaseAdapter.getClient()
                            .from('tasks')
                            .select('*')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: true });

                        if (mounted) {
                            let mergedTasks = data || [];

                            // MERGE PENDING QUEUE ITEMS (Offline Persistence)
                            try {
                                const queue = SyncAgent.getQueue();
                                const pendingTodos = queue.filter(item => item.type === 'todo');

                                // 1. Apply Pending Adds
                                const pendingAdds = pendingTodos
                                    .filter(item => item.action === 'add')
                                    .map(item => ({
                                        id: item.id, // Use the temp id from queue
                                        text: item.data.text,
                                        completed: item.data.completed,
                                        pending: true
                                    }));
                                mergedTasks = [...mergedTasks, ...pendingAdds];

                                // 2. Apply Pending Updates
                                pendingTodos.filter(item => item.action === 'update').forEach(item => {
                                    mergedTasks = mergedTasks.map(t =>
                                        t.id === item.data.id ? { ...t, ...item.data.updates, pending: true } : t
                                    );
                                });

                                // 3. Apply Pending Deletes
                                const pendingDeletes = new Set(pendingTodos.filter(item => item.action === 'delete').map(item => item.data.id));
                                mergedTasks = mergedTasks.filter(t => !pendingDeletes.has(t.id));

                            } catch (qErr) {
                                console.warn("Failed to merge sync queue", qErr);
                            }

                            setTasks(mergedTasks);
                        }
                    } else {
                        setIsCloud(false);
                        // Load from LocalStorage
                        const savedTasks = localStorage.getItem('tasks');
                        if (mounted && savedTasks) setTasks(JSON.parse(savedTasks));
                    }
                } catch (err) {
                    console.error('Failed to load tasks', err);
                } finally {
                    if (mounted) setIsLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    // Save to LocalStorage (only if guest)
    useEffect(() => {
        if (!isCloud && !isLoading) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
    }, [tasks, isCloud, isLoading]);

    const addTask = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const tempId = Date.now();
        const newTask = { id: tempId, text: input, completed: false, pending: true };

        // 1. Optimistic Update
        setTasks(prev => [...prev, newTask]);
        setInput('');

        // 2. Background Sync
        if (isCloud) {
            // We use cachedUser for immediate action.
            // We know we are logged in because `isCloud` is true.
            const user = SupabaseAdapter.cachedUser;

            if (user) {
                (async () => {
                    try {
                        const { data, error } = await SupabaseAdapter.getClient()
                            .from('tasks')
                            .insert([{ user_id: user.id, text: newTask.text, completed: false }])
                            .select()
                            .single();

                        if (error) throw error;

                        // Replace temp ID with real ID and remove pending flag
                        setTasks(prev => prev.map(t => t.id === tempId ? { ...data, pending: false } : t));
                    } catch (err) {
                        console.warn("Cloud add failed, queueing for sync", err);
                        // Queue for background sync
                        import('./agents/core/SyncAgent.js').then(m => {
                            m.default.addToQueue('todo', 'add', { text: newTask.text, completed: false });
                        });
                    }
                })();
            } else {
                console.warn("User session lost during add task");
            }
        } else {
            // Guest mode: update local storage implicitly via effect
        }
    };

    const toggleTask = async (id, currentStatus) => {
        // 1. Optimistic Update
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));

        // 2. Background Sync
        if (isCloud) {
            (async () => {
                try {
                    const { error } = await SupabaseAdapter.getClient()
                        .from('tasks')
                        .update({ completed: !currentStatus })
                        .eq('id', id);
                    if (error) throw error;
                } catch (err) {
                    console.warn("Cloud toggle failed, queueing for sync");
                    import('./agents/core/SyncAgent.js').then(m => {
                        m.default.addToQueue('todo', 'update', { id, updates: { completed: !currentStatus } });
                    });
                }
            })();
        }
    };

    const deleteTask = async (id) => {
        // 1. Optimistic Update
        setTasks(prev => prev.filter(task => task.id !== id));

        // 2. Background Sync
        if (isCloud) {
            (async () => {
                try {
                    const { error } = await SupabaseAdapter.getClient()
                        .from('tasks')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                } catch (err) {
                    console.warn("Cloud delete failed, queueing for sync");
                    import('./agents/core/SyncAgent.js').then(m => {
                        m.default.addToQueue('todo', 'delete', { id });
                    });
                }
            })();
        }
    };

    return (
        <div className="todo-container glass p-4 mt-5 animate-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0 fw-bold">Daily Tasks</h3>
                {isCloud && <span className="badge bg-primary bg-opacity-25 text-primary small">Cloud Synced</span>}
            </div>

            <form onSubmit={addTask} className="d-flex gap-2 mb-4">
                <input
                    type="text"
                    className="form-control glass"
                    placeholder="Add a new task..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'inherit' }}
                />
                <button type="submit" className="btn btn-primary">
                    Add
                </button>
            </form>

            <div className="task-list d-flex flex-column gap-3">
                {tasks.length === 0 ? (
                    <p className="opacity-50 text-center py-4">
                        {isLoading ? 'Loading...' : 'No tasks yet. Start your day!'}
                    </p>
                ) : (
                    tasks.map(task => (
                        <div
                            key={task.id}
                            className="task-item d-flex align-items-center justify-content-between glass p-3"
                            style={{ animation: 'fadeIn 0.3s ease forwards', background: 'rgba(255,255,255,0.02)' }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(task.id, task.completed)}
                                    className="form-check-input"
                                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                />
                                <span
                                    style={{
                                        textDecoration: task.completed ? 'line-through' : 'none',
                                        opacity: task.completed ? 0.5 : 1,
                                        transition: 'var(--transition)',
                                        fontWeight: 500
                                    }}
                                >
                                    {task.text}
                                </span>
                            </div>
                            <button
                                onClick={() => deleteTask(task.id)}
                                className="btn btn-sm btn-outline-danger border-0 rounded-circle"
                                style={{ transition: 'var(--transition)' }}
                                aria-label={`Delete task: ${task.text}`}
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Todo;
