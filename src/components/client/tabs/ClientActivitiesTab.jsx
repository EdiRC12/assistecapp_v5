import React, { useMemo } from 'react';
import {
    Calendar, Filter, FileText, CheckCircle2, AlertCircle,
    Clock, Plus, History, Activity, Zap, Search, ChevronRight
} from 'lucide-react';
import {
    StatusColors,
    StatusLabels,
    CategoryLabels
} from '../../../constants/taskConstants';
import DashboardCard from '../DashboardCard';

const ClientActivitiesTab = ({
    clientTasks = [],
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    months = [],
    years = [],
    onEditTask,
    activeTopic,
    techTests = [],
    allTests = [],
    techFollowups = [],
    clientFollowups = [],
    allInventory = []
}) => {

    const filteredActivities = useMemo(() => {
        return clientTasks.filter(item => {
            const date = new Date(item.created_at || item.createdAt);
            const matchesMonth = !filterMonth || (date.getMonth() + 1).toString() === filterMonth;
            const matchesYear = !filterYear || date.getFullYear().toString() === filterYear;
            const matchesType = filterType === 'ALL' || item.display_type === filterType ||
                (filterType === 'TASKS' && !item.is_test && !item.is_followup) ||
                (filterType === 'TESTS' && item.is_test) ||
                (filterType === 'FOLLOWUPS' && item.is_followup);
            const matchesCategory = !filterCategory || item.category === filterCategory;

            return matchesMonth && matchesYear && matchesType && matchesCategory;
        }).sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    }, [clientTasks, filterMonth, filterYear, filterType, filterCategory]);

    const stats = useMemo(() => {
        return {
            total: filteredActivities.length,
            completed: filteredActivities.filter(a => a.status === 'DONE' || a.status === 'FINALIZADO' || a.status === 'CONCLUÍDO').length,
            pending: filteredActivities.filter(a => a.status !== 'DONE' && a.status !== 'FINALIZADO' && a.status !== 'CONCLUÍDO' && a.status !== 'CANCELED').length
        };
    }, [filteredActivities]);

    const getIcon = (type) => {
        switch (type) {
            case 'TESTE PURO':
            case 'TESTE REPROVADO':
            case 'TESTE CONVERTIDO':
                return <Activity size={16} className="text-indigo-500" />;
            case 'ACOMPANHAMENTO':
            case 'ACOMP. CONVERTIDO':
                return <History size={16} className="text-amber-500" />;
            default:
                return <FileText size={16} className="text-brand-500" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros</span>
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 border-none text-[10px] font-bold text-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500 py-1.5 px-3 uppercase tracking-tight"
                >
                    <option value="ALL">Todos os Tipos</option>
                    <option value="TASKS">Tarefas / Kanban</option>
                    <option value="TESTS">Testes Técnicos</option>
                    <option value="FOLLOWUPS">Acompanhamentos</option>
                </select>

                <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-slate-50 border-none text-[10px] font-bold text-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500 py-1.5 px-3 uppercase tracking-tight"
                >
                    <option value="">Todos os Meses</option>
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-slate-50 border-none text-[10px] font-bold text-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500 py-1.5 px-3 uppercase tracking-tight"
                >
                    <option value="">Todos os Anos</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <div className="ml-auto flex gap-4">
                    <div className="text-center">
                        <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Total</div>
                        <div className="text-sm font-black text-slate-700">{stats.total}</div>
                    </div>
                </div>
            </div>

            {/* Activities List */}
            <DashboardCard title="Linha do Tempo de Atividades" icon={History}>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner min-h-[400px]">
                    {filteredActivities.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                            <Activity size={48} className="mb-4 opacity-20" />
                            <p className="font-black text-xs uppercase tracking-widest">Nenhuma atividade encontrada</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredActivities.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 bg-white/50 hover:bg-white flex items-center justify-between group transition-all cursor-pointer border-b border-transparent hover:border-slate-100"
                                    onClick={() => onEditTask && !item.is_test && !item.is_followup && onEditTask(item)}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors shrink-0">
                                            {getIcon(item.display_type)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="text-sm font-bold text-slate-700 truncate capitalize">{item.title}</h4>
                                                <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase border shrink-0 ${StatusColors[item.status] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                    {StatusLabels[item.status] || item.status || 'Pendente'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(item.created_at || item.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] font-bold text-brand-600/60 uppercase tracking-tight">
                                                    {item.display_type} {item.category && `• ${CategoryLabels[item.category] || item.category}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {item.converted_task_id && (
                                            <div className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-1 rounded flex items-center gap-1 border border-emerald-100 uppercase tracking-tighter">
                                                <Zap size={10} /> Convertido
                                            </div>
                                        )}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-100 rounded-lg text-slate-400">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardCard>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ClientActivitiesTab;
