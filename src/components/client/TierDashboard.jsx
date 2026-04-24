import React, { useMemo } from 'react';
import { ChevronLeft, Award, Users, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, Clock, BarChart3, PieChart, Activity, UserPlus, Phone } from 'lucide-react';
import { TierIcon } from './ClientTierBadge';

const TierDashboard = ({ tier, clients, tasks, timeRange, onClose, onSelectClient }) => {
    const tierConfig = {
        'OURO': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Estratégicos', iconColor: '#f59e0b', barColor: '#f59e0b' },
        'PRATA': { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', label: 'Ascensão', iconColor: '#64748b', barColor: '#64748b' },
        'BRONZE': { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', label: 'Operação', iconColor: '#fb923c', barColor: '#fb923c' }
    };

    const config = tierConfig[tier] || tierConfig['BRONZE'];

    const analysis = useMemo(() => {
        const now = new Date();
        const days = parseInt(timeRange);
        const targetDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        const tierClients = clients.filter(c => c.classification === tier);
        const clientNames = tierClients.map(c => c.name);
        const tierTasks = tasks.filter(t => clientNames.includes(t.client));

        const clientActions = tierClients.map(client => {
            const clientTasks = tasks.filter(t => t.client === client.name);
            const latestTask = [...clientTasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            const lastActivityDate = latestTask ? new Date(latestTask.created_at) : null;
            const daysSinceLastActivity = lastActivityDate ? Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24)) : 999;

            return {
                ...client,
                lastActivity: lastActivityDate,
                daysSinceLastActivity,
                taskCount: clientTasks.length,
                recentTasks: clientTasks.filter(t => new Date(t.created_at) >= targetDate).length
            };
        });

        // 1. Prioridade de Contato (Mais tempo sem atividade)
        const priorityContacts = [...clientActions]
            .filter(c => c.taskCount > 0)
            .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)
            .slice(0, 5);

        // 2. Top Atendimentos (Mais tarefas no período)
        const topEngaged = [...clientActions]
            .sort((a, b) => b.recentTasks - a.recentTasks)
            .slice(0, 5);

        // 3. Distribuição por Tipo de Ação
        const typeDistribution = tierTasks.reduce((acc, task) => {
            const type = task.type || 'OUTROS';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const activeCount = clientActions.filter(c => c.daysSinceLastActivity <= days).length;

        return {
            totalClients: tierClients.length,
            activeClients: activeCount,
            totalTasks: tierTasks.length,
            engagementRate: tierClients.length > 0 ? Math.round((activeCount / tierClients.length) * 100) : 0,
            priorityContacts,
            topEngaged,
            typeDistribution,
            clientActions
        };
    }, [tier, clients, tasks, timeRange]);

    return (
        <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-500 overflow-hidden bg-slate-50/50">
            {/* Nav Header */}
            <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-brand-600 transition-all"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${config.bg} ${config.color} border ${config.border} shadow-inner`}>
                            <TierIcon tier={tier} size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1 uppercase">
                                Inteligência <span className={config.color}>{tier}</span>
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                                Gestão Estratégica & Análise de {timeRange} Dias
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <Users className="text-slate-300 mb-4" size={24} />
                        <div>
                            <div className="text-4xl font-black text-slate-900 leading-none mb-1">{analysis.totalClients}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Clientes</div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <Activity className="text-brand-400 mb-4" size={24} />
                        <div>
                            <div className="text-4xl font-black text-brand-600 leading-none mb-1">{analysis.activeClients}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes Ativos</div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <BarChart3 className="text-slate-300 mb-4" size={24} />
                        <div>
                            <div className="text-4xl font-black text-slate-900 leading-none mb-1">{analysis.totalTasks}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Realizadas</div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden relative">
                        <TrendingUp className={`${config.color} mb-4 opacity-50`} size={24} />
                        <div className="relative z-10">
                            <div className={`text-4xl font-black leading-none mb-1 ${config.color}`}>{analysis.engagementRate}%</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de Engajamento</div>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20" style={{ width: `${analysis.engagementRate}%`, color: config.iconColor }} />
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Prioridade de Contato */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="text-amber-500" size={18} />
                                Prioridade de Contato
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Maiores Inatividades</span>
                        </div>
                        <div className="p-4 flex-1">
                            {analysis.priorityContacts.length > 0 ? (
                                <div className="space-y-3">
                                    {analysis.priorityContacts.map(client => (
                                        <div key={client.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-amber-300 transition-all">
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-800 text-xs uppercase truncate mb-1">{client.name}</div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase">
                                                    {client.daysSinceLastActivity} dias sem visita
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onSelectClient(client.name)}
                                                className="p-2 bg-white text-slate-400 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <Phone size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                    <CheckCircle2 size={40} className="mb-2 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Tudo em dia!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Atendimentos */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="text-brand-500" size={18} />
                                Top Atendimentos
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Últimos {timeRange} dias</span>
                        </div>
                        <div className="p-4 flex-1">
                            {analysis.topEngaged.length > 0 ? (
                                <div className="space-y-3">
                                    {analysis.topEngaged.map(client => (
                                        <div key={client.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:border-brand-300 transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-brand-600 shadow-sm">
                                                {client.recentTasks}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-slate-800 text-xs uppercase truncate mb-1">{client.name}</div>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                                                    <div className="bg-brand-500 h-full rounded-full" style={{ width: `${(client.recentTasks / Math.max(...analysis.topEngaged.map(c => c.recentTasks))) * 100}%` }} />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onSelectClient(client.name)}
                                                className="text-slate-300 group-hover:text-brand-600 transition-colors"
                                            >
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                    <Activity size={40} className="mb-2 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Sem dados recentes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Distribuição de Ações (Mini Chart) */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <PieChart className="text-indigo-500" size={18} />
                                Distribuição de Ações
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {Object.entries(analysis.typeDistribution).length > 0 ? (
                                Object.entries(analysis.typeDistribution).map(([type, count]) => (
                                    <div key={type} className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="text-2xl font-black text-slate-800 mb-1">{count}</div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 h-6 flex items-center">{type}</div>
                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${(count / analysis.totalTasks) * 100}%`,
                                                    backgroundColor: config.iconColor
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    Nenhuma ação registrada no período
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="pt-8 border-t border-slate-100 flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Award size={14} /> Foco em Clientes {tier}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                        {new Date().toLocaleDateString('pt-BR')} • AssisTec Intelligence
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierDashboard;
