import React, { useMemo, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Award, TrendingUp, AlertCircle, ChevronRight, Calendar, CheckCircle2, Clock, Printer } from 'lucide-react';

const CategoryAnalysisModal = ({ tier, clients, tasks, onClose, onSelectClient }) => {
    const [portalContainer, setPortalContainer] = useState(null);

    useEffect(() => {
        const el = document.createElement('div');
        el.id = 'bi-modal-portal';
        document.body.appendChild(el);
        setPortalContainer(el);
        return () => {
            document.body.removeChild(el);
        };
    }, []);

    const analysis = useMemo(() => {
        if (!tier) return null;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
        const riskDate = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        const categoryClients = clients.filter(c => c.classification === tier);
        const clientNames = categoryClients.map(c => c.name);
        const categoryTasks = tasks.filter(t => clientNames.includes(t.client));

        const clientStats = categoryClients.map(client => {
            const clientTasks = categoryTasks
                .filter(t => t.client === client.name)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const lastTask = clientTasks[0];
            const lastActivityDate = lastTask ? new Date(lastTask.created_at) : null;
            return {
                ...client, lastActivityDate,
                isActive30: lastActivityDate && lastActivityDate >= thirtyDaysAgo,
                isActive180: lastActivityDate && lastActivityDate >= sixMonthsAgo,
                isAtRisk: !lastActivityDate || lastActivityDate < riskDate,
                taskCount: clientTasks.length
            };
        });

        const activeCount30 = clientStats.filter(c => c.isActive30).length;
        const activeCount180 = clientStats.filter(c => c.isActive180).length;
        const totalCount = clientStats.length;
        return {
            clientStats, activeCount30, activeCount180,
            riskCount: clientStats.filter(c => c.isAtRisk).length,
            totalCount,
            activationRate30: totalCount > 0 ? Math.round((activeCount30 / totalCount) * 100) : 0,
            activationRate180: totalCount > 0 ? Math.round((activeCount180 / totalCount) * 100) : 0,
            totalTasks: categoryTasks.length
        };
    }, [tier, clients, tasks]);

    const tierStyles = useMemo(() => {
        const styles = {
            'OURO': { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', chart: '#f59e0b', label: 'Parceiros Estratégicos' },
            'PRATA': { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', chart: '#64748b', label: 'Clientes em Ascensão' },
            'BRONZE': { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', chart: '#fb923c', label: 'Base de Operação' }
        };
        return styles[tier] || styles['OURO'];
    }, [tier]);

    if (!tier || !portalContainer || !analysis) return null;

    const handlePrint = () => {
        window.print();
    };

    // Donut Chart
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const getOffset = (rate) => circumference - (rate / 100) * circumference;

    const DonutChart = ({ rate, label, sublabel }) => (
        <div className="flex flex-col items-center justify-center p-4 bg-white/50 rounded-2xl border border-slate-100/50">
            <div className="relative w-28 h-28 mb-3">
                <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
                    <circle cx="56" cy="56" r={radius} fill="transparent" stroke={tierStyles.chart} strokeWidth="6"
                        strokeDasharray={circumference} strokeDashoffset={getOffset(rate)} strokeLinecap="round"
                        className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-800 leading-none">{rate}%</span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1">{sublabel}</span>
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-500 text-center uppercase tracking-widest leading-tight">{label}</p>
        </div>
    );

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm">
            {/* ============================================================
                printable-area: classe obrigatória do index.css global.
                Sem ela, body * { visibility: hidden } esconde tudo na impressão.
                ============================================================ */}
            <div className="printable-area bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${tierStyles.bg}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${tierStyles.border} bg-white shadow-sm`}>
                            <Award className={tierStyles.text} size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black uppercase tracking-tight ${tierStyles.text}`}>Análise: {tier}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{tierStyles.label}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                        <button onClick={handlePrint}
                            className="p-2 transition-all text-slate-400 hover:text-brand-600 bg-white/50 hover:bg-white rounded-full border border-transparent hover:border-slate-100 hover:shadow-sm"
                            title="Imprimir Relatório">
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-slate-400">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
                        <div className="lg:col-span-3 bg-slate-50 rounded-3xl p-6 border border-slate-100 grid grid-cols-2 gap-4">
                            <DonutChart rate={analysis.activationRate30} label="Atendimento" sublabel="30 DIAS" />
                            <DonutChart rate={analysis.activationRate180} label="Engajamento" sublabel="6 MESES" />
                        </div>
                        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-center">
                                <TrendingUp className="text-slate-400 mb-2" size={18} />
                                <span className="text-3xl font-black text-slate-800">{analysis.totalTasks}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tarefas Totais</span>
                            </div>
                            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-center">
                                <CheckCircle2 className="text-brand-500 mb-2" size={18} />
                                <span className="text-3xl font-black text-brand-600">{analysis.activeCount30}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clientes Ativos (30d)</span>
                            </div>
                            <div className={`col-span-2 p-5 rounded-3xl border flex items-center justify-between ${analysis.riskCount > 0 ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
                                <div className="flex items-center gap-4">
                                    <AlertCircle size={20} />
                                    <div>
                                        <h4 className="font-black uppercase text-xs leading-none mb-1">Status de Risco</h4>
                                        <p className="text-[9px] font-bold opacity-80 uppercase leading-tight">
                                            {analysis.riskCount > 0 ? `${analysis.riskCount} em risco de inatividade (>60 dias)` : 'Engajamento saudável'}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xl font-black">{analysis.riskCount}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar size={14} /> Detalhamento Operacional
                            </h3>
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">
                                {analysis.totalCount} Parceiros Registrados
                            </span>
                        </div>
                        <div className="space-y-2">
                            {analysis.clientStats.sort((a, b) => b.taskCount - a.taskCount).map(c => (
                                <button key={c.id} onClick={() => onSelectClient(c.name)}
                                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl transition-all hover:border-brand-500 hover:shadow-lg hover:shadow-brand-100/20 group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${c.isActive30 ? 'bg-brand-500' : c.isActive180 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                        <div className="text-left">
                                            <p className="font-extrabold text-slate-800 text-xs tracking-tight group-hover:text-brand-600 transition-colors uppercase">{c.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Clock size={8} /> {c.lastActivityDate ? `Ação: ${c.lastActivityDate.toLocaleDateString('pt-BR')}` : 'Sem registros'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-800 mb-0.5">{c.taskCount}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-center">Ativ.</p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-200 group-hover:translate-x-1 group-hover:text-brand-500 transition-all print:hidden" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                        Gerado por AssisTecApp Analysis - {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, portalContainer);
};

export default CategoryAnalysisModal;
