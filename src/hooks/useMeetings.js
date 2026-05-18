import { useState, useCallback, useEffect } from 'react';

/**
 * useMeetings Hook
 * Gerencia o ciclo de vida de reuniões e apontamentos (War Room)
 */
export const useMeetings = (supabase, currentUser, { notifySuccess, notifyError } = {}) => {
    const [meetings, setMeetings] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [actionItems, setActionItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sessionsLimit, setSessionsLimit] = useState(15);
    const [hasMoreSessions, setHasMoreSessions] = useState(true);

    // 1. Buscar Sessões (Histórico e Status Ativo)
    const fetchSessions = useCallback(async (isLoadMore = false) => {
        if (!supabase) return;
        try {
            const currentLimit = isLoadMore ? sessionsLimit + 15 : 15;
            if (isLoadMore) setSessionsLimit(currentLimit);

            // 1.1. Buscar a sessão ativa de reunião se houver
            const { data: activeData, error: activeError } = await supabase
                .from('meeting_sessions')
                .select(`
                    *,
                    created_by_user:users!meeting_sessions_created_by_fkey(username),
                    meeting_action_items(id, is_deleted)
                `)
                .eq('status', 'ACTIVE')
                .maybeSingle();

            if (activeError) throw activeError;
            setActiveSession(activeData || null);

            // 1.2. Buscar as reuniões finalizadas com paginação para saúde do banco
            const { data: finishedData, error: finishedError } = await supabase
                .from('meeting_sessions')
                .select(`
                    *,
                    created_by_user:users!meeting_sessions_created_by_fkey(username),
                    meeting_action_items(id, is_deleted)
                `)
                .eq('status', 'FINISHED')
                .order('start_time', { ascending: false })
                .limit(currentLimit);

            if (finishedError) throw finishedError;

            const allSessions = [];
            if (activeData) {
                allSessions.push(activeData);
            }
            if (finishedData) {
                allSessions.push(...finishedData);
            }

            setMeetings(allSessions);
            setHasMoreSessions((finishedData || []).length === currentLimit);
        } catch (error) {
            console.error('[useMeetings] fetchSessions error:', error);
        }
    }, [supabase, sessionsLimit]);

    // 2. Buscar Apontamentos (Pendentes + Sessão Ativa)
    const fetchActionItems = useCallback(async () => {
        if (!supabase) return;
        try {
            // Buscamos itens que NÃO estão excluídos OU que pertencem à sessão ativa atual
            let query = supabase.from('meeting_action_items').select('*, session:meeting_sessions(title, start_time)');
            
            if (activeSession) {
                // Durante a reunião, vemos tudo o que não foi concluído + o que foi criado hoje (mesmo se já concluído)
                query = query.or(`status.neq.CONCLUIDO,session_id.eq.${activeSession.id}`);
            } else {
                // No Dashboard, vemos apenas o que está Pendente ou Em Andamento
                query = query.or('status.eq.PENDENTE,status.eq.EM_ANDAMENTO');
            }

            const { data, error } = await query.order('created_at', { ascending: true });
            
            if (error) throw error;
            
            // Filtramos localmente para não quebrar caso a coluna is_deleted ainda não exista
            const visibleItems = (data || []).filter(item => item.is_deleted !== true);
            setActionItems(visibleItems);
        } catch (error) {
            console.error('[useMeetings] fetchActionItems error:', error);
        }
    }, [supabase, activeSession]);

    // 2.1. Buscar Estatísticas Globais (Geral de todas as reuniões)
    const fetchOverallStats = useCallback(async () => {
        if (!supabase) return { completionRate: 0, totalActions: 0, doneActions: 0 };
        try {
            const { data, error } = await supabase
                .from('meeting_action_items')
                .select('status, is_deleted');
            
            if (error) throw error;
            
            const visible = (data || []).filter(a => a.is_deleted !== true);
            const total = visible.length;
            const done = visible.filter(a => a.status === 'CONCLUIDO').length;
            const rate = total ? Math.round((done / total) * 100) : 0;
            
            return { completionRate: rate, totalActions: total, doneActions: done };
        } catch (error) {
            console.error('[useMeetings] fetchOverallStats error:', error);
            return { completionRate: 0, totalActions: 0, doneActions: 0 };
        }
    }, [supabase]);

    // 3. Iniciar Reunião
    const startMeeting = async (title = 'Reunião de Alinhamento') => {
        if (!supabase || !currentUser) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('meeting_sessions')
                .insert([{
                    title,
                    start_time: new Date().toISOString(),
                    status: 'ACTIVE',
                    created_by: currentUser.id
                }])
                .select()
                .single();

            if (error) throw error;
            setActiveSession(data);
            if (notifySuccess) notifySuccess('Reunião Iniciada', 'O cronômetro da War Room começou.');
            fetchSessions();
        } catch (error) {
            if (notifyError) notifyError('Erro ao iniciar reunião', error.message);
        } finally {
            setLoading(false);
        }
    };

    // 4. Finalizar Reunião (suporta duração customizada caso excedido o tempo)
    const closeMeeting = async (customDurationSeconds = null) => {
        if (!supabase || !activeSession) return;
        setLoading(true);
        try {
            const endTime = new Date();
            const startTime = new Date(activeSession.start_time);
            
            let durationSeconds = customDurationSeconds;
            let finalEndTime = endTime.toISOString();
            
            if (durationSeconds === null) {
                durationSeconds = Math.floor((endTime - startTime) / 1000);
            } else {
                const finalEnd = new Date(startTime.getTime() + durationSeconds * 1000);
                finalEndTime = finalEnd.toISOString();
            }

            const { error } = await supabase
                .from('meeting_sessions')
                .update({
                    end_time: finalEndTime,
                    duration_seconds: durationSeconds,
                    status: 'FINISHED'
                })
                .eq('id', activeSession.id);

            if (error) throw error;
            setActiveSession(null);
            if (notifySuccess) notifySuccess('Reunião Finalizada', `Sessão encerrada com sucesso.`);
            fetchSessions();
        } catch (error) {
            if (notifyError) notifyError('Erro ao finalizar reunião', error.message);
        } finally {
            setLoading(false);
        }
    };

    // 4.1. Excluir Sessão de Reunião e seus apontamentos
    const deleteMeetingSession = async (sessionId) => {
        if (!supabase || !sessionId) return;
        setLoading(true);
        try {
            // Desvincular tarefas ligadas aos pautas desta reunião
            const { data: itemsToDelete, error: itemsSelectError } = await supabase
                .from('meeting_action_items')
                .select('id')
                .eq('session_id', sessionId);

            if (!itemsSelectError && itemsToDelete?.length) {
                const itemIds = itemsToDelete.map(i => i.id);
                await supabase
                    .from('tasks')
                    .update({ meeting_action_id: null })
                    .in('meeting_action_id', itemIds);
            }

            // Deletar pautas da reunião
            const { error: itemsError } = await supabase
                .from('meeting_action_items')
                .delete()
                .eq('session_id', sessionId);

            if (itemsError) throw itemsError;

            // Deletar a sessão de reunião de fato
            const { error: sessionError } = await supabase
                .from('meeting_sessions')
                .delete()
                .eq('id', sessionId);

            if (sessionError) throw sessionError;

            // Atualiza o estado
            setMeetings(prev => prev.filter(m => m.id !== sessionId));
            if (notifySuccess) notifySuccess('Reunião Excluída', 'A reunião e suas pautas foram apagadas com sucesso.');
        } catch (error) {
            console.error('[useMeetings] deleteMeetingSession error:', error);
            if (notifyError) notifyError('Erro ao excluir reunião', error.message);
        } finally {
            setLoading(false);
        }
    };

    // 4.2. Editar Sessão de Reunião (Título, data de início e duração)
    const updateMeetingSession = async (sessionId, updates) => {
        if (!supabase || !sessionId) return;
        setLoading(true);
        try {
            let payload = { ...updates };
            if (updates.start_time && updates.duration_seconds !== undefined) {
                const start = new Date(updates.start_time);
                const end = new Date(start.getTime() + updates.duration_seconds * 1000);
                payload.end_time = end.toISOString();
            }

            const { error } = await supabase
                .from('meeting_sessions')
                .update(payload)
                .eq('id', sessionId);

            if (error) throw error;

            // Atualiza o estado local
            setMeetings(prev => prev.map(m => m.id === sessionId ? { ...m, ...payload } : m));
            if (notifySuccess) notifySuccess('Reunião Atualizada', 'Informações da reunião atualizadas.');
        } catch (error) {
            console.error('[useMeetings] updateMeetingSession error:', error);
            if (notifyError) notifyError('Erro ao atualizar reunião', error.message);
        } finally {
            setLoading(false);
        }
    };

    // 5. Adicionar Apontamento
    const addActionItem = async (text) => {
        if (!supabase || !activeSession || !text.trim()) return;
        try {
            const { data, error } = await supabase
                .from('meeting_action_items')
                .insert([{
                    session_id: activeSession.id,
                    text,
                    status: 'PENDENTE',
                    user_id: currentUser.id
                }])
                .select()
                .single();

            if (error) throw error;
            const itemWithSession = {
                ...data,
                session: activeSession ? { title: activeSession.title, start_time: activeSession.start_time } : null
            };
            setActionItems(prev => [...prev, itemWithSession]);
        } catch (error) {
            if (notifyError) notifyError('Erro ao salvar nota', error.message);
        }
    };

    // 6. Atualizar Apontamento
    const updateActionItem = async (id, updates) => {
        if (!supabase || !id) return;
        try {
            const oldItem = actionItems.find(i => i.id === id);
            const isReopening = oldItem?.status === 'CONCLUIDO' && updates.status === 'PENDENTE';

            const { error } = await supabase
                .from('meeting_action_items')
                .update({
                    ...updates,
                    completed_at: updates.status === 'CONCLUIDO' ? new Date().toISOString() : null,
                    reopened_at: isReopening ? new Date().toISOString() : (oldItem?.reopened_at || null),
                    reopened_by: isReopening ? currentUser.id : (oldItem?.reopened_by || null)
                })
                .eq('id', id);

            if (error) throw error;
            setActionItems(prev => prev.map(item => item.id === id ? { 
                ...item, 
                ...updates,
                reopened_at: isReopening ? new Date().toISOString() : item.reopened_at,
                reopened_by: isReopening ? currentUser.id : item.reopened_by
            } : item));

            if (isReopening && notifySuccess) {
                notifySuccess('Pauta Reaberta', 'O item voltou para o status pendente.');
            }
        } catch (error) {
            if (notifyError) notifyError('Erro ao atualizar status', error.message);
        }
    };

    // 6.1. Exclusão Lógica (Soft Delete)
    const deleteActionItem = async (id) => {
        if (!supabase || !id || !currentUser) return;
        try {
            const { error } = await supabase
                .from('meeting_action_items')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: currentUser.id
                })
                .eq('id', id);

            if (error) throw error;
            setActionItems(prev => prev.filter(item => item.id !== id));
            if (notifySuccess) notifySuccess('Pauta Excluída', 'O item foi movido para a lixeira da sessão.');
        } catch (error) {
            if (notifyError) notifyError('Erro ao excluir pauta', error.message);
        }
    };

    // 6.2. Restaurar Pauta
    const restoreActionItem = async (id) => {
        if (!supabase || !id) return;
        try {
            const { error } = await supabase
                .from('meeting_action_items')
                .update({
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null
                })
                .eq('id', id);

            if (error) throw error;
            fetchActionItems(); // Atualiza a lista principal
            if (notifySuccess) notifySuccess('Pauta Restaurada', 'O item voltou para a lista ativa.');
        } catch (error) {
            if (notifyError) notifyError('Erro ao restaurar pauta', error.message);
        }
    };

    // 7. Buscar Itens de uma Sessão Específica (Histórico)
    const fetchSessionActionItems = async (sessionId) => {
        if (!supabase || !sessionId) return [];
        try {
            const { data, error } = await supabase
                .from('meeting_action_items')
                .select(`
                    *,
                    deleted_by_user:users!meeting_action_items_deleted_by_fkey(username),
                    reopened_by_user:users!meeting_action_items_reopened_by_fkey(username)
                `)
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[useMeetings] fetchSessionActionItems error:', error);
            return [];
        }
    };

    // 8. Sincronismo com Tarefas (Uso Externo)
    const linkTaskToAction = async (actionId, taskId) => {
        if (!actionId || !taskId) return;
        await updateActionItem(actionId, { 
            linked_task_id: taskId,
            status: 'EM_ANDAMENTO'
        });
    };

    // Efeitos de Inicialização
    useEffect(() => {
        if (currentUser && supabase) {
            fetchSessions();
        }
    }, [currentUser?.id, supabase, fetchSessions]);

    useEffect(() => {
        if (supabase) {
            fetchActionItems();
        }
    }, [activeSession?.id, supabase, fetchActionItems]);

    // REAL-TIME Sync para Apontamentos (Opcional mas recomendado)
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel('meeting_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_action_items' }, () => {
                fetchActionItems();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_sessions' }, () => {
                fetchSessions();
            })
            .subscribe();
        
        return () => supabase.removeChannel(channel);
    }, [supabase, fetchActionItems, fetchSessions]);

    return {
        meetings,
        activeSession,
        actionItems,
        loading,
        hasMoreSessions,
        fetchSessions,
        startMeeting,
        closeMeeting,
        deleteMeetingSession,
        updateMeetingSession,
        addActionItem,
        updateActionItem,
        deleteActionItem,
        restoreActionItem,
        linkTaskToAction,
        fetchSessionActionItems,
        fetchOverallStats,
        refresh: fetchSessions
    };
};
