import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useVisitationData = (currentUser, selectedMonth, selectedYear) => {
    const [visitationPlanning, setVisitationPlanning] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            let query = supabase
                .from('visitation_planning')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter by date if provided (using created_at or a specific date field)
            if (selectedMonth !== 'ALL' && selectedYear !== 'ALL') {
                const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
                const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
                query = query.gte('created_at', startDate).lte('created_at', endDate);
            }

            const { data, error } = await query;
            if (error) throw error;
            setVisitationPlanning(data || []);
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
        fetchData,
        handleDelete
    };
};
