import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, Play, Square, Clock, ListChecks, CheckCircle2, 
    AlertCircle, Plus, LayoutDashboard, Plane, ShieldAlert, 
    Settings2, ChevronRight, ChevronLeft, MessageSquare, ExternalLink, 
    TrendingUp, Timer, Calendar, History, Trash2, CheckSquare
} from 'lucide-react';
import { useMeetings } from '../hooks/useMeetings';

// Reused Views
import TravelsView from './TravelsView';
import RncView from './RncView';
import ControlsView from './ControlsView';
import ReturnsView from './returns/ReturnsView';
import PlanningHub from './planning/PlanningHub';
import { RotateCcw } from 'lucide-react';

const MeetingHub = ({ 
    supabase, 
    currentUser, 
    tasks, 
    users, 
    allClients,
    techTests,
    fetchTechTests,
    techFollowups,
    testFlows,
    testStatusPresets,
    inventoryReasons,
    vehicles,
    notifySuccess,
    notifyError,
    notifyWarning,
    onEditTask,
    onCreateTask,
    onNewTask,
    setIsModalOpen,
    setEditingTask,
    fetchTaskDetail,
    setTasks,
    fetchTasks,
    hasMoreTasks,
    customCategories,
    theme
}) => {
    const { 
        meetings, 
        activeSession, 
        actionItems, 
        loading, 
        startMeeting, 
        closeMeeting, 
        addActionItem, 
        updateActionItem,
        deleteActionItem,
        restoreActionItem,
        linkTaskToAction,
        fetchSessionActionItems,
        fetchOverallStats
    } = useMeetings(supabase, currentUser, { notifySuccess, notifyError });

    const [activeTab, setActiveTab] = useState('TRAVELS');
    const [newNoteText, setNewNoteText] = useState('');
    const [timer, setTimer] = useState('00:00:00');
    const [dashboardFilter, setDashboardFilter] = useState('RECENT'); // 'RECENT', 'MONTH', 'YEAR'
    const [overallStats, setOverallStats] = useState({ completionRate: 0, totalActions: 0, doneActions: 0 });
    
    // Estados para Histórico
    const [selectedHistorySession, setSelectedHistorySession] = useState(null);
    const [historyActionItems, setHistoryActionItems] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    // Estados para Sub-abas de RNC & DEV
    const [rncSubTab, setRncSubTab] = useState('RECORDS'); // 'RECORDS' ou 'RETURNS'
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // 1. Manutenção do Cronômetro
    useEffect(() => {
        let interval;
        if (activeSession && activeSession.start_time) {
            interval = setInterval(() => {
                const start = new Date(activeSession.start_time);
                const now = new Date();
                const diff = Math.floor((now - start) / 1000);
                
                const h = Math.floor(diff / 3600).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                const s = (diff % 60).toString().padStart(2, '0');
                setTimer(`${h}:${m}:${s}`);
            }, 1000);
        } else {
            setTimer('00:00:00');
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    // 1.1. Buscar Estatísticas Globais
    useEffect(() => {
        const loadStats = async () => {
            const s = await fetchOverallStats();
            setOverallStats(s);
        };
        loadStats();
    }, [actionItems, fetchOverallStats]);

    // 2. Estatísticas para o Dashboard
    const stats = useMemo(() => {
        if (!meetings.length) return { avgDuration: 0, totalSessions: 0, completionRate: 0 };
        
        const finished = meetings.filter(m => m.status === 'FINISHED' && m.duration_seconds);
        const totalDuration = finished.reduce((acc, m) => acc + m.duration_seconds, 0);
        const avg = finished.length ? Math.floor(totalDuration / finished.length / 60) : 0;

        return {
            avgDuration: avg,
            totalSessions: meetings.length,
            completionRate: overallStats.completionRate
        };
    }, [meetings, overallStats]);

    // 2.1. Função de Visualização de Histórico
    const handleViewHistory = async (session) => {
        setLoadingHistory(true);
        setSelectedHistorySession(session);
        setIsHistoryModalOpen(true);
        
        try {
            const data = await fetchSessionActionItems(session.id);
            setHistoryActionItems(data);
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // 2.2. Componente Reutilizável de Item de Ação
    const renderActionItemCard = (item, isHistory = false) => {
        const getStatusStyles = () => {
            switch (item.status) {
                case 'CONCLUIDO':
                    return 'bg-emerald-50 border-emerald-200 text-emerald-800';
                case 'EM_ANDAMENTO':
                    return 'bg-blue-50 border-blue-200 text-blue-800';
                case 'PENDENTE':
                    return 'bg-amber-50 border-amber-200 text-amber-800';
                default:
                    return 'bg-white border-slate-100 text-slate-700';
            }
        };

        return (
            <div key={item.id} className={`p-4 rounded-2xl border transition-all shadow-sm ${getStatusStyles()}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <div className={`text-sm font-bold ${item.status === 'CONCLUIDO' ? 'line-through opacity-70' : ''}`}>
                            {item.text}
                        </div>
                        {item.status === 'EM_ANDAMENTO' && (
                            <div className="mt-2 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase w-fit">
                                    <TrendingUp size={10} /> Em Andamento (Tarefa Vinculada)
                                </div>
                                {tasks.find(t => t.meeting_action_id === item.id) && (
                                    <div 
                                        onClick={() => onEditTask(tasks.find(t => t.meeting_action_id === item.id))}
                                        className="text-[9px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 ml-1"
                                    >
                                        <CheckSquare size={10} />
                                        Tarefa: <span className="underline">{tasks.find(t => t.meeting_action_id === item.id).title}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {(item.reopened_at || item.is_deleted) && (
                            <div className="mt-2 space-y-1">
                                {item.reopened_at && (
                                    <div className="text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                        <RotateCcw size={10} /> Reaberto em {new Date(item.reopened_at).toLocaleDateString()} {item.reopened_by_user?.username ? `por ${item.reopened_by_user.username}` : ''}
                                    </div>
                                )}
                                {item.is_deleted && (
                                    <div className="text-[9px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit border border-rose-200">
                                        <Trash2 size={10} /> Excluído em {new Date(item.deleted_at).toLocaleDateString()} {item.deleted_by_user?.username ? `por ${item.deleted_by_user.username}` : ''}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                {!isHistory ? (
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                updateActionItem(item.id, { status: item.status === 'CONCLUIDO' ? 'PENDENTE' : 'CONCLUIDO' });
                            }}
                            className={`shrink-0 p-1.5 rounded-lg transition-all ${item.status === 'CONCLUIDO' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 hover:text-emerald-500'}`}
                            title={item.status === 'CONCLUIDO' ? 'Reativar / Reabrir Pauta' : 'Marcar como Concluído'}
                        >
                            {item.status === 'CONCLUIDO' ? <RotateCcw size={18} /> : <CheckCircle2 size={18} />}
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Deseja realmente excluir este apontamento?')) {
                                    deleteActionItem(item.id);
                                }
                            }}
                            className="shrink-0 p-1.5 rounded-lg bg-slate-100 text-slate-300 hover:bg-rose-100 hover:text-rose-500 transition-all"
                            title="Excluir Pauta"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {item.is_deleted ? (
                            <button 
                                onClick={() => restoreActionItem(item.id).then(() => handleViewHistory(selectedHistorySession))}
                                className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 uppercase tracking-tighter"
                            >
                                Restaurar
                            </button>
                        ) : (
                            <button 
                                onClick={() => updateActionItem(item.id, { status: item.status === 'CONCLUIDO' ? 'PENDENTE' : 'CONCLUIDO' }).then(() => handleViewHistory(selectedHistorySession))}
                                className="px-3 py-1 bg-brand-600 text-white text-[10px] font-black rounded-lg hover:bg-brand-700 uppercase tracking-tighter"
                            >
                                {item.status === 'CONCLUIDO' ? 'Reabrir' : 'Concluir'}
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {!isHistory && item.status === 'PENDENTE' && (
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                    <button 
                        onClick={() => {
                            setIsModalOpen(true);
                            setEditingTask({ 
                                title: '', 
                                description: `Pauta da Reunião (${new Date(item.created_at).toLocaleDateString()}): ${item.text}`,
                                meeting_action_id: item.id 
                            });
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-black text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-all uppercase tracking-tight"
                    >
                        <ExternalLink size={12} /> Transformar em Tarefa
                    </button>
                </div>
            )}
        </div>
    );
};

    // 3. Renderização do Dashboard (Modo IDLE)
    const renderDashboard = () => (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Dashboard */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">CENTRAL DE REUNIÕES</h2>
                    <p className="text-slate-500 font-medium">Acompanhamento de alinhamentos e decisões estratégicas.</p>
                </div>
                <button 
                    onClick={() => startMeeting()}
                    className="flex items-center gap-3 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand-200 hover:bg-brand-700 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                    <Play size={20} fill="currentColor" /> Iniciar Reunião de Hoje
                </button>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-brand-200 transition-all">
                    <div className="p-4 bg-brand-50 text-brand-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <History size={28} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Sessões</span>
                        <div className="text-2xl font-black text-slate-800">{stats.totalSessions}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-indigo-200 transition-all">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <Timer size={28} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Médio</span>
                        <div className="text-2xl font-black text-slate-800">{stats.avgDuration} min</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-emerald-200 transition-all">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conclusão de Ações</span>
                        <div className="text-2xl font-black text-slate-800">{stats.completionRate}%</div>
                    </div>
                </div>
            </div>

            {/* Pendências e Histórico */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lista de Pendências Reais */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                            <ListChecks size={20} className="text-amber-500" /> Pendências Acumuladas
                        </h3>
                        <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                            {actionItems.filter(a => a.status !== 'CONCLUIDO').length} Aguardando
                        </span>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                        {actionItems.filter(a => a.status !== 'CONCLUIDO').length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                                <CheckCircle2 size={48} className="opacity-20" />
                                <span>Tudo em dia por aqui!</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {actionItems.filter(a => a.status !== 'CONCLUIDO').map(item => renderActionItemCard(item))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Histórico de Sessões */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                            <History size={20} className="text-indigo-500" /> Histórico de Sessões
                        </h3>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                        {meetings.filter(m => m.status === 'FINISHED').slice(0, 5).map(session => (
                            <div 
                                key={session.id} 
                                onClick={() => handleViewHistory(session)}
                                className="p-4 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <div className="font-black text-slate-800 text-sm uppercase">{session.title}</div>
                                        <div className="text-[10px] text-slate-400 font-bold">{new Date(session.start_time).toLocaleDateString()} • {Math.floor(session.duration_seconds/60)} min</div>
                                    </div>
                                </div>
                                <div className="text-slate-300 group-hover:text-brand-500 transition-colors">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // 4. Renderização do Modo Reunião (Modo ACTIVE)
    const renderActiveMeeting = () => (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 animate-in slide-in-from-bottom-4 duration-500">
            {/* Top Bar Sessão */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Sessão em Andamento</span>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{activeSession.title}</h2>
                    </div>
                    <div className="h-10 w-px bg-slate-100 mx-2" />
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-2xl shadow-lg">
                        <Clock size={18} className="text-brand-400" />
                        <span className="font-mono text-lg font-black tracking-widest">{timer}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mr-4">
                        <button 
                            onClick={() => setActiveTab('TRAVELS')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'TRAVELS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Plane size={14} /> VIAGENS
                        </button>
                        <button 
                            onClick={() => setActiveTab('RNC')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'RNC' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ShieldAlert size={14} /> RNC & DEV.
                        </button>
                        <button 
                            onClick={() => setActiveTab('TESTS')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'TESTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Settings2 size={14} /> CONTROLES
                        </button>
                        <button 
                            onClick={() => setActiveTab('AGENDA')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'AGENDA' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Calendar size={14} /> AGENDA
                        </button>
                    </div>

                    <button 
                        onClick={() => closeMeeting()}
                        className="flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                        <Square size={16} fill="white" /> Encerrar Reunião
                    </button>
                </div>
            </div>

            {/* Area de Conteúdo Main + Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* Visualizações Reusadas */}
                <div className="flex-1 overflow-hidden p-4 relative backdrop-blur-sm bg-slate-50/50">
                    <div className="h-full rounded-3xl overflow-hidden shadow-2xl border border-white/50 bg-white relative">
                        {activeTab === 'TRAVELS' && (
                            <TravelsView 
                                tasks={tasks} 
                                users={users} 
                                allClients={allClients} 
                                vehicles={vehicles}
                                notifySuccess={notifySuccess}
                                notifyError={notifyError}
                                onEditTask={onEditTask}
                                onUpdateTasks={setTasks}
                                onUpdateTests={fetchTechTests}
                                isMeetingView={true}
                            />
                        )}
                        {activeTab === 'RNC' && (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Sub-Tabs Nav */}
                                <div className="flex items-center gap-2 p-4 bg-slate-50/80 border-b border-slate-100 shrink-0">
                                    <button
                                        onClick={() => setRncSubTab('RECORDS')}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rncSubTab === 'RECORDS' ? 'bg-rose-600 text-white shadow-lg active:scale-105' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'}`}
                                    >
                                        <ShieldAlert size={14} /> Monitoramento RNC
                                    </button>
                                    <button
                                        onClick={() => setRncSubTab('RETURNS')}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rncSubTab === 'RETURNS' ? 'bg-rose-600 text-white shadow-lg active:scale-105' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'}`}
                                    >
                                        <RotateCcw size={14} /> Controle de Devoluções
                                    </button>
                                </div>

                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    {rncSubTab === 'RECORDS' ? (
                                        <RncView 
                                            tasks={tasks} 
                                            currentUser={currentUser} 
                                            users={users} 
                                            allClients={allClients}
                                            notifySuccess={notifySuccess}
                                            notifyError={notifyError}
                                            notifyWarning={notifyWarning}
                                            onCreateTask={onCreateTask}
                                            isMeetingView={true}
                                        />
                                    ) : (
                                        <ReturnsView
                                            currentUser={currentUser}
                                            allClients={allClients}
                                            notifySuccess={notifySuccess}
                                            notifyError={notifyError}
                                            isMeetingView={true}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'AGENDA' && (
                            <PlanningHub 
                                currentUser={currentUser}
                                allClients={allClients}
                                tasks={tasks}
                                techTests={techTests}
                                categories={customCategories}
                                onNewTask={onNewTask}
                                onEditTask={onEditTask}
                                notifySuccess={notifySuccess}
                                notifyError={notifyError}
                            />
                        )}
                        {activeTab === 'TESTS' && (
                            <ControlsView 
                                techTests={techTests} 
                                currentUser={currentUser} 
                                users={users} 
                                allClients={allClients}
                                tasks={tasks}
                                testFlows={testFlows}
                                testStatusPresets={testStatusPresets}
                                inventoryReasons={inventoryReasons}
                                notifySuccess={notifySuccess}
                                notifyError={notifyError}
                                onNewTask={onNewTask}
                                onCreateTask={onCreateTask}
                                isMeetingView={true}
                            />
                        )}
                    </div>
                </div>

                {/* Sidebar Checklist (Action Items) */}
                <div 
                    className={`bg-white transition-all duration-500 relative border-l border-slate-200 shadow-2xl z-[40] ${
                        isSidebarOpen ? 'w-[400px]' : 'w-0'
                    }`}
                >
                    {/* Toggle Handle (Puxador) - Fora do recorte para ficar sempre visível */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-8 h-20 bg-white border border-r-0 border-slate-200 rounded-l-2xl shadow-[-4px_0_15px_-3px_rgb(0,0,0,0.1)] flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all pointer-events-auto group z-[50]`}
                        title={isSidebarOpen ? "Recolher Notas" : "Mostrar Notas"}
                    >
                        {isSidebarOpen ? <ChevronRight size={20} className="group-hover:-translate-x-0.5 transition-transform" /> : <ChevronLeft size={20} className="group-hover:translate-x-0.5 transition-transform" />}
                    </button>

                    {/* Conteúdo com Recorte (Clipper) */}
                    <div className={`h-full flex flex-col overflow-hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 min-w-[400px]">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                            <ListChecks size={20} className="text-brand-600" /> Notas da Sessão
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">{actionItems.length} Itens</span>
                    </div>

                    {/* Input Nova Nota */}
                    <div className="p-4 min-w-[400px]">
                        <div className="relative group">
                            <input 
                                type="text"
                                placeholder="Novo apontamento..."
                                value={newNoteText}
                                onChange={e => setNewNoteText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newNoteText.trim()) {
                                        addActionItem(newNoteText);
                                        setNewNoteText('');
                                    }
                                }}
                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-inner"
                            />
                            <button 
                                onClick={() => {
                                    if (newNoteText.trim()) {
                                        addActionItem(newNoteText);
                                        setNewNoteText('');
                                    }
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 text-white rounded-xl shadow-md hover:bg-brand-700 active:scale-95 transition-all"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Lista de Itens do Checklist */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-w-[400px]">
                        {actionItems.map(item => renderActionItemCard(item))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            {activeSession ? renderActiveMeeting() : renderDashboard()}

            {/* Modal de Detalhes do Histórico */}
            {isHistoryModalOpen && selectedHistorySession && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl max-h-[80vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Detalhes da Sessão</span>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{selectedHistorySession.title}</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1">
                                    {new Date(selectedHistorySession.start_time).toLocaleString()} • {Math.floor(selectedHistorySession.duration_seconds/60)} min
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-slate-50/50">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-4">
                                    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-xs font-bold uppercase tracking-widest">Carregando apontamentos...</p>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apontamentos daquela data</h4>
                                    {historyActionItems.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 italic text-sm">Nenhum apontamento registrado nesta sessão.</div>
                                    ) : (
                                        historyActionItems.map(item => renderActionItemCard(item, true))
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingHub;
