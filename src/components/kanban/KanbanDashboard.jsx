import React, { useMemo } from 'react';
import {
    BarChart3, Clock, AlertCircle, CheckCircle2, ListTodo,
    Calendar, TrendingUp, AlertTriangle, Users, ArrowRight,
    MessageSquare, Layers, Sparkles
} from 'lucide-react';
import { TaskStatus, Priority, StatusLabels } from '../../constants/taskConstants';
import { UI_TOKENS } from '../../constants/themeConstants';

const KanbanDashboard = ({ tasks, currentUser, users, setSuggestions, suggestions = [] }) => {
    const themeStyle = currentUser?.theme_style || 'DEFAULT';
    const isMidnight = themeStyle === 'MIDNIGHT';

    const handleFeedPoli = () => {
        if (!setSuggestions) return;

        const newInsights = [];

        // 1. Insight de Atraso
        if (stats.overdue > 0) {
            newInsights.push({
                id: `dash_overdue_${Date.now()}`,
                type: 'performance_indicator',
                title: `Alerta de Atraso: ${stats.overdue} tarefas`,
                description: `Identifiquei ${stats.overdue} tarefas com prazo expirado no quadro atual. Recomendo revisar prioridades.`,
                priority: 'high',
                data: { overdue: stats.overdue }
            });
        }

        // 2. Insight de Inatividade
        if (stats.inactive > 0) {
            newInsights.push({
                id: `dash_inactive_${Date.now()}`,
                type: 'aging_alert',
                title: `Tarefas Estagnadas`,
                description: `Existem ${stats.inactive} tarefas sem movimentação há mais de 7 dias.`,
                priority: 'medium',
                data: { inactive: stats.inactive }
            });
        }

        // 3. Insight de Progresso
        if (progressPercentage < 50 && stats.total > 5) {
            newInsights.push({
                id: `dash_progress_${Date.now()}`,
                type: 'cycle_time_insight',
                title: `Baixo Engajamento de Etapas`,
                description: `O progresso global está em ${progressPercentage}%. Considere focar na conclusão das etapas em aberto.`,
                priority: 'low',
                data: { progress: progressPercentage }
            });
        }

        if (newInsights.length > 0) {
            setSuggestions(prev => [...newInsights, ...prev]);
            alert(`${newInsights.length} insights enviados para a POLI!`);
        } else {
            alert("O quadro está saudável! Nenhum alerta crítico para a POLI no momento.");
        }
    };

    // 1. Métricas Base
    const stats = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const counts = {
            total: tasks.length,
            toStart: 0,
            inProgress: 0,
            waiting: 0,
            done: 0,
            canceled: 0,
            overdue: 0,
            highPriority: 0,
            inactive: 0, // Sem update a mais de 7 dias
            completedStages: 0,
            totalStages: 0
        };

        tasks.forEach(t => {
            // Conta por Status
            if (t.status === TaskStatus.TO_START) counts.toStart++;
            else if (t.status === TaskStatus.IN_PROGRESS) counts.inProgress++;
            else if (t.status === TaskStatus.WAITING_CLIENT) counts.waiting++;
            else if (t.status === TaskStatus.DONE) counts.done++;
            else if (t.status === TaskStatus.CANCELED) counts.canceled++;

            // Atrasos
            if (t.due_date && new Date(t.due_date) < now && t.status !== TaskStatus.DONE) {
                counts.overdue++;
            }

            // Alta Prioridade
            if (t.priority === Priority.HIGH) counts.highPriority++;

            // Inatividade (7 dias)
            const lastUpdate = new Date(t.updated_at || t.created_at);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            if (lastUpdate < sevenDaysAgo && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED) {
                counts.inactive++;
            }

            // Progresso de Etapas
            if (t.stages) {
                Object.values(t.stages).forEach(s => {
                    if (s.active) {
                        counts.totalStages++;
                        if (['COMPLETED', 'SOLUCIONADO', 'FINALIZADO'].includes(s.status)) {
                            counts.completedStages++;
                        }
                    }
                });
            }
        });

        return counts;
    }, [tasks]);

    const progressPercentage = stats.totalStages > 0
        ? Math.round((stats.completedStages / stats.totalStages) * 100)
        : 0;

    const cards = [
        {
            label: 'Total de Atividades',
            value: stats.total,
            icon: ListTodo,
            color: 'text-brand-500',
            bg: 'bg-brand-500/10',
            desc: 'Tarefas no quadro atual'
        },
        {
            label: 'Em Andamento',
            value: stats.inProgress,
            icon: TrendingUp,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            desc: 'Trabalho ativo'
        },
        {
            label: 'Atrasadas',
            value: stats.overdue,
            icon: AlertCircle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            desc: 'Prazo expirado',
            critical: stats.overdue > 0
        },
        {
            label: 'Inativas (+7d)',
            value: stats.inactive,
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            desc: 'Sem movimentação',
            warning: stats.inactive > 0
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Header / Resumo Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`p-5 rounded-3xl border ${isMidnight ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'} shadow-sm hover:shadow-lg transition-all group`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                                <card.icon size={24} />
                            </div>
                            {card.critical && (
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                            )}
                        </div>
                        <h4 className={`text-2xl font-black ${isMidnight ? 'text-white' : 'text-slate-900'} mb-1`}>{card.value}</h4>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isMidnight ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{card.label}</p>
                        <p className="text-[10px] text-slate-400 italic line-clamp-1">{card.desc}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lado Esquerdo: Distribuição e Progresso */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Barra de Progresso Geral do Kanban */}
                    <div className={`p-6 rounded-3xl border ${isMidnight ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'} shadow-sm`}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className={`text-sm font-black uppercase tracking-widest ${isMidnight ? 'text-white' : 'text-slate-800'}`}>Progresso Global de Ações</h3>
                                <p className="text-[10px] text-slate-400 mt-1">Conclusão de todas as etapas ativas no quadro</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-brand-600">{progressPercentage}%</span>
                            </div>
                        </div>

                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 border border-slate-200 dark:border-slate-700">
                            <div
                                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--brand-rgb),0.3)]"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Total de Etapas</p>
                                <p className={`text-lg font-black ${isMidnight ? 'text-white' : 'text-slate-800'}`}>{stats.totalStages}</p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-1">Finalizadas</p>
                                <p className="text-lg font-black text-emerald-600">{stats.completedStages}</p>
                            </div>
                        </div>
                    </div>

                    {/* Distribuição por Status */}
                    <div className={`p-6 rounded-3xl border ${isMidnight ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'} shadow-sm`}>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${isMidnight ? 'text-white' : 'text-slate-800'} mb-6`}>Status das Tarefas</h3>
                        <div className="space-y-4">
                            {[
                                { status: TaskStatus.TO_START, label: 'A Iniciar', color: 'bg-slate-400' },
                                { status: TaskStatus.IN_PROGRESS, label: 'Em Andamento', color: 'bg-blue-500' },
                                { status: TaskStatus.WAITING_CLIENT, label: 'Aguardando Cliente', color: 'bg-amber-500' },
                                { status: TaskStatus.DONE, label: 'Finalizadas', color: 'bg-emerald-500' }
                            ].map((item, idx) => {
                                const count = stats[item.status === TaskStatus.TO_START ? 'toStart' : item.status === TaskStatus.IN_PROGRESS ? 'inProgress' : item.status === TaskStatus.WAITING_CLIENT ? 'waiting' : 'done'];
                                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className={isMidnight ? 'text-slate-300' : 'text-slate-600'}>{item.label}</span>
                                            <span className={isMidnight ? 'text-slate-400' : 'text-slate-500'}>{count} ({pct}%)</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${item.color} transition-all duration-500`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Alertas e Inteligência POLI */}
                <div className="space-y-6">
                    {/* Alertas Críticos */}
                    <div className={`p-6 rounded-3xl border ${isMidnight ? 'border-red-500/30 bg-red-950/20' : 'border-red-100 bg-red-50/50'}`}>
                        <h3 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <AlertTriangle size={16} /> Alertas de Atenção
                        </h3>
                        <div className="space-y-3">
                            {stats.overdue > 0 && (
                                <div className="flex items-center gap-3 bg-white/40 dark:bg-white/5 p-3 rounded-xl border border-red-200 dark:border-red-500/20">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-red-700 dark:text-red-400 uppercase">{stats.overdue} Atrasadas</p>
                                        <p className="text-[9px] text-red-600/70">Requerem prioridade imediata</p>
                                    </div>
                                </div>
                            )}
                            {stats.highPriority > 0 && (
                                <div className="flex items-center gap-3 bg-white/40 dark:bg-white/5 p-3 rounded-xl border border-brand-200 dark:border-brand-500/20">
                                    <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600">
                                        <AlertCircle size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-brand-700 dark:text-brand-400 uppercase">{stats.highPriority} Alta Prioridade</p>
                                        <p className="text-[9px] text-brand-600/70">Ativas no quadro atual</p>
                                    </div>
                                </div>
                            )}
                            {stats.overdue === 0 && stats.highPriority === 0 && (
                                <div className="text-center py-4">
                                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-50" />
                                    <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Tudo em conformidade!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card de Nutrição POLI */}
                    <div className={`p-6 rounded-3xl border ${isMidnight ? 'bg-brand-900/20 border-brand-500/30' : 'bg-brand-50 border-brand-100'} relative overflow-hidden group`}>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all duration-700" />
                        <h3 className="text-xs font-black text-brand-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Sparkles size={16} className="animate-pulse" /> Inteligência POLI
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-4 italic">
                            "Estes dados alimentam minha análise de performance. Pressione o botão para uma visão estruturada que posso interpretar agora."
                        </p>
                        <button
                            onClick={handleFeedPoli}
                            className="w-full py-3 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            Exportar Insights Analíticos <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* Inatividade / Engajamento */}
                    <div className={`p-6 rounded-3xl border ${isMidnight ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'} shadow-sm`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isMidnight ? 'text-white' : 'text-slate-800'} mb-4`}>Equipe Atuante</h3>
                        <div className="space-y-3">
                            {users && users.slice(0, 4).map(u => {
                                const userTasksCount = tasks.filter(t => t.assigned_users?.includes(u.id)).length;
                                if (userTasksCount === 0) return null;

                                return (
                                    <div key={u.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                                                style={{ backgroundColor: u.color || '#64748b' }}
                                            >
                                                {u.username?.[0]?.toUpperCase()}
                                            </div>
                                            <span className={`text-xs font-bold ${isMidnight ? 'text-slate-300' : 'text-slate-700'}`}>{u.username}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-brand-500">{userTasksCount} Tarefas</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KanbanDashboard;
