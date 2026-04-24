import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
    Activity, Users, MapPin, CheckCircle2, AlertTriangle, 
    Sparkles, FlaskConical, TrendingUp, Calendar, ArrowUpRight,
    Briefcase, Clock, Timer, LayoutGrid, Zap, Plane, Map as MapIcon,
    Headphones, MessageSquare, Bell, Navigation, ShieldAlert, ClipboardCheck
} from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TaskStatus } from '../constants/taskConstants';

const GlobalDashboard = ({
    tasks = [],
    allClients = [],
    techTests = [],
    techFollowups = [],
    suggestions = [],
    users = [],
    currentUser,
    setViewMode,
    notifySuccess,
    notifyError
}) => {
    const isMobile = useIsMobile();
    const [sacTickets, setSacTickets] = useState([]);
    const [simpleTickets, setSimpleTickets] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            try {
                const [sacRes, riRes] = await Promise.all([
                    supabase.from('sac_tickets').select('*').in('status', ['ABERTO', 'EM_ANALISE']),
                    supabase.from('simple_tickets').select('*').in('status', ['ABERTO', 'EM_ANALISE'])
                ]);
                if (sacRes.error) throw sacRes.error;
                if (riRes.error) throw riRes.error;
                setSacTickets(sacRes.data || []);
                setSimpleTickets(riRes.data || []);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const activeTravelsCount = tasks.filter(t =>
            t.travels?.length > 0 && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED
        ).flatMap(t => t.travels).filter(tr => {
            if (!tr.date) return false;
            const trDate = new Date(tr.date.includes('T') ? tr.date : `${tr.date}T00:00:00`);
            const dashToday = new Date(); dashToday.setHours(0,0,0,0);
            return !isNaN(trDate.getTime()) && (trDate >= dashToday || tr.status === 'EM_CURSO');
        }).length;

        const ignoreStatuses = ['FINALIZADO', 'CANCELADO', 'APROVADO', 'REPROVADO'];
        const activeTests = techTests.filter(t => !ignoreStatuses.includes(t.status)).length;
        const onlineUsersList = users.filter(u => u.last_seen && (new Date() - new Date(u.last_seen) < 10 * 60 * 1000));

        const pendingVisits = tasks.filter(t =>
            t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED &&
            t.visitation?.required === true
        );

        const overdueItems = tasks.filter(t => {
            if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED) return false;
            if (!t.due_date) return false;
            const d = new Date(t.due_date.includes('T') ? t.due_date : `${t.due_date}T12:00:00`);
            const now = new Date(); now.setHours(0,0,0,0);
            return d < now;
        });

        return {
            activeTravels: activeTravelsCount,
            activeTests,
            onlineUsers: onlineUsersList.length,
            onlineUsersList,
            activeSacs: sacTickets.length,
            activeRis: simpleTickets.length,
            pendingVisits,
            overdueItems,
        };
    }, [tasks, techTests, users, sacTickets, simpleTickets]);

    const blueIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    const activeTravelsList = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return tasks
            .filter(t => t.travels?.length > 0 && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)
            .flatMap(t => t.travels.map(tr => ({ ...tr, client: t.client, taskTitle: t.title })))
            .filter(tr => {
                if (!tr.date) return false;
                const trDate = new Date(tr.date.includes('T') ? tr.date : `${tr.date}T00:00:00`);
                return !isNaN(trDate.getTime()) && (trDate >= today || tr.status === 'EM_CURSO');
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 6);
    }, [tasks]);

    const weekStats = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7); nextWeek.setHours(23, 59, 59, 999);
        const parseDate = (d) => {
            if (!d) return null;
            const date = new Date(d.includes('T') ? d : `${d}T12:00:00`);
            return isNaN(date.getTime()) ? null : date;
        };
        const weekTasks = tasks.filter(t => {
            if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED) return false;
            const d = parseDate(t.due_date);
            return d && d >= today && d <= nextWeek;
        });
        const weekSacs = sacTickets.filter(s => { const d = parseDate(s.created_at); return d && d >= today && d <= nextWeek; });
        const weekRis = simpleTickets.filter(r => { const d = parseDate(r.report_date || r.created_at); return d && d >= today && d <= nextWeek; });
        return {
            total: weekTasks.length + weekSacs.length + weekRis.length,
            items: [
                ...weekTasks.map(t => ({ type: 'TASK', date: t.due_date, title: t.title, client: t.client, status: t.status, category: t.category, assigned: t.assigned_users, raw: t })),
                ...weekSacs.map(s => ({ type: 'SAC', date: s.created_at, title: s.subject || 'Ocorrência Técnica', client: s.client_name, status: s.status, category: 'SAC', raw: s })),
                ...weekRis.map(r => ({ type: 'RI', date: r.report_date || r.created_at, title: r.subject || 'Interação Rápida', client: r.client_name, status: r.status, category: 'RI', raw: r }))
            ].sort((a, b) => parseDate(a.date)?.getTime() - parseDate(b.date)?.getTime()),
        };
    }, [tasks, sacTickets, simpleTickets]);

    // Central de Alertas: SACs + Testes críticos unificados
    const alertItems = useMemo(() => {
        const ignoreStatuses = ['FINALIZADO', 'CANCELADO', 'APROVADO', 'REPROVADO'];
        const sacAlerts = sacTickets.slice(0, 5).map(s => ({
            type: 'SAC',
            title: s.subject || 'Ocorrência sem título',
            client: s.client_name || '—',
            date: s.created_at,
            severity: s.status === 'EM_ANALISE' ? 'high' : 'medium',
            raw: s
        }));
        const testAlerts = techTests
            .filter(t => !ignoreStatuses.includes(t.status))
            .slice(0, 4)
            .map(t => ({
                type: 'TESTE',
                title: t.title || t.product || 'Teste sem título',
                client: t.client || '—',
                date: t.created_at,
                severity: t.status === 'AGUARDANDO' ? 'medium' : 'low',
                raw: t
            }));
        return [...sacAlerts, ...testAlerts].slice(0, 6);
    }, [sacTickets, techTests]);

    const kpiCards = [
        { label: 'Online', val: stats.onlineUsers, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', detail: stats.onlineUsersList.map(u => u.username).join(', ') },
        { label: 'Viagens', val: stats.activeTravels, icon: Plane, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
        { label: 'Testes', val: stats.activeTests, icon: FlaskConical, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
        { label: 'SACs', val: stats.activeSacs, icon: Headphones, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
        { label: 'RIs', val: stats.activeRis, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        { label: 'Atrasadas', val: stats.overdueItems.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    ];

    return (
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'} flex flex-col gap-4 animate-in fade-in duration-500 bg-slate-50/60`}>

            {/* ─── LINHA 1: Header + KPIs ─── */}
            <header className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="shrink-0">
                    <h1 className="text-base font-black text-slate-800 tracking-tight uppercase leading-none">Dashboard Global</h1>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Visão consolidada da operação em tempo real</p>
                </div>
                <div className={`grid ${isMobile ? 'grid-cols-3 gap-2' : 'grid-cols-3 lg:grid-cols-6 gap-2'} flex-1`}>
                    {kpiCards.map((stat, i) => (
                        <div key={i} className={`group relative p-2.5 rounded-xl ${stat.bg} border ${stat.border} flex items-center gap-2 hover:scale-105 transition-all duration-200 cursor-default`}>
                            <div className={`p-1.5 rounded-lg bg-white shadow-sm ${stat.color}`}>
                                <stat.icon size={14} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider leading-none">{stat.label}</p>
                                <p className={`text-lg font-black leading-none ${stat.color}`}>{stat.val}</p>
                            </div>
                            {stat.detail && stats.onlineUsersList.length > 0 && (
                                <div className="absolute top-full left-0 mt-1.5 z-50 invisible group-hover:visible bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl min-w-[140px] animate-in fade-in duration-150">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 border-b border-slate-700 pb-1.5">Equipe Ativa</p>
                                    {stats.onlineUsersList.map((u, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-bold">{u.username}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </header>

            {/* ─── LINHA 2: Grade 3 colunas ─── */}
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-4'}`} style={{ minHeight: isMobile ? 'auto' : '340px', maxHeight: isMobile ? 'none' : '360px' }}>

                {/* Col 1 — Radar de Viagens */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:border-sky-300 transition-colors">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-sky-600 p-1.5 rounded-lg shadow-sm shadow-sky-200">
                                <Plane className="text-white" size={14} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Radar de Viagens</h3>
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Logística ativa</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setViewMode('travels')}
                            className="text-[9px] font-black text-sky-600 uppercase flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            Ver <ArrowUpRight size={11} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {activeTravelsList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 opacity-40">
                                <Plane size={28} className="text-slate-300 mb-2" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nenhuma viagem ativa</p>
                            </div>
                        ) : activeTravelsList.map((tr, i) => (
                            <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-transparent hover:border-sky-200 transition-all group">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${tr.status === 'EM_CURSO' ? 'bg-sky-500 animate-pulse' : 'bg-slate-300'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{tr.status === 'EM_CURSO' ? '🚗 Em Deslocamento' : 'Planejado'}</p>
                                    <p className="text-xs font-black text-slate-800 group-hover:text-sky-700 truncate">{tr.client}</p>
                                </div>
                                <p className="text-[9px] font-mono text-slate-400 shrink-0">{new Date(tr.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Col 2 — Status da Semana */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:border-indigo-300 transition-colors">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-200">
                                <Calendar className="text-white" size={14} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Status da Semana</h3>
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Próximos 7 dias</p>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-indigo-600">{weekStats.total}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">itens</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {weekStats.items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 opacity-40">
                                <Calendar size={28} className="text-slate-300 mb-2" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Agenda limpa</p>
                            </div>
                        ) : weekStats.items.map((item, i) => (
                            <div key={i}
                                onClick={() => setViewMode(item.type === 'TASK' ? 'kanban' : 'sac')}
                                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all cursor-pointer group">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 mt-0.5 ${
                                    item.type === 'TASK' ? 'bg-indigo-100 text-indigo-700' :
                                    item.type === 'SAC' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                }`}>{item.type}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 group-hover:text-indigo-700 truncate">{item.client || 'Sem Cliente'}</p>
                                    <p className="text-[9px] text-slate-400 truncate">{item.title}</p>
                                </div>
                                <p className="text-[9px] font-mono text-slate-400 shrink-0">{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Col 3 — Central de Alertas + Visitas Pendentes */}
                <section className="flex flex-col gap-3 overflow-hidden">
                    {/* Central de Alertas */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:border-rose-300 transition-colors flex-1">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
                            <div className="flex items-center gap-2">
                                <div className="bg-rose-600 p-1.5 rounded-lg shadow-sm shadow-rose-200">
                                    <ShieldAlert className="text-white" size={14} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Central de Alertas</h3>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">SACs + Testes ativos</p>
                                </div>
                            </div>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${alertItems.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                {alertItems.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                            {alertItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-6 opacity-40">
                                    <CheckCircle2 size={24} className="text-emerald-400 mb-1.5" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tudo em dia!</p>
                                </div>
                            ) : alertItems.map((alert, i) => (
                                <div key={i}
                                    onClick={() => setViewMode(alert.type === 'SAC' ? 'sac' : 'controls')}
                                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer group">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${alert.severity === 'high' ? 'bg-rose-500 animate-pulse' : alert.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-slate-800 truncate group-hover:text-rose-700">{alert.client}</p>
                                        <p className="text-[8px] text-slate-400 truncate">{alert.title}</p>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase shrink-0 ${alert.type === 'SAC' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{alert.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Visitas Pendentes */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:border-emerald-300 transition-colors" style={{ maxHeight: '140px' }}>
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
                            <div className="flex items-center gap-2">
                                <div className="bg-emerald-600 p-1.5 rounded-lg shadow-sm shadow-emerald-200">
                                    <Navigation className="text-white" size={12} />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Visitas Pendentes</h3>
                                </div>
                            </div>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${stats.pendingVisits.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {stats.pendingVisits.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {stats.pendingVisits.length === 0 ? (
                                <div className="flex items-center justify-center h-full py-3 opacity-40">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Nenhuma visita agendada</p>
                                </div>
                            ) : stats.pendingVisits.slice(0, 3).map((v, i) => (
                                <div key={i}
                                    onClick={() => setViewMode('kanban')}
                                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer group">
                                    <MapPin size={10} className="text-emerald-500 shrink-0" />
                                    <p className="text-[9px] font-black text-slate-700 truncate group-hover:text-emerald-700">{v.client}</p>
                                    {v.due_date && <p className="text-[8px] font-mono text-slate-400 shrink-0 ml-auto">{new Date(v.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* ─── LINHA 3: Mapa Full-Width ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0" style={{ height: isMobile ? '250px' : '480px' }}>
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-700 p-1.5 rounded-lg">
                            <MapIcon className="text-white" size={13} />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Mapa Operacional</h3>
                            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Tarefas com localização ativa</p>
                        </div>
                    </div>
                    <button onClick={() => setViewMode('map')} className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1 hover:text-brand-600 transition-colors">
                        Expandir <ArrowUpRight size={11} />
                    </button>
                </div>
                <div style={{ height: 'calc(100% - 45px)' }}>
                    <MapContainer center={[-23.5505, -46.6333]} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                        {tasks.filter(t => t.geo?.lat && t.geo?.lng && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)
                            .map(t => (
                                <Marker key={t.id} position={[t.geo.lat, t.geo.lng]} icon={blueIcon}>
                                    <Popup>
                                        <div className="p-1">
                                            <div className="font-bold text-slate-800 text-xs">{t.client}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">{t.location}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                    </MapContainer>
                </div>
            </div>

            {/* Hidden Icons */}
            <div className="hidden">
                <Activity /><Briefcase /><Clock /><Timer /><LayoutGrid /><Headphones /><MessageSquare /><Bell /><ClipboardCheck />
            </div>
        </div>
    );
};

export default GlobalDashboard;
