import React, { useState, useMemo } from 'react';
import {
    Search, Filter, BarChart3, Plus, RotateCcw,
    Edit2, Trash2, FileText, Repeat as Replay, History,
    Calendar, CheckCircle2, Clock, AlertCircle, Sparkles,
    RefreshCw
} from 'lucide-react';
import { useReturnsData } from '../../hooks/useReturnsData';
import ReturnsModal from './ReturnsModal';
import { supabase } from '../../supabaseClient';

const ReturnsView = ({ currentUser, allClients, onOpenJourneyReport, notifySuccess, notifyError, notifyWarning, isMeetingView }) => {
    // State for dates (local or could be passed from parent)
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const {
        loading,
        returns,
        fetchData,
        handleDeleteReturn
    } = useReturnsData(selectedMonth, selectedYear);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [collectionFilter, setCollectionFilter] = useState('ALL');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [newItem, setNewItem] = useState({
        client_name: '',
        invoice_number: '',
        item_name: '',
        quantity: 0,
        unit_price: 0,
        total_value: 0,
        return_date: new Date().toISOString().split('T')[0],
        status: 'PENDENTE',
        notes: '',
        collection_status: 'PENDENTE',
        scheduled_collection_date: ''
    });

    // Filtering logic
    const filteredReportData = useMemo(() => {
        return returns.filter(ret => {
            const matchesSearch =
                (ret.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (ret.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (ret.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || ret.status === statusFilter;
            const matchesCollection = collectionFilter === 'ALL' || ret.collection_status === collectionFilter;
            return matchesSearch && matchesStatus && matchesCollection;
        });
    }, [returns, searchTerm, statusFilter, collectionFilter]);

    // Totals logic
    const reportTotals = useMemo(() => {
        return filteredReportData.reduce((acc, curr) => {
            acc.count++;
            acc.totalQuantity += (parseFloat(curr.quantity) || 0);
            acc.totalValue += (parseFloat(curr.total_value) || (parseFloat(curr.quantity) || 0) * (parseFloat(curr.unit_price) || 0));
            if (curr.status === 'CONCLUÍDO' || curr.status === 'RECEBIDO') acc.resolvedCount++;
            return acc;
        }, { count: 0, totalQuantity: 0, totalValue: 0, resolvedCount: 0 });
    }, [filteredReportData]);

    const handleSaveReturn = async () => {
        if (!newItem.client_name || !newItem.item_name || !newItem.quantity) {
            notifyWarning?.('Campos Obrigatórios', 'Preencha o Cliente, Item e Quantidade.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...newItem,
                total_value: (parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.unit_price) || 0)
            };

            // Limpeza de campos de relacionamento que não pertencem à tabela product_returns
            delete payload.rnc_records;
            delete payload.sac_tickets;
            // Sanitização de campos de data
            if (payload.return_date === '') payload.return_date = null;
            if (payload.scheduled_collection_date === '') payload.scheduled_collection_date = null;

            // Se for edição, o ID já está no editingId, removemos do payload para evitar conflito se vier do spread
            if (editingId) delete payload.id;

            if (editingId) {
                const { error } = await supabase.from('product_returns').update(payload).eq('id', editingId);
                if (error) throw error;

                // --- Sincronismo Reverso (Returns -> Parent) ---
                if (payload.sac_id) {
                    await supabase.from('sac_tickets').update({
                        rework_qty: parseFloat(payload.rework_qty) || 0,
                        loss_qty: parseFloat(payload.loss_qty) || 0,
                        discard_qty: parseFloat(payload.discard_qty) || 0,
                        final_quantity: parseFloat(payload.rework_qty) || 0, // No SAC, final_quantity é o retrabalho
                        return_destination: payload.return_destination,
                        op: payload.op,
                        batch_number: payload.batch_number
                    }).eq('id', payload.sac_id);
                } else if (payload.rnc_id) {
                    await supabase.from('rnc_records').update({
                        rework_qty: parseFloat(payload.rework_qty) || 0,
                        loss_qty: parseFloat(payload.loss_qty) || 0,
                        discard_qty: parseFloat(payload.discard_qty) || 0,
                        final_quantity: parseFloat(payload.rework_qty) || 0,
                        return_destination: payload.return_destination,
                        op: payload.op,
                        batch_number: payload.batch_number
                    }).eq('id', payload.rnc_id);
                }

                notifySuccess?.('Sucesso', 'Devolução atualizada com sucesso.');
            } else {
                const { error } = await supabase.from('product_returns').insert([payload]);
                if (error) throw error;
                notifySuccess?.('Sucesso', 'Devolução registrada com sucesso.');
            }
            setShowAddForm(false);
            fetchData();
        } catch (error) {
            console.error('Error saving return:', error);
            notifyError?.('Erro ao salvar', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const months = [
        "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
        "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];

    const years = [2024, 2025, 2026];

    const handleGenerateManagementReport = async () => {
        if (filteredReportData.length === 0) {
            notifyWarning?.('Sem registros', 'Não há registros filtrados para gerar o fechamento.');
            return;
        }

        if (!window.confirm(`Deseja gerar o Relatório de Gestão para ${filteredReportData.length} registros selecionados?`)) return;

        try {
            const period = `${months[selectedMonth - 1] || 'GERAL'} ${selectedYear}`;
            const totals = {
                count: reportTotals.count,
                totalValue: reportTotals.totalValue,
                totalQuantity: reportTotals.totalQuantity,
                resolvedCount: reportTotals.resolvedCount
            };

            const payload = {
                type: 'MGMT_RETURNS',
                title: `FECHAMENTO DEVOLUÇÕES - ${period}`,
                period: period,
                totals: totals,
                raw_data: filteredReportData.map(r => ({
                    Data: new Date(r.return_date).toLocaleDateString('pt-BR'),
                    Cliente: r.client_name,
                    Item: r.item_name,
                    Qtd: r.quantity,
                    Valor: r.total_value,
                    Status: r.status,
                    Logística: r.collection_status
                })),
                raw_data_count: filteredReportData.length,
                user_id: currentUser?.id
            };

            const { error } = await supabase.from('saved_reports').insert([payload]);
            if (error) throw error;

            notifySuccess?.('Sucesso', 'Fechamento de Gestão salvo na Central de Relatórios.');
        } catch (error) {
            console.error('Error generating MGMT report:', error);
            notifyError?.('Erro ao gerar fechamento', error.message);
        }
    };

    return (
        <div className={`flex-1 flex flex-col gap-6 overflow-hidden ${isMeetingView ? 'p-1' : 'p-4 md:p-6'} bg-slate-50/50 relative`}>
            {/* Header com Filtros de Data */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <RotateCcw className="text-rose-600" size={28} />
                        Gestão de Devoluções
                    </h1>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Controle Financeiro e Logístico de Retornos</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 px-3 py-2 cursor-pointer"
                    >
                        <option value="ALL">TODOS OS MESES</option>
                        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <div className="w-px h-4 bg-slate-100" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 px-3 py-2 cursor-pointer"
                    >
                        <option value="ALL">TODOS OS ANOS</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-xl shadow-rose-900/5 flex flex-col gap-0.5 border-l-4 border-l-rose-500">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total em Devoluções</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-bold text-slate-400">R$</span>
                        <span className="text-xl font-black text-slate-900">
                            {(reportTotals.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <span className="text-[8px] font-bold text-rose-500 italic">Impacto financeiro no período</span>
                </div>
                <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-0.5 border-l-4 border-l-amber-500">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume Devolvido</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">
                            {(reportTotals.totalQuantity || 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">UN/KG</span>
                    </div>
                    <span className="text-[8px] font-bold text-amber-500 italic">Total de material movimentado</span>
                </div>
                <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-0.5 border-l-4 border-l-emerald-500">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxa de Resolução</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-emerald-600">
                            {reportTotals.count > 0
                                ? ((reportTotals.resolvedCount / reportTotals.count) * 100).toFixed(1)
                                : '0.0'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">%</span>
                    </div>
                    <span className="text-[8px] font-bold text-emerald-500 italic">Processadas com sucesso</span>
                </div>
                <div className="bg-slate-900 p-4 rounded-[24px] shadow-xl flex flex-col gap-0.5 border-l-4 border-l-rose-500">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pendências em Aberto</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">
                            {(reportTotals.count || 0) - (reportTotals.resolvedCount || 0)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">ITENS</span>
                    </div>
                    <span className="text-[8px] font-bold text-rose-400 italic">Aguardando ação técnica</span>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative min-w-[250px] flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, item ou NF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-bold transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <Filter size={14} className="ml-2 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 pr-8 py-2.5 cursor-pointer"
                    >
                        <option value="ALL">TODOS OS STATUS</option>
                        <option value="PENDENTE">PENDENTE</option>
                        <option value="EM ANALISE">EM ANÁLISE</option>
                        <option value="CONCLUÍDO">CONCLUÍDO</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <Clock size={14} className="ml-2 text-slate-400" />
                    <select
                        value={collectionFilter}
                        onChange={(e) => setCollectionFilter(e.target.value)}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 pr-8 py-2.5 cursor-pointer"
                    >
                        <option value="ALL">LOGÍSTICA: TODOS</option>
                        <option value="PENDENTE">PENDENTE</option>
                        <option value="PROGRAMADA">AGENDADA</option>
                        <option value="COLETADA">EM TRÂNSITO</option>
                        <option value="EM_CASA">EM CASA</option>
                        <option value="RESOLVIDA">RESOLVIDA</option>
                    </select>
                </div>
                
                    <button
                        onClick={handleGenerateManagementReport}
                        className="bg-slate-100 text-slate-800 px-6 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200 active:scale-95"
                        title="Gerar Relatório de Gestão para a Central"
                    >
                        <BarChart3 size={16} className="text-rose-600" /> Gerar Fechamento
                    </button>

                    <button
                        onClick={() => {
                            setNewItem({
                                client_name: '',
                                invoice_number: '',
                                item_name: '',
                                quantity: 0,
                                unit_price: 0,
                                total_value: 0,
                                return_date: new Date().toISOString().split('T')[0],
                                status: 'PENDENTE',
                                notes: '',
                                collection_status: 'PENDENTE',
                                scheduled_collection_date: ''
                            });
                            setEditingId(null);
                            setShowAddForm(true);
                        }}
                        className="bg-rose-600 text-white px-8 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-xl shadow-rose-100 active:scale-95"
                    >
                        <Plus size={16} /> Nova Devolução
                    </button>
            </div>

            <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="px-5 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Replay size={14} className="text-rose-500" />
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Listagem de Materiais Devolvidos</h3>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
                            <span className="text-slate-400 font-bold text-sm">Sincronizando registros...</span>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-left">
                            <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data / Status</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente / Item</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">OP / Lote</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Coleta</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">NF / Vínculo</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Destinação / Valor</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredReportData.map(ret => (
                                    <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex flex-wrap gap-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit ${ret.status === 'RECEBIDO' || ret.status === 'CONCLUÍDO' ? 'bg-emerald-50 text-emerald-600' :
                                                        ret.status === 'CANCELADO' ? 'bg-rose-50 text-rose-600' :
                                                            ret.status === 'EM ANALISE' ? 'bg-amber-50 text-amber-600' :
                                                                'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {ret.status}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(ret.return_date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{ret.client_name}</span>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{ret.item_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-700 uppercase">{ret.op || ret.rnc_records?.op || ret.sac_tickets?.op || '---'}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">LOTE: {ret.batch_number || ret.rnc_records?.batch_number || ret.sac_tickets?.batch_number || '---'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit ${
                                                    ret.collection_status === 'COLETADA' ? 'bg-emerald-50 text-emerald-600' :
                                                    ret.collection_status === 'PROGRAMADA' ? 'bg-indigo-50 text-indigo-600 animate-pulse' :
                                                    ret.collection_status === 'EM_CASA' ? 'bg-blue-600 text-white shadow-lg' :
                                                    ret.collection_status === 'RESOLVIDA' ? 'bg-emerald-600 text-white shadow-lg' :
                                                    ret.collection_status === 'NAO_SE_APLICA' ? 'bg-slate-50 text-slate-400' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {ret.collection_status || 'PENDENTE'}
                                                </span>
                                                {ret.scheduled_collection_date && (
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                        {new Date(ret.scheduled_collection_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-slate-700">NF: {ret.invoice_number || '-'}</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {ret.rnc_records && (
                                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[7px] font-black rounded uppercase flex items-center gap-0.5 border border-indigo-100">
                                                            <FileText size={7} /> RNC #{ret.rnc_records.rnc_number}
                                                        </span>
                                                    )}
                                                    {ret.sac_tickets && (
                                                        <span className="px-1.5 py-0.5 bg-brand-50 text-brand-600 text-[7px] font-black rounded uppercase flex items-center gap-0.5 border border-brand-100">
                                                            <AlertCircle size={7} /> OT #{ret.sac_tickets.appointment_number}
                                                        </span>
                                                    )}
                                                    {!ret.rnc_records && !ret.sac_tickets && (
                                                        <span className="text-[7px] font-bold text-slate-300 uppercase italic">Avulso</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                                    {ret.rework_qty > 0 && (
                                                        <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100" title="Retrabalho">
                                                            <RotateCcw size={8} /><span className="text-[9px] font-black">{ret.rework_qty}</span>
                                                        </div>
                                                    )}
                                                    {ret.loss_qty > 0 && (
                                                        <div className="flex items-center gap-0.5 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100" title="Perda de Produção">
                                                            <BarChart3 size={8} /><span className="text-[9px] font-black">{ret.loss_qty}</span>
                                                        </div>
                                                    )}
                                                    {ret.discard_qty > 0 && (
                                                        <div className="flex items-center gap-0.5 bg-slate-900 text-white px-1.5 py-0.5 rounded" title="Descarte">
                                                            <Trash2 size={8} /><span className="text-[9px] font-black">{ret.discard_qty}</span>
                                                        </div>
                                                    )}
                                                    <span className="text-[11px] font-black text-slate-900 ml-1">{ret.quantity} {ret.uom || 'UN'}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-emerald-600">
                                                    R$ {(ret.total_value || ((parseFloat(ret.quantity) || 0) * (parseFloat(ret.unit_price) || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenJourneyReport?.('RETURNS', ret);
                                                    }}
                                                    className="p-1.5 bg-brand-50 text-brand-600 hover:bg-slate-900 hover:text-white rounded-lg transition-all active:scale-95"
                                                    title="Ver Relatório"
                                                >
                                                    <History size={13} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setNewItem(ret);
                                                        setEditingId(ret.id);
                                                        setShowAddForm(true);
                                                    }}
                                                    className="p-1.5 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all active:scale-95"
                                                    title="Editar Devolução"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReturn(ret.id)}
                                                    className="p-1.5 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all active:scale-95"
                                                    title="Excluir Devolução"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredReportData.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                                <RotateCcw size={48} className="text-slate-400" />
                                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Nenhuma devolução encontrada</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ReturnsModal
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                editingId={editingId}
                newItem={newItem}
                setNewItem={setNewItem}
                registeredClients={allClients}
                handleSaveReturn={handleSaveReturn}
                isSaving={isSaving}
                isMeetingView={isMeetingView}
            />
        </div>
    );
};

export default ReturnsView;
