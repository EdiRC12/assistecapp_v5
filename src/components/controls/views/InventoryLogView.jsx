import React, { useState, useMemo } from 'react';
import { 
    History, Search, Download, Calendar, Package, 
    User, AlertCircle, ArrowRight, ExternalLink, Filter, BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';

const InventoryLogView = ({ 
    adjustmentLogs, 
    inventory,
    setReportContext,
    setShowReportModal,
    setAiAnalysis,
    hasMore,
    onLoadMore,
    loading,
    onShowTestDetails
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = useMemo(() => {
        const logs = adjustmentLogs || [];
        return logs.filter(log => {
            const item = (inventory || []).find(i => i.id === log.inventory_item_id);
            const itemName = item?.name || 'Item Removido';
            const searchStr = `${itemName} ${log.reason} ${log.test_reference || ''} ${log.user_id?.username || ''}`.toLowerCase();
            return searchStr.includes(searchTerm.toLowerCase());
        });
    }, [adjustmentLogs, inventory, searchTerm]);

    const handleExportExcel = () => {
        const dataToExport = filteredLogs.map(log => {
            const item = inventory.find(i => i.id === log.inventory_item_id);
            return {
                'Data/Hora': new Date(log.created_at).toLocaleString('pt-BR'),
                'Item': item?.name || 'Item Removido',
                'Qtd Anterior': log.prev_qty,
                'Qtd Nova': log.new_qty,
                'Diferença': log.difference,
                'Unidade': item?.unit || 'N/A',
                'Motivo': log.reason,
                'Teste Vinculado': log.test_reference || 'N/A',
                'Usuário': log.user_id?.username || 'Sistema'
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historico_Ajustes");
        XLSX.writeFile(wb, `historico_ajustes_estoque_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('pt-BR'),
            time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
    };

    return (
        <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 min-h-0 overflow-hidden">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                        <History size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Histórico de Furos</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rastreamento de Justificativas e Ajustes</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar logs..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button
                        onClick={() => {
                            setReportContext('ADJUSTMENTS');
                            setAiAnalysis('');
                            setShowReportModal(true);
                        }}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 group"
                    >
                        <BarChart3 size={14} className="group-hover:bounce transition-transform" /> Gerar Relatório
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        title="Exportar Excel"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 h-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item do Estoque</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Variação</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Diferença</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo / Justificativa</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teste Vinculado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-300">
                                        <div className="flex flex-col items-center">
                                            <AlertCircle size={40} className="mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const { date, time } = formatDate(log.created_at);
                                    const item = inventory.find(i => i.id === log.inventory_item_id);
                                    const isLoss = log.difference < 0;
                                    
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700 leading-none mb-1">{date}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                        <Calendar size={10} /> {time}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                                                        <Package size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-700 leading-none mb-1">{item?.name || 'Item Removido'}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bin: {item?.stock_bin || '---'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                                                    <span className="px-2 py-1 bg-slate-100 rounded-lg">{log.prev_qty}</span>
                                                    <ArrowRight size={12} className="text-slate-300" />
                                                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-800">{log.new_qty}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                                    isLoss ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                    {log.difference > 0 ? '+' : ''}{log.difference} {item?.unit || ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                                                    {log.reason}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.related_test_id ? (
                                                    <div className="flex flex-col max-w-[200px]">
                                                        <span 
                                                            onClick={() => onShowTestDetails && onShowTestDetails(log.related_test_id)}
                                                            className="text-xs font-black text-indigo-600 truncate underline cursor-pointer flex items-center gap-1 group-hover:text-indigo-500"
                                                        >
                                                            {log.test_reference || `#${log.related_test_id}`} <ExternalLink size={10} />
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase truncate">ID: {log.related_test_id.slice(0,8)}</span>
                                                    </div>
                                                ) : log.test_reference ? (
                                                    <div className="flex flex-col max-w-[200px] opacity-80">
                                                        <span className="text-xs font-black text-slate-500 uppercase italic truncate">
                                                            Ref: {log.test_reference}
                                                        </span>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Sem link oficial</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Sem vínculo</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <div className="p-1.5 bg-slate-100 rounded-full">
                                                        <User size={12} />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-tight truncate max-w-[120px]">
                                                        {log.user_id?.username || 'Sistema'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {hasMore && (
                        <div className="p-4 flex justify-center bg-slate-50/50 border-t border-slate-100">
                            <button
                                onClick={onLoadMore}
                                disabled={loading}
                                className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-slate-700 to-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:shadow-lg hover:shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Carregando...
                                    </>
                                ) : (
                                    'Carregar Mais Histórico'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryLogView;
