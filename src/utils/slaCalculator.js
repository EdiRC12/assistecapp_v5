/**
 * Calcula o status de SLA de visita de um cliente.
 * 
 * @param {Object} client O objeto do cliente (do banco de dados), deve conter `visit_frequency_months`.
 * @param {Array} tasks Todas as tarefas do sistema para extrair as visitas passadas e futuras.
 * @returns {Object} { status: 'OK' | 'OVERDUE' | 'SCHEDULED' | 'NO_SLA', monthsOverdue: number, lastVisitDate: string, nextScheduledDate: string }
 */
export const calculateClientSLA = (client, tasks) => {
    if (!client || !client.visit_frequency_months || client.visit_frequency_months <= 0) {
        return { status: 'NO_SLA', monthsOverdue: 0, lastVisitDate: null, nextScheduledDate: null };
    }

    const freqMonths = client.visit_frequency_months;
    const clientNameNorm = (client.name || '').trim().toLowerCase();

    // Encontrar tarefas deste cliente que exigem visita ou têm viagens
    const clientTasks = (tasks || []).filter(t => {
        if (!t.client || t.client.trim().toLowerCase() !== clientNameNorm) return false;
        if (t.visitation && t.visitation.required) return true;
        if (t.travels && t.travels.length > 0) return true;
        return false;
    });

    let lastVisitDate = null;
    let nextScheduledDate = null;

    for (const t of clientTasks) {
        if (t.travels && t.travels.length > 0) {
            for (const tr of t.travels) {
                const dateStr = tr.date || t.due_date || t.createdAt || t.created_at;
                if (!dateStr) continue;
                const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
                if (isNaN(date.getTime())) continue;

                if (tr.status === 'FINALIZADA' || t.status === 'CONCLUÍDO') {
                    if (!lastVisitDate || date > lastVisitDate) {
                        lastVisitDate = date;
                    }
                } else {
                    if (!nextScheduledDate || date < nextScheduledDate) {
                        nextScheduledDate = date;
                    }
                }
            }
        } else {
            const dateStr = t.due_date || t.createdAt || t.created_at;
            if (!dateStr) continue;

            const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
            if (isNaN(date.getTime())) continue;

            if (t.status === 'CONCLUÍDO') {
                if (!lastVisitDate || date > lastVisitDate) {
                    lastVisitDate = date;
                }
            } else {
                if (!nextScheduledDate || date < nextScheduledDate) {
                    nextScheduledDate = date;
                }
            }
        }
    }

    if (nextScheduledDate && nextScheduledDate > new Date()) {
        return { status: 'SCHEDULED', monthsOverdue: 0, lastVisitDate, nextScheduledDate };
    }

    if (!lastVisitDate) {
        // Nunca foi visitado e tem SLA, está muito atrasado (vamos assumir overdue)
        return { status: 'OVERDUE', monthsOverdue: 999, lastVisitDate: null, nextScheduledDate: null };
    }

    const now = new Date();
    const monthsSinceLastVisit = (now.getFullYear() - lastVisitDate.getFullYear()) * 12 + (now.getMonth() - lastVisitDate.getMonth());

    if (monthsSinceLastVisit > freqMonths) {
        return { status: 'OVERDUE', monthsOverdue: monthsSinceLastVisit - freqMonths, lastVisitDate, nextScheduledDate: null };
    }

    return { status: 'OK', monthsOverdue: 0, lastVisitDate, nextScheduledDate: null };
};
