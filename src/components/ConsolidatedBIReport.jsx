import React, { useMemo, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer, Award, TrendingUp, Users, CheckCircle2, AlertCircle } from 'lucide-react';

const ConsolidatedBIReport = ({ clients, tasks, timeRange, onClose, currentUser }) => {
    const [portalContainer, setPortalContainer] = useState(null);

    useEffect(() => {
        const el = document.createElement('div');
        el.id = 'bi-report-portal';
        document.body.appendChild(el);
        setPortalContainer(el);
        return () => {
            document.body.removeChild(el);
        };
    }, []);

    const analysis = useMemo(() => {
        const now = new Date();
        const days = parseInt(timeRange);
        const targetDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        const tiers = ['OURO', 'PRATA', 'BRONZE'];
        // Garantir que clients e tasks sejam arrays válidos antes de operar
        const safeClients = Array.isArray(clients) ? clients : [];
        const safeTasks = Array.isArray(tasks) ? tasks : [];

        const reportData = tiers.map(tier => {
            const tierClients = safeClients.filter(c => c && c.classification === tier);
            const clientNames = tierClients.map(c => c.name);
            const tierTasks = safeTasks.filter(t => t && clientNames.includes(t.client));

            const clientStats = tierClients.map(client => {
                const latestTask = safeTasks
                    .filter(t => t && t.client === client.name)
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                const lastActivityDate = latestTask ? new Date(latestTask.created_at) : null;
                return { ...client, isActive: lastActivityDate && lastActivityDate >= targetDate };
            });

            const activeCount = clientStats.filter(s => s.isActive).length;
            const totalCount = clientStats.length;
            return {
                tier, totalCount, activeCount,
                activationRate: totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0,
                totalTasks: tierTasks.length
            };
        });

        return {
            reportData,
            grandTotalClients: safeClients.length,
            grandTotalTasks: safeTasks.length,
            days
        };
    }, [clients, tasks, timeRange]);

    const handlePrint = () => {
        window.print();
    };

    const tierConfig = {
        'OURO': { color: '#f59e0b', label: 'Estratégicos' },
        'PRATA': { color: '#64748b', label: 'Ascensão' },
        'BRONZE': { color: '#fb923c', label: 'Operação' }
    };

    if (!portalContainer) return null;

    const reportContent = (
        // ============================================================
        // printable-area: classe obrigatória do index.css global.
        // Sem ela, body * { visibility: hidden } esconde tudo na impressão.
        // ============================================================
        <div className="printable-area fixed inset-0 z-[9999] bg-white overflow-auto flex flex-col">
            {/* Header / Toolbar */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <TrendingUp className="text-brand-600" size={24} />
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relatório Consolidado de BI</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200">
                        <Printer size={18} /> Imprimir
                    </button>
                    <button onClick={onClose}
                        className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-12 w-full">
                <div className="flex justify-between items-end mb-10 pb-6 border-b-4 border-slate-900">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">AssisTecApp</h1>
                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Inteligência de Mercado & Engajamento</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Período de Análise</p>
                        <p className="text-lg font-black text-slate-800 uppercase">{analysis.days} Dias</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-12">
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                        <Users className="text-slate-400 mb-2" size={24} />
                        <p className="text-3xl font-black text-slate-900 leading-none">{analysis.grandTotalClients}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Total de Clientes</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                        <Award className="text-brand-500 mb-2" size={24} />
                        <p className="text-3xl font-black text-slate-900 leading-none">
                            {analysis.reportData.reduce((acc, curr) => acc + curr.activeCount, 0)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Clientes Ativos</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                        <TrendingUp className="text-brand-600 mb-2" size={24} />
                        <p className="text-3xl font-black text-slate-900 leading-none">{analysis.grandTotalTasks}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Atividades Totais</p>
                    </div>
                </div>

                <div className="space-y-8 mb-12">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <div className="w-2 h-8 bg-brand-600 rounded-full" />
                        Desempenho por Categoria
                    </h3>
                    {analysis.reportData.map(data => (
                        <div key={data.tier} className="bg-white border-2 border-slate-100 rounded-3xl p-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center border-4"
                                    style={{ borderColor: tierConfig[data.tier].color + '20', color: tierConfig[data.tier].color }}>
                                    <Award size={32} />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-slate-900 leading-none mb-1">{data.tier}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tierConfig[data.tier].label}</p>
                                </div>
                            </div>
                            <div className="flex gap-12 text-right">
                                <div>
                                    <p className="text-2xl font-black text-slate-800">{data.totalCount}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-brand-600">{data.activeCount}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativos</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black" style={{ color: tierConfig[data.tier].color }}>{data.activationRate}%</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Engajamento</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 rounded-3xl p-10">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 text-center">Distribuição de Atividades no Período</h3>
                    <div className="space-y-6">
                        {analysis.reportData.map(data => (
                            <div key={data.tier} className="flex items-center gap-6">
                                <span className="w-20 text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.tier}</span>
                                <div className="flex-1 h-8 bg-white rounded-full overflow-hidden border border-slate-200">
                                    <div className="h-full" style={{
                                        width: `${analysis.grandTotalTasks > 0 ? (data.totalTasks / analysis.grandTotalTasks) * 100 : 0}%`,
                                        backgroundColor: tierConfig[data.tier].color
                                    }} />
                                </div>
                                <span className="w-12 text-right text-xs font-black text-slate-800">{data.totalTasks}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-200 text-center">
                    <div className="flex justify-center gap-8 mb-4">
                        <div className="text-left">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emissor</p>
                            <p className="text-xs font-black text-slate-900">{currentUser?.username || 'Sistema de Atendimento'}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data de Geração</p>
                            <p className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Confidencial - AssisTecApp Intelligence</p>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(reportContent, portalContainer);
};

export default ConsolidatedBIReport;
