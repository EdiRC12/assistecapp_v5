import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useReturnsData = (selectedMonth, selectedYear) => {
    const [loading, setLoading] = useState(false);
    const [returns, setReturns] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let returnsQuery = supabase
                .from('product_returns')
                .select(`
                    *,
                    rnc_records:rnc_records!rnc_id(rnc_number, status, op, batch_number),
                    sac_tickets:sac_tickets!sac_id(appointment_number, status, op, batch_number)
                `)
                .order('return_date', { ascending: false });

            if (selectedYear !== 'ALL') {
                let startDate, endDate;
                if (selectedMonth !== 'ALL') {
                    startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
                    endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
                } else {
                    startDate = new Date(selectedYear, 0, 1).toISOString();
                    endDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
                }
                returnsQuery = returnsQuery.gte('return_date', startDate).lte('return_date', endDate);
            }

            const { data, error } = await returnsQuery;
            if (error) throw error;
            setReturns(data || []);
        } catch (error) {
            console.error('Error fetching returns data:', error.message, error.details);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    // Real-time updates
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel('returns_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'product_returns' },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // Refetch to get the joined relations (rnc_records, sac_tickets)
                        fetchData();
                    } else if (payload.eventType === 'DELETE') {
                        setReturns(prev => prev.filter(r => r.id === payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleDeleteReturn = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este registro de devolução?')) return false;
        try {
            const { error } = await supabase.from('product_returns').delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error deleting return:', err);
            throw err;
        }
    };

    return {
        loading,
        returns,
        setReturns,
        fetchData,
        handleDeleteReturn
    };
};
