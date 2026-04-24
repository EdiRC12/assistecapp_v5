import React, { useMemo } from 'react';
import {
    FlaskConical, TrendingUp, AlertCircle, CheckCircle2,
    BarChart3, DollarSign, Target, Sparkles, ArrowRight,
    Users, Clock, Zap, Info
} from 'lucide-react';

const InfoTooltip = ({ text }) => (
    <div className="group relative ml-1 inline-block">
        <Info size={12} className="text-slate-300 cursor-help hover:text-indigo-500 transition-colors" />
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none text-center">
            <div className="relative">
                {text}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
            </div>
        </div>
    </div>
);

const EngineeringDashboard = ({ tests, tasks, setSuggestions, setViewMode, setActiveSection }) => {
    const stats = useMemo(() => {
        const counts = {
            total: tests.length,
            approved: 0,
            rejected: 0,
            inDevelopment: 0,
            waiting: 0,
            productionCost: 0,
            logisticsCost: 0,
            successRate: 0,
            topClients: {}
        };

        // 1. Cálculo Global de Logística (Copia a lógica da Gestão de Custos)
        // Somar apenas tarefas que possuem vínculo direto com testes (parent_test_id)
        counts.logisticsCost = (tasks || [])
            .filter(tk => tk?.parent_test_id)
            .reduce((acc, curr) => {
                const manualCost = parseFloat(curr?.trip_cost || 0);
                const travelsArrayCost = (curr?.travels || []).reduce((trAcc, tr) => trAcc + parseFloat(tr?.cost || 0), 0);
                return acc + manualCost + travelsArrayCost;
            }, 0);

        tests.forEach(t => {
            if (t.status === 'APROVADO') counts.approved++;
            else if (t.status === 'REPROVADO') counts.rejected++;
            else if (t.status === 'EM DESENVOLVIMENTO') counts.inDevelopment++;
            else counts.waiting++;

            // Soma segura do custo de produção
            const prodCost = parseFloat(t.op_cost || t.gross_total_cost || t.production_cost || 0);
            counts.productionCost += prodCost;

            // Clientes
            if (t.client_name) {
                counts.topClients[t.client_name] = (counts.topClients[t.client_name] || 0) + 1;
            }
        });

        counts.successRate = counts.total > 0 ? Math.round((counts.approved / (counts.approved + counts.rejected || 1)) * 100) : 0;

        return counts;
    }, [tests, tasks]);

    const handleFeedPoli = () => {
        if (!setSuggestions) return;
        const newInsights = [];

        if (stats.successRate < 50 && (stats.approved + stats.rejected) > 5) {
            newInsights.push({
                id: `eng_success_${Date.now()}`,
                type: 'performance_indicator',
                title: `Baixa Taxa de Sucesso em Testes`,
                description: `A performance dos testes está em ${stats.successRate}%. Recomendo avaliar a formulação ou os critérios de aplicação no cliente.`,
                priority: 'high',
                data: { successRate: stats.successRate }
            });
        }

        if (stats.logisticsCost > stats.productionCost * 0.3) {
            newInsights.push({
                id: `eng_cost_${Date.now()}`,
                type: 'cycle_time_insight',
                title: `Custo Logístico Elevado`,
                description: `Os custos de visita para testes representam ${((stats.logisticsCost / stats.productionCost) * 100).toFixed(1)}% do valor de produção.`,
                priority: 'medium'
            });
        }

        if (newInsights.length > 0) {
            setSuggestions(prev => [...newInsights, ...prev]);
            if (window.confirm(`${newInsights.length} insights de engenharia enviados para a POLI! Deseja visualizar a apresentação estratégica agora?`)) {
                if (setViewMode) setViewMode('poli');
                if (setActiveSection) setActiveSection('presentation');
            }
        } else {
            alert("Os indicadores de engenharia estão saudáveis.");
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const kpis = [
        { label: 'Total de Testes', description: 'Volume total de testes técnicos registrados no período seleccionado.', value: stats.total, icon: FlaskConical, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Taxa de Sucesso', description: 'Percentual de testes aprovados em relação ao total de testes concluídos.', value: `${stats.successRate}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Investimento Prod.', description: 'Custo total de material e operação física utilizados nos testes.', value: formatCurrency(stats.productionCost), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Custo Logístico', description: 'Gastos com viagens e deslocamentos vinculados aos testes de campo.', value: formatCurrency(stats.logisticsCost), icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' }
    ];

    return (
        <div className="flex-1 overflow-y-auto pr-2 animate-in fade-in zoom-in-95 duration-500 space-y-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2.5 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                <kpi.icon size={20} />
                            </div>
                            <InfoTooltip text={kpi.description} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-1">{kpi.value}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group/chart">
                    <div className="absolute top-6 right-6">
                        <InfoTooltip text="Visualização da performance técnica baseada nas aprovações e reprovações de campo." />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-600" /> Distribuição por Status
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Aprovados', value: stats.approved, color: 'bg-emerald-500' },
                            { label: 'Reprovados', value: stats.rejected, color: 'bg-rose-500' },
                            { label: 'Em Desenvolvimento', value: stats.inDevelopment, color: 'bg-blue-500' },
                            { label: 'Aguardando', value: stats.waiting, color: 'bg-slate-400' }
                        ].map((item, i) => {
                            const pct = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                            return (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-slate-600">{item.label}</span>
                                        <span className="text-slate-500">{item.value} ({pct}%)</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-indigo-900 p-6 rounded-3xl text-white relative overflow-hidden group">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                    <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Sparkles size={16} className="animate-pulse" /> Inteligência POLI
                    </h3>
                    <p className="text-[11px] text-indigo-100 leading-relaxed mb-6 italic">
                        "Estou pronta para analisar o ROI dos testes e sugerir otimizações de logística baseadas no faturamento vs custo de visita."
                    </p>
                    <button
                        onClick={handleFeedPoli}
                        className="w-full py-4 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-50 shadow-xl transition-all flex items-center justify-center gap-2 border-none"
                    >
                        Exportar Insights para POLI <ArrowRight size={14} />
                    </button>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Top Clientes em Teste</h4>
                        <div className="space-y-3">
                            {Object.entries(stats.topClients).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count], i) => (
                                <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-indigo-100 truncate max-w-[150px]">{name}</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded-lg">{count} testes</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EngineeringDashboard;
