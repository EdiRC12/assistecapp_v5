import React from 'react';
import { createPortal } from 'react-dom';
import {
    Database, Package, FlaskConical, AlertTriangle,
    BarChart3, ChevronRight, RefreshCw, Printer, Trash2, X
} from 'lucide-react';

const getStatusBadge = (status) => {
    switch (status) {
        case 'ACTIVE':
            return {
                label: 'ATIVO',
                classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
            };
        case 'BILLED':
            return {
                label: 'FATURADO',
                classes: 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
            };
        case 'DISCARDED':
            return {
                label: 'DESCARTADO',
                classes: 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
            };
        default:
            return {
                label: status || 'ATIVO',
                classes: 'bg-slate-50 text-slate-500 border border-slate-200 shadow-sm'
            };
    }
};

const getInventoryMetrics = (item, relatedTest) => {
    const isBilled = item.status === 'BILLED';
    const isDiscarded = item.status === 'DISCARDED';

    if (isBilled) {
        // Volumes faturados
        const shipments = relatedTest?.extra_data?.shipments || [];
        const volsBilled = shipments.length > 0 
            ? shipments.reduce((sum, s) => sum + (parseInt(s.volumes) || 0), 0)
            : (parseInt(relatedTest?.extra_data?.volumes_faturados) || 0);
        
        // Qtd faturada
        const qtyBilled = item.qty_billed || relatedTest?.quantity_billed || 0;

        return {
            volumes: volsBilled,
            volumesLabel: 'Faturado',
            volumesColor: 'text-blue-500 font-bold',
            quantity: qtyBilled,
            quantityLabel: 'Faturado',
            quantityColor: 'text-blue-500 font-bold'
        };
    } else if (isDiscarded) {
        // Volumes descartados (originalmente produzidos)
        const volsProduced = parseInt(relatedTest?.volumes) || 0;
        // Qtd descartada
        const qtyDiscarded = item.quantity_discarded || relatedTest?.quantity_discarded || 0;

        return {
            volumes: volsProduced,
            volumesLabel: 'Descarte',
            volumesColor: 'text-rose-500 font-bold',
            quantity: qtyDiscarded,
            quantityLabel: 'Descartado',
            quantityColor: 'text-rose-500 font-bold'
        };
    } else {
        // Ativo (em estoque)
        return {
            volumes: item.volumes || 0,
            volumesLabel: 'Vols',
            volumesColor: 'text-slate-700',
            quantity: item.quantity || 0,
            quantityLabel: (item.unit?.toUpperCase() === 'UN' ? 'KG' : item.unit) || 'KG',
            quantityColor: 'text-slate-900'
        };
    }
};

const InventoryView = ({
    inventory,
    tests = [],
    activeInventoryBin,
    setActiveInventoryBin,
    searchTerm,
    setSelectedInventoryItem,
    setTempInventoryItem,
    onEditManualItem,
    setReportContext,
    setShowReportModal,
    setAiAnalysis,
    onPrint,
    stockStatusFilter = 'ACTIVE',
    setStockStatusFilter,
    hasMore,
    onLoadMore,
    loading,
    isMaximized,
    setIsMaximized,
    onResyncAll
}) => {
    const filteredInventory = inventory.filter(item => {
        const binTarget = activeInventoryBin?.trim().toUpperCase();
        const itemBinValue = item.stock_bin?.trim().toUpperCase();

        const matchBin = activeInventoryBin === 'ALL' || itemBinValue === binTarget;

        const relatedTest = tests?.find(t => t.id === item.test_id);
        const productName = relatedTest?.product_name || '';
        const opNumber = item.op || relatedTest?.op_number || relatedTest?.extra_data?.OP || '';

        const matchSearch = !searchTerm || 
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchStatus = stockStatusFilter === 'ALL' || item.status === stockStatusFilter;

        return matchBin && matchSearch && matchStatus;
    });

    const bins = [
        { id: 'ALL', label: 'TODOS', icon: Database, color: 'text-slate-500' },
        { id: 'ESTOQUE 0', label: 'ESTOQUE 0 (A RESERVAR)', icon: RefreshCw, color: 'text-amber-500' },
        { id: 'ESTOQUE 01', label: 'ESTOQUE 01 (ACABADO)', icon: Package, color: 'text-emerald-500' },
        { id: 'ESTOQUE 65', label: 'ESTOQUE 65 (ENGENHARIA)', icon: FlaskConical, color: 'text-blue-500' },
        { id: 'ESTOQUE 14', label: 'ESTOQUE 14 (RESTRITO)', icon: AlertTriangle, color: 'text-rose-500' }
    ];

    const tableContent = (
        <div 
            style={isMaximized ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
                backgroundColor: '#ffffff',
                padding: '24px',
                boxSizing: 'border-box'
            } : {}}
            className={`flex-1 flex flex-col bg-white overflow-hidden ${
                isMaximized 
                    ? 'max-h-none h-full' 
                    : 'rounded-[32px] border border-slate-100 shadow-sm min-h-0 h-0 max-h-[calc(100vh-320px)]'
            }`}
        >
            {isMaximized && (
                <button
                    onClick={() => setIsMaximized(false)}
                    style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 100000 }}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all shadow-md active:scale-95 flex items-center justify-center border border-slate-200"
                    title="Sair da Tela Cheia"
                >
                    <X size={18} />
                </button>
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar h-full min-h-0">
                <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className="border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item / Cliente</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Depósito</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Volumes</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo (KG)</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                         {filteredInventory.map(item => {
                            const relatedTest = tests?.find(t => t.id === item.test_id);
                            // Para itens de teste: usa product_name do teste vinculado.
                            // Para itens diretos (sem test_id): extrai o name do item como descrição do produto.
                            const productName = relatedTest?.product_name ||
                                (!item.test_id
                                    ? (item.name || '').replace(/^ITEM:\s*/i, '').trim()
                                    : '');
                            const opNumber = item.op || relatedTest?.op_number || relatedTest?.extra_data?.OP || '';

                            return (
                                <tr
                                    key={item.id}
                                    onClick={() => {
                                        if (!item.test_id && onEditManualItem) {
                                            onEditManualItem(item);
                                        } else {
                                            setSelectedInventoryItem(item);
                                            setTempInventoryItem(item);
                                        }
                                    }}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                                {item.name?.replace('RESÍDUO:', 'ITEM:').includes('ITEM:') ? item.name.replace('RESÍDUO:', 'ITEM:') : `ITEM: ${item.name}`}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {item.client_name || 'Estoque Geral'}
                                                </span>
                                                {opNumber && (
                                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                        OP: {opNumber}
                                                    </span>
                                                )}
                                                {item.status === 'BILLED' && (() => {
                                                    const nfs = new Set();
                                                    if (relatedTest?.nf_number) nfs.add(relatedTest.nf_number);
                                                    if (relatedTest?.extra_data?.shipments) {
                                                        relatedTest.extra_data.shipments.forEach(s => {
                                                            if (s.nf_number) nfs.add(s.nf_number);
                                                            if (s.nf) nfs.add(s.nf);
                                                        });
                                                    }
                                                    const nfList = Array.from(nfs).filter(Boolean).join(', ');
                                                    return nfList ? (
                                                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                            NF: {nfList}
                                                        </span>
                                                    ) : null;
                                                })()}
                                                {item.status === 'DISCARDED' && (() => {
                                                    const discardReason = item.justification_reason || 
                                                        (relatedTest?.stock_destination === 'DISCARDED' ? 'DESCARTE TÉCNICO' : '') ||
                                                        (relatedTest?.situation === 'REPROVADO' ? 'REPROVADO' : '') ||
                                                        'DESCARTE TÉCNICO';
                                                    return (
                                                        <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                            MOTIVO: {discardReason}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <span className={`text-[9px] font-medium uppercase tracking-tight ${productName ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                PROD: {productName || 'NÃO INFORMADO'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${item.stock_bin === 'ESTOQUE 14' ? 'bg-rose-50 text-rose-600' :
                                                    item.stock_bin === 'ESTOQUE 0' ? 'bg-amber-50 text-amber-600' :
                                                        item.stock_bin === 'ESTOQUE 65' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {item.stock_bin}
                                            </span>
                                        </div>
                                    </td>
                                    {(() => {
                                     const metrics = getInventoryMetrics(item, relatedTest);
                                     return (
                                         <>
                                             <td className="p-4 text-center">
                                                 <div className="flex flex-col items-center">
                                                     <span className={`text-[12px] font-black ${metrics.volumesColor}`}>
                                                         {metrics.volumes}
                                                     </span>
                                                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                                                         {metrics.volumesLabel}
                                                     </span>
                                                 </div>
                                             </td>
                                             <td className="p-4 text-right">
                                                 <div className="flex flex-col items-end">
                                                     <div className="flex items-center gap-1">
                                                         <span className={`text-[13px] font-black ${metrics.quantityColor}`}>
                                                             {metrics.quantity.toFixed(item.unit === 'SACOS' ? 3 : 2)}
                                                         </span>
                                                         <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                             {item.unit?.toUpperCase() === 'UN' ? 'KG' : (item.unit || 'KG')}
                                                         </span>
                                                     </div>
                                                     {(item.status === 'BILLED' || item.status === 'DISCARDED') && (
                                                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">
                                                             {metrics.quantityLabel}
                                                         </span>
                                                     )}
                                                 </div>
                                             </td>
                                         </>
                                     );
                                 })()}
                                 <td className="p-4 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                         {(() => {
                                             const badge = getStatusBadge(item.status || 'ACTIVE');
                                             return (
                                                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${badge.classes}`}>
                                                     {badge.label}
                                                 </span>
                                             );
                                         })()}
                                         <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
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
                            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:shadow-lg hover:shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
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
                {filteredInventory.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-300 bg-white">
                        <Database size={48} className="mb-4 opacity-20" />
                        <p className="font-black text-xs uppercase tracking-widest">Nenhum item encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Bin Selector / Filter Row */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                {bins.map(bin => (
                    <button
                        key={bin.id}
                        onClick={() => {
                            setActiveInventoryBin(bin.id);
                            // Ao clicar num bin, voltar para ACTIVE se estava em DISCARDED
                            if (setStockStatusFilter && stockStatusFilter === 'DISCARDED') {
                                setStockStatusFilter('ACTIVE');
                            }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                            activeInventoryBin === bin.id && stockStatusFilter !== 'DISCARDED'
                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                            }`}
                    >
                        <bin.icon size={14} className={activeInventoryBin === bin.id && stockStatusFilter !== 'DISCARDED' ? 'text-white' : bin.color} />
                        {bin.label}
                    </button>
                ))}

                {/* Botão de Filtro Rápido: Descartados */}
                {setStockStatusFilter && (
                    <button
                        onClick={() => {
                            setStockStatusFilter(stockStatusFilter === 'DISCARDED' ? 'ACTIVE' : 'DISCARDED');
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                            stockStatusFilter === 'DISCARDED'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100'
                                : 'bg-white text-rose-400 border-rose-100 hover:border-rose-300 hover:bg-rose-50'
                            }`}
                    >
                        <Trash2 size={14} />
                        Descartados {stockStatusFilter === 'DISCARDED' && `(✓)`}
                    </button>
                )}

                <div className="flex-1 flex justify-end gap-3">
                    {onResyncAll && (
                        <button
                            onClick={onResyncAll}
                            disabled={loading}
                            title="Recalcula saldos, volumes e status de todos os itens com base nos dados atuais dos testes. Use para corrigir divergências em lote."
                            className="bg-amber-500 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-amber-100 active:scale-95 group disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={14} className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Sincronizando...' : 'Ressincronizar Estoque'}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setReportContext('INVENTORY');
                            setAiAnalysis('');
                            onPrint();
                        }}
                        className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-slate-100 active:scale-95 group"
                    >
                        <Printer size={14} className="group-hover:rotate-[-10deg] transition-transform" /> Imprimir Lista
                    </button>

                    <button
                        onClick={() => {
                            setReportContext('INVENTORY');
                            setAiAnalysis('');
                            setShowReportModal(true);
                        }}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 group"
                    >
                        <BarChart3 size={14} className="group-hover:bounce transition-transform" /> Relatório de Ativos
                    </button>
                </div>
            </div>

            {isMaximized ? createPortal(tableContent, document.body) : tableContent}
        </div>
    );
};

export default InventoryView;
