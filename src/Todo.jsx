import React, { useState, useEffect } from 'react';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';

function Todo() {
    const [tasks, setTasks] = useState([]);
    const [input, setInput] = useState('');
    const [isCloud, setIsCloud] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        const loadTasks = async () => {
            setIsLoading(true);
            const user = await SupabaseAdapter.getUser();

            if (user) {
                setIsCloud(true);
                const { data } = await SupabaseAdapter.getClient()
                    .from('tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (data) setTasks(data);
            } else {
                // Load from LocalStorage
                const savedTasks = localStorage.getItem('tasks');
                if (savedTasks) setTasks(JSON.parse(savedTasks));
            }
            setIsLoading(false);
        };
        loadTasks();
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

        const newTask = { text: input, completed: false };

        if (isCloud) {
            try {
                const user = await SupabaseAdapter.getUser();
                const { data, error } = await SupabaseAdapter.getClient()
                    .from('tasks')
                    .insert([{ user_id: user.id, text: input, completed: false }])
                    .select()
                    .single();

                if (error) throw error;
                if (data) setTasks([...tasks, data]);
            } catch (err) {
                console.warn("Cloud add failed, queueing for sync", err);
                const tempId = Date.now();
                const tempTask = { ...newTask, id: tempId, pending: true };
                setTasks([...tasks, tempTask]);

                // Queue for background sync
                import('./agents/core/SyncAgent.js').then(m => {
                    m.default.addToQueue('todo', 'add', newTask);
                });
            }
        } else {
            setTasks([...tasks, { id: Date.now(), text: input, completed: false }]);
        }
        setInput('');
    };

    const toggleTask = async (id, currentStatus) => {
        // Optimistic update
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));

        if (isCloud) {
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
        }
    };

    const deleteTask = async (id) => {
        // Optimistic update
        setTasks(tasks.filter(task => task.id !== id));

        if (isCloud) {
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
                    disabled={isLoading}
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? '...' : 'Add'}
                </button>
            </form>
            <div className="task-list d-flex flex-column gap-3">
                {tasks.length === 0 ? (
                    <p className="opacity-50 text-center py-4">
                        {isLoading ? 'Loading...' : 'No tasks yet. Start your day!'}
                    </p>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="task-item d-flex align-items-center justify-content-between glass p-3"
                            style={{ animation: 'fadeIn 0.3s ease forwards', background: 'rgba(255,255,255,0.02)' }}>
                            <div className="d-flex align-items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(task.id, task.completed)}
                                    className="form-check-input"
                                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                />
                                <span style={{
                                    textDecoration: task.completed ? 'line-through' : 'none',
                                    opacity: task.completed ? 0.5 : 1,
                                    transition: 'var(--transition)',
                                    fontWeight: 500
                                }}>
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
