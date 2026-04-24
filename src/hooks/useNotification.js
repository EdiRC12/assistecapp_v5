import { useState, useCallback } from 'react';
import { generateUUID } from '../utils/helpers';

export const useNotification = () => {
    const [notifications, setNotifications] = useState([]);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addNotification = useCallback((type, title, message, options = {}) => {
        const { duration = 4000, actions = [] } = options;
        const id = generateUUID();
        const newNotification = { id, type, title, message, actions };

        setNotifications(prev => [...prev, newNotification]);

        // Se duration for 0, a notificação é persistente
        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, [removeNotification]);

    const notifySuccess = useCallback((title, message, options) => addNotification('success', title, message, options), [addNotification]);
    const notifyError = useCallback((title, message, options) => addNotification('error', title, message, options), [addNotification]);
    const notifyInfo = useCallback((title, message, options) => addNotification('info', title, message, options), [addNotification]);
    const notifyWarning = useCallback((title, message, options) => addNotification('warning', title, message, options), [addNotification]);

    return {
        notifications,
        removeNotification,
        notifySuccess,
        notifyError,
        notifyInfo,
        notifyWarning
    };
};
