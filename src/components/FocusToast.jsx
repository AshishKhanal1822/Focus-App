// src/components/FocusToast.jsx
// In-app overlay notification for focus timer events.
// Works in fullscreen mode because it renders directly in the DOM (unlike
// browser Notification API which is suppressed when fullscreen is active).

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../agents/core/EventBus.js';
import { Brain, Bell, CheckCircle, X } from 'lucide-react';

const TOAST_DURATION_MS = 5000; // auto-dismiss after 5 s (except completion)

const TOAST_TYPES = {
  started:   { icon: Brain,       color: '#6366f1', label: 'Focus Started',    bg: 'rgba(99,102,241,0.18)' },
  warning:   { icon: Bell,        color: '#f59e0b', label: 'Almost Done!',      bg: 'rgba(245,158,11,0.18)' },
  completed: { icon: CheckCircle, color: '#22c55e', label: 'Focus Complete 🎉', bg: 'rgba(34,197,94,0.18)'  },
};

let toastId = 0;

export default function FocusToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type, body, persistent = false) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-3), { id, type, body, persistent }]); // keep max 4

    if (!persistent) {
      timers.current[id] = setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    }
    return id;
  }, [dismiss]);

  useEffect(() => {
    let prevStatus = 'idle';
    let warnSent   = false;

    const unsubState = eventBus.on('FOCUS_STATE_UPDATED', (state) => {
      const { status, remainingMs } = state;

      // Session just started
      if (prevStatus !== 'running' && status === 'running') {
        warnSent = false;
        push('started', 'Timer is running — stay focused and productive.');
      }

      // 1-minute warning
      if (status === 'running' && !warnSent) {
        const mins = remainingMs / 60000;
        if (mins > 0 && mins <= 1) {
          warnSent = true;
          push('warning', 'Less than 1 minute remaining — start wrapping up.');
        }
      }

      prevStatus = status;
    });

    const unsubDone = eventBus.on('FOCUS_COMPLETED', () => {
      push('completed', 'Great job! Your focus session is complete.', true); // persistent until dismissed
    });

    return () => {
      unsubState();
      unsubDone();
      // Clear all pending timers
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, [push]);

  return (
    <div
      aria-live="assertive"
      aria-atomic="false"
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 2147483647, // max z-index — stays above fullscreen overlays
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const cfg = TOAST_TYPES[toast.type] || TOAST_TYPES.started;
          const Icon = cfg.icon;

          return (
            <motion.div
              key={toast.id}
              role="alert"
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0,  scale: 1     }}
              exit={{    opacity: 0, x: 60, scale: 0.88  }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                pointerEvents: 'auto',
                background: cfg.bg,
                backdropFilter: 'blur(18px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
                border: `1px solid ${cfg.color}55`,
                borderRadius: '14px',
                padding: '0.85rem 1.1rem',
                minWidth: '280px',
                maxWidth: '340px',
                boxShadow: `0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px ${cfg.color}22`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              {/* Icon circle */}
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: `${cfg.color}22`,
                border: `1.5px solid ${cfg.color}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: cfg.color,
              }}>
                <Icon size={18} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: cfg.color,
                  lineHeight: 1.2,
                }}>
                  {cfg.label}
                </p>
                <p style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted, #9ca3af)',
                  lineHeight: 1.4,
                }}>
                  {toast.body}
                </p>

                {/* Progress bar (only for auto-dismiss toasts) */}
                {!toast.persistent && (
                  <motion.div
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: TOAST_DURATION_MS / 1000, ease: 'linear' }}
                    style={{
                      marginTop: '0.5rem',
                      height: 2,
                      borderRadius: 9999,
                      background: cfg.color,
                      transformOrigin: 'left',
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: 'var(--text-muted, #9ca3af)',
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
