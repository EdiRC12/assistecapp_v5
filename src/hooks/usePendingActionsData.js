import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const usePendingActionsData = (currentUser) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActions = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('visit_pending_actions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActions(data || []);
        } catch (error) {
            console.error('[usePendingActionsData] Error fetching:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActions();

        const channel = supabase
            .channel('pending_actions_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'visit_pending_actions' },
                (payload) => {
                    console.log('[Real-time] Pending Action change:', payload);
                    if (payload.eventType === 'INSERT') {
                        setActions(prev => {
                            if (prev.some(a => a.id === payload.new.id)) return prev;
                            return [payload.new, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setActions(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
                    } else if (payload.eventType === 'DELETE') {
                        setActions(prev => prev.filter(a => a.id === payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

    const handleToggleStatus = async (action) => {
        const newStatus = action.status === 'PENDENTE' ? 'CONCLUÍDO' : 'PENDENTE';
        return handleUpdateStatus(action.id, newStatus);
    };

    const handleUpdateStatus = async (id, newStatus) => {
        const { error } = await supabase
            .from('visit_pending_actions')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) {
            setActions(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
            return newStatus;
        }
        return null;
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir esta pendência?')) return false;
        try {
            const { error } = await supabase.from('visit_pending_actions').delete().eq('id', id);
            if (error) throw error;
            setActions(prev => prev.filter(a => a.id !== id));
            return true;
        } catch (error) {
            console.error('[usePendingActionsData] Error deleting:', error);
            return false;
        }
    };

    return {
        actions,
        setActions,
        loading,
        fetchActions,
        handleToggleStatus,
        handleUpdateStatus,
        handleDelete
    };
};
