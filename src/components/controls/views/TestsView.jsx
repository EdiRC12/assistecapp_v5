import React from 'react';
import {
    FlaskConical, Plus, Trash2, CheckCircle
} from 'lucide-react';

const TestsView = ({
    tests,
    searchTerm,
    statusFilter,
    onEditTest,
    onUpdateStatus,
    onDeleteTest,
    onConvertToTask,
    testFlows = [],
    testStatusPresets = [],
    hasMore,
    onLoadMore,
    loading
}) => {
    const getContrastColor = (hexColor) => {
        if (!hexColor || hexColor === 'transparent') return '#475569';
        const color = hexColor.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 180) ? '#1e293b' : '#ffffff';
    };

    const filteredTests = tests.map(t => {
        let displayStatus = t.status || 'AGUARDANDO RETORNO DO CLIENTE';
        let displayColor = t.status_color || '#eab308';
        let displayFlow = t.flow_stage || '';

        if (displayStatus === 'AGUARDANDO') displayStatus = 'AGUARDANDO RETORNO DO CLIENTE';

        if (displayStatus === 'AGUARDANDO RETORNO DO CLIENTE' && t.situation) {
            const sitUpper = t.situation.toUpperCase().trim();
            let targetLabel = sitUpper;
            if (sitUpper === 'CONCLUÍDO' || sitUpper === 'CONCLUIDO') targetLabel = 'APROVADO';
            else if (sitUpper === 'AGUARDANDO') targetLabel = 'AGUARDANDO RETORNO DO CLIENTE';

            const matched = testStatusPresets?.find(p => p.label.toUpperCase() === targetLabel);
            if (matched) {
                displayStatus = matched.label;
                displayColor = matched.color;
            }
        }

        const currentPreset = testStatusPresets?.find(p => p.label.toUpperCase() === displayStatus.toUpperCase());
        if (currentPreset) displayColor = currentPreset.color;

        if (t.nf_number && (!displayFlow || displayFlow === '')) {
            displayFlow = 'FATURADO';
        }

        const currentFlowPreset = testFlows?.find(f => (typeof f === 'string' ? f : f.label).toUpperCase() === displayFlow.toUpperCase());
        const displayFlowColor = currentFlowPreset?.color || 'transparent';

        return { ...t, displayStatus, displayColor, displayFlow, displayFlowColor };
    }).filter(t => {
        const matchSearch = !searchTerm || t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || t.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || t.displayStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    if (tests.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
                <div className="p-6 bg-slate-50 text-slate-200 rounded-full mb-4">
                    <FlaskConical size={48} />
                </div>
                <p className="text-slate-400 font-bold">Nenhum teste encontrado.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative group">
            <div className="flex-1 overflow-auto custom-scrollbar relative rounded-[40px]">
                <table className="w-full border-separate border-spacing-0 text-left relative min-w-[950px] table-fixed">
                    <thead className="relative z-[40]">
                        <tr className="shadow-sm">
                            <th className="sticky top-0 z-[40] p-5 text-[13px] font-black text-white uppercase tracking-tighter bg-gradient-to-r from-brand-600 to-brand-500 text-center w-[180px] first:rounded-tl-[40px] border-b border-brand-700/30">Cliente</th>
                            <th className="sticky top-0 z-[40] p-5 text-[13px] font-black text-white uppercase tracking-tighter bg-brand-500 text-center w-[315px] border-b border-brand-700/30">Teste e Produto</th>
                            <th className="sticky top-0 z-[40] p-5 text-[13px] font-black text-white uppercase tracking-tighter bg-brand-500 text-center w-[140px] border-b border-brand-700/30">Prod/OP</th>
                            <th className="sticky top-0 z-[40] p-5 text-[13px] font-black text-white uppercase tracking-tighter bg-brand-500 text-center w-[80px] border-b border-brand-700/30">Custos</th>
                            <th className="sticky top-0 z-[40] p-5 text-[11px] font-black text-white uppercase tracking-tighter bg-brand-500 text-center w-[75px] border-l border-white/10 border-b border-brand-700/30">Fluxo</th>
                            <th className="sticky top-0 z-[40] p-5 text-[11px] font-black text-white uppercase tracking-tighter bg-brand-500 text-center w-[90px] border-l border-white/10 border-b border-brand-700/30">Status</th>
                            <th className="sticky top-0 z-[40] p-5 text-[11px] font-black text-white uppercase tracking-tighter bg-gradient-to-r from-brand-500 to-brand-600 border-l border-white/10 w-[50px] text-center last:rounded-tr-[40px] border-b border-brand-700/30">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredTests.map((t) => (
                            <tr
                                key={t.id}
                                onDoubleClick={() => onEditTest(t)}
                                className="transition-all group/row cursor-pointer select-none border-b border-white hover:brightness-95 relative"
                                style={{
                                    backgroundColor: t.displayColor ? `${t.displayColor}48` : 'transparent',
                                    borderLeft: `24px solid ${t.displayColor || '#cbd5e1'}`,
                                    WebkitPrintColorAdjust: 'exact',
                                    printColorAdjust: 'exact'
                                }}
                            >
                                <td className="p-4 text-[13px] text-slate-900 font-black uppercase tracking-normal leading-tight border-r border-slate-100/50 w-[180px] whitespace-normal">{t.client_name || '-'}</td>
                                <td className="p-4 w-[315px] whitespace-normal">
                                    <div className="text-[13px] font-black text-slate-800 uppercase leading-snug mb-1">{t.title}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">{t.product_name || 'Produto Não Informado'}</div>
                                    <div className="text-[10px] text-slate-400 italic mt-0.5 whitespace-normal" title={t.description || t.extra_data?.Objetivo || t.extra_data?.OBJETIVO}>
                                        {t.description || t.extra_data?.Objetivo || t.extra_data?.OBJETIVO || t.extra_data?.['Objetivo do teste'] || '-'}
                                    </div>
                                </td>
                                <td className="p-4 flex gap-x-4 gap-y-2 flex-wrap items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Nº Registro</span>
                                        <span className="text-xs font-bold text-indigo-700">{t.test_number || '-'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Nº Pedido/OP</span>
                                        <span className="text-xs font-medium text-slate-900">{t.test_order || '-'} / {t.op_number || '-'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Produzido</span>
                                        <span className="text-xs font-medium text-slate-900">{t.produced_quantity || 0} Und/Kg</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Entrega</span>
                                        <span className="text-[10px] font-medium text-slate-700">{t.delivery_date ? new Date(t.delivery_date).toLocaleDateString('pt-BR') : '-'}</span>
                                    </div>
                                </td>
                                <td className="p-4 w-[80px]">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-start gap-2 items-center bg-slate-200/50 px-1.5 py-0.5 rounded text-[10px] border border-slate-300/30">
                                            <span className="font-black text-slate-900 uppercase tracking-tighter">Unit:</span>
                                            <span className="font-mono font-bold text-slate-900">R$ {parseFloat(t.unit_cost || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        <div className="flex justify-start gap-1.5 items-center bg-emerald-100 border border-emerald-200 px-1.5 py-1 rounded shadow-sm text-[10px]">
                                            <span className="font-black text-emerald-900 uppercase tracking-tighter">BRUTO:</span>
                                            <span className="font-mono font-bold text-emerald-900">R$ {parseFloat(t.gross_total_cost || t.op_cost || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-1 px-2 border-l border-slate-100 w-[75px]" onClick={(e) => e.stopPropagation()}>
                                    <select
                                        value={t.displayFlow || ''}
                                        onChange={(e) => onUpdateStatus(t.id, 'flow_stage', e.target.value)}
                                        className="w-full text-[10px] font-black p-1 px-1 rounded-lg text-center uppercase outline-none cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-slate-300 hover:brightness-110 shadow-md transition-all drop-shadow-sm border-none"
                                        style={{ 
                                            backgroundColor: t.displayFlowColor !== 'transparent' ? t.displayFlowColor : '#f1f5f9',
                                            color: getContrastColor(t.displayFlowColor)
                                        }}
                                    >
                                        <option value="" className="bg-white text-slate-800">SEM FASE</option>
                                        {testFlows?.map(f => (
                                            <option key={typeof f === 'string' ? f : f.label} value={typeof f === 'string' ? f : f.label} className="bg-white text-slate-800">
                                                {typeof f === 'string' ? f : f.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-1 px-2 border-l border-slate-100 w-[90px]" onClick={(e) => e.stopPropagation()}>
                                    <select
                                        value={t.displayStatus || 'AGUARDANDO'}
                                        onChange={(e) => {
                                            const selectedPreset = testStatusPresets?.find(p => p.label === e.target.value);
                                            const newColor = selectedPreset ? selectedPreset.color : '#94a3b8';
                                            onUpdateStatus(t.id, 'status', e.target.value, { status_color: newColor });
                                        }}
                                        className="w-full text-[10px] font-black p-1 px-1 rounded-lg text-center uppercase outline-none cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-slate-300 hover:brightness-110 shadow-md transition-all drop-shadow-sm"
                                        style={{ 
                                            backgroundColor: t.displayColor || '#94a3b8',
                                            color: getContrastColor(t.displayColor)
                                        }}
                                    >
                                        {testStatusPresets.map((p, idx) => (
                                            <option key={idx} value={p.label} className="bg-white text-slate-800">
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-1 bg-white/50 backdrop-blur-sm shadow-sm border-l border-slate-200 w-[50px]">
                                    <div className="flex gap-1 items-center justify-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const info = { ...t.extra_data, title: t.title, client: t.client_name, status: t.displayStatus };
                                                onConvertToTask(t, info);
                                            }}
                                            className="p-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all active:scale-95 shadow-md shadow-brand-100 flex items-center justify-center shrink-0"
                                            title="Criar tarefa no Kanban"
                                        >
                                            <Plus size={11} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteTest(t.id);
                                            }}
                                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                            title="Excluir Teste"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasMore && (
                <div className="p-4 flex justify-center bg-slate-50/50 border-t border-slate-100">
                    <button
                        onClick={onLoadMore}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full hover:shadow-lg hover:shadow-brand-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        {loading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Carregando...
                            </>
                        ) : (
                            'Carregar Mais Registros'
                        )}
                    </button>
                </div>
            )}
            <div className="p-4 bg-slate-100 border-t border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-6">
                    <span>{filteredTests.length} Registros Encontrados</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-400 font-bold lowercase">Clique duplo para ver detalhes</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Conectado ao Supabase
                </div>
            </div>
        </div>
    );
};

export default TestsView;
