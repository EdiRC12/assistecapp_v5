import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useVisitationData = (currentUser, selectedMonth, selectedYear) => {
    const [visitationPlanning, setVisitationPlanning] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const fetchData = async (isLoadMore = false) => {
        if (!currentUser?.id) return;
        
        if (!isLoadMore) {
            setLoading(true);
            setPage(0);
        }

        const currentPage = isLoadMore ? page + 1 : 0;

        try {
            let query = supabase
                .from('visitation_planning')
                .select('*')
                .order('created_at', { ascending: false })
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            // Filter by date if provided (using created_at or a specific date field)
            if (selectedMonth !== 'ALL' && selectedYear !== 'ALL') {
                const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
                const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
                query = query.gte('created_at', startDate).lte('created_at', endDate);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            if (isLoadMore) {
                setVisitationPlanning(prev => [...prev, ...(data || [])]);
                setPage(currentPage);
            } else {
                setVisitationPlanning(data || []);
            }

            if (data.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch (error) {
            console.error('[useVisitationData] Error fetching:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('visitation_planning_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'visitation_planning' },
                (payload) => {
                    console.log('[Real-time] visitation_planning:', payload);
                    if (payload.eventType === 'INSERT') {
                        setVisitationPlanning(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setVisitationPlanning(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
                    } else if (payload.eventType === 'DELETE') {
                        setVisitationPlanning(prev => prev.filter(p => p.id === payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, selectedMonth, selectedYear]);

    const fetchMore = () => {
        if (!loading && hasMore) {
            fetchData(true);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir este planejamento?")) return false;
        try {
            const { error } = await supabase.from('visitation_planning').delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[useVisitationData] Error deleting:', error);
            return false;
        }
    };

    return {
        visitationPlanning,
        setVisitationPlanning,
        loading,
        hasMore,
        fetchData,
        fetchMore,
        handleDelete
    };
};
