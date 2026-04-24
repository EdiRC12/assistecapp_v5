import React, { useMemo } from 'react';
import {
    Package, TrendingUp, AlertCircle, CheckCircle2,
    BarChart3, DollarSign, Target, Sparkles, ArrowRight,
    MapPin, Layers, Box, Zap, Trash2, History, Info
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

const InventoryDashboard = ({ inventory, setSuggestions, setViewMode, setActiveSection }) => {
    const stats = useMemo(() => {
        const counts = {
            totalItems: inventory.length,
            totalQuantityKg: 0,
            totalQuantityUn: 0,
            totalValue: 0, // Investimento Total
            activeItems: 0,
            discardedItems: 0,
            discardedLoss: 0, // Prejuízo Real
            discardedQuantityKg: 0,
            discardedQuantityUn: 0,
            inactiveItems: 0,
            totalProducedWeight: 0,
            byLocation: {},
            byBin: {}, // Values (Finance)
            byBinStats: {}, // Detailed (Items, KG, UN)
            byBinDiscarded: {},
            stagnatedValue: 0
        };

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        inventory.forEach(item => {
            const isKg = (item.unit?.toUpperCase() || 'KG') === 'KG';
            const qty = parseFloat(item.quantity || 0);
            const produced = parseFloat(item.qty_produced || qty || 1);
            const cost = parseFloat(item.production_cost || 0);

            counts.totalValue += cost;
            counts.totalProducedWeight += produced;

            if (item.status === 'ACTIVE') {
                counts.activeItems++;
                if (isKg) counts.totalQuantityKg += qty;
                else counts.totalQuantityUn += qty;
            } else if (item.status === 'DISCARDED') {
                counts.discardedItems++;
                // Lógica de Perda Industrial Real: (Volume perdido / Volume produzido) * Custo
                const lossQty = (qty === 0 && produced > 0) ? produced - parseFloat(item.qty_billed || 0) : qty;
                const itemLoss = (produced > 0 ? (lossQty / produced) : 1) * cost;
                counts.discardedLoss += itemLoss;
                
                if (isKg) counts.discardedQuantityKg += lossQty;
                else counts.discardedQuantityUn += lossQty;

                if (item.stock_bin) {
                    counts.byBinDiscarded[item.stock_bin] = (counts.byBinDiscarded[item.stock_bin] || 0) + 1;
                }
            }

            // Stats por Bin
            if (item.stock_bin) {
                if (!counts.byBinStats[item.stock_bin]) {
                    counts.byBinStats[item.stock_bin] = { items: 0, kg: 0, un: 0, value: 0 };
                }
                counts.byBinStats[item.stock_bin].items++;
                counts.byBinStats[item.stock_bin].value += cost;
                if (isKg) counts.byBinStats[item.stock_bin].kg += qty;
                else counts.byBinStats[item.stock_bin].un += qty;
                
                counts.byBin[item.stock_bin] = (counts.byBin[item.stock_bin] || 0) + cost;
            }

            // Inatividade / Estagnação (90 dias)
            const lastUpdate = new Date(item.updated_at || item.created_at);
            if (lastUpdate < ninetyDaysAgo && item.status === 'ACTIVE') {
                counts.inactiveItems++;
                counts.stagnatedValue += cost;
            }
        });

        // Cálculo de Eficiência (Taxa de Acerto)
        const totalDiscardedVolume = counts.discardedQuantityKg + counts.discardedQuantityUn;
        const totalProducedVolume = counts.totalProducedWeight || 1;
        counts.efficiencyRate = Math.max(0, Math.min(100, ((totalProducedVolume - totalDiscardedVolume) / totalProducedVolume) * 100));

        return counts;
    }, [inventory]);

    const handleFeedPoli = () => {
        if (!setSuggestions) return;
        const newInsights = [];

        if (stats.stagnatedValue > stats.totalValue * 0.2) {
            newInsights.push({
                id: `inv_stagnated_${Date.now()}`,
                type: 'aging_alert',
                title: `Alto Valor Estagnado`,
                description: `Identifiquei que ${((stats.stagnatedValue / stats.totalValue) * 100).toFixed(1)}% do valor do estoque técnico não tem giro há mais de 90 dias. Recomendo descarte ou reuso imediato.`,
                priority: 'high',
                data: { stagnatedValue: stats.stagnatedValue }
            });
        }

        if (stats.efficiencyRate < 90) {
            newInsights.push({
                id: `inv_efficiency_${Date.now()}`,
                type: 'operational_warning',
                title: `Baixa Eficiência de Retorno`,
                description: `Sua taxa de acerto atual é de ${stats.efficiencyRate.toFixed(1)}%. O volume de descartes está acima do aceitável para o padrão industrial.`,
                priority: 'high'
            });
        }

        if (stats.discardedItems > stats.totalItems * 0.1) {
            newInsights.push({
                id: `inv_discard_${Date.now()}`,
                type: 'cycle_time_insight',
                title: `Taxa de Descarte Elevada`,
                description: `O volume de itens descartados representa ${Math.round((stats.discardedItems / stats.totalItems) * 100)}% do histórico.`,
                priority: 'medium'
            });
        }

        if (stats.byBin['ESTOQUE 0'] > 0) {
            newInsights.push({
                id: `inv_reserve_${Date.now()}`,
                type: 'operational_warning',
                title: `Itens Aguardando Reserva`,
                description: `Identifiquei itens no depósito de reserva (ESTOQUE 0). Recomendo a destinação final desses materiais para MD, Engenharia ou Quarentena.`,
                priority: 'medium',
                data: { reserveValue: stats.byBin['ESTOQUE 0'] }
            });
        }

        if (newInsights.length > 0) {
            setSuggestions(prev => [...newInsights, ...prev]);
            if (window.confirm(`${newInsights.length} insights de inventário enviados para a POLI! Deseja visualizar a apresentação estratégica agora?`)) {
                if (setViewMode) setViewMode('poli');
                if (setActiveSection) setActiveSection('presentation');
            }
        } else {
            alert("O giro de ativos está saudável!");
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const kpis = [
        { label: 'Registros Gerais', description: 'Total de itens cadastrados (Ativos + Descartados).', value: stats.totalItems, sub: `${stats.totalItems} itens`, icon: Package, color: 'text-slate-600', bg: 'bg-slate-50' },
        { label: 'Investimento Total', description: 'Custo de produção somado de todos os ativos em estoque.', value: formatCurrency(stats.totalValue), sub: 'CUSTO ACUMULADO DE PRODUÇÃO', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Prejuízo Real', description: 'Custo real do material perdido (Produzido vs Faturado).', value: formatCurrency(stats.discardedLoss), sub: 'PERDA PROPORCIONAL POR DESCARTE', icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Eficiência de Produção', description: 'Percentual de aproveitamento (Faturado vs Descartado).', value: `${stats.efficiencyRate.toFixed(1)}%`, sub: 'TAXA DE ACERTO INDUSTRIAL', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Volume Total', description: 'Peso e unidades totais disponíveis no estoque físico.', value: stats.totalQuantityKg.toFixed(1), sub: `${stats.totalQuantityUn} UN`, icon: Box, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Ativos do Sistema', description: 'Itens em estado ATIVO e disponíveis para uso imediato.', value: stats.activeItems, sub: 'ITENS DISPONÍVEIS', icon: Zap, color: 'text-cyan-600', bg: 'bg-cyan-50' }
    ];

    return (
        <div className="flex-1 overflow-y-auto pr-2 animate-in fade-in zoom-in-95 duration-500 space-y-6 custom-scrollbar">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`bg-white p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all ${kpi.label.includes('Prejuízo') ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2.5 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                <kpi.icon size={20} />
                            </div>
                            <InfoTooltip text={kpi.description} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-1">
                            {kpi.label === 'Volume Total' ? (
                                <div className="flex items-baseline gap-1.5">
                                    {kpi.value} <span className="text-[10px] text-slate-400">KG</span>
                                </div>
                            ) : kpi.value}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribuição Financeira */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <DollarSign size={16} className="text-emerald-600" /> Valor Estratégico por Depósito
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.byBinStats).sort((a, b) => b[1].value - a[1].value).map(([bin, binData], i) => {
                            const pct = stats.totalValue > 0 ? Math.round((binData.value / stats.totalValue) * 100) : 0;
                            return (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-slate-600 uppercase flex items-center gap-2">
                                            {bin} <span className="text-[9px] text-slate-400 font-medium">({binData.items} itens)</span>
                                        </span>
                                        <span className="text-slate-500">{formatCurrency(binData.value)} ({pct}%)</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Ocupação por Volume (KG/UN) */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group/chart">
                    <div className="absolute top-6 right-6">
                        <InfoTooltip text="Distribuição detalhada de peso (KG) ou unidades (UN) entre os locais de armazenamento." />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-600" /> Ocupação por Depósito (KG/UN)
                    </h3>
                    <div className="space-y-6">
                        {Object.entries(stats.byBinStats).sort((a, b) => b[1].kg - a[1].kg).map(([bin, binData], i) => {
                            return (
                                <div key={i} className="space-y-2 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{bin}</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-black text-slate-400">
                                                <span>VOLUME KG</span>
                                                <span className="text-brand-600">{binData.kg.toFixed(1)} KG</span>
                                            </div>
                                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, (binData.kg / (stats.totalQuantityKg || 1)) * 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-black text-slate-400">
                                                <span>UNIDADES</span>
                                                <span className="text-amber-600">{binData.un} UN</span>
                                            </div>
                                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (binData.un / (stats.totalQuantityUn || 1)) * 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Descartes por Depósito */}
                <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Trash2 size={16} className="text-rose-500" /> Histórico de Descartes por Depósito
                    </h3>
                    {Object.keys(stats.byBinDiscarded).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                            <Trash2 size={32} className="mb-2 opacity-30" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum descarte registrado</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(stats.byBinDiscarded).sort((a, b) => b[1] - a[1]).map(([bin, count], i) => {
                                const total = stats.discardedItems || 1;
                                const pct = Math.round((count / total) * 100);
                                const binData = stats.byBinStats[bin] || { kg: 0, un: 0 };
                                return (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-slate-600 uppercase flex items-center gap-2">
                                                {bin} 
                                                <span className="text-[8px] text-rose-300 font-medium">({stats.discardedQuantityKg.toFixed(1)} kg / {stats.discardedQuantityUn} un totais)</span>
                                            </span>
                                            <span className="text-rose-500">{count} {count === 1 ? 'item' : 'itens'} ({pct}%)</span>
                                        </div>
                                        <div className="h-1.5 bg-rose-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-400" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl text-white relative overflow-hidden group">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Sparkles size={16} className="animate-pulse" /> Inteligência POLI
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-6 italic">
                        "Estou analisando a saúde do seu inventário de sobras. Clique abaixo para exportar o levantamento de itens obsoletos e valor de giro."
                    </p>
                    <button
                        onClick={handleFeedPoli}
                        className="w-full py-4 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 shadow-xl transition-all flex items-center justify-center gap-2 border-none"
                    >
                        Exportar Insights para POLI <ArrowRight size={14} />
                    </button>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo de Ativos</h4>
                            <span className="text-[9px] font-bold text-slate-400">Total: {stats.totalQuantityKg.toFixed(2)} KG</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Impacto Financeiro (POLI)</p>
                                <p className="text-lg font-black text-emerald-400">{formatCurrency(stats.totalValue)}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Volume Armazenado</p>
                                <p className="text-lg font-black text-rose-400">{stats.totalQuantityKg.toFixed(1)} <span className="text-[10px]">KG</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryDashboard;
