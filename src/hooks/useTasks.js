import { useState, useCallback, useEffect } from 'react';
import { TaskStatus } from '../constants/taskConstants';

export const useTasks = (supabase, currentUser, { notifySuccess, notifyError, notifyWarning } = {}) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMoreTasks, setHasMoreTasks] = useState(true);
    const [page, setPage] = useState(0);
    const [tasksLimit, setTasksLimit] = useState(500);
    const [editingTask, setEditingTask] = useState(undefined);
    const [techTests, setTechTests] = useState([]);
    const [techFollowups, setTechFollowups] = useState([]);

    const fetchTechTests = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('tech_tests').select('*');
            if (error) throw error;
            const sortedData = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setTechTests(sortedData);
        } catch (error) {
            console.error('Error fetching tech tests:', error);
        }
    }, [supabase]);

    const fetchTechFollowups = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('tech_followups').select('*');
            if (error) throw error;
            const sortedData = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setTechFollowups(sortedData);
        } catch (error) {
            console.error('Error fetching tech followups:', error);
        }
    }, [supabase]);

    const fetchTasks = useCallback(async (isLoadMore = false) => {
        if (!currentUser || !supabase || loading) return;

        setLoading(true);
        try {
            // Limite de 90 dias por padrão para economia de dados
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const startDate = ninetyDaysAgo.toISOString();

            // Elevamos o limite para garantir que tarefas ativas (atrasadas ou não) sejam carregadas
            const currentLimit = isLoadMore ? tasksLimit + 200 : 500;
            if (isLoadMore) setTasksLimit(currentLimit);

            // SHALLOW FETCH - Adicionados 'stages', 'description' e 'meeting_action_id' para rastreabilidade
            const shallowFields = 'id, title, client, status, due_date, priority, user_id, assigned_users, visibility, category, created_at, updated_at, last_modified_by, last_modified_at, visitation, travels, trip_km_end, vehicle_info, trip_cost, trip_cost_currency, parent_test_id, parent_test_number, parent_followup_id, production_cost, parent_sac_id, parent_rnc_id, geo, stages, description, meeting_action_id';

            const { data, error } = await supabase.from('tasks')
                .select(shallowFields)
                .or(`visibility.eq.PUBLIC,user_id.eq.${currentUser.id},assigned_users.cs.{${currentUser.id}}`)
                .or(`status.not.in.(DONE,CANCELED),created_at.gte.${startDate}`);

            if (error) throw error;

            const sortedData = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, currentLimit);

            setHasMoreTasks(sortedData.length === currentLimit);

            setTasks(prevTasks => {
                const safePrevTasks = Array.isArray(prevTasks) ? prevTasks : [];
                const newTasksMap = new Map();
                (sortedData || []).forEach(t => {
                    const standardized = {
                        id: t.id,
                        client: t.client || 'Cliente não identificado',
                        title: t.title || t.client || 'Tarefa sem título',
                        status: t.status || TaskStatus.PENDING,
                        category: t.category || 'Geral',
                        stages: t.stages || {},
                        visibility: t.visibility || 'PUBLIC',
                        ...t,
                        createdAt: t.created_at || t.createdAt || new Date().toISOString()
                    };
                    newTasksMap.set(t.id, standardized);
                });

                // Preservar dados 'profundos' (cache local)
                safePrevTasks.forEach(oldTask => {
                    if (oldTask && oldTask.id && newTasksMap.has(oldTask.id)) {
                        const serverTask = newTasksMap.get(oldTask.id);
                        newTasksMap.set(oldTask.id, { ...oldTask, ...serverTask });
                    }
                });

                return Array.from(newTasksMap.values());
            });
        } catch (err) {
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [supabase, currentUser, tasksLimit, loading]);

    const fetchTaskDetail = useCallback(async (taskId) => {
        if (!currentUser || !supabase || !taskId || taskId.toString().startsWith('test-')) return;

        const { data, error } = await supabase.from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error) {
            console.error('Error fetching task details:', error);
        } else if (data) {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...data, createdAt: data.created_at } : t));
            return data;
        }
    }, [supabase, currentUser]);

    const handleSaveTask = useCallback(async (taskData, setIsModalOpen) => {
        if (!supabase || !currentUser) return;

        // Forçando o processamento caso seja uma string vazia -> null explícito, para apagar datas.
        const dueDateRaw = taskData.due_date !== undefined ? taskData.due_date : taskData.dueDate;
        const dueDateValue = (dueDateRaw === '' || dueDateRaw === undefined || dueDateRaw === null) ? null : dueDateRaw;
        console.log('TAREFA CREATE/UPDATE dueDateValue Tratado:', dueDateValue, taskData);
        
        const { dueDate, due_date, createdAt, reportRequired, report, ...otherProps } = taskData;
        const taskId = editingTask?.id || taskData.id;

        let finalTaskId = taskId;

        try {
            if (taskId) {
                // Update
                const oldTask = tasks.find(t => t.id === taskId);
                const taskToSave = {
                    ...(oldTask || {}),
                    ...otherProps,
                    client: taskData.client || oldTask?.client || '',
                    title: taskData.title || taskData.client || oldTask?.title || '',
                    due_date: dueDateValue,
                    updated_at: new Date().toISOString(),
                    last_modified_by: currentUser.id,
                    last_modified_at: new Date().toISOString(),
                    meeting_action_id: taskData.meeting_action_id || oldTask?.meeting_action_id || null
                };

                const { id, users, createdAt, created_at, is_test, display_type, real_id, _reason, itemType, ...updatePayload } = taskToSave;

                // Cleanup virtual fields
                ['reportRequired', 'reportData', 'report', 'parent_visitation_id', 'parent_action_id', 'linked_test_id'].forEach(f => delete updatePayload[f]);

                if (oldTask && oldTask.client && !updatePayload.client) updatePayload.client = oldTask.client;
                if (otherProps.travels) updatePayload.travels = otherProps.travels;
                if (otherProps.attachments) updatePayload.attachments = otherProps.attachments;

                // Cascade status to stages
                if (taskToSave.status === TaskStatus.CANCELED || taskToSave.status === TaskStatus.DONE) {
                    const newStageStatus = taskToSave.status === TaskStatus.DONE ? 'COMPLETED' : 'CANCELED';
                    const sourceStages = updatePayload.stages || taskData.stages;
                    if (sourceStages) {
                        const cascadedStages = {};
                        Object.keys(sourceStages).forEach(k => {
                            cascadedStages[k] = { ...sourceStages[k], status: newStageStatus };
                        });
                        updatePayload.stages = cascadedStages;
                    }
                }

                const { data, error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId).select().single();
                if (error) throw error;

                // Sincronismo com Meeting Hub (Se a tarefa for finalizada)
                const mActionId = taskToSave.meeting_action_id || (oldTask && oldTask.meeting_action_id);
                if (mActionId && taskToSave.status === TaskStatus.DONE) {
                    await supabase.from('meeting_action_items').update({ 
                        status: 'CONCLUIDO', 
                        completed_at: new Date().toISOString() 
                    }).eq('id', mActionId);
                }

                const standardizedData = {
                    ...oldTask,
                    ...data,
                    createdAt: data.created_at || data.createdAt,
                    reportData: report,
                    last_modified_by: currentUser.id,
                    last_modified_at: new Date().toISOString()
                };
                setTasks(prev => prev.map(t => t.id === taskId ? standardizedData : t));
            } else {
                // Create
                const taskToSave = {
                    ...otherProps,
                    client: taskData.client || otherProps.client || '',
                    title: taskData.title || taskData.client || '',
                    user_id: currentUser.id,
                    visibility: taskData.visibility || 'PUBLIC',
                    due_date: dueDateValue,
                    updated_at: new Date().toISOString(),
                    last_modified_by: currentUser.id,
                    last_modified_at: new Date().toISOString(),
                    meeting_action_id: taskData.meeting_action_id || null
                };

                ['reportRequired', 'report', 'reportData', 'is_test', 'display_type', 'real_id', 'parent_visitation_id', 'parent_action_id', 'linked_test_id', '_reason', 'itemType'].forEach(f => delete taskToSave[f]);

                const { data, error } = await supabase.from('tasks').insert(taskToSave).select().single();
                if (error) throw error;

                finalTaskId = data.id;

                // Bind module data
                if (taskData.parent_test_id) {
                    await supabase.from('tech_tests').update({ converted_task_id: finalTaskId }).eq('id', taskData.parent_test_id);
                    fetchTechTests();
                }
                if (taskData.parent_followup_id) {
                    await supabase.from('tech_followups').update({ converted_task_id: finalTaskId }).eq('id', taskData.parent_followup_id);
                    fetchTechFollowups();
                }
                if (taskData.parent_visitation_id) {
                    await supabase.from('visitation_planning').update({ status: 'MIGRADO', migrated_task_id: finalTaskId }).eq('id', taskData.parent_visitation_id);
                }
                if (taskData.parent_action_id) {
                    await supabase.from('visit_pending_actions').update({ status: 'MIGRADO', migrated_task_id: finalTaskId }).eq('id', taskData.parent_action_id);
                }
                if (taskData.meeting_action_id) {
                    await supabase.from('meeting_action_items').update({ 
                        linked_task_id: finalTaskId, 
                        status: 'EM_ANDAMENTO' 
                    }).eq('id', taskData.meeting_action_id);
                }

                const standardizedData = {
                    ...data,
                    createdAt: data.created_at || data.createdAt,
                    reportData: report,
                    last_modified_by: currentUser.id,
                    last_modified_at: new Date().toISOString()
                };
                setTasks(prev => [standardizedData, ...prev]);
            }

            // Handle Report
            if (reportRequired && finalTaskId) {
                const { data: existingReport } = await supabase.from('task_reports').select('id').eq('task_id', finalTaskId).single();
                const reportPayload = {
                    task_id: finalTaskId,
                    user_id: currentUser.id,
                    content: report?.content || '',
                    raw_notes: report?.raw_notes || '',
                    media_urls: report?.media_urls || [],
                    status: report?.status || 'DRAFT',
                    ai_generated: report?.ai_generated || false,
                    last_edited_by: currentUser.id,
                    updated_at: new Date().toISOString()
                };

                if (existingReport) {
                    await supabase.from('task_reports').update(reportPayload).eq('id', existingReport.id);
                } else {
                    await supabase.from('task_reports').insert(reportPayload);
                }
            }

            // Sincronizar custos bruto do teste pai se aplicável
            const finalParentTestId = taskData.parent_test_id || (taskId ? tasks.find(t => t.id === taskId)?.parent_test_id : null);
            if (finalParentTestId) {
                const { data: testData } = await supabase.from('tech_tests').select('op_cost').eq('id', finalParentTestId).single();
                if (testData?.op_cost !== undefined) {
                    const currentTravels = taskData.travels !== undefined ? taskData.travels : (taskId ? tasks.find(t => t.id === taskId)?.travels : []) || [];
                    const travelsCost = currentTravels.reduce((acc, tr) => acc + (parseFloat(tr.cost) || 0), 0);
                    
                    const manualTripCostRaw = taskData.trip_cost !== undefined ? taskData.trip_cost : (taskId ? tasks.find(t => t.id === taskId)?.trip_cost : 0);
                    const manualTripCost = parseFloat(manualTripCostRaw) || 0;
                    
                    const totalTaskCost = travelsCost + manualTripCost;
                    const newGrossTotal = parseFloat(testData.op_cost || 0) + totalTaskCost;
                    
                    await supabase.from('tech_tests').update({ gross_total_cost: newGrossTotal }).eq('id', finalParentTestId);
                    if (fetchTechTests) fetchTechTests();
                }
            }

            if (notifySuccess) {
                notifySuccess('Sucesso', taskId ? 'Tarefa atualizada com sucesso.' : 'Tarefa criada com sucesso.');
            }

            if (setIsModalOpen) setIsModalOpen(false);
            setEditingTask(undefined);
        } catch (error) {
            console.error('Error saving task:', error);
            if (notifyError) notifyError('Erro ao salvar', error.message);
        }
    }, [supabase, currentUser, editingTask, tasks, fetchTechTests, fetchTechFollowups]);

    const handleDeleteTask = useCallback(async (taskId) => {
        if (!supabase) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (window.confirm('Tem certeza que deseja excluir permanentemente? Isso apagará todo o histórico.')) {
            // Se era uma tarefa vinculada a uma reunião, volta o apontamento para PENDENTE
            if (task.meeting_action_id) {
                await supabase.from('meeting_action_items').update({
                    linked_task_id: null,
                    status: 'PENDENTE'
                }).eq('id', task.meeting_action_id);
            }

            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) {
                console.error('Error deleting task:', error);
            } else {
                setTasks(prev => prev.filter(t => t.id !== taskId));
            }
        }
    }, [supabase, tasks]);

    const handleTaskDrop = useCallback(async (taskId, newStatus) => {
        if (!supabase) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        if ((task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELED) && newStatus !== TaskStatus.DONE && newStatus !== TaskStatus.CANCELED) {
            if (notifyWarning) notifyWarning('Ação Necessária', 'Para reabrir uma tarefa finalizada ou cancelada, é necessário editá-la e informar o motivo da reabertura.');
            return;
        }

        if (newStatus === TaskStatus.CANCELED) {
            setEditingTask({ ...task, status: newStatus });
            // Cannot easily open modal from here if it stays in App. Maybe view component should handle the modal opening.
            // For now, we return a flag or specific status.
            return 'OPEN_MODAL';
        }

        let updatedStages = { ...task.stages };
        if (newStatus === TaskStatus.DONE) {
            Object.keys(updatedStages).forEach(s => {
                updatedStages[s] = { ...updatedStages[s], status: 'FINALIZADO' };
            });
        }

        const updates = {
            status: newStatus,
            stages: updatedStages,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
        if (error) {
            console.error('Error dropping task:', error);
            if (notifyError) notifyError('Erro ao mover', 'Não foi possível atualizar o status da tarefa.');
        } else {
            if (notifySuccess) notifySuccess('Sucesso', 'Status da tarefa atualizado.');
            
            // Sincronismo com Reuniões: Se a tarefa foi para DONE, conclui o apontamento
            if (newStatus === TaskStatus.DONE) {
                await supabase.from('meeting_action_items').update({
                    status: 'CONCLUIDO',
                    completed_at: new Date().toISOString()
                }).eq('linked_task_id', taskId);
            }

            const standardizedData = {
                ...task,
                ...data,
                createdAt: data.created_at || data.createdAt
            };
            setTasks(prev => prev.map(t => t.id === taskId ? standardizedData : t));
        }
    }, [supabase, tasks]);

    useEffect(() => {
        if (currentUser) {
            fetchTasks();
            fetchTechTests();
            fetchTechFollowups();
        }
    }, [currentUser?.id]); // Apenas re-roda se o usuário mudar

    // --- REAL-TIME SYNC ---
    useEffect(() => {
        if (!supabase || !currentUser) return;

        const channel = supabase
            .channel('tasks_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks'
                },
                (payload) => {
                    console.log('[Real-time] Task change detected:', payload);
                    
                    if (payload.eventType === 'INSERT' && payload.new) {
                        setTasks(prev => {
                            const safePrev = Array.isArray(prev) ? prev : [];
                            if (safePrev.some(t => t.id === payload.new.id)) return safePrev;
                            const standardized = {
                                client: payload.new.client || 'Novo Cliente',
                                stages: payload.new.stages || {},
                                ...payload.new
                            };
                            return [standardized, ...safePrev];
                        });
                    } else if (payload.eventType === 'UPDATE' && payload.new) {
                        setTasks(prev => {
                            const safePrev = Array.isArray(prev) ? prev : [];
                            return safePrev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t);
                        });
                        // If editing this task, update local edit state
                        setEditingTask(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
                    } else if (payload.eventType === 'DELETE' && payload.old) {
                        setTasks(prev => {
                            const safePrev = Array.isArray(prev) ? prev : [];
                            return safePrev.filter(t => t.id !== payload.old.id);
                        });
                        setEditingTask(prev => prev?.id === payload.old.id ? null : prev);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, currentUser]);

    return {
        tasks, setTasks, loading, hasMoreTasks, editingTask, setEditingTask,
        techTests, techFollowups,
        fetchTasks, fetchTaskDetail, handleSaveTask, handleDeleteTask, handleTaskDrop,
        fetchTechTests, fetchTechFollowups
    };
};
