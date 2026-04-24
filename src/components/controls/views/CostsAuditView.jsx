import React from 'react';
import {
    TrendingUp, Coins, Package, BarChart3, AlertTriangle,
    Search, FileText, CheckCircle, Car, RefreshCw
} from 'lucide-react';

const CostsAuditView = ({
    inventory,
    tests,
    tasks,
    filteredReportData,
    reportTotals,
    onTestOpenClick,
    setReportContext,
    setShowReportModal,
    setAiAnalysis,
    hasMore,
    onLoadMore,
    loading,
    isMeetingView
}) => {
    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento Novo</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-400">R$</span>
                        <span className="text-2xl font-black text-slate-900">
                            {tests
                                .filter(t => !t.consumed_stock_id && !['CANCELADO', 'REPROVADO'].includes(t.status) && ((t.op_cost || t.gross_total_cost || 0) > 0 || (t.produced_quantity || 0) > 0))
                                .reduce((acc, curr) => acc + (curr.op_cost || curr.gross_total_cost || 0), 0)
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 italic">Capital injetado na Engenharia</span>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrimônio em Estoque</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-400">R$</span>
                        <span className="text-2xl font-black text-emerald-600">
                            {inventory
                                .filter(i => {
                                    const test = tests.find(t => String(t.id) === String(i.test_id));
                                    return !test || !['CANCELADO', 'REPROVADO'].includes(test.status);
                                })
                                .reduce((acc, curr) => acc + (curr.production_cost || 0), 0)
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-500 italic">Ativo circulante nos depósitos</span>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-1 border-l-4 border-l-amber-400">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Custo Amortizado (Reuso)</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-400">R$</span>
                        <span className="text-2xl font-black text-amber-600">
                            {tests
                                .filter(t => t.consumed_stock_id && !['CANCELADO', 'REPROVADO'].includes(t.status) && ((t.op_cost || t.gross_total_cost || 0) > 0 || (t.produced_quantity || 0) > 0))
                                .reduce((acc, curr) => acc + (curr.op_cost || curr.gross_total_cost || 0), 0)
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-500 italic">Economia gerada por reaproveitamento</span>
                </div>
                <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl flex flex-col gap-1 border-l-4 border-l-brand-500">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Viagens (Logística)</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-500">R$</span>
                        <span className="text-2xl font-black text-white">
                            {tasks.filter(t => t.parent_test_id).reduce((acc, curr) => {
                                const taskCost = curr.trip_cost || 0;
                                const travelsCost = (curr.travels || []).reduce((tAcc, tCurr) => tAcc + (tCurr.cost || 0), 0);
                                return acc + taskCost + travelsCost;
                            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 italic">Custos vinculados a testes técnicos</span>
                </div>
            </div>

            {/* Audit Table */}
            <div className={`flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0 h-0 ${isMeetingView ? 'max-h-none' : 'max-h-[calc(100vh-320px)]'} printable-area`}>
                {/* Hidden Print Header */}
                <div className="hidden print:flex flex-col gap-4 p-8 border-b-2 border-slate-900 mb-6 w-full">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Auditoria de Estoque</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Integridade de Saldos e Custos - Engenharia & Controles</p>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-900 uppercase">{new Date().toLocaleDateString('pt-BR')}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Gerado por Assistec App V6</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-500" />
                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Auditoria de Integridade de Estoque</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setReportContext('AUDIT');
                                setAiAnalysis('');
                                setShowReportModal(true);
                            }}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 group"
                        >
                            <BarChart3 size={14} className="group-hover:bounce transition-transform" /> Gerar Relatório de Custos
                        </button>
                        <span className="text-[9px] font-black text-slate-400 uppercase italic">Cálculo: Produzido - (Faturado + Reuso + Saldo)</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar h-full min-h-0">
                    <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-slate-100">
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item / Teste</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">OP</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vol</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Produzido</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center text-emerald-600">Faturamento</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center text-amber-600">Reuso</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center text-rose-600">Perda</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center text-slate-800">Saldo Físico</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Custo Prod.</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Custo Log.</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status Auditoria</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredReportData.map(t => {
                                const invItem = inventory.find(i => String(i.test_id) === String(t.id)) ||
                                    inventory.find(i => i.name === `ITEM: ${t.title} ` && i.client_name === t.client_name);

                                const currentStock = invItem?.quantity || 0;

                                const activeReuses = tests.filter(other =>
                                    String(other.consumed_stock_id) === String(invItem?.id) &&
                                    !['CANCELADO', 'REPROVADO'].includes(other.status)
                                );
                                const totalConsumedByOthers = activeReuses.reduce((sum, curr) => sum + (curr.produced_quantity || 0), 0);

                                const produced = t.produced_quantity || 0;
                                const billed = t.quantity_billed || 0;

                                let unitCost = 0;
                                let isFromReuse = false;
                                if (t.consumed_stock_id) {
                                    const donorInventory = inventory.find(i => String(i.id) === String(t.consumed_stock_id));
                                    const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                    if (parentTest && parentTest.produced_quantity > 0) {
                                        unitCost = (parentTest.op_cost || parentTest.gross_total_cost || 0) / parentTest.produced_quantity;
                                        isFromReuse = true;
                                    }
                                } else {
                                    if (produced > 0) {
                                        unitCost = (t.op_cost || t.gross_total_cost || 0) / produced;
                                    }
                                }

                                let amortizedProductionCost = 0;
                                if (t.consumed_stock_id) {
                                    amortizedProductionCost = unitCost * produced;
                                } else if (totalConsumedByOthers > 0) {
                                    // Considera o patrimônio que resta no estoque + o que já foi faturado
                                    amortizedProductionCost = unitCost * (currentStock + billed);
                                } else {
                                    amortizedProductionCost = unitCost * produced;
                                }

                                const loss = invItem?.justification_reason === 'AVARIA/PERDA' ? Math.abs(invItem.inventory_adjustment || 0) : 0;
                                const theoreticalBalance = Math.max(0, produced - (billed + totalConsumedByOthers + loss));
                                const diff = currentStock - theoreticalBalance;

                                const hasCostDiscrepancy = produced === 0 && (t.op_cost || t.gross_total_cost || 0) > 0;

                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors break-inside-avoid" onClick={() => onTestOpenClick(t)}>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">#{t.test_number}</span>
                                                    <div className="text-[14px] font-black text-slate-800 uppercase tracking-tighter break-words">{t.title}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[12px] font-black text-slate-600 uppercase tracking-tight">{t.client_name}</div>
                                                    {t.extra_data?.['LOTE'] && (
                                                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">LOTE: {t.extra_data['LOTE']}</span>
                                                    )}
                                                </div>
                                                {hasCostDiscrepancy && (
                                                    <span className="text-[7px] text-rose-500 font-black uppercase tracking-tighter mt-0.5">⚠️ Custo sem Produção</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{t.op_number || t.extra_data?.OP || t.extra_data?.['OP'] || '-'}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-[10px] font-black text-slate-800">{invItem?.volumes || '0'}</span>
                                        </td>
                                        <td className="p-4 text-center text-xs font-black text-slate-600">{produced.toFixed(1)} <span className="text-[8px] text-slate-400 uppercase">{t.unit}</span></td>
                                        <td className="p-4 text-center text-xs font-black text-emerald-600">{billed.toFixed(1)} <span className="text-[8px] text-emerald-400 uppercase">{t.unit}</span></td>
                                        <td className="p-4 text-center text-xs font-black text-amber-600">{(totalConsumedByOthers || 0).toFixed(1)} <span className="text-[8px] text-amber-400 uppercase">{t.unit}</span></td>
                                        <td className="p-4 text-center text-xs font-black text-rose-600">{loss.toFixed(1)} <span className="text-[8px] text-rose-400 uppercase">{t.unit}</span></td>
                                        <td className="p-4 text-center text-xs font-black text-slate-800">{currentStock.toFixed(1)} <span className="text-[8px] text-slate-500 uppercase">{t.unit}</span></td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1 text-slate-700 font-black text-[10px]">
                                                    {isFromReuse && (
                                                        (() => {
                                                            const donorInventory = inventory.find(i => String(i.id) === String(t.consumed_stock_id));
                                                            const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                                            return <RefreshCw size={10} className="text-indigo-400" title={`Custo Herdado do Teste #${parentTest?.test_number || '?'} `} />;
                                                        })()
                                                    )}
                                                    <span>R$ {amortizedProductionCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                {isFromReuse && (
                                                    (() => {
                                                        const donorInventory = inventory.find(i => String(i.id) === String(t.consumed_stock_id));
                                                        const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                                        return (
                                                            <span className="text-[7px] text-indigo-500 font-black uppercase tracking-tighter">
                                                                De: Teste #{parentTest?.test_number || '?'}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                                {!isFromReuse && totalConsumedByOthers > 0 && (
                                                    (() => {
                                                        const activeReusesSorted = activeReuses.sort((a, b) => (a.test_number || 0) - (b.test_number || 0));
                                                        return (
                                                            <span className="text-[7px] text-amber-500 font-black uppercase tracking-tighter">
                                                                Para: #{activeReusesSorted.map(r => r.test_number).join(', #')}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                                {unitCost > 0 && (
                                                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        R$ {unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {t.unit}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-center">
                                                {(() => {
                                                    const linkedTaskCosts = tasks
                                                        .filter(tk => tk.parent_test_id === t.id)
                                                        .reduce((acc, curr) => {
                                                            const taskCost = curr.trip_cost || 0;
                                                            const travelsCost = (curr.travels || []).reduce((tAcc, tCurr) => tAcc + (tCurr.cost || 0), 0);
                                                            return acc + taskCost + travelsCost;
                                                        }, 0);

                                                    if (linkedTaskCosts > 0) {
                                                        return (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <div className="flex items-center gap-1 text-indigo-600 font-black text-[10px]">
                                                                    <Car size={10} />
                                                                    <span>R$ {linkedTaskCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">Investimento Logístico</span>
                                                            </div>
                                                        );
                                                    }
                                                    return <span className="text-slate-300 text-[10px] font-bold">-</span>;
                                                })()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                {Math.abs(diff) < 0.1 ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter border border-emerald-200 flex items-center gap-1">
                                                            <CheckCircle size={12} /> Integridade OK
                                                        </span>
                                                        {loss > 0 && (
                                                            <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-1 rounded flex items-center gap-0.5">
                                                                <AlertTriangle size={8} /> Justificado como Perda
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className={`px-3 py-1 ${diff < 0 ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-amber-100 text-amber-600 border-amber-200'} rounded-full text-[9px] font-black uppercase tracking-tighter border flex items-center gap-1`}>
                                                        <AlertTriangle size={12} /> {diff < 0 ? `Furo: ${Math.abs(diff).toFixed(1)}` : `Sobra: ${diff.toFixed(1)}`}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {hasMore && (
                        <div className="p-4 flex justify-center bg-slate-50/50 border-t border-slate-100">
                            <button
                                onClick={onLoadMore}
                                disabled={loading}
                                className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:shadow-lg hover:shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Carregando...
                                    </>
                                ) : (
                                    'Carregar Mais Auditorias'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostsAuditView;
