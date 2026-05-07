import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const usePendingActionsData = (currentUser) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const fetchActions = async (isLoadMore = false) => {
        if (!currentUser?.id) return;
        
        if (!isLoadMore) {
            setLoading(true);
            setPage(0);
        }

        const currentPage = isLoadMore ? page + 1 : 0;

        try {
            const { data, error } = await supabase
                .from('visit_pending_actions')
                .select('*')
                .order('created_at', { ascending: false })
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            if (error) throw error;
            
            if (isLoadMore) {
                setActions(prev => [...prev, ...(data || [])]);
                setPage(currentPage);
            } else {
                setActions(data || []);
            }

            if (data.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
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

    const fetchMore = () => {
        if (!loading && hasMore) {
            fetchActions(true);
        }
    };

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
        hasMore,
        fetchActions,
        fetchMore,
        handleToggleStatus,
        handleUpdateStatus,
        handleDelete
    };
};
