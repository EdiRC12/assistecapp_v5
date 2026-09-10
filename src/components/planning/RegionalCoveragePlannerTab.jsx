import React, { useState, useMemo } from 'react';
import { 
    MapPin, Compass, Calendar, Users, Route, TrendingUp, CheckCircle2, 
    AlertTriangle, Clock, ChevronDown, ChevronUp, Search, Plus, X, Check,
    Building2, Sparkles, ShieldAlert, PieChart, Info, Crown, Award, 
    Layers, ArrowRight, Scale, BarChart3, Target, CalendarDays, CalendarRange, Filter, Briefcase
} from 'lucide-react';
import { calculateRegionalCoverage } from '../../utils/regionalCoverageCalculator';
import OverdueSLATab from './OverdueSLATab';
import VisitationTab from './VisitationTab';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Coordenadas geográficas dos estados do Brasil
const STATE_COORDINATES = {
    'RS': [-30.0346, -51.2177],
    'SC': [-27.5954, -48.5480],
    'PR': [-25.4284, -49.2733],
    'SP': [-23.5505, -46.6333],
    'RJ': [-22.9068, -43.1729],
    'MG': [-19.9167, -43.9345],
    'ES': [-20.3155, -40.3128],
    'GO': [-16.6869, -49.2648],
    'DF': [-15.7938, -47.8827],
    'MT': [-15.6010, -56.0978],
    'MS': [-20.4697, -54.6201],
    'BA': [-12.9777, -38.5016],
    'PE': [-8.0476, -34.8770],
    'CE': [-3.7319, -38.5267],
    'RN': [-5.7945, -35.2110],
    'PB': [-7.1195, -34.8450],
    'AL': [-9.6658, -35.7353],
    'SE': [-10.9472, -37.0731],
    'MA': [-2.5307, -44.3068],
    'PI': [-5.0892, -42.8019],
    'PA': [-1.4558, -48.4902],
    'AM': [-3.1190, -60.0217],
    'RO': [-8.7619, -63.9039],
    'AC': [-9.9754, -67.8249],
    'RR': [2.8235, -60.6758],
    'AP': [0.0355, -51.0705],
    'TO': [-10.1844, -48.3336],
    'OUTROS': [-15.7938, -47.8827]
};

const RecenterMapHelper = ({ coords }) => {
    const map = useMap();
    React.useEffect(() => {
        if (!coords || coords.length === 0) return;
        try {
            map.fitBounds(coords, { padding: [40, 40], maxZoom: 8 });
        } catch (e) {
            console.warn("Could not fit map bounds:", e);
        }
    }, [coords, map]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 150);
        return () => clearTimeout(timer);
    }, [map]);

    return null;
};

const RegionalCoveragePlannerTab = ({
    allClients = [],
    tasks = [],
    supabase,
    currentUser,
    techTests,
    onNewTask,
    onTaskCreated,
    onNavigateTab,
    notifySuccess,
    notifyError
}) => {
    // Sub-modos
    const [subMode, setSubMode] = useState('STATE_PLANNING');

    // Filtros de Datas
    const today = new Date();
    const currentYear = today.getFullYear();

    const [startDateStr, setStartDateStr] = useState(`${currentYear}-01-01`);
    const [endDateStr, setEndDateStr] = useState(`${currentYear}-12-21`);

    // Filtros de busca
    const [searchState, setSearchState] = useState('');
    const [expandedState, setExpandedState] = useState(null);
    const [filterOnlyNeglected, setFilterOnlyNeglected] = useState(false);
    const [selectedRegionFilter, setSelectedRegionFilter] = useState('TODAS');

    // Sub-aba interna da Central Integrada
    const [integratedTab, setIntegratedTab] = useState('OVERDUE_SLA');

    // Modal de Seleção de Clientes da Viagem
    const [selectedTripModalData, setSelectedTripModalData] = useState(null);
    const [selectedClientKeys, setSelectedClientKeys] = useState([]);
    const [clientSearchFilter, setClientSearchFilter] = useState('');

    // Meta 2027
    const [targetGoal2027, setTargetGoal2027] = useState(85);

    // Dados de sincronização em tempo real do Cronograma (Rascunhos e Reservas)
    const [plannedVisits, setPlannedVisits] = useState([]);
    const [travelReservations, setTravelReservations] = useState([]);

    const fetchPlannerSyncData = async () => {
        if (!supabase) return;
        try {
            const [pvRes, trRes] = await Promise.all([
                supabase.from('planned_visits').select('*'),
                supabase.from('travel_reservations').select('*')
            ]);
            if (pvRes.data) setPlannedVisits(pvRes.data);
            if (trRes.data) setTravelReservations(trRes.data);
        } catch (err) {
            console.error('Error fetching planner sync data:', err);
        }
    };

    React.useEffect(() => {
        fetchPlannerSyncData();
    }, [supabase]);

    // Processamento Inteligente Unificado (considera Tarefas + Visitas Planejadas + Reservas no Cronograma)
    const coverageData = useMemo(() => {
        return calculateRegionalCoverage(allClients, tasks, startDateStr, endDateStr, plannedVisits, travelReservations);
    }, [allClients, tasks, startDateStr, endDateStr, plannedVisits, travelReservations]);

    const { summary, regionsList, categoryStats, visitTypeStats, imbalanceAlerts } = coverageData;

    // Filtro de regiões
    const filteredRegions = useMemo(() => {
        return regionsList.filter(reg => {
            if (selectedRegionFilter !== 'TODAS' && reg.state !== selectedRegionFilter) {
                return false;
            }
            const matchesSearch = !searchState || 
                reg.state.toLowerCase().includes(searchState.toLowerCase()) ||
                reg.topCities.some(c => c.toLowerCase().includes(searchState.toLowerCase()));
            const matchesNeglected = !filterOnlyNeglected || reg.attentionLevel === 'NEGLIGENCIADO';
            return matchesSearch && matchesNeglected;
        });
    }, [regionsList, searchState, filterOnlyNeglected, selectedRegionFilter]);

    // Algoritmo Inteligente de Sugestão de Agendas de Viagem para Meses Restantes
    const suggestedSchedule = useMemo(() => {
        const start = new Date(startDateStr || '2026-01-01');
        const end = new Date(endDateStr || '2026-12-31');
        const now = new Date();
        
        const planningStart = now > start && now < end ? now : start;

        const monthsList = [];
        let curr = new Date(planningStart.getFullYear(), planningStart.getMonth(), 1);
        const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

        while (curr <= lastMonth) {
            monthsList.push({
                year: curr.getFullYear(),
                monthIndex: curr.getMonth(),
                monthName: curr.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
            });
            curr.setMonth(curr.getMonth() + 1);
        }

        const rankedRegions = regionsList
            .map(r => {
                const pendingAnchors = r.anchorClients.filter(c => c.needsAttention || c.isOverdue);
                const pendingWildcards = r.wildcardClients.filter(c => c.needsAttention || c.isOverdue);
                const isNeglected = r.attentionLevel === 'NEGLIGENCIADO';
                const score = (pendingAnchors.length * 15) + (100 - r.anchorCoveragePct) + (isNeglected ? 40 : 0);
                return {
                    ...r,
                    pendingAnchors,
                    pendingWildcards,
                    priorityScore: Math.round(score)
                };
            })
            .filter(r => r.pendingAnchors.length > 0 || r.attentionLevel === 'NEGLIGENCIADO' || r.anchorCoveragePct < 80)
            .sort((a, b) => b.priorityScore - a.priorityScore);

        const weeksAllocation = [];
        let regionIndex = 0;

        monthsList.forEach(m => {
            [2, 4].forEach(weekNum => {
                if (regionIndex < rankedRegions.length) {
                    const targetRegion = rankedRegions[regionIndex];
                    weeksAllocation.push({
                        id: `${m.year}-${m.monthIndex}-W${weekNum}`,
                        year: m.year,
                        monthIndex: m.monthIndex,
                        weekNum: weekNum,
                        monthName: m.monthName,
                        weekLabel: `Semana ${weekNum}`,
                        region: targetRegion
                    });
                    regionIndex++;
                } else if (rankedRegions.length > 0) {
                    const recycleRegion = rankedRegions[(weeksAllocation.length) % rankedRegions.length];
                    weeksAllocation.push({
                        id: `${m.year}-${m.monthIndex}-W${weekNum}`,
                        year: m.year,
                        monthIndex: m.monthIndex,
                        weekNum: weekNum,
                        monthName: m.monthName,
                        weekLabel: `Semana ${weekNum}`,
                        region: recycleRegion,
                        isRecycled: true
                    });
                }
            });
        });

        return {
            remainingMonthsCount: monthsList.length,
            totalAvailableWeeks: monthsList.length * 2,
            weeksAllocation,
            criticalRegionsCount: rankedRegions.length
        };
    }, [regionsList, startDateStr, endDateStr]);

    // Estados do Modo Sugestão: 'TIMELINE' (Cronograma Semanal), 'CARDS' ou 'MAP'
    const [suggestionViewMode, setSuggestionViewMode] = useState('TIMELINE');
    const [selectedSuggestionMonth, setSelectedSuggestionMonth] = useState('TODOS');

    // Impacto Simulado das Sugestões
    const suggestedVisitsCount = useMemo(() => {
        return suggestedSchedule.weeksAllocation.reduce((acc, week) => {
            const anchorsCount = week.region.pendingAnchors?.length || 0;
            const wildcardsCount = Math.min(3, week.region.pendingWildcards?.length || 0);
            return acc + anchorsCount + wildcardsCount;
        }, 0);
    }, [suggestedSchedule]);

    const suggestedCoveragePct = useMemo(() => {
        const totalReq = summary.totalRequiredVisits || (allClients.length * 2) || 100;
        const rawPct = Math.round((suggestedVisitsCount / Math.max(1, totalReq)) * 100);
        const currentProjected = summary.projectedFinalCoveragePct || (summary.pastCompletedPct + summary.futureScheduledPct);
        const remainingCap = 100 - currentProjected;
        const calculatedGain = rawPct > 0 ? rawPct : 35;
        return Math.max(1, Math.min(remainingCap > 0 ? remainingCap : 35, calculatedGain));
    }, [suggestedVisitsCount, summary, allClients]);

    const simulatedTotalPct = Math.min(100, (summary.projectedFinalCoveragePct || summary.pastCompletedPct + summary.futureScheduledPct) + suggestedCoveragePct);

    const calculateWeekRangeFromItem = (weekInfo) => {
        let year = new Date().getFullYear();
        let monthIndex = new Date().getMonth();
        let weekNum = 2;

        if (weekInfo && typeof weekInfo === 'object') {
            if (weekInfo.year) year = weekInfo.year;
            if (weekInfo.monthIndex !== undefined) monthIndex = weekInfo.monthIndex;
            if (weekInfo.weekNum) weekNum = weekInfo.weekNum;
        } else if (typeof weekInfo === 'string') {
            if (weekInfo.includes('4')) weekNum = 4;
        }

        const dayAnchor = (weekNum === 4 || weekNum === '4') ? 22 : 8;
        const targetDate = new Date(year, monthIndex, dayAnchor);
        const dayOfWeek = targetDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const monday = new Date(year, monthIndex, dayAnchor + diffToMonday);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        const formatISO = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        return {
            weekStart: formatISO(monday),
            endDate: formatISO(friday),
            weekLabel: typeof weekInfo === 'object' ? `${weekInfo.monthName || ''} • ${weekInfo.weekLabel || ''}` : (weekInfo || 'Semana Recomendada')
        };
    };

    const handleReserveRegionForWeek = async (region, weekInfo = null) => {
        if (!region || !region.state) return;

        const range = calculateWeekRangeFromItem(weekInfo);

        try {
            if (supabase) {
                const reservationPayload = {
                    week_start: range.weekStart,
                    end_date: range.endDate,
                    state_code: region.state,
                    notes: `VIAGEM DE ATENDIMENTO - ESTADO DO ${region.state}`.toUpperCase(),
                    created_at: new Date().toISOString()
                };

                if (currentUser?.id) {
                    reservationPayload.user_id = currentUser.id;
                }

                let { error: resErr } = await supabase
                    .from('travel_reservations')
                    .insert([reservationPayload]);

                if (resErr && reservationPayload.user_id) {
                    delete reservationPayload.user_id;
                    const fallbackRes = await supabase
                        .from('travel_reservations')
                        .insert([reservationPayload]);
                    resErr = fallbackRes.error;
                }

                if (resErr) {
                    console.error('Error inserting travel_reservation:', resErr);
                }
            }

            if (notifySuccess) {
                notifySuccess(`Viagem para o Estado do ${region.state} reservada no Cronograma!`);
            }

            if (onNavigateTab) {
                onNavigateTab('CRONOGRAMA', region.state);
            }
        } catch (err) {
            console.error('Error in handleReserveRegionForWeek:', err);
            if (onNavigateTab) {
                onNavigateTab('CRONOGRAMA', region?.state || '');
            }
        }
    };

    const toggleExpand = (stateName) => {
        setExpandedState(prev => prev === stateName ? null : stateName);
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-slate-50/60 space-y-6">
            
            {/* ── HEADER PRINCIPAL & SELETORES DE DATAS ───────────────────────── */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
                    <Scale size={280} className="text-indigo-400" />
                </div>

                <div className="relative z-10 space-y-5">
                    
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                        <div className="space-y-1.5 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
                                <Sparkles size={13} className="text-indigo-400" />
                                Central Unificada de Inteligência Regional
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                                Cobertura Regional, Projeções & Metas
                            </h2>
                            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                                Acompanhe a projeção dinâmica de fechamento do ciclo, combinando o que já foi **Realizado** com a **Agenda Programada**, respeitando a cadência de semanas alternadas e viagens extras.
                            </p>
                        </div>

                        {/* Intervalo de Datas */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 shadow-inner">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-indigo-200 flex items-center gap-1">
                                    <CalendarDays size={12} /> Início do Ciclo
                                </label>
                                <input
                                    type="date"
                                    value={startDateStr}
                                    onChange={(e) => setStartDateStr(e.target.value)}
                                    className="bg-slate-900/80 text-white text-xs font-black px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                                />
                            </div>

                            <div className="hidden sm:block w-px h-8 bg-white/10" />

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-indigo-200 flex items-center gap-1">
                                    <Clock size={12} /> Fim do Ciclo (Último dia)
                                </label>
                                <input
                                    type="date"
                                    value={endDateStr}
                                    onChange={(e) => setEndDateStr(e.target.value)}
                                    className="bg-slate-900/80 text-white text-xs font-black px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sub-Navegação dos Modos */}
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setSubMode('STATE_PLANNING')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                subMode === 'STATE_PLANNING'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                            }`}
                        >
                            <MapPin size={14} />
                            <span>1. Fechamento de Ciclo por Região</span>
                        </button>

                        <button
                            onClick={() => setSubMode('HISTORICAL_DASHBOARD')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                subMode === 'HISTORICAL_DASHBOARD'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                            }`}
                        >
                            <BarChart3 size={14} />
                            <span>2. Balanço do Período & Metas 2027</span>
                        </button>

                        <button
                            onClick={() => setSubMode('INTEGRATED_REQUESTS_SLA')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                subMode === 'INTEGRATED_REQUESTS_SLA'
                                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                    : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                            }`}
                        >
                            <ShieldAlert size={14} />
                            <span>3. Central Integrada de Solicitantes & SLAs</span>
                            {summary.neglectedCount > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                    {summary.neglectedCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setSubMode('SCHEDULE_SUGGESTION')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                subMode === 'SCHEDULE_SUGGESTION'
                                    ? 'bg-amber-500 text-slate-900 shadow-lg scale-105 font-black'
                                    : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                            }`}
                        >
                            <Sparkles size={14} className={subMode === 'SCHEDULE_SUGGESTION' ? 'fill-slate-900' : ''} />
                            <span>4. Sugestão Inteligente de Agendas 🗓️</span>
                            {suggestedSchedule.criticalRegionsCount > 0 && (
                                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                    {suggestedSchedule.criticalRegionsCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── PAINEL DE PROJEÇÃO DINÂMICA DE META ───────────────────────────── */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-indigo-600" />
                            Projeção Dinâmica de Fechamento de Meta ({startDateStr} a {endDateStr})
                        </span>
                        <h3 className="text-lg font-black text-slate-800 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>Estimativa Atual: <strong className="text-indigo-600">{summary.projectedFinalCoveragePct}%</strong></span>
                            {suggestedCoveragePct > 0 && (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl text-xs font-black shadow-2xs flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-amber-600 fill-amber-500" />
                                    Se seguirmos o sugerido: <strong className="text-amber-950 text-sm font-black">{simulatedTotalPct}%</strong> da Meta Atendida (+{suggestedCoveragePct}%)
                                </span>
                            )}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0">
                        <Briefcase size={14} className="text-indigo-600" />
                        <span>Semanas de Viagem: <strong className="text-slate-800">{summary.actualTravelWeeksCount}</strong> / {summary.expectedTravelWeeks} previstos</span>
                        {summary.extraTravelWeeksCount > 0 && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                                +{summary.extraTravelWeeksCount} Semanas Extras! ({summary.capacityExecutionPct}%)
                            </span>
                        )}
                    </div>
                </div>

                {/* 3 Linhas de Indicadores Coloridos com Barra de Progresso Própria */}
                <div className="space-y-3 pt-1">
                    {/* Linha 1: Realizado */}
                    <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-black">
                            <span className="flex items-center gap-2 text-emerald-700 uppercase tracking-wider">
                                <CheckCircle2 size={15} className="text-emerald-500" />
                                Realizado no Ciclo
                            </span>
                            <span className="text-slate-800 font-extrabold">
                                <strong className="text-emerald-600 text-sm">{summary.pastCompletedPct}%</strong> ({summary.globalDoneInPast} visitas realizadas)
                            </span>
                        </div>
                        <div className="w-full bg-emerald-100/60 h-3.5 rounded-full overflow-hidden border border-emerald-200/50 p-0.5">
                            <div 
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 shadow-2xs"
                                style={{ width: `${Math.min(100, Math.max(summary.pastCompletedPct, 1))}%` }}
                            />
                        </div>
                    </div>

                    {/* Linha 2: Programado na Agenda */}
                    <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-black">
                            <span className="flex items-center gap-2 text-indigo-700 uppercase tracking-wider">
                                <CalendarRange size={15} className="text-indigo-500" />
                                Programado na Agenda
                            </span>
                            <span className="text-slate-800 font-extrabold">
                                <strong className="text-indigo-600 text-sm">{summary.futureScheduledPct}%</strong> ({summary.globalScheduledInFuture} visitas agendadas)
                            </span>
                        </div>
                        <div className="w-full bg-indigo-100/60 h-3.5 rounded-full overflow-hidden border border-indigo-200/50 p-0.5">
                            <div 
                                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-700 shadow-2xs"
                                style={{ width: `${Math.min(100, Math.max(summary.futureScheduledPct, summary.futureScheduledPct > 0 ? summary.futureScheduledPct : 0))}%` }}
                            />
                        </div>
                    </div>

                    {/* Linha 3: Simulado com Sugestões */}
                    <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/70 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-black">
                            <span className="flex items-center gap-2 text-amber-900 uppercase tracking-wider">
                                <Sparkles size={15} className="text-amber-500 fill-amber-400" />
                                Simulado com Sugestões Inteligentes
                            </span>
                            <span className="text-amber-950 font-extrabold">
                                <strong className="text-amber-600 text-sm">+{suggestedCoveragePct}%</strong> ({suggestedVisitsCount} visitas sugeridas)
                            </span>
                        </div>
                        <div className="w-full bg-amber-100/80 h-3.5 rounded-full overflow-hidden border border-amber-300/60 p-0.5">
                            <div 
                                className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 h-full rounded-full transition-all duration-700 shadow-2xs"
                                style={{ width: `${Math.min(100, Math.max(suggestedCoveragePct, 2))}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MODO 1: PLANEJAMENTO POR REGIONAL & DATAS (STATE_PLANNING) ──────── */}
            {subMode === 'STATE_PLANNING' && (
                <div className="space-y-6">
                    
                    {/* Alerta de Desequilíbrio */}
                    {imbalanceAlerts.neglectedRegions.length > 0 && (
                        <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-rose-500 text-white rounded-xl shrink-0 shadow-sm mt-0.5">
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h4 className="font-black text-rose-900 text-sm">
                                        Alerta: {imbalanceAlerts.neglectedRegions.length} Região(ões) com Pendência em Clientes Âncoras!
                                    </h4>
                                    <p className="text-xs text-rose-700 mt-0.5">
                                        As regiões <span className="font-black">{imbalanceAlerts.neglectedRegions.map(r => r.state).join(', ')}</span> precisam de viagens na agenda para fechar o ano sem atrasos.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setFilterOnlyNeglected(prev => !prev)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 border ${
                                    filterOnlyNeglected
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                                        : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                                }`}
                            >
                                {filterOnlyNeglected ? 'Mostrar Todas as Regiões' : 'Filtrar Apenas com Alerta'}
                            </button>
                        </div>
                    )}

                    {/* Pesquisa por Região */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 w-full">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por Estado (ex: PR, SC) ou Cidade..."
                                value={searchState}
                                onChange={(e) => setSearchState(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="text-xs font-bold text-slate-400 px-2">
                            {filteredRegions.length} Região(ões) exibidas
                        </div>
                    </div>

                    {/* Lista de Estados */}
                    <div className="space-y-4">
                        {filteredRegions.map((region) => {
                            const isExpanded = expandedState === region.state;
                            const isNeglected = region.attentionLevel === 'NEGLIGENCIADO';

                            return (
                                <div
                                    key={region.state}
                                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                                        isNeglected ? 'border-rose-300 ring-2 ring-rose-500/20 shadow-md' : 'border-slate-200 shadow-sm'
                                    }`}
                                >
                                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4 min-w-0 flex-1">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm ${
                                                isNeglected ? 'bg-rose-600 text-white' :
                                                region.anchorCoveragePct >= 80 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                                            }`}>
                                                {region.state}
                                            </div>

                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                                                        {region.state === 'OUTROS' ? 'Outras Regiões' : `Estado do ${region.state}`}
                                                    </h3>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                                        {region.anchorClientsCount} Âncoras (Ouro/Prata)
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                                                        {region.wildcardClientsCount} Coringas (Bronze)
                                                    </span>
                                                    {region.hasCalendarReservation && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                                            <CalendarDays size={12} className="text-indigo-600" />
                                                            Reserva no Cronograma
                                                        </span>
                                                    )}
                                                    {region.scheduledInFuture > 0 && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                            <CheckCircle2 size={12} className="text-emerald-600" />
                                                            {region.scheduledInFuture} no Cronograma
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                                    <Building2 size={13} className="text-slate-400 shrink-0" />
                                                    <span className="font-semibold text-slate-600">Principais Cidades:</span> {region.topCities.slice(0, 4).join(', ') || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
                                            <div className="text-right min-w-[130px]">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cobertura Âncoras</div>
                                                <div className="text-xl font-black text-slate-800">{region.anchorCoveragePct}%</div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleReserveRegionForWeek(region)}
                                                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5"
                                                >
                                                    <Plus size={14} />
                                                    <span>Agendar Viagem</span>
                                                </button>

                                                <button
                                                    onClick={() => toggleExpand(region.state)}
                                                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all"
                                                >
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalhamento Expandido */}
                                    {isExpanded && (
                                        <div className="p-5 bg-slate-50/90 border-t border-slate-200 space-y-4">
                                            <h4 className="text-xs font-black uppercase text-amber-800 flex items-center gap-1">
                                                <Crown size={14} className="text-amber-500" /> Clientes Âncoras (Ouro/Prata) do {region.state}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {region.anchorClients.map(client => (
                                                    <div key={client.id || client.name} className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                                {client.classification}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {client.completedInPast} feitas / {client.requiredVisitsInPeriod} metas
                                                            </span>
                                                        </div>
                                                        <div className="font-bold text-slate-800 text-xs">{client.name}</div>
                                                        <div className="text-[11px] text-slate-500">{client.city}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── MODO 2: BALANÇO HISTÓRICO & METAS 2027 (HISTORICAL_DASHBOARD) ──── */}
            {subMode === 'HISTORICAL_DASHBOARD' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <BarChart3 size={20} className="text-indigo-600" />
                                    Balanço Consolidado do Ciclo ({startDateStr} a {endDateStr})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Desempenho histórico de atendimento por classificação e categoria para servir de linha de base.
                                </p>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-2xl flex items-center gap-3 shrink-0">
                                <Target size={18} className="text-indigo-600" />
                                <div>
                                    <div className="text-[10px] font-black uppercase text-indigo-400">Meta Desejada 2027</div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={targetGoal2027}
                                            onChange={(e) => setTargetGoal2027(Number(e.target.value))}
                                            className="w-12 text-center text-sm font-black bg-white rounded-lg border border-indigo-200 text-indigo-900"
                                        />
                                        <span className="text-xs font-black text-indigo-700">% de Cobertura</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desempenho por Categoria */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['OURO', 'PRATA', 'BRONZE'].map(catKey => {
                                const cat = categoryStats[catKey];
                                return (
                                    <div key={catKey} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-xs uppercase text-slate-700 flex items-center gap-1">
                                                {catKey === 'OURO' && <Crown size={14} className="text-amber-500" />}
                                                {catKey === 'PRATA' && <Award size={14} className="text-slate-400" />}
                                                {catKey === 'BRONZE' && <Users size={14} className="text-amber-700" />}
                                                Clientes {catKey}
                                            </span>
                                            <span className="text-base font-black text-slate-800">{cat.coveragePct}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600" style={{ width: `${cat.coveragePct}%` }} />
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                                            <span>Atendidos: {cat.totalPlannedOrDone} / {cat.requiredVisits}</span>
                                            <span>Total: {cat.total} cli</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODO 3: CENTRAL INTEGRADA DE SOLICITANTES & SLAS ────────────────── */}
            {subMode === 'INTEGRATED_REQUESTS_SLA' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-2">
                        <button
                            onClick={() => setIntegratedTab('OVERDUE_SLA')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                integratedTab === 'OVERDUE_SLA'
                                    ? 'bg-white text-rose-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            ⚠️ Clientes SLA Atrasados
                        </button>

                        <button
                            onClick={() => setIntegratedTab('PROSPECTION')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                integratedTab === 'PROSPECTION'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            📩 Solicitações & Prospecções de Visitas
                        </button>
                    </div>

                    <div className="flex-1 p-4">
                        {integratedTab === 'OVERDUE_SLA' ? (
                            <OverdueSLATab
                                overdueClients={coverageData.regionsList.flatMap(r => 
                                    r.anchorClients.concat(r.wildcardClients)
                                        .filter(c => c.isOverdue)
                                        .map(c => ({
                                            client: c,
                                            monthsOverdue: c.slaResult ? c.slaResult.monthsOverdue : 1,
                                            lastVisitDate: c.slaResult ? c.slaResult.lastVisitDate : null,
                                            status: c.slaResult ? c.slaResult.status : 'OVERDUE'
                                        }))
                                )}
                                onActionClick={onNavigateTab}
                                supabase={supabase}
                                notifySuccess={notifySuccess}
                                notifyError={notifyError}
                            />
                        ) : (
                            <VisitationTab
                                currentUser={currentUser}
                                allClients={allClients}
                                techTests={techTests}
                                onNewTask={onNewTask}
                                onTaskCreated={onTaskCreated}
                                notifySuccess={notifySuccess}
                                notifyError={notifyError}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ── MODO 4: SUGESTÃO INTELIGENTE DE AGENDAS (SCHEDULE_SUGGESTION) ─── */}
            {subMode === 'SCHEDULE_SUGGESTION' && (
                <div className="space-y-6">
                    {/* Header da Sugestão */}
                    <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-indigo-500/30 shadow-xl space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider mb-2">
                                    <Sparkles size={14} className="fill-amber-300" />
                                    Algoritmo de Priorização Automática
                                </span>
                                <h3 className="text-xl md:text-2xl font-black tracking-tight">
                                    Sugestão Inteligente de Agendas de Viagem
                                </h3>
                                <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                                    Proposta de cronograma semana a semana para os <strong className="text-amber-300">{suggestedSchedule.remainingMonthsCount} meses restantes</strong> do ciclo, distribuindo as semanas de viagem para zerar pendências nos Estados críticos.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0">
                                <div className="text-center px-2">
                                    <div className="text-2xl font-black text-amber-400">{suggestedSchedule.totalAvailableWeeks}</div>
                                    <div className="text-[10px] font-black uppercase text-slate-300">Semanas Disponíveis</div>
                                </div>
                                <div className="w-px h-8 bg-white/20" />
                                <div className="text-center px-2">
                                    <div className="text-2xl font-black text-rose-400">{suggestedSchedule.criticalRegionsCount}</div>
                                    <div className="text-[10px] font-black uppercase text-slate-300">Regiões Críticas</div>
                                </div>
                            </div>
                        </div>

                        {/* Barra de Controles: Alternador de Visão (Cronograma / Cards / Mapa) e Filtro por Mês */}
                        <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Toggle de Visão */}
                            <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-white/15 shadow-inner flex-wrap">
                                <button
                                    onClick={() => setSuggestionViewMode('TIMELINE')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                        suggestionViewMode === 'TIMELINE'
                                            ? 'bg-amber-400 text-slate-950 shadow-md'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <CalendarRange size={14} />
                                    <span>📅 Cronograma Semanal do Ciclo</span>
                                </button>

                                <button
                                    onClick={() => setSuggestionViewMode('CARDS')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                        suggestionViewMode === 'CARDS'
                                            ? 'bg-amber-400 text-slate-950 shadow-md'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <Layers size={14} />
                                    <span>📋 Grade por Cards</span>
                                </button>

                                <button
                                    onClick={() => setSuggestionViewMode('MAP')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                        suggestionViewMode === 'MAP'
                                            ? 'bg-amber-400 text-slate-950 shadow-md'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <Compass size={14} />
                                    <span>🗺️ Mapa Interativo</span>
                                </button>
                            </div>

                            {/* Filtro por Mês */}
                            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Filtrar Mês:</span>
                                <button
                                    onClick={() => setSelectedSuggestionMonth('TODOS')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                                        selectedSuggestionMonth === 'TODOS'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                    }`}
                                >
                                    Todos ({suggestedSchedule.weeksAllocation.length} semanas)
                                </button>

                                {Array.from(new Set(suggestedSchedule.weeksAllocation.map(w => w.monthName))).map(monthName => (
                                    <button
                                        key={monthName}
                                        onClick={() => setSelectedSuggestionMonth(monthName)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                                            selectedSuggestionMonth === monthName
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                        }`}
                                    >
                                        {monthName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── VISÃO 1: CRONOGRAMA SEMANAL DO CICLO (TIMELINE - PADRÃO) ──── */}
                    {suggestionViewMode === 'TIMELINE' ? (
                        <div className="space-y-6">
                            {Array.from(new Set(suggestedSchedule.weeksAllocation.map(w => w.monthName)))
                                .filter(m => selectedSuggestionMonth === 'TODOS' || m === selectedSuggestionMonth)
                                .map((monthName) => {
                                    const monthWeeks = suggestedSchedule.weeksAllocation.filter(w => w.monthName === monthName);
                                    
                                    // Mapear as 4 semanas do mês (alternando viagens e escritório)
                                    const fullMonthWeeks = [1, 2, 3, 4].map(wNum => {
                                        const foundSuggested = monthWeeks.find(mw => mw.weekLabel === `Semana ${wNum}`);
                                        return {
                                            weekNumber: wNum,
                                            weekLabel: `Semana ${wNum}`,
                                            suggested: foundSuggested || null
                                        };
                                    });

                                    return (
                                        <div key={monthName} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                                                    <CalendarDays size={18} className="text-indigo-600" />
                                                    Cronograma Semanal do Ciclo: <span className="text-indigo-600 capitalize">{monthName}</span>
                                                </h4>
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                                    2 Viagens Sugeridas • 2 Semanas de Escritório
                                                </span>
                                            </div>

                                            {/* Linhas das Semanas do Mês */}
                                            <div className="space-y-3">
                                                {fullMonthWeeks.map(w => {
                                                    if (w.suggested) {
                                                        const reg = w.suggested.region;
                                                        const isNeglected = reg.attentionLevel === 'NEGLIGENCIADO';
                                                        return (
                                                            <div 
                                                                key={w.weekNumber}
                                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm ${
                                                                    isNeglected
                                                                        ? 'bg-gradient-to-r from-rose-50 via-white to-rose-50/30 border-rose-300'
                                                                        : 'bg-gradient-to-r from-amber-50/80 via-white to-amber-50/20 border-amber-300'
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-4 flex-1">
                                                                    <div className={`p-3 rounded-xl font-black text-xs uppercase tracking-wider shrink-0 flex flex-col items-center justify-center min-w-[90px] shadow-sm ${
                                                                        isNeglected ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                                                                    }`}>
                                                                        <span className="text-[10px] opacity-80">SEMANA</span>
                                                                        <span className="text-base font-black">0{w.weekNumber}</span>
                                                                    </div>

                                                                    <div className="space-y-1.5 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white shadow-2xs">
                                                                                🚀 Viagem Sugerida: {reg.state}
                                                                            </span>
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                                                isNeglected ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                                                                            }`}>
                                                                                Urgência: {reg.priorityScore} pts
                                                                            </span>
                                                                        </div>

                                                                        <h5 className="font-black text-slate-800 text-sm">
                                                                            Viagem de Atendimento para o Estado do {reg.state} ({reg.pendingAnchors.length} Âncoras Pendentes)
                                                                        </h5>

                                                                        {/* Clientes Principais */}
                                                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                                                            <span className="text-[11px] font-bold text-slate-400">Clientes Âncoras:</span>
                                                                            {reg.pendingAnchors.slice(0, 4).map((c, i) => (
                                                                                <span key={i} className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-lg font-semibold shadow-2xs">
                                                                                    {c.name} ({c.classification})
                                                                                </span>
                                                                            ))}
                                                                            {reg.pendingAnchors.length > 4 && (
                                                                                <span className="text-xs font-bold text-indigo-600">
                                                                                    +{reg.pendingAnchors.length - 4} mais
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleReserveRegionForWeek(reg, w.suggested)}
                                                                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
                                                                >
                                                                    <Plus size={15} />
                                                                    <span>Agendar Viagem no Cronograma</span>
                                                                </button>
                                                            </div>
                                                        );
                                                    } else {
                                                        return (
                                                            <div 
                                                                key={w.weekNumber}
                                                                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4 text-slate-500 opacity-80 hover:opacity-100 transition-opacity"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-2.5 rounded-xl bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider shrink-0 min-w-[90px] text-center">
                                                                        Semana 0{w.weekNumber}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                                        <Building2 size={15} className="text-slate-400" />
                                                                        <span>🏢 Trabalho Interno / Suporte Técnico em Escritório</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
                                                                    Cadência de Escritório Alternada
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : suggestionViewMode === 'MAP' ? (
                        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                                        <MapPin size={16} className="text-amber-500" />
                                        Simulação de Rotas e Destinos no Mapa ({selectedSuggestionMonth})
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Clique nos marcadores do mapa para ver os detalhes da viagem sugerida e agendar diretamente.
                                    </p>
                                </div>
                            </div>

                            <div className="w-full h-[550px] rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                                <MapContainer
                                    center={[-14.235, -51.925]}
                                    zoom={4}
                                    className="w-full h-full"
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                                    />

                                    {/* Centralizar Mapa nos Estados Selecionados */}
                                    <RecenterMapHelper
                                        coords={suggestedSchedule.weeksAllocation
                                            .filter(w => selectedSuggestionMonth === 'TODOS' || w.monthName === selectedSuggestionMonth)
                                            .map(w => STATE_COORDINATES[w.region.state])
                                            .filter(Boolean)}
                                    />

                                    {suggestedSchedule.weeksAllocation
                                        .filter(w => selectedSuggestionMonth === 'TODOS' || w.monthName === selectedSuggestionMonth)
                                        .map((item, idx) => {
                                            const reg = item.region;
                                            const coords = STATE_COORDINATES[reg.state] || STATE_COORDINATES['OUTROS'];
                                            const isNeglected = reg.attentionLevel === 'NEGLIGENCIADO';
                                            const markerColor = isNeglected ? '#ef4444' : '#f59e0b';

                                            return (
                                                <CircleMarker
                                                    key={`${item.id}-${idx}`}
                                                    center={coords}
                                                    pathOptions={{
                                                        color: markerColor,
                                                        fillColor: markerColor,
                                                        fillOpacity: 0.85,
                                                        weight: 3
                                                    }}
                                                    radius={22}
                                                >
                                                    <Tooltip direction="top" opacity={0.95}>
                                                        <div className="font-sans text-center">
                                                            <span className="font-black text-xs text-slate-800 block">
                                                                {item.monthName} • {item.weekLabel}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                                                Viagem {reg.state} (Urgência: {reg.priorityScore} pts)
                                                            </span>
                                                        </div>
                                                    </Tooltip>

                                                    <Popup className="custom-leaflet-popup">
                                                        <div className="p-3 max-w-xs space-y-3 font-sans">
                                                            <div className="flex justify-between items-center border-b pb-2">
                                                                <span className="text-xs font-black text-indigo-700 uppercase">
                                                                    {item.monthName} • {item.weekLabel}
                                                                </span>
                                                                <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                                                                    {reg.state}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                <div className="font-black text-slate-800 text-sm">
                                                                    Viagem Sugerida para {reg.state}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    Cobertura Atual: <strong>{reg.anchorCoveragePct}%</strong> • {reg.pendingAnchors.length} Âncoras Pendentes
                                                                </div>
                                                            </div>

                                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
                                                                <div className="text-[10px] font-black uppercase text-slate-400">
                                                                    👑 Âncoras Principais:
                                                                </div>
                                                                {reg.pendingAnchors.slice(0, 3).map((c, i) => (
                                                                    <div key={i} className="text-xs font-bold text-slate-700 truncate">
                                                                        • {c.name} ({c.city})
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <button
                                                                onClick={() => handleReserveRegionForWeek(reg)}
                                                                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                                                            >
                                                                <Plus size={14} />
                                                                <span>Agendar Viagem para {reg.state}</span>
                                                            </button>
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            );
                                        })}
                                </MapContainer>
                            </div>
                        </div>
                    ) : (
                        /* Grade de Semanas Sugeridas (Visão por Cards) */
                        suggestedSchedule.weeksAllocation.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
                                <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                                <h4 className="text-lg font-black text-slate-800">Todas as Regiões Cobertas!</h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    Nenhuma região apresenta pendência crítica em clientes âncoras para os meses restantes do período.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suggestedSchedule.weeksAllocation
                                    .filter(w => selectedSuggestionMonth === 'TODOS' || w.monthName === selectedSuggestionMonth)
                                    .map((item, idx) => {
                                        const reg = item.region;
                                        const isNeglected = reg.attentionLevel === 'NEGLIGENCIADO';
                                        return (
                                            <div
                                                key={item.id || idx}
                                                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                                            >
                                                <div className="space-y-3">
                                                    {/* Cabeçalho da Semana */}
                                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1">
                                                                <CalendarDays size={14} />
                                                                {item.monthName} • {item.weekLabel}
                                                            </span>
                                                            {item.isRecycled && (
                                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                                                    Reforço Extra
                                                                </span>
                                                            )}
                                                        </div>

                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                                                            isNeglected
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                                        }`}>
                                                            Urgência: {reg.priorityScore} pts
                                                        </span>
                                                    </div>

                                                    {/* Info do Estado Sugerido */}
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-sm ${
                                                            isNeglected ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                                                        }`}>
                                                            {reg.state}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-black text-slate-800 text-base">
                                                                Viagem para {reg.state === 'OUTROS' ? 'Outras Regiões' : `Estado do ${reg.state}`}
                                                            </h4>
                                                            <p className="text-xs text-slate-500">
                                                                Cobertura Atual: <strong className="text-slate-800">{reg.anchorCoveragePct}%</strong> • {reg.pendingAnchors.length} Âncoras Pendentes
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Lista de Clientes Âncoras Prioritários */}
                                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                                                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                            <Crown size={12} className="text-amber-500" /> Clientes Âncoras a Visitar nesta Viagem:
                                                        </div>
                                                        <div className="space-y-1">
                                                            {reg.pendingAnchors.slice(0, 3).map((c, i) => (
                                                                <div key={i} className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white p-2 rounded-xl border border-slate-200/60">
                                                                    <span className="truncate">{c.name}</span>
                                                                    <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shrink-0">
                                                                        {c.classification} • {c.city}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {reg.pendingAnchors.length > 3 && (
                                                                <div className="text-[10px] font-bold text-slate-400 text-center pt-0.5">
                                                                    + mais {reg.pendingAnchors.length - 3} cliente(s) âncoras na região
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Botão de Agendamento Direto */}
                                                <button
                                                    onClick={() => handleReserveRegionForWeek(reg, item)}
                                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                                                >
                                                    <Plus size={15} />
                                                    <span>Agendar Viagem Sugerida para {reg.state}</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default RegionalCoveragePlannerTab;
