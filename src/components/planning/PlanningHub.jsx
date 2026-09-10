import React, { useState, useMemo } from 'react';
import { 
    Calendar, CheckSquare, ChevronRight, ChevronLeft,
    Briefcase, ClipboardList, Clock, AlertTriangle, Route, MapPin, Users,
    BarChart2, Compass
} from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import VisitationTab from './VisitationTab';
import PendingActionsTab from './PendingActionsTab';
import SupportRoutePlanner from '../support/SupportRoutePlanner';
import TravelCalendarTab from './TravelCalendarTab';
import OverdueSLATab from './OverdueSLATab';
import PlanningDashboardTab from './PlanningDashboardTab';
import RegionalCoveragePlannerTab from './RegionalCoveragePlannerTab';
import { calculateClientSLA } from '../../utils/slaCalculator';
import { usePendingActionsData } from '../../hooks/usePendingActionsData';

const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const TABS = [
    {
        id: 'DASHBOARD',
        label: 'DASHBOARD',
        fullLabel: 'Visão Geral',
        desc: 'Resumo e métricas do planejamento',
        color: 'violet',
        icon: BarChart2,
        activeText: 'text-violet-600',
        activeBg: 'bg-violet-600',
        ring: 'ring-violet-500',
        badgeColor: 'bg-rose-500',
    },
    {
        id: 'REGIONAL_COVERAGE',
        label: 'COBERTURA & METAS',
        fullLabel: 'Central de Cobertura Regional & Metas',
        desc: 'Planejamento por ciclo de datas, balanço de metas Ouro/Prata/Bronze e central de solicitações',
        color: 'indigo',
        icon: Compass,
        activeText: 'text-indigo-600',
        activeBg: 'bg-indigo-600',
        ring: 'ring-indigo-500',
        badgeColor: null,
    },
    {
        id: 'ROUTE_PLANNER',
        label: 'ROTA DE VIAGEM',
        fullLabel: 'Planejador de Rotas no Mapa',
        desc: 'Simulação e roteirização no mapa',
        color: 'indigo',
        icon: Route,
        activeText: 'text-indigo-600',
        activeBg: 'bg-indigo-600',
        ring: 'ring-indigo-500',
        badgeColor: null,
    },
    {
        id: 'CRONOGRAMA',
        label: 'CRONOGRAMA',
        fullLabel: 'Calendário de Viagens',
        desc: 'Agenda e reservas regionais no calendário',
        color: 'indigo',
        icon: Calendar,
        activeText: 'text-indigo-600',
        activeBg: 'bg-indigo-600',
        ring: 'ring-indigo-500',
        badgeColor: null,
    },
    {
        id: 'PENDING',
        label: 'AÇÕES PENDENTES',
        fullLabel: 'Pendências de Visita',
        desc: 'Ações e tarefas pós-atendimento',
        color: 'emerald',
        icon: CheckSquare,
        activeText: 'text-emerald-600',
        activeBg: 'bg-emerald-600',
        ring: 'ring-emerald-500',
        badgeColor: 'bg-amber-500',
    }
];

const PlanningHub = ({
    supabase,
    currentUser,
    allClients,
    tasks,
    categories,
    onNewTask,
    onEditTask,
    onTaskCreated,
    techTests,
    notifySuccess,
    notifyError,
    theme
}) => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    const [selectedCalendarState, setSelectedCalendarState] = useState('');

    const handleNavigateTab = (tabId, stateCode = '') => {
        setActiveTab(tabId);
        if (stateCode) {
            setSelectedCalendarState(stateCode);
        }
    };

    // ── GLOBAL FILTER STATE (Fase 1) ────────────────────────────────────────
    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1); // 1-12
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    const handlePrevMonth = () => {
        if (filterMonth === 1) {
            setFilterMonth(12);
            setFilterYear(y => y - 1);
        } else {
            setFilterMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (filterMonth === 12) {
            setFilterMonth(1);
            setFilterYear(y => y + 1);
        } else {
            setFilterMonth(m => m + 1);
        }
    };

    const handleResetToToday = () => {
        setFilterMonth(now.getMonth() + 1);
        setFilterYear(now.getFullYear());
    };

    const isCurrentPeriod = filterMonth === (now.getMonth() + 1) && filterYear === now.getFullYear();

    // ── BADGE COUNTERS ───────────────────────────────────────────────────────
    // SLA overdue count (clientes com meta que estão atrasados)
    const overdueClients = useMemo(() => {
        if (!allClients || !tasks) return [];
        const overdue = [];
        allClients.forEach(c => {
            const sla = calculateClientSLA(c, tasks);
            if (sla.status === 'OVERDUE') {
                overdue.push({ client: c, ...sla });
            }
        });
        return overdue.sort((a, b) => b.monthsOverdue - a.monthsOverdue);
    }, [allClients, tasks]);

    // Badge counts per tab
    const badgeCounts = useMemo(() => {
        // SLA badge is always computed (not period-filtered, always urgent)
        return {
            DASHBOARD: overdueClients.length,
            SLA_OVERDUE: overdueClients.length,
            PENDING: 0,   // PendingActionsTab has internal state; badge shows at 0 by default unless we lift state
            VISITATION: 0,
            CRONOGRAMA: 0,
            ROUTE_PLANNER: 0,
        };
    }, [overdueClients]);

    const activeTabInfo = TABS.find(t => t.id === activeTab) || TABS[0];

    return (
        <div className="h-full flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
            {/* ── Hub Header & Tab Nav ────────────────────────────────────── */}
            <div className={`shrink-0 bg-white border-b border-slate-200 transition-all ${isMobile ? 'px-2 py-2' : 'px-6 py-3'}`}>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">

                    {/* Tab buttons */}
                    <div className="flex-1 min-w-0 overflow-x-auto custom-scrollbar pb-1">
                        <div className={`flex ${isMobile ? 'flex-wrap' : 'items-center'} gap-1 bg-slate-100 p-1 rounded-2xl w-max`}>
                            {TABS.map((tab, idx) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                const count = badgeCounts[tab.id] || 0;
                                return (
                                    <React.Fragment key={tab.id}>
                                        <button
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`relative flex items-center justify-center gap-1.5 md:gap-2.5 ${isMobile ? 'px-3 py-2 flex-1' : 'px-5 py-2.5'} rounded-xl transition-all font-black ${isMobile ? 'text-[10px]' : 'text-sm'} whitespace-nowrap ${isActive
                                                ? `${tab.activeBg} text-white shadow-lg ${isMobile ? '' : 'scale-105'}`
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
                                                }`}
                                        >
                                            <Icon size={isMobile ? 12 : 15} />
                                            <span>{tab.label}</span>
                                            {/* Notification Badge */}
                                            {count > 0 && tab.badgeColor && (
                                                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 ${tab.badgeColor} text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white`}>
                                                    {count > 99 ? '99+' : count}
                                                </span>
                                            )}
                                        </button>
                                        {idx < TABS.length - 1 && !isMobile && (
                                            <ChevronRight size={14} className="text-slate-300 shrink-0" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Global Period Filter Bar ─────────────────────────── */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={handlePrevMonth}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-700 transition-all"
                                title="Mês anterior"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            <button
                                onClick={handleResetToToday}
                                title="Voltar ao mês atual"
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${isCurrentPeriod
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                                    }`}
                            >
                                {MONTHS_PT[filterMonth - 1].substring(0, 3)} {filterYear}
                            </button>

                            <button
                                onClick={handleNextMonth}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-700 transition-all"
                                title="Próximo mês"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>


                    </div>
                </div>
            </div>

            {/* ── Content Area ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {activeTab === 'DASHBOARD' ? (
                    <PlanningDashboardTab
                        allClients={allClients}
                        tasks={tasks}
                        overdueClients={overdueClients}
                        filterMonth={filterMonth}
                        filterYear={filterYear}
                        onNavigateTab={setActiveTab}
                        onNewTask={onNewTask}
                        currentUser={currentUser}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                ) : activeTab === 'REGIONAL_COVERAGE' ? (
                    <RegionalCoveragePlannerTab
                        allClients={allClients}
                        tasks={tasks}
                        supabase={supabase}
                        currentUser={currentUser}
                        techTests={techTests}
                        onNewTask={onNewTask}
                        onTaskCreated={onTaskCreated}
                        onNavigateTab={handleNavigateTab}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                ) : activeTab === 'ROUTE_PLANNER' ? (
                    <SupportRoutePlanner
                        supabase={supabase}
                        currentUser={currentUser}
                        theme={theme}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        onNewTask={onNewTask}
                        onTaskCreated={onTaskCreated}
                        tasks={tasks}
                        overdueClients={overdueClients}
                    />
                ) : activeTab === 'CRONOGRAMA' ? (
                    <TravelCalendarTab
                        currentUser={currentUser}
                        allClients={allClients}
                        tasks={tasks}
                        onNewTask={onNewTask}
                        onEditTask={onEditTask}
                        onTaskCreated={onTaskCreated}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        globalFilterMonth={filterMonth}
                        globalFilterYear={filterYear}
                        initialSelectedState={selectedCalendarState}
                    />
                ) : (
                    <PendingActionsTab
                        currentUser={currentUser}
                        allClients={allClients}
                        tasks={tasks}
                        categories={categories}
                        onNewTask={onNewTask}
                        onEditTask={onEditTask}
                        onTaskCreated={onTaskCreated}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                )}
            </div>
        </div>
    );
};

export default PlanningHub;
