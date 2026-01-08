// src/hooks/useAgentEvent.js
// React hook that subscribes to EventBus events and provides the latest payload.
// Usage: const data = useAgentEvent('FOCUS_STATE_UPDATED');

import { useEffect, useState } from 'react';
import { eventBus } from '../agents/core/EventBus.js';

export function useAgentEvent(eventType, initialValue = null) {
    const [data, setData] = useState(initialValue);

    useEffect(() => {
        const unsubscribe = eventBus.on(eventType, setData);
        // Cleanup on unmount
        return () => unsubscribe();
    }, [eventType]);

    return data;
}
