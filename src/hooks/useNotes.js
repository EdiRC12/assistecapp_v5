import { useState, useCallback, useEffect, useMemo } from 'react';

const isToday = (dateStr) => {
    if (!dateStr) return false;
    try {
        const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
        if (isNaN(d.getTime())) return false;
        const now = new Date();
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
    } catch (e) {
        return false;
    }
};

export const useNotes = (supabase, currentUser, { notifySuccess, notifyError } = {}) => {
    const [notes, setNotes] = useState([]);
    const [isDailyHubOpen, setIsDailyHubOpen] = useState(false);

    const todayNotesCount = useMemo(() => {
        const count = notes.filter(n => {
            if (!n.note_date) return true; // Notas sem data aparecem hoje
            return isToday(n.note_date);
        }).length;
        return count;
    }, [notes]);

    const fetchNotes = useCallback(async () => {
        if (!supabase || !currentUser) return;
        try {
            console.log('[useNotes] Buscando notas no banco...');
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .or(`is_public.eq.true,user_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[useNotes] Erro Supabase ao buscar:', error);
                throw error;
            }
            console.log('[useNotes] Notas encontradas:', data?.length, data);
            setNotes(data || []);
        } catch (error) {
            console.error('[useNotes] Falha crítica ao buscar notas:', error);
        }
    }, [supabase, currentUser]);

    const handleSaveNote = useCallback(async (noteData) => {
        if (!supabase || !currentUser) return;
        try {
            const { id, ...payload } = noteData;
            console.log('[useNotes] Tentando salvar nota:', payload);
            const { data, error } = await supabase.from('notes').upsert({
                id: id,
                ...payload,
                user_id: currentUser.id
            }).select();
            
            if (error) {
                console.error('[useNotes] Erro no Upsert:', error);
                throw error;
            }
            console.log('[useNotes] Nota salva com sucesso. Resultado:', data);
            await fetchNotes();
            if (notifySuccess) notifySuccess('Sucesso', 'Nota salva com sucesso.');
        } catch (error) {
            console.error('[useNotes] Erro ao salvar nota:', error);
            if (notifyError) notifyError('Erro ao salvar', 'Não foi possível salvar a nota.');
        }
    }, [supabase, currentUser, fetchNotes]);

    const handleDeleteNote = useCallback(async (noteId) => {
        if (!supabase) return;
        if (!window.confirm('Excluir esta nota?')) return;
        try {
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error) throw error;
            setNotes(prev => prev.filter(n => n.id !== noteId));
            if (notifySuccess) notifySuccess('Sucesso', 'Nota excluída.');
        } catch (error) {
            console.error('Error deleting note:', error);
            if (notifyError) notifyError('Erro ao excluir', 'Não foi possível excluir a nota. Verifique sua conexão.');
        }
    }, [supabase]);

    useEffect(() => {
        if (currentUser) {
            fetchNotes();

            // --- REAL-TIME SYNC ---
            const channel = supabase
                .channel('notes_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'notes' },
                    (payload) => {
                        console.log('[Real-time] Note change:', payload);
                        if (payload.eventType === 'INSERT') {
                            // Only add if relevant to user or public
                            if (payload.new.is_public || payload.new.user_id === currentUser.id) {
                                setNotes(prev => [payload.new, ...prev]);
                            }
                        } else if (payload.eventType === 'UPDATE') {
                            setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
                        } else if (payload.eventType === 'DELETE') {
                            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setNotes([]);
        }
    }, [currentUser, fetchNotes]);

    return {
        notes,
        setNotes,
        todayNotesCount,
        isDailyHubOpen,
        setIsDailyHubOpen,
        fetchNotes,
        handleSaveNote,
        handleDeleteNote
    };
};
