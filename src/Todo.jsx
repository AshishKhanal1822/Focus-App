import React, { useState, useEffect } from 'react';

function Todo() {
    const [tasks, setTasks] = useState(() => {
        const savedTasks = localStorage.getItem('tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    const [input, setInput] = useState('');

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: input, completed: false }]);
        setInput('');
    };

    const toggleTask = (id) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    };

    const deleteTask = (id) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    return (
        <div className="todo-container glass p-4 mt-5 animate-fade-in">
            <h3 className="mb-4 fw-bold">Daily Tasks</h3>
            <form onSubmit={addTask} className="d-flex gap-2 mb-4">
                <input
                    type="text"
                    className="form-control glass"
                    placeholder="Add a new task..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'inherit' }}
                />
                <button type="submit" className="btn btn-primary">Add</button>
            </form>
            <div className="task-list d-flex flex-column gap-3">
                {tasks.length === 0 ? (
                    <p className="opacity-50 text-center py-4">No tasks yet. Start your day!</p>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="task-item d-flex align-items-center justify-content-between glass p-3"
                            style={{ animation: 'fadeIn 0.3s ease forwards', background: 'rgba(255,255,255,0.02)' }}>
                            <div className="d-flex align-items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(task.id)}
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
