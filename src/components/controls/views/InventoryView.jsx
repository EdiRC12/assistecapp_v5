import {
    Database, Package, FlaskConical, AlertTriangle,
    BarChart3, ChevronRight, RefreshCw, Printer, Trash2
} from 'lucide-react';

const InventoryView = ({
    inventory,
    activeInventoryBin,
    setActiveInventoryBin,
    searchTerm,
    setSelectedInventoryItem,
    setTempInventoryItem,
    setReportContext,
    setShowReportModal,
    setAiAnalysis,
    onPrint,
    stockStatusFilter = 'ACTIVE',
    setStockStatusFilter,
    hasMore,
    onLoadMore,
    loading
}) => {
    const filteredInventory = inventory.filter(item => {
        const binTarget = activeInventoryBin?.trim().toUpperCase();
        const itemBinValue = item.stock_bin?.trim().toUpperCase();

        const matchBin = activeInventoryBin === 'ALL' || itemBinValue === binTarget;
        const matchSearch = !searchTerm || item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.op?.toLowerCase().includes(searchTerm.toLowerCase());

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

            <div className="flex-1 flex flex-col bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-0 h-0 max-h-[calc(100vh-320px)]">
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
                            {filteredInventory.map(item => (
                                <tr
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedInventoryItem(item);
                                        setTempInventoryItem(item);
                                    }}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                                {item.name?.replace('RESÍDUO:', 'ITEM:').includes('ITEM:') ? item.name.replace('RESÍDUO:', 'ITEM:') : `ITEM: ${item.name}`}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {item.client_name || 'Estoque Geral'}
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
                                            {item.op && <span className="text-[8px] font-bold text-slate-400 mt-1">OP: {item.op}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="text-[12px] font-black text-slate-700">{(item.volumes || 0)}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Vols</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-[13px] font-black text-slate-900">{(item.quantity || 0).toFixed(1)}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">{item.unit || 'KG'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${(item.status || 'ACTIVE') === 'ACTIVE'
                                                    ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {item.status || 'ACTIVE'}
                                            </span>
                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
        </div>
    );
};

export default InventoryView;
