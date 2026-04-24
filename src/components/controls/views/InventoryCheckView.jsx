import {
    CheckSquare, Plus, Printer, CheckCircle
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const InventoryCheckView = ({
    isInventorySessionActive,
    setIsInventorySessionActive,
    inventory,
    setInventory,
    tests,
    setLoading = () => { },
    setPendingJustifications,
    itemBeingAdjusted,
    setItemBeingAdjusted,
    handleSaveInventory,
    notifyError = () => { },
    hasMore,
    onLoadMore,
    loading
}) => {
    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden animate-in slide-in-from-right-4 duration-500">
            {!isInventorySessionActive ? (
                /* --- REPOUSO VIEW --- */
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-[40px] border border-slate-100 shadow-xl gap-8">
                    <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[32px] flex items-center justify-center border-2 border-dashed border-slate-200">
                        <CheckSquare size={48} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Monitoramento de Ativos</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                            ÚLTIMA CONFERÊNCIA GERAL REALIZADA EM:{' '}
                            <span className="text-slate-900">
                                {(() => {
                                    const items = inventory || [];
                                    const lastDate = items.reduce((max, i) => i.last_inventory_at && i.last_inventory_at > (max || '') ? i.last_inventory_at : max, null);
                                    return lastDate ? new Date(lastDate).toLocaleDateString('pt-BR') : 'NUNCA REALIZADA';
                                })()}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            const { error } = await supabase.from('ee_inventory').update({ is_checked: false }).neq('status', 'DISCARDED');
                            if (!error) {
                                setInventory(prev => prev.map(i => ({ ...i, is_checked: false })));
                                setIsInventorySessionActive(true);
                            } else {
                                notifyError("Erro ao resetar confer\u00eancia", error.message);
                            }
                            setLoading(false);
                        }}
                        className="px-12 py-5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-brand-200 hover:bg-brand-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3"
                    >
                        <Plus size={18} /> Iniciar Novo Inventário
                    </button>
                </div>
            ) : (
                /* --- ACTIVE SESSION VIEW --- */
                <>
                    <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm print:hidden animate-in slide-in-from-top-4 duration-300">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Inventário em Curso</h2>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Validando saldos atuais dos depósitos</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="px-6 py-3 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200 flex items-center gap-2 hover:bg-white transition-all active:scale-95"
                            >
                                <Printer size={16} /> Imprimir Guia
                            </button>
                            <button
                                onClick={() => {
                                    try {
                                        const safeInventory = inventory || [];
                                        const safeTests = tests || [];

                                        const checkedItems = safeInventory.filter(i => i.is_checked);
                                        
                                        const discrepancies = checkedItems.reduce((acc, i) => {
                                            const sourceTest = safeTests.find(t => String(t?.id) === String(i?.test_id));
                                            
                                            // Se for item manual sem teste, o teórico é a própria quantidade (sem discrepância esperada)
                                            // Caso o usuário tenha ajustado manualmente antes de finalizar, o 'theoretical' de base 
                                            // seria o valor antes do ajuste nesta sessão. 
                                            // Para fins de auditoria, vamos focar nos itens com teste vinculado ou onde houve mudança.
                                            
                                            const qtyProduced = parseFloat(i?.qty_produced || sourceTest?.produced_quantity || 0);
                                            const qtyBilled = parseFloat(i?.qty_billed || sourceTest?.quantity_billed || 0);
                                            
                                            const totalConsumedByOthers = safeTests
                                                .filter(t => String(t?.consumed_stock_id) === String(i?.id) && !['CANCELADO', 'REPROVADO'].includes(t?.status))
                                                .reduce((sum, t) => sum + parseFloat(t?.produced_quantity || 0), 0);

                                            // CRÍTICO: O teórico deve considerar o total produzido - saídas + AJUSTES ACUMULADOS ANTERIORES
                                            const previousAdjustments = parseFloat(i?.inventory_adjustment || 0);
                                            const theoretical = Math.max(0, qtyProduced - (qtyBilled + totalConsumedByOthers) + previousAdjustments);
                                            const currentQty = parseFloat(i?.quantity || 0);

                                            // Só entra na lista de "Direcionamento" se houver diferença real e atual
                                            if (Math.abs(currentQty - theoretical) > 0.01) {
                                                acc.push({ 
                                                    ...i, 
                                                    theoretical,
                                                    physical: currentQty,
                                                    difference: currentQty - theoretical
                                                });
                                            }
                                            return acc;
                                        }, []);

                                        // SEMPRE abre o modal de justificativa para gerar o Snapshot, mesmo que discrepancies seja []
                                        setPendingJustifications(discrepancies);
                                    } catch (err) {
                                        console.error('[InventoryCheck] Erro ao finalizar:', err);
                                        notifyError("Erro ao processar finalização", "Ocorreu um erro técnico ao calcular as discrepâncias.");
                                    }
                                }}
                                className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl flex items-center gap-2 hover:bg-black transition-all active:scale-95"
                            >
                                <CheckCircle size={16} /> Finalizar Inventário
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0 transition-all print:overflow-visible print:h-auto print:!m-0 print:!p-0 print:!top-0 print:!left-0 print:transform-none animate-in slide-in-from-bottom-4 duration-500 printable-area">
                        {/* Hidden Print Header */}
                        <div className="hidden print:flex flex-col gap-4 print:pt-0 print:pb-8 print:px-0 border-b-2 border-slate-900 mb-8 items-center text-center">
                            <div className="w-full flex flex-col items-center">
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Inventário</h1>
                                <p className="text-[12px] font-bold text-slate-600 uppercase tracking-widest mt-1">Controle de Ativos e Saldos — Engenharia & Controles</p>
                                <div className="flex gap-4 mt-3 text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px]">
                                    <span>Data: {new Date().toLocaleDateString('pt-BR')}</span>
                                    <span>•</span>
                                    <span>Gerado por Assistec App V6</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/10">
                            <div className="flex items-center gap-2">
                                <CheckSquare size={18} className="text-blue-500 print:hidden" />
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Lista de Conferência</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden print:overflow-visible flex flex-col min-h-0 print:h-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                    <tr className="border-b border-slate-100">
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrimônio / Item</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">OP</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Depósito</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Vol</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Físico</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center print:hidden">Conferido?</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center print:hidden">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(inventory || [])
                                        .filter(i => i.status !== 'DISCARDED' && (i.quantity > 0 || i.qty_produced > 0))
                                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                        .map(item => (
                                            <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${item.is_checked ? 'bg-emerald-50/30' : ''} align-middle break-inside-avoid print:break-inside-avoid`}>
                                                <td className="p-4 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{item.name}</span>
                                                        {item.last_inventory_at && (
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase italic">Última Ref: {new Date(item.last_inventory_at).toLocaleDateString('pt-BR')}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{item.op || '-'}</span>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest block break-words leading-tight">{item.client_name || 'Estoque Geral'}</span>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter whitespace-nowrap ${item.stock_bin === 'ESTOQUE 14' ? 'bg-rose-50 text-rose-600' :
                                                            item.stock_bin === 'ESTOQUE 0' ? 'bg-amber-50 text-amber-600' :
                                                                item.stock_bin === 'ESTOQUE 65' ? 'bg-blue-50 text-blue-600' :
                                                                    'bg-emerald-50 text-emerald-600'}`}>
                                                        {item.stock_bin}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <span className="text-[11px] font-black text-slate-600">{item.volumes || '0'}</span>
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {itemBeingAdjusted === item.id ? (
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                autoFocus
                                                                defaultValue={item.quantity}
                                                                onBlur={(e) => {
                                                                    const newVal = parseFloat(e.target.value) || 0;
                                                                    setItemBeingAdjusted(null);
                                                                    if (newVal === item.quantity) return;
                                                                    handleSaveInventory(item, newVal);
                                                                }}
                                                                className="w-20 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[12px] font-black text-amber-700 outline-none focus:ring-2 focus:ring-amber-500 text-right animate-in zoom-in-95"
                                                            />
                                                        ) : (
                                                            <span className="text-[14px] font-black text-slate-900">{(item.quantity || 0).toFixed(1)} <span className="text-[10px] text-slate-400">{item.unit}</span></span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 print:hidden">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={async () => {
                                                                const newValue = !item.is_checked;
                                                                const { error } = await supabase.from('ee_inventory').update({ is_checked: newValue }).eq('id', item.id);
                                                                if (!error) {
                                                                    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: newValue } : i));
                                                                }
                                                            }}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.is_checked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'} `}
                                                        >
                                                            <CheckCircle size={20} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 print:hidden">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => setItemBeingAdjusted(itemBeingAdjusted === item.id ? null : item.id)}
                                                            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${itemBeingAdjusted === item.id ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'} `}
                                                        >
                                                            {itemBeingAdjusted === item.id ? 'Cancelar' : 'Ajustar Saldo'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>

                            {hasMore && (
                                <div className="p-4 flex justify-center bg-slate-50/50 border-t border-slate-100 print:hidden">
                                    <button
                                        onClick={onLoadMore}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-8 py-2.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:shadow-lg hover:shadow-brand-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Carregando...
                                            </>
                                        ) : (
                                            'Carregar Mais Itens'
                                        )}
                                    </button>
                                </div>
                            )}

                            <tfoot className="print:hidden">
                                    <tr>
                                        <td colSpan="8" className="p-8"></td>
                                    </tr>
                                </tfoot>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default InventoryCheckView;
