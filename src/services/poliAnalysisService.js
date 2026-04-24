import { supabase } from '../supabaseClient';

/**
 * POLI Analysis Service
 * Handles Inventory and RNC analysis logic
 */

/**
 * Analyze materials inventory for low stock or stagnant items (> 3 months)
 * @returns {Promise<Array>} List of inventory suggestions
 */
export const analyzeInventory = async () => {
    try {
        const { data: inventory, error } = await supabase
            .from('materials_inventory')
            .select('*');

        if (error) throw error;

        const suggestions = [];
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        for (const item of (inventory || [])) {
            // Check for low stock
            if (item.quantity <= item.min_quantity) {
                suggestions.push({
                    type: 'inventory_alert',
                    id: `low_stock_${item.id}`,
                    title: `Estoque Baixo: ${item.name}`,
                    description: `O material ${item.name} está com apenas ${item.quantity}${item.unit}. (Mínimo: ${item.min_quantity})`,
                    priority: 'high',
                    data: { itemId: item.id, current: item.quantity, min: item.min_quantity }
                });
            }

            // Check for stagnant stock (> 3 months without update)
            const lastUpdate = new Date(item.last_update);
            if (lastUpdate < threeMonthsAgo) {
                suggestions.push({
                    type: 'inventory_alert',
                    id: `stagnant_${item.id}`,
                    title: `Material sem Movimentação: ${item.name}`,
                    description: `Este item está parado há mais de 3 meses sem alteração no estoque. Avaliar necessidade de descarte ou nova amostra.`,
                    priority: 'medium',
                    data: { itemId: item.id, lastUpdate: item.last_update }
                });
            }
        }

        return suggestions;
    } catch (err) {
        console.error('Error analyzing inventory:', err);
        return [];
    }
};

/**
 * Analyze RNCs for patterns, resolution time, and recurring issues
 * @param {Array} tasks - List of tasks from Category.RNC
 * @returns {Array} List of RNC suggestions
 */
export const analyzeRncs = (tasks) => {
    const rncTasks = tasks.filter(t => t.category === 'RNC' || t.category === 'Atendimento de RNC');
    if (rncTasks.length === 0) return [];

    const suggestions = [];

    // 1. Recurring Problems (basic string matching in 'rnc' or 'description')
    const problemCounts = {};
    rncTasks.forEach(t => {
        const problem = t.rnc || t.title || 'Outro';
        problemCounts[problem] = (problemCounts[problem] || 0) + 1;
    });

    Object.entries(problemCounts).forEach(([problem, count]) => {
        if (count >= 3) {
            suggestions.push({
                type: 'rnc_analysis',
                id: `recurring_${problem.substring(0, 10)}`,
                title: `Problema Recorrente: ${problem}`,
                description: `O problema "${problem}" foi identificado em ${count} atendimentos recentes.`,
                priority: 'high',
                data: { problem, count }
            });
        }
    });

    // 2. Average Resolution Time
    const resolvedRncs = rncTasks.filter(t => t.status === 'DONE');
    if (resolvedRncs.length > 0) {
        let totalTime = 0;
        resolvedRncs.forEach(t => {
            const start = new Date(t.created_at);
            const end = new Date(t.updated_at);
            totalTime += (end - start);
        });
        const avgDays = Math.round(totalTime / (1000 * 60 * 60 * 24 * resolvedRncs.length));

        if (avgDays > 7) {
            suggestions.push({
                type: 'rnc_analysis',
                id: 'avg_resolution_time',
                title: 'Tempo Médio de Resolução Elevado',
                description: `O tempo médio para resolver uma RNC está em ${avgDays} dias. Meta sugerida: 7 dias.`,
                priority: 'medium',
                data: { avgDays }
            });
        }
    }

    // 3. Client Frequency
    const clientCounts = {};
    rncTasks.forEach(t => {
        clientCounts[t.client] = (clientCounts[t.client] || 0) + 1;
    });

    Object.entries(clientCounts).forEach(([client, count]) => {
        if (count >= 4) {
            suggestions.push({
                type: 'rnc_analysis',
                id: `client_freq_${client.substring(0, 10)}`,
                title: `Alto Volume de RNC: ${client}`,
                description: `O cliente ${client} possui ${count} RNCs registradas. Pode ser necessário um treinamento técnico.`,
                priority: 'medium',
                data: { client, count }
            });
        }
    });

    return suggestions;
};

/**
 * Get material performance history for a specific client
 * @param {string} clientId 
 * @returns {Promise<Array>}
 */
export const getMaterialPerformance = async (clientId) => {
    try {
        const { data, error } = await supabase
            .from('material_performance')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching material performance:', err);
        return [];
    }
};

/**
 * Analyze Team Performance Indicators
 * @param {Array} tasks - List of all tasks
 * @returns {Array} Performance suggestions
 */
export const analyzePerformance = (tasks) => {
    const suggestions = [];
    const categoriesToAnalyze = ['RNC', 'DESENVOLVIMENTO', 'TESTES'];

    categoriesToAnalyze.forEach(cat => {
        const catTasks = tasks.filter(t => t.category?.toUpperCase().includes(cat) && t.status === 'DONE');
        if (catTasks.length === 0) return;

        let totalDays = 0;
        catTasks.forEach(t => {
            const start = new Date(t.created_at);
            const end = new Date(t.updated_at);
            totalDays += (end - start);
        });
        const avgDays = Math.round(totalDays / (1000 * 60 * 60 * 24 * catTasks.length));

        suggestions.push({
            type: 'performance_indicator',
            id: `avg_time_${cat}`,
            title: `Tempo Médio: ${cat}`,
            description: `O tempo médio de conclusão para ${cat} é de ${avgDays} dias.`,
            priority: 'low',
            data: { category: cat, avgDays }
        });

        // Success rate for Development
        if (cat === 'DESENVOLVIMENTO') {
            const successful = catTasks.filter(t => t.outcome === 'SUCCESS').length;
            const successRate = Math.round((successful / catTasks.length) * 100);
            suggestions.push({
                type: 'performance_indicator',
                id: 'dev_success_rate',
                title: 'Taxa de Sucesso: Desenvolvimento',
                description: `Sua taxa de sucesso em novos desenvolvimentos é de ${successRate}%.`,
                priority: 'medium',
                data: { successRate }
            });
        }
    });

    return suggestions;
};

/**
 * Proactive After-Sales Analysis (Gold/Silver clients every 6 months)
 * @param {Array} clients - List of clients
 * @returns {Array} After-sales suggestions
 */
export const analyzeAfterSales = (clients) => {
    const suggestions = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    clients.filter(c => c.classification === 'OURO' || c.classification === 'PRATA').forEach(client => {
        const lastVisit = client.last_pos_venda_at ? new Date(client.last_pos_venda_at) : null;

        if (!lastVisit || lastVisit < sixMonthsAgo) {
            suggestions.push({
                type: 'proactive_after_sales',
                id: `followup_${client.id}`,
                title: `Acompanhamento: ${client.name}`,
                description: `Lembrete: Cliente ${client.classification} sem visita de pós-venda há mais de 6 meses.`,
                priority: 'medium',
                data: { clientId: client.id, classification: client.classification }
            });
        }
    });

    return suggestions;
};

/**
 * Analyze Task Cycle Time and Aging (Audit Intelligence)
 * @param {Array} tasks - List of all tasks
 * @returns {Array} List of audit suggestions
 */
export const analyzeTaskAging = (tasks) => {
    const now = new Date();
    const suggestions = [];

    // 1. Aging Analysis (Open tasks for too long)
    const openTasks = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');
    openTasks.forEach(t => {
        const created = new Date(t.created_at);
        const agingDays = Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24));

        if (agingDays > 15) {
            suggestions.push({
                type: 'aging_alert',
                id: `aging_${t.id}`,
                title: `Task Estagnada: ${t.title}`,
                description: `Esta tarefa está em aberto há ${agingDays} dias. Requer revisão de prioridade ou auditoria de impedimentos.`,
                priority: agingDays > 30 ? 'high' : 'medium',
                data: { taskId: t.id, agingDays }
            });
        }
    });

    // 2. Cycle Time Analysis (Average time to complete by category)
    const completedTasks = tasks.filter(t => t.status === 'DONE');
    const categories = [...new Set(completedTasks.map(t => t.category))].filter(Boolean);

    categories.forEach(cat => {
        const catTasks = completedTasks.filter(t => t.category === cat);
        if (catTasks.length < 3) return; // Need a sample

        const avgDays = catTasks.reduce((acc, t) => {
            const start = new Date(t.created_at);
            const end = new Date(t.updated_at);
            return acc + (end - start);
        }, 0) / (catTasks.length * 1000 * 60 * 60 * 24);

        if (avgDays > 10) {
            suggestions.push({
                type: 'cycle_time_insight',
                id: `cycle_${cat}`,
                title: `Gargalo Detectado: ${cat}`,
                description: `O tempo médio de resolução para "${cat}" é de ${Math.round(avgDays)} dias. Considerar otimização de fluxo.`,
                priority: 'low',
                data: { category: cat, avgDays: Math.round(avgDays) }
            });
        }
    });

    return suggestions;
};

/**
 * Technical Insights - Suggest solutions based on history
 * @param {string} currentProblem - The RNC/Problem description
 * @param {Array} pastTasks - List of historical tasks
 * @returns {Array} Potential solutions
 */
export const getTechnicalInsights = (currentProblem, pastTasks) => {
    if (!currentProblem) return [];

    // Very basic keyword matching for demonstration
    const keywords = currentProblem.toLowerCase().split(' ').filter(word => word.length > 4);
    const related = pastTasks.filter(t =>
        t.status === 'DONE' &&
        keywords.some(kw => t.description?.toLowerCase().includes(kw) || t.rnc?.toLowerCase().includes(kw))
    );

    return related.slice(0, 3).map(t => ({
        taskId: t.id,
        title: t.title,
        solution: t.description?.substring(0, 100) + '...',
        client: t.client
    }));
};
/**
 * Analyze Inactive Clients (No visits or tasks in 120 days)
 * @param {Array} clients - List of clients
 * @param {Array} tasks - List of all tasks
 * @returns {Array} Inactive client suggestions
 */
export const analyzeInactiveClients = (clients, tasks) => {
    const suggestions = [];
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 120);

    clients.forEach(client => {
        // Find latest interaction (visit or task)
        const clientTasks = tasks.filter(t => t.client === client.name && t.status === 'DONE');
        
        // Find latest task date
        let latestInteraction = null;
        if (clientTasks.length > 0) {
            const latestTask = clientTasks.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
            latestInteraction = new Date(latestTask.updated_at || latestTask.created_at);
        }

        // Also check last_pos_venda_at if exists
        if (client.last_pos_venda_at) {
            const lpDate = new Date(client.last_pos_venda_at);
            if (!latestInteraction || lpDate > latestInteraction) {
                latestInteraction = lpDate;
            }
        }

        // Evaluate inactivity
        if (!latestInteraction || latestInteraction < thresholdDate) {
            const daysInative = latestInteraction 
                ? Math.floor((new Date() - latestInteraction) / (1000 * 60 * 60 * 24))
                : 'mais de 120';

            suggestions.push({
                type: 'client_inactive',
                id: `inactive_${client.id}`,
                title: `Cliente Inativo: ${client.name}`,
                description: `Este cliente ${client.classification || ''} está sem interações registradas há ${daysInative} dias. Risco de perda de vínculo.`,
                priority: client.classification === 'OURO' ? 'high' : (client.classification === 'PRATA' ? 'medium' : 'low'),
                data: { 
                    clientId: client.id, 
                    lastInteraction: latestInteraction ? latestInteraction.toLocaleDateString('pt-BR') : 'Nunca',
                    daysInative 
                }
            });
        }
    });

    return suggestions;
};

/**
 * Analyze Overdue Notes from Daily Hub
 * @param {Array} notes - List of all notes
 * @returns {Array} List of overdue note suggestions
 */
export const analyzeOverdueNotes = (notes) => {
    const now = new Date();
    const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const suggestions = [];

    const overdueCount = (notes || []).filter(note => {
        if (note.is_confirmed) return false;
        if (!note.note_date) return false;
        
        const nDate = new Date(note.note_date + 'T12:00:00');
        const noteDateOnly = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate()).getTime();

        if (noteDateOnly < todayAtMidnight) return true;
        
        if (noteDateOnly === todayAtMidnight && note.note_time) {
            const [hours, minutes] = note.note_time.split(':');
            const targetTime = new Date();
            targetTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            return now.getTime() > targetTime.getTime();
        }
        return false;
    }).length;

    if (overdueCount > 0) {
        suggestions.push({
            type: 'daily_hub_overdue',
            id: 'daily_hub_overdue_alert',
            title: `Lembretes Atrasados: ${overdueCount} pendentes`,
            description: `Existem ${overdueCount} lembretes no Daily Hub que já passaram do horário e não foram confirmados.`,
            priority: 'medium',
            data: { overdueCount }
        });
    }

    return suggestions;
};

/**
 * Analyze Return orders for potential issues
 * @returns {Promise<Array>} List of return suggestions
 */
export const analyzeReturns = async () => {
    try {
        const { data: returns, error } = await supabase
            .from('returns')
            .select('*')
            .not('status', 'eq', 'FINALIZADO');

        if (error) throw error;

        const suggestions = [];
        const highValueThreshold = 5000;

        for (const ret of (returns || [])) {
            // 1. High value returns
            if (Number(ret.total_value) >= highValueThreshold) {
                suggestions.push({
                    type: 'return_analysis',
                    id: `high_value_return_${ret.id}`,
                    title: `Devolução de Alto Valor: ${ret.client_name}`,
                    description: `Devolução de R$ ${ret.total_value} aguardando processamento. Requer atenção financeira.`,
                    priority: 'high',
                    data: { returnId: ret.id, value: ret.total_value }
                });
            }

            // 2. Old returns (pending for more than 15 days)
            const created = new Date(ret.created_at);
            const daysOpen = Math.ceil(Math.abs(new Date() - created) / (1000 * 60 * 60 * 24));
            if (daysOpen > 15) {
                suggestions.push({
                    type: 'return_analysis',
                    id: `old_return_${ret.id}`,
                    title: `Devolução Estagnada: ${ret.client_name}`,
                    description: `Esta devolução está aberta há ${daysOpen} dias sem finalização.`,
                    priority: 'medium',
                    data: { returnId: ret.id, daysOpen }
                });
            }
        }

        return suggestions;
    } catch (err) {
        console.error('Error analyzing returns:', err);
        return [];
    }
};

/**
 * Analyze SAC Followups for missing feedback
 * @param {Array} tasks - List of all tasks
 * @returns {Array} List of followup suggestions
 */
export const analyzeFollowups = (tasks) => {
    const suggestions = [];
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 7); // 7 days without update

    const openFollowups = (tasks || []).filter(t => 
        (t.category === 'SAC' || t.title?.toLowerCase().includes('sac')) && 
        !['DONE', 'FINALIZADO', 'CANCELADO'].includes(t.status?.toUpperCase())
    );

    openFollowups.forEach(t => {
        const lastAction = new Date(t.updated_at || t.created_at);
        if (lastAction < thresholdDate) {
            suggestions.push({
                type: 'followup_stalled',
                id: `stalled_sac_${t.id}`,
                title: `Follow-up Pendente: ${t.client || 'Cliente N/I'}`,
                description: `O atendimento "${t.title}" está sem atualizações há mais de 7 dias.`,
                priority: 'medium',
                data: { taskId: t.id, daysStalled: Math.floor((new Date() - lastAction) / (1000 * 60 * 60 * 24)) }
            });
        }
    });

    return suggestions;
};
