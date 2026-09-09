import React, { useMemo } from 'react';
import {
    BarChart2, AlertTriangle, CheckSquare, Briefcase,
    CalendarClock, MapPin, TrendingUp, CheckCircle2,
    Clock, Users, ArrowRight, Calendar, Route
} from 'lucide-react';
import { calculateClientSLA } from '../../utils/slaCalculator';

const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// ── Sub-componente: KPI Card ──────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, subLabel, color, onClick, badgeCount }) => {
    const colorMap = {
        rose:    { bg: 'bg-rose-50',    icon: 'bg-rose-100 text-rose-600',    border: 'border-rose-100', value: 'text-rose-700',   hover: 'hover:border-rose-300 hover:shadow-rose-50' },
        amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600',   border: 'border-amber-100', value: 'text-amber-700', hover: 'hover:border-amber-300 hover:shadow-amber-50' },
        emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100', value: 'text-emerald-700', hover: 'hover:border-emerald-300 hover:shadow-emerald-50' },
        indigo:  { bg: 'bg-indigo-50',  icon: 'bg-indigo-100 text-indigo-600',  border: 'border-indigo-100', value: 'text-indigo-700', hover: 'hover:border-indigo-300 hover:shadow-indigo-50' },
        violet:  { bg: 'bg-violet-50',  icon: 'bg-violet-100 text-violet-600',  border: 'border-violet-100', value: 'text-violet-700', hover: 'hover:border-violet-300 hover:shadow-violet-50' },
        slate:   { bg: 'bg-slate-50',   icon: 'bg-slate-100 text-slate-600',   border: 'border-slate-100', value: 'text-slate-700',  hover: 'hover:border-slate-300 hover:shadow-slate-50' },
    };
    const c = colorMap[color] || colorMap.slate;

    return (
        <div
            onClick={onClick}
            className={`relative bg-white rounded-2xl border-2 ${c.border} p-5 flex flex-col gap-3 shadow-sm transition-all duration-200 ${onClick ? `cursor-pointer hover:shadow-lg ${c.hover} hover:-translate-y-0.5` : ''}`}
        >
            {badgeCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    {badgeCount > 99 ? '99+' : badgeCount}
                </span>
            )}
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center`}>
                    <Icon size={20} />
                </div>
                {onClick && <ArrowRight size={14} className="text-slate-300" />}
            </div>
            <div>
                <p className={`text-3xl font-black ${c.value} leading-none`}>{value}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{label}</p>
                {subLabel && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{subLabel}</p>}
            </div>
        </div>
    );
};

// ── Sub-componente: Client SLA Row ────────────────────────────────────────
const SlaClientRow = ({ oc, onSchedule }) => (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-rose-100 hover:border-rose-200 hover:shadow-sm transition-all group">
        <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle size={14} className="text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-800 truncate">{oc.client.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
                {oc.client.city && (
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                        <MapPin size={9} /> {oc.client.city} - {oc.client.state}
                    </span>
                )}
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${oc.monthsOverdue === 999 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {oc.monthsOverdue === 999 ? 'Nunca visitado' : `${oc.monthsOverdue} ${oc.monthsOverdue === 1 ? 'mês' : 'meses'} atraso`}
                </span>
            </div>
        </div>
        <button
            onClick={() => onSchedule(oc.client)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-700 shrink-0"
        >
            <Calendar size={10} /> Agendar
        </button>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────
const PlanningDashboardTab = ({
    allClients = [],
    tasks = [],
    overdueClients = [],
    filterMonth,
    filterYear,
    onNavigateTab,
    onNewTask,
    currentUser,
    notifySuccess,
    notifyError,
}) => {

    // ── Métricas: Visitas do Período Filtrado ──────────────────────────────
    const periodMetrics = useMemo(() => {
        const completed = [];
        const scheduled = [];

        tasks.forEach(task => {
            const travels = task.travels || [];
            if (travels.length === 0 && !task.visitation?.required) return;

            const checkDate = (dateStr) => {
                if (!dateStr) return false;
                const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
                return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
            };

            if (travels.length > 0) {
                travels.forEach(tr => {
                    const dateStr = tr.date || task.due_date;
                    if (!checkDate(dateStr)) return;
                    if (tr.status === 'FINALIZADA' || task.status === 'CONCLUÍDO') {
                        completed.push({ task, travel: tr });
                    } else {
                        scheduled.push({ task, travel: tr });
                    }
                });
            } else {
                const dateStr = task.due_date;
                if (!checkDate(dateStr)) return;
                if (task.status === 'CONCLUÍDO') {
                    completed.push({ task });
                } else {
                    scheduled.push({ task });
                }
            }
        });

        return { completed, scheduled };
    }, [tasks, filterMonth, filterYear]);

    // Clientes com SLA que NÃO estão em nenhuma agenda (falta programar)
    const clientsToSchedule = useMemo(() => {
        return overdueClients.slice(0, 8); // Top 8 mais urgentes para exibir na lista
    }, [overdueClients]);

    // Clientes com visita agendada no período filtrado (para exibir resumo)
    const scheduledClientsCount = useMemo(() => {
        const names = new Set();
        periodMetrics.scheduled.forEach(({ task }) => {
            if (task.client) names.add(task.client.trim().toLowerCase());
        });
        return names.size;
    }, [periodMetrics]);

    const completedClientsCount = useMemo(() => {
        const names = new Set();
        periodMetrics.completed.forEach(({ task }) => {
            if (task.client) names.add(task.client.trim().toLowerCase());
        });
        return names.size;
    }, [periodMetrics]);

    // % de cobertura do período (clientes com SLA que foram atendidos)
    const clientsWithSLA = useMemo(() => allClients.filter(c => c.visit_frequency_months > 0 || (c.visit_frequency_value > 0)), [allClients]);

    const periodLabel = `${MONTHS_PT[filterMonth - 1]} ${filterYear}`;
    const isCurrentMonth = filterMonth === new Date().getMonth() + 1 && filterYear === new Date().getFullYear();

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
            {/* ── Period Banner ───────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-600 text-white rounded-xl flex items-center justify-center shadow-lg shrink-0">
                    <BarChart2 size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 leading-none">
                        Dashboard de Planejamento
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Período: {periodLabel}
                        {isCurrentMonth && <span className="ml-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black">MÊS ATUAL</span>}
                    </p>
                </div>
            </div>

            {/* ── KPI Cards Row ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={AlertTriangle}
                    label="Falta Programar"
                    value={overdueClients.length}
                    subLabel="Clientes com SLA vencido"
                    color="rose"
                    badgeCount={overdueClients.length}
                    onClick={() => onNavigateTab('SLA_OVERDUE')}
                />
                <KpiCard
                    icon={Calendar}
                    label="Agendadas"
                    value={periodMetrics.scheduled.length}
                    subLabel={`${scheduledClientsCount} clientes no período`}
                    color="indigo"
                    onClick={() => onNavigateTab('CRONOGRAMA')}
                />
                <KpiCard
                    icon={CheckCircle2}
                    label="Concluídas"
                    value={periodMetrics.completed.length}
                    subLabel={`${completedClientsCount} clientes atendidos`}
                    color="emerald"
                    onClick={() => onNavigateTab('CRONOGRAMA')}
                />
                <KpiCard
                    icon={Users}
                    label="Base com SLA"
                    value={clientsWithSLA.length}
                    subLabel="Clientes com meta de visita"
                    color="violet"
                />
            </div>

            {/* ── Main Content: 2 Columns ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Coluna 1: Clientes para Programar (SLA) ─────────────── */}
                <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-rose-50 flex items-center justify-between bg-rose-50/50">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-rose-500" />
                            <h3 className="text-sm font-black text-slate-800">Falta Programar</h3>
                            <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                                {overdueClients.length}
                            </span>
                        </div>
                        <button
                            onClick={() => onNavigateTab('SLA_OVERDUE')}
                            className="flex items-center gap-1 text-rose-600 text-[10px] font-black hover:underline"
                        >
                            Ver todos <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {clientsToSchedule.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="bg-emerald-100 p-3 rounded-full mb-3">
                                    <CheckCircle2 size={24} className="text-emerald-600" />
                                </div>
                                <p className="font-black text-slate-700 text-sm">Tudo em dia!</p>
                                <p className="text-xs font-medium text-slate-400 mt-1">Nenhum cliente com SLA vencido.</p>
                            </div>
                        ) : (
                            clientsToSchedule.map((oc, i) => (
                                <SlaClientRow
                                    key={i}
                                    oc={oc}
                                    onSchedule={(client) => {
                                        if (onNewTask) {
                                            onNewTask(client.name, { client: client.name });
                                        }
                                    }}
                                />
                            ))
                        )}
                        {overdueClients.length > 8 && (
                            <button
                                onClick={() => onNavigateTab('SLA_OVERDUE')}
                                className="w-full py-3 text-[10px] font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all border-2 border-dashed border-rose-100"
                            >
                                + {overdueClients.length - 8} clientes adicionais →
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Coluna 2: Resumo do Período + Ações Rápidas ─────────── */}
                <div className="space-y-4">
                    {/* Resumo do Período */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                            <CalendarClock size={16} className="text-indigo-500" />
                            <h3 className="text-sm font-black text-slate-800">Resumo de {periodLabel}</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {/* Barra de progresso do período */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Atendimentos do Período</span>
                                    <span className="text-[10px] font-black text-slate-700">
                                        {periodMetrics.completed.length} de {periodMetrics.completed.length + periodMetrics.scheduled.length}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    {(periodMetrics.completed.length + periodMetrics.scheduled.length) > 0 ? (
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                            style={{
                                                width: `${Math.round((periodMetrics.completed.length / (periodMetrics.completed.length + periodMetrics.scheduled.length)) * 100)}%`
                                            }}
                                        />
                                    ) : (
                                        <div className="h-full bg-slate-100 rounded-full" style={{ width: '0%' }} />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-emerald-700">{periodMetrics.completed.length}</p>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase">Concluídas</p>
                                </div>
                                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-indigo-700">{periodMetrics.scheduled.length}</p>
                                    <p className="text-[9px] font-bold text-indigo-600 uppercase">Agendadas</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-black text-slate-800">Ações Rápidas</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 gap-2">
                            <button
                                onClick={() => onNavigateTab('CRONOGRAMA')}
                                className="flex items-center gap-3 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all text-left group"
                            >
                                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0">
                                    <Calendar size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-indigo-700">Abrir Cronograma</p>
                                    <p className="text-[9px] font-medium text-indigo-500">Ver e editar agendamentos</p>
                                </div>
                                <ArrowRight size={14} className="text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                            </button>

                            <button
                                onClick={() => onNavigateTab('ROUTE_PLANNER')}
                                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-left group"
                            >
                                <div className="w-8 h-8 bg-slate-700 text-white rounded-lg flex items-center justify-center shrink-0">
                                    <Route size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-700">Planejar Rota</p>
                                    <p className="text-[9px] font-medium text-slate-500">Monte rotas e itinerários</p>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                            </button>

                            <button
                                onClick={() => onNavigateTab('VISITATION')}
                                className="flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all text-left group"
                            >
                                <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0">
                                    <Briefcase size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-amber-700">Prospecção / Visitas</p>
                                    <p className="text-[9px] font-medium text-amber-500">Gerenciar planejamentos</p>
                                </div>
                                <ArrowRight size={14} className="text-amber-300 group-hover:text-amber-600 transition-colors" />
                            </button>

                            <button
                                onClick={() => onNavigateTab('PENDING')}
                                className="flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-left group"
                            >
                                <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shrink-0">
                                    <CheckSquare size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-emerald-700">Ações Pendentes</p>
                                    <p className="text-[9px] font-medium text-emerald-500">Acompanhar pós-visita</p>
                                </div>
                                <ArrowRight size={14} className="text-emerald-300 group-hover:text-emerald-600 transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanningDashboardTab;
