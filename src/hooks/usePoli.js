import { useState, useCallback, useEffect, useRef } from 'react';

export const usePoli = (tasks, setViewMode, setTravelsFilter) => {
    const [suggestions, setSuggestions] = useState([]);
    const [poliNotification, setPoliNotification] = useState(null);
    const [isPoliPanelOpen, setIsPoliPanelOpen] = useState(false);
    const lastSuggestionsCount = useRef(0);

    const handlePoliAction = useCallback(async (suggestion) => {
        if (!suggestion) return;

        const data = suggestion.data || suggestion.metadata;
        const taskId = suggestion.task_id || suggestion.taskId || data?.taskId;

        if (suggestion.type === 'trip_cost_reminder' && taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                setTravelsFilter(task.client || '');
                setViewMode('travels');
                setIsPoliPanelOpen(false);
            }
        }
    }, [tasks, setViewMode, setTravelsFilter]);

    useEffect(() => {
        if (suggestions.length > lastSuggestionsCount.current && !isPoliPanelOpen) {
            const newCount = suggestions.length - lastSuggestionsCount.current;
            const latest = suggestions[suggestions.length - 1];
            setPoliNotification({
                title: latest.title || latest.clientName || "Nova Sugestão",
                count: newCount
            });

            const timer = setTimeout(() => setPoliNotification(null), 10000);
            return () => clearTimeout(timer);
        }
        lastSuggestionsCount.current = suggestions.length;
    }, [suggestions.length, isPoliPanelOpen]);

    return {
        suggestions,
        setSuggestions,
        poliNotification,
        setPoliNotification,
        isPoliPanelOpen,
        setIsPoliPanelOpen,
        handlePoliAction
    };
};
