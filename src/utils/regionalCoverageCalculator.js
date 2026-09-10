import { calculateClientSLA } from './slaCalculator';

/**
 * Utilitário para calcular a cobertura regional, balanço histórico,
 * projeção dinâmica (Realizado + Programado), cadência de semanas alternadas
 * e semanas de viagem extraordinárias.
 * 
 * @param {Array} allClients Lista de clientes
 * @param {Array} tasks Lista de tarefas
 * @param {string} startDateStr Data de início do período (ex: '2026-01-01')
 * @param {string} endDateStr Data final do ciclo de trabalho (ex: '2026-12-21')
 * @returns {Object} { summary, regionsList, categoryStats, visitTypeStats, imbalanceAlerts }
 */
export const calculateRegionalCoverage = (
    allClients = [],
    tasks = [],
    startDateStr = '2026-01-01',
    endDateStr = '2026-12-21',
    plannedVisits = [],
    travelReservations = []
) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = startDateStr ? new Date(`${startDateStr}T00:00:00`) : new Date(today.getFullYear(), 0, 1);
    const endDate = endDateStr ? new Date(`${endDateStr}T23:59:59`) : new Date(today.getFullYear(), 11, 31);

    // Duração do período em meses e semanas
    const diffMs = endDate.getTime() - startDate.getTime();
    const periodDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const periodMonths = Math.max(1, Math.round(periodDays / 30.4375));
    const periodWeeks = Math.max(1, Math.round(periodDays / 7));

    // Cadência Alternada Padrão: 1 semana de viagem / 1 semana de trabalho interno
    const expectedTravelWeeks = Math.max(1, Math.floor(periodWeeks / 2));
    const expectedOfficeWeeks = periodWeeks - expectedTravelWeeks;

    const stateMap = {};
    const travelWeeksSet = new Set(); // Mapeia semanas únicas onde houve/haverá viagens

    // Métricas Globais por Categoria
    const categoryStats = {
        OURO: { total: 0, requiredVisits: 0, doneInPast: 0, scheduledInFuture: 0, totalPlannedOrDone: 0, coveragePct: 0 },
        PRATA: { total: 0, requiredVisits: 0, doneInPast: 0, scheduledInFuture: 0, totalPlannedOrDone: 0, coveragePct: 0 },
        BRONZE: { total: 0, requiredVisits: 0, doneInPast: 0, scheduledInFuture: 0, totalPlannedOrDone: 0, coveragePct: 0 }
    };

    // Métricas por Tipo/Motivo de Atendimento
    const visitTypeStats = {
        'Visita Periódica': 0,
        'Suporte Técnico': 0,
        'Prospecção': 0,
        'Preventiva': 0,
        'Outros': 0
    };

    let globalTotalClients = 0;
    let globalAnchorClients = 0;
    let globalWildcardClients = 0;
    let globalTotalRequiredVisits = 0;
    let globalDoneInPast = 0;
    let globalScheduledInFuture = 0;

    (allClients || []).forEach(client => {
        if (!client) return;

        globalTotalClients++;

        const stateRaw = (client.state || client.uf || '').trim().toUpperCase();
        const state = stateRaw || 'OUTROS';
        const city = (client.city || client.cidade || '').trim() || 'Cidade não informada';

        const rawClass = (client.classification || 'BRONZE').toUpperCase();
        const classification = (rawClass === 'OURO' || rawClass === 'PRATA') ? rawClass : 'BRONZE';
        const isAnchor = classification === 'OURO' || classification === 'PRATA';

        if (isAnchor) globalAnchorClients++;
        else globalWildcardClients++;

        categoryStats[classification].total++;

        // SLA / Frequência
        const freqMonths = (client.visit_frequency_months && client.visit_frequency_months > 0)
            ? Number(client.visit_frequency_months)
            : null;

        const slaResult = calculateClientSLA(client, tasks);

        let requiredVisitsInPeriod = 0;
        if (freqMonths) {
            requiredVisitsInPeriod = Math.max(1, Math.round(periodMonths / freqMonths));
        } else {
            requiredVisitsInPeriod = isAnchor ? 1 : 0;
        }

        categoryStats[classification].requiredVisits += requiredVisitsInPeriod;

        // 1. Tarefas/Viagens do cliente em `tasks`
        const clientNameNorm = (client.name || '').trim().toLowerCase();
        const clientId = client.id;

        const clientTasks = (tasks || []).filter(t => {
            if (t.status === 'CANCELED') return false;
            const taskClientNorm = (t.client || '').trim().toLowerCase();
            const matchesName = taskClientNorm && taskClientNorm === clientNameNorm;
            const matchesId = clientId && (t.client_id === clientId);
            if (matchesName || matchesId) return true;
            if (t.visitation && t.visitation.required && matchesName) return true;
            if (t.travels && t.travels.length > 0) {
                return t.travels.some(tr => (tr.name || tr.client || '').trim().toLowerCase() === clientNameNorm);
            }
            return false;
        });

        let completedInPast = 0;
        let scheduledInFuture = 0;
        const countedDates = new Set();

        clientTasks.forEach(t => {
            const dateStr = t.due_date || t.createdAt || t.created_at;
            let taskDate = null;
            if (dateStr) {
                taskDate = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
            }

            if (taskDate) {
                const dateKey = taskDate.toISOString().split('T')[0];
                countedDates.add(dateKey);

                // Registrar a semana do ano em que ocorreu a viagem
                const yearWeek = `${taskDate.getFullYear()}-W${Math.ceil((((taskDate - new Date(taskDate.getFullYear(), 0, 1)) / 86400000) + 1) / 7)}`;
                travelWeeksSet.add(yearWeek);
            }

            const cat = (t.category || t.type || '').toLowerCase();
            if (cat.includes('suporte') || cat.includes('manutenção')) visitTypeStats['Suporte Técnico']++;
            else if (cat.includes('prospecção') || cat.includes('venda')) visitTypeStats['Prospecção']++;
            else if (cat.includes('preventiva')) visitTypeStats['Preventiva']++;
            else if (cat.includes('viagem') || cat.includes('visita')) visitTypeStats['Visita Periódica']++;
            else visitTypeStats['Outros']++;

            const isCompleted = t.status === 'CONCLUÍDO' || t.status === 'CONCLUIDA' || t.status === 'FINALIZADA' || (t.travels && t.travels.some(tr => tr.status === 'FINALIZADA'));

            if (taskDate && taskDate >= startDate && taskDate <= endDate) {
                if (isCompleted) {
                    completedInPast++;
                } else {
                    scheduledInFuture++;
                }
            } else if (isCompleted) {
                completedInPast++;
            }
        });

        // 2. Rascunhos de Visita Planejadas no Cronograma (`plannedVisits`)
        const clientPlannedVisits = (plannedVisits || []).filter(pv => {
            if (!pv.visit_date) return false;
            const pvName = (pv.client_name || '').trim().toLowerCase();
            const matchesName = pvName && pvName === clientNameNorm;
            const matchesId = clientId && (pv.client_id === clientId);
            return matchesName || matchesId;
        });

        clientPlannedVisits.forEach(pv => {
            const dateStr = pv.visit_date;
            const pvDate = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
            const dateKey = pvDate.toISOString().split('T')[0];

            if (!countedDates.has(dateKey)) {
                countedDates.add(dateKey);

                const yearWeek = `${pvDate.getFullYear()}-W${Math.ceil((((pvDate - new Date(pvDate.getFullYear(), 0, 1)) / 86400000) + 1) / 7)}`;
                travelWeeksSet.add(yearWeek);

                if (pvDate >= startDate && pvDate <= endDate) {
                    scheduledInFuture++;
                }
            }
        });

        const totalPlannedOrDone = completedInPast + scheduledInFuture;
        const missingVisits = Math.max(0, requiredVisitsInPeriod - totalPlannedOrDone);

        categoryStats[classification].doneInPast += completedInPast;
        categoryStats[classification].scheduledInFuture += scheduledInFuture;
        categoryStats[classification].totalPlannedOrDone += totalPlannedOrDone;

        // Estado
        if (!stateMap[state]) {
            stateMap[state] = {
                state,
                totalClients: 0,
                anchorClientsCount: 0,
                wildcardClientsCount: 0,
                totalRequiredVisits: 0,
                anchorRequiredVisits: 0,
                completedInPast: 0,
                scheduledInFuture: 0,
                totalPlannedOrDone: 0,
                missingVisits: 0,
                missingAnchorVisits: 0,
                citiesMap: {},
                anchorClients: [],
                wildcardClients: []
            };
        }

        const stateObj = stateMap[state];
        stateObj.totalClients++;
        stateObj.totalRequiredVisits += requiredVisitsInPeriod;
        stateObj.completedInPast += completedInPast;
        stateObj.scheduledInFuture += scheduledInFuture;
        stateObj.totalPlannedOrDone += totalPlannedOrDone;
        stateObj.missingVisits += missingVisits;

        if (isAnchor) {
            stateObj.anchorClientsCount++;
            stateObj.anchorRequiredVisits += requiredVisitsInPeriod;
            stateObj.missingAnchorVisits += missingVisits;
        } else {
            stateObj.wildcardClientsCount++;
        }

        if (!stateObj.citiesMap[city]) {
            stateObj.citiesMap[city] = { city, count: 0 };
        }
        stateObj.citiesMap[city].count++;

        const enrichedClient = {
            ...client,
            classification,
            isAnchor,
            slaResult,
            freqMonths,
            requiredVisitsInPeriod,
            completedInPast,
            scheduledInFuture,
            totalPlannedOrDone,
            missingVisits,
            isOverdue: slaResult.status === 'OVERDUE',
            needsAttention: missingVisits > 0 || slaResult.status === 'OVERDUE'
        };

        if (isAnchor) {
            stateObj.anchorClients.push(enrichedClient);
        } else {
            stateObj.wildcardClients.push(enrichedClient);
        }

        globalTotalRequiredVisits += requiredVisitsInPeriod;
        globalDoneInPast += completedInPast;
        globalScheduledInFuture += scheduledInFuture;
    });

    // 3. Incorporar semanas de viagem reservadas no Cronograma (`travelReservations`)
    (travelReservations || []).forEach(res => {
        if (!res.week_start) return;
        const resStart = new Date(res.week_start.includes('T') ? res.week_start : `${res.week_start}T12:00:00`);
        const yearWeek = `${resStart.getFullYear()}-W${Math.ceil((((resStart - new Date(resStart.getFullYear(), 0, 1)) / 86400000) + 1) / 7)}`;
        travelWeeksSet.add(yearWeek);

        const resState = (res.state_code || '').trim().toUpperCase();
        if (resState && stateMap[resState]) {
            stateMap[resState].hasCalendarReservation = true;
            stateMap[resState].scheduledReservationsCount = (stateMap[resState].scheduledReservationsCount || 0) + 1;
        }
    });

    // Calcular % para categorias
    Object.keys(categoryStats).forEach(key => {
        const cat = categoryStats[key];
        cat.coveragePct = cat.requiredVisits > 0
            ? Math.min(100, Math.round((cat.totalPlannedOrDone / cat.requiredVisits) * 100))
            : 100;
    });

    // Lista de Regiões
    const regionsList = Object.values(stateMap).map(st => {
        const anchorCoveragePct = st.anchorRequiredVisits > 0
            ? Math.min(100, Math.round(((st.anchorRequiredVisits - st.missingAnchorVisits) / st.anchorRequiredVisits) * 100))
            : 100;

        const globalCoveragePct = st.totalRequiredVisits > 0
            ? Math.min(100, Math.round((st.totalPlannedOrDone / st.totalRequiredVisits) * 100))
            : 100;

        const topCities = Object.values(st.citiesMap)
            .sort((a, b) => b.count - a.count)
            .map(c => `${c.city} (${c.count})`);

        st.anchorClients.sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0) || b.missingVisits - a.missingVisits);
        st.wildcardClients.sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0));

        let attentionLevel = 'EQUILIBRADO';
        if (st.anchorRequiredVisits > 0 && anchorCoveragePct < 40 && st.missingAnchorVisits >= 2) {
            attentionLevel = 'NEGLIGENCIADO';
        } else if (anchorCoveragePct >= 90 && st.totalPlannedOrDone > 5) {
            attentionLevel = 'ALTO_FOCO';
        }

        return {
            ...st,
            anchorCoveragePct,
            globalCoveragePct,
            topCities,
            attentionLevel
        };
    });

    regionsList.sort((a, b) => {
        const scoreA = (a.attentionLevel === 'NEGLIGENCIADO' ? 100 : 0) + a.missingAnchorVisits * 2 + a.missingVisits;
        const scoreB = (b.attentionLevel === 'NEGLIGENCIADO' ? 100 : 0) + b.missingAnchorVisits * 2 + b.missingVisits;
        return scoreB - scoreA;
    });

    const neglectedRegions = regionsList.filter(r => r.attentionLevel === 'NEGLIGENCIADO');
    const highFocusRegions = regionsList.filter(r => r.attentionLevel === 'ALTO_FOCO');

    // Métricas da Projeção Dinâmica
    const globalTotalVisitsPlannedOrDone = globalDoneInPast + globalScheduledInFuture;
    const pastCompletedPct = globalTotalRequiredVisits > 0
        ? Math.min(100, Math.round((globalDoneInPast / globalTotalRequiredVisits) * 100))
        : 100;
    
    const futureScheduledPct = globalTotalRequiredVisits > 0
        ? Math.min(100, Math.round((globalScheduledInFuture / globalTotalRequiredVisits) * 100))
        : 0;

    const projectedFinalCoveragePct = Math.min(100, pastCompletedPct + futureScheduledPct);

    // Métricas de Semanas Executadas vs Capacidade Padrão Alternada
    const actualTravelWeeksCount = travelWeeksSet.size;
    const capacityExecutionPct = Math.round((actualTravelWeeksCount / expectedTravelWeeks) * 100);
    const extraTravelWeeksCount = Math.max(0, actualTravelWeeksCount - expectedTravelWeeks);

    return {
        summary: {
            startDateStr,
            endDateStr,
            periodMonths,
            periodWeeks,
            expectedTravelWeeks,
            expectedOfficeWeeks,
            actualTravelWeeksCount,
            extraTravelWeeksCount,
            capacityExecutionPct,
            totalClients: globalTotalClients,
            globalAnchorClients,
            globalWildcardClients,
            totalRegions: regionsList.length,
            globalTotalRequiredVisits,
            globalDoneInPast,
            globalScheduledInFuture,
            globalTotalVisitsPlannedOrDone,
            pastCompletedPct,
            futureScheduledPct,
            projectedFinalCoveragePct,
            neglectedCount: neglectedRegions.length
        },
        regionsList,
        categoryStats,
        visitTypeStats,
        imbalanceAlerts: {
            neglectedRegions,
            highFocusRegions
        }
    };
};
