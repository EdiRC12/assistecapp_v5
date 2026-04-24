import React, { useState, useEffect, useMemo } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import {
    History, Plus, Trash2, CheckCircle, Search, RefreshCw, X, User,
    MessageSquare, Target, Activity, Zap, Phone, Mail, MessageCircle,
    Users, StickyNote, Briefcase, CheckSquare, Square, Clock, BarChart3
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const FollowupsView = ({
    currentUser,
    allClients = [],
    techFollowups,
    onFetchFollowups,
    onNewTask,
    onOpenJourneyReport,
    highlightedFollowupId,
    notifySuccess,
    notifyError,
    notifyWarning
}) => {
    const isMobile = useIsMobile();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedFollowup, setSelectedFollowup] = useState(null);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const years = [2024, 2025, 2026];

    const handleGenerateManagementReport = async () => {
        if (filteredFollowups.length === 0) {
            notifyWarning?.('Sem registros', 'Não há registros filtrados para gerar o fechamento.');
            return;
        }

        if (!window.confirm(`Deseja gerar o Relatório de Gestão para ${filteredFollowups.length} registros de Acompanhamento em ${months[selectedMonth - 1]} ${selectedYear}?`)) return;

        try {
            const period = `${months[selectedMonth - 1]} ${selectedYear}`;
            const payload = {
                type: 'MGMT_FOLLOWUP',
                title: `FECHAMENTO ACOMP - ${period}`,
                period: period,
                totals: { count: filteredFollowups.length },
                raw_data: filteredFollowups.map(t => ({
                    Data: new Date(t.created_at).toLocaleDateString('pt-BR'),
                    Acomp: t.followup_number || '---',
                    Cliente: t.client_name,
                    Assunto: t.title,
                    Status: t.stability_status
                })),
                raw_data_count: filteredFollowups.length,
                user_id: currentUser?.id
            };

            const { error } = await supabase.from('saved_reports').insert([payload]);
            if (error) throw error;
            notifySuccess?.('Sucesso', 'Fechamento de Gestão (Acompanhamentos) salvo na Central.');
        } catch (error) {
            console.error('Error generating MGMT report:', error);
            notifyError?.('Erro ao gerar fechamento', error.message);
        }
    };

    const [newFollowup, setNewFollowup] = useState({
        client_name: '',
        title: '',
        notes: '',
        monitoring_objective: '',
        review_cycle: 'MENSAL',
        control_parameter: '',
        stability_status: 'EM OBSERVAÇÃO',
        priority: 'MEDIA'
    });

    // Local states for Timeline and Checklist editing
    const [interactionText, setInteractionText] = useState('');
    const [checkItemText, setCheckItemText] = useState('');

    const filteredFollowups = useMemo(() => {
        return (techFollowups || []).filter(f => {
            const matchesSearch = (f.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (f.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (f.control_parameter?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            
            let matchesDate = true;
            if (f.created_at) {
                const d = new Date(f.created_at);
                const matchesMonth = selectedMonth === 'ALL' || (d.getMonth() + 1) === parseInt(selectedMonth);
                const matchesYear = selectedYear === 'ALL' || d.getFullYear() === parseInt(selectedYear);
                matchesDate = matchesMonth && matchesYear;
            } else {
                matchesDate = selectedMonth === 'ALL' && selectedYear === 'ALL';
            }

            return matchesSearch && matchesDate;
        });
    }, [techFollowups, searchTerm, selectedMonth, selectedYear]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            console.log('[FollowupsView] Iniciando salvamento...', { newFollowup, currentUser });

            if (!currentUser?.id) {
                throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
            }

            const nextNumber = techFollowups.length > 0
                ? Math.max(...techFollowups.map(f => f.followup_number || 0)) + 1
                : 1;

            const payload = {
                ...newFollowup,
                followup_number: nextNumber,
                user_id: currentUser.id,
                timeline: [],
                checklist: []
            };

            console.log('[FollowupsView] Enviando payload para tech_followups:', payload);

            const { data, error } = await supabase.from('tech_followups').insert([payload]).select();
            
            if (error) {
                console.error('[FollowupsView] Erro Supabase no Insert:', error);
                throw error;
            }

            console.log('[FollowupsView] Sucesso no salvamento:', data);

            setShowAddModal(false);
            setNewFollowup({
                client_name: '',
                title: '',
                notes: '',
                monitoring_objective: '',
                review_cycle: 'MENSAL',
                control_parameter: '',
                stability_status: 'EM OBSERVAÇÃO',
                priority: 'MEDIA'
            });
            setClientSearch('');
            if (onFetchFollowups) {
                onFetchFollowups();
            } else {
                console.warn('[FollowupsView] onFetchFollowups não disponível para atualizar lista.');
            }
            if (notifySuccess) notifySuccess('Sucesso', 'Acompanhamento registrado com sucesso.');
        } catch (error) {
            console.error('[FollowupsView] Catch Error:', error);
            notifyError('Erro ao salvar', error.message || 'Erro inesperado ao salvar acompanhamento.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = async (id, field, value) => {
        try {
            const { error } = await supabase.from('tech_followups').update({ [field]: value }).eq('id', id);
            if (error) throw error;
            onFetchFollowups();
            // Update local state if needed
            if (selectedFollowup && selectedFollowup.id === id) {
                setSelectedFollowup({ ...selectedFollowup, [field]: value });
            }
        } catch (error) {
            console.error('Erro ao atualizar campo:', error);
        }
    };

    const addInteraction = async (type) => {
        if (!interactionText && type === 'NOTA') return;

        const newEntry = {
            id: Date.now(),
            type,
            text: interactionText || (type === 'LIGAÇÃO' ? 'Ligação realizada' :
                type === 'WHATSAPP' ? 'Contato via WhatsApp' :
                    type === 'REUNIÃO' ? 'Reunião técnica' :
                        type === 'ACORDO' ? 'Acordo firmado' : ''),
            date: new Date().toISOString(),
            user: currentUser.username || currentUser.email
        };

        const updatedTimeline = [newEntry, ...(selectedFollowup.timeline || [])];
        await handleUpdateField(selectedFollowup.id, 'timeline', updatedTimeline);
        setInteractionText('');
    };

    const addCheckItem = async () => {
        if (!checkItemText) return;
        const newItem = {
            id: Date.now(),
            text: checkItemText,
            completed: false
        };
        const updatedChecklist = [...(selectedFollowup.checklist || []), newItem];
        await handleUpdateField(selectedFollowup.id, 'checklist', updatedChecklist);
        setCheckItemText('');
    };

    const toggleCheckItem = async (itemId) => {
        const updatedChecklist = selectedFollowup.checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        await handleUpdateField(selectedFollowup.id, 'checklist', updatedChecklist);
    };

    const removeCheckItem = async (itemId) => {
        const updatedChecklist = selectedFollowup.checklist.filter(item => item.id !== itemId);
        await handleUpdateField(selectedFollowup.id, 'checklist', updatedChecklist);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja excluir este acompanhamento?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('tech_followups').delete().eq('id', id);
            if (error) throw error;
            if (selectedFollowup?.id === id) setSelectedFollowup(null);
            onFetchFollowups();
        } catch (error) {
            notifyError('Erro ao excluir', error.message);
        } finally {
            setLoading(false);
        }
    };

    const convertToTask = async (e, f) => {
        e.stopPropagation();
        const taskPayload = {
            title: f.followup_number ? `[ACOMP #${f.followup_number}] ${f.title}` : f.title,
            description: `OBJETIVO: ${f.monitoring_objective || '-'}\nPARÂMETRO: ${f.control_parameter || '-'}\nNOTAS: ${f.notes || ''}\nDATA: ${new Date(f.created_at).toLocaleDateString()}`,
            parent_followup_id: f.id,
            parent_followup_number: f.followup_number // Adicionando o número para o card
        };

        if (onNewTask) {
            const result = await onNewTask(f.client_name, taskPayload);
        }
    };

    const getStabilityBadge = (status) => {
        switch (status) {
            case 'ESTABILIZADO':
                return <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-widest">ESTABILIZADO</span>;
            case 'REQUER AÇÃO':
                return <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-widest">REQUER AÇÃO</span>;
            default:
                return <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-widest">EM OBSERVAÇÃO</span>;
        }
    };

    const getPriorityStyle = (priority) => {
        switch (priority) {
            case 'CRITICA': return 'bg-red-50 text-red-600 border-red-200';
            case 'ALTA': return 'bg-orange-50 text-orange-600 border-orange-200';
            case 'MEDIA': return 'bg-blue-50 text-blue-600 border-blue-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getInteractionIcon = (type) => {
        switch (type) {
            case 'LIGAÇÃO': return <Phone size={14} />;
            case 'E-MAIL': return <Mail size={14} />;
            case 'WHATSAPP': return <MessageCircle size={14} />;
            case 'REUNIÃO': return <Users size={14} />;
            case 'ACORDO': return <Briefcase size={14} />;
            default: return <StickyNote size={14} />;
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
            {/* Action Bar */}
            <div className={`${isMobile ? 'p-3 pb-1' : 'p-6 pb-2'}`}>
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-4'} items-center`}>
                    <div className="flex-1 w-full bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400`} size={isMobile ? 14 : 16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={isMobile ? "Buscar..." : "Buscar acompanhamentos (título, parceiro, parâmetro)..."}
                                className={`w-full ${isMobile ? 'pl-9 py-1.5' : 'pl-10 py-2'} bg-slate-50/50 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-600 placeholder:text-slate-300 ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                            />
                        </div>
                    </div>

                    {!isMobile && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">
                                <option value="ALL">TODOS OS MESES</option>
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <div className="w-px h-4 bg-slate-100" />
                            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">
                                <option value="ALL">TODOS OS ANOS</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={handleGenerateManagementReport}
                        className={`${isMobile ? 'hidden' : 'px-4 py-3 text-[10px]'} bg-slate-100 text-slate-800 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-95 shadow-sm text-indigo-600`}
                        title="Gerar Relatório de Gestão (Snapshot)"
                    >
                        <BarChart3 size={16} /> <span className="hidden md:inline text-slate-800">Gerar Fechamento</span>
                    </button>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className={`${isMobile ? 'w-full py-2.5 text-[9px]' : 'px-4 py-3 text-[10px]'} bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 transition-all active:scale-95 whitespace-nowrap`}
                    >
                        <Plus size={isMobile ? 14 : 16} /> Novo Registro
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                {loading && !showAddModal && !selectedFollowup ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Processando...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFollowups.map(f => (
                            <div
                                key={f.id}
                                id={`followup-${f.id}`}
                                onClick={() => setSelectedFollowup(f)}
                                className={`p-6 rounded-[32px] border transition-all cursor-pointer group flex flex-col gap-4 ${f.id === highlightedFollowupId ? 'bg-brand-50 border-brand-500 shadow-2xl ring-4 ring-brand-500/20 scale-105 z-10' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-200'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl group-hover:scale-110 transition-transform"><History size={24} /></div>
                                        <div className="flex flex-col">
                                            {f.followup_number && <span className="bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md mb-1 w-fit">#{f.followup_number}</span>}
                                            {getStabilityBadge(f.stability_status)}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {!f.converted_task_id && (
                                            <button
                                                onClick={(e) => convertToTask(e, f)}
                                                className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-md group-hover:scale-105"
                                                title="Criar tarefa no Kanban"
                                            >
                                                <Zap size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleDelete(e, f.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">{f.title}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{f.client_name}</div>
                                        {f.converted_task_id && (
                                            <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-100">
                                                <CheckCircle size={10} /> CONVERTIDO
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 mb-3">
                                        {f.control_parameter && (
                                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                                                <Target size={10} /> Parâmetro: {f.control_parameter}
                                            </span>
                                        )}
                                        {f.review_cycle && (
                                            <span className="text-[9px] font-bold text-indigo-400 flex items-center gap-1 uppercase tracking-wider">
                                                <Activity size={10} /> Ciclo: {f.review_cycle}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2 overflow-hidden">
                                        {f.notes ? `"${f.notes}"` : "Sem notas registradas"}
                                    </p>
                                </div>
                                <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center text-[9px] font-black uppercase">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Clock size={10} />
                                        <span>{new Date(f.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {f.checklist?.length > 0 && (
                                            <span className="text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                                                <CheckSquare size={10} /> {f.checklist.filter(i => i.completed).length}/{f.checklist.length}
                                            </span>
                                        )}
                                        <span className="text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">{f.users?.username || 'Sistema'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredFollowups.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
                                <History size={48} className="mb-4 opacity-20" />
                                <p className="font-black text-xs uppercase tracking-widest">Nenhum acompanhamento encontrado</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Adicionar */}
            {showAddModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-500/20"><Plus size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Novo Monitoramento</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Acompanhamento Técnico Passivo</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-800 transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 flex flex-col gap-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Parceiro</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            required
                                            type="text"
                                            disabled={loading}
                                            className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            value={clientSearch}
                                            onChange={e => {
                                                setClientSearch(e.target.value);
                                                setNewFollowup(prev => ({ ...prev, client_name: e.target.value }));
                                            }}
                                            placeholder="Buscar parceiro..."
                                        />
                                        {clientSearch && !allClients.some(c => (typeof c === 'string' ? c : c.name) === clientSearch) && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
                                                {allClients
                                                    .map(c => typeof c === 'string' ? c : c.name)
                                                    .filter(name => name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                    .map((name, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            className="w-full p-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0"
                                                            onClick={() => {
                                                                setClientSearch(name);
                                                                setNewFollowup(prev => ({ ...prev, client_name: name }));
                                                            }}
                                                        >
                                                            {name}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Assunto</label>
                                    <input 
                                        required 
                                        type="text" 
                                        disabled={loading}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-50" 
                                        value={newFollowup.title} 
                                        onChange={e => setNewFollowup(prev => ({ ...prev, title: e.target.value }))} 
                                        placeholder="Ex: Monitoramento de Brilho" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objetivo da Observação</label>
                                <input 
                                    type="text" 
                                    disabled={loading}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-50" 
                                    value={newFollowup.monitoring_objective} 
                                    onChange={e => setNewFollowup(prev => ({ ...prev, monitoring_objective: e.target.value }))} 
                                    placeholder="O que se pretende validar?" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciclo de Revisão</label>
                                    <select 
                                        disabled={loading}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-50" 
                                        value={newFollowup.review_cycle} 
                                        onChange={e => setNewFollowup(prev => ({ ...prev, review_cycle: e.target.value }))}
                                    >
                                        <option value="SEMANAL">SEMANAL</option>
                                        <option value="MENSAL">MENSAL</option>
                                        <option value="TRIMESTRAL">TRIMESTRAL</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parâmetro de Controle</label>
                                    <input 
                                        type="text" 
                                        disabled={loading}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all disabled:opacity-50" 
                                        value={newFollowup.control_parameter} 
                                        onChange={e => setNewFollowup(prev => ({ ...prev, control_parameter: e.target.value }))} 
                                        placeholder="Ex: Brilho, Secagem..." 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas Iniciais</label>
                                <textarea 
                                    required 
                                    disabled={loading}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none transition-all h-24 resize-none disabled:opacity-50" 
                                    value={newFollowup.notes} 
                                    onChange={e => setNewFollowup(prev => ({ ...prev, notes: e.target.value }))} 
                                    placeholder="Detalhamento do monitoramento..." 
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={16} /> : "INICIAR MONITORAMENTO"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Detalhes */}
            {selectedFollowup && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Cabeçalho único unificado */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20"><History size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Dossiê {selectedFollowup.followup_number ? `#${selectedFollowup.followup_number}` : ''}</h2>
                                    <div className="flex items-center gap-2">
                                        {getStabilityBadge(selectedFollowup.stability_status)}
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${getPriorityStyle(selectedFollowup.priority)}`}>PRIORIDADE {selectedFollowup.priority || 'MEDIA'}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedFollowup(null)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        {/* Painéis lado a lado */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Left Side: Info & Checklist */}
                        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-100">

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-[#fafafa]">
                                {/* Header Info */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={12} /> Cliente</label>
                                        <p className="text-sm font-black text-indigo-600 uppercase break-words">{selectedFollowup.client_name}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 justify-end"><Activity size={12} /> Ciclo de Revisão</label>
                                        <select
                                            className="text-sm font-bold text-slate-600 bg-transparent border-none outline-none focus:ring-0 p-0 text-right cursor-pointer"
                                            value={selectedFollowup.review_cycle || 'MENSAL'}
                                            onChange={(e) => handleUpdateField(selectedFollowup.id, 'review_cycle', e.target.value)}
                                        >
                                            <option value="SEMANAL">SEMANAL</option>
                                            <option value="MENSAL">MENSAL</option>
                                            <option value="TRIMESTRAL">TRIMESTRAL</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Status do Monitoramento</label>
                                    <div className="flex gap-2">
                                        {['EM OBSERVAÇÃO', 'ESTABILIZADO', 'REQUER AÇÃO'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => handleUpdateField(selectedFollowup.id, 'stability_status', status)}
                                                className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${selectedFollowup.stability_status === status ? (status === 'ESTABILIZADO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : status === 'REQUER AÇÃO' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-amber-50 border-amber-500 text-amber-700') : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Checklist */}
                                <div className="space-y-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14} className="text-brand-500" /> Checklist de Monitoramento</label>
                                        <span className="text-[10px] font-black text-slate-300">{(selectedFollowup.checklist || []).filter(i => i.completed).length}/{(selectedFollowup.checklist || []).length}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Adicionar item ao checklist..."
                                            className="flex-1 bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border border-slate-50 focus:ring-2 focus:ring-brand-500"
                                            value={checkItemText}
                                            onChange={e => setCheckItemText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addCheckItem()}
                                        />
                                        <button onClick={addCheckItem} className="p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all"><Plus size={18} /></button>
                                    </div>
                                    <div className="space-y-2">
                                        {(selectedFollowup.checklist || []).map(item => (
                                            <div key={item.id} className="group flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-all">
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleCheckItem(item.id)}>
                                                    {item.completed ? <CheckCircle className="text-emerald-500" size={18} /> : <Square className="text-slate-300" size={18} />}
                                                    <span className={`text-xs font-bold ${item.completed ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{item.text}</span>
                                                </div>
                                                <button onClick={() => removeCheckItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={14} /> Observação Técnica Base</label>
                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{selectedFollowup.title}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium mb-4">{selectedFollowup.notes || "Sem notas iniciais."}</p>
                                        <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-brand-400 uppercase">Objetivo Operacional</span>
                                            <p className="text-[10px] font-bold text-brand-700">{selectedFollowup.monitoring_objective || "Não definido."}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                        {(selectedFollowup.users?.username || 'S')[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Responsável</span>
                                        <span className="text-[10px] font-bold text-slate-600">{selectedFollowup.users?.username || 'Sistema'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onOpenJourneyReport('FOLLOWUP', selectedFollowup)}
                                        className="h-9 px-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <History size={14} /> Relatório
                                    </button>
                                    {!selectedFollowup.converted_task_id && (
                                        <button onClick={(e) => { convertToTask(e, selectedFollowup); setSelectedFollowup(null); }} className="h-9 px-4 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-200">
                                            <Zap size={10} /> Gerar Tarefa
                                        </button>
                                    )}
                                    <button onClick={(e) => handleDelete(e, selectedFollowup.id)} className="h-9 w-9 flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Timeline */}
                        <div className="w-full md:w-[400px] flex flex-col bg-slate-50/50">
                            <div className="px-8 py-4 border-b border-slate-100 flex items-center bg-white">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14} /> Interações (Timeline)</label>
                            </div>

                            <div className="p-6 flex flex-col gap-4">
                                <textarea
                                    className="w-full p-4 bg-white rounded-2xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500 h-24 resize-none transition-all placeholder:text-slate-300"
                                    placeholder="Descreva a nova interação ou observação técnica..."
                                    value={interactionText}
                                    onChange={e => setInteractionText(e.target.value)}
                                />
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: 'LIGAÇÃO', type: 'LIGAÇÃO', icon: <Phone size={12} />, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                                        { label: 'E-MAIL', type: 'E-MAIL', icon: <Mail size={12} />, color: 'text-orange-600 bg-orange-50 border-orange-100' },
                                        { label: 'WHATSAPP', type: 'WHATSAPP', icon: <MessageCircle size={12} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                                        { label: 'REUNIÃO', type: 'REUNIÃO', icon: <Users size={12} />, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                                        { label: 'NOTA', type: 'NOTA', icon: <StickyNote size={12} />, color: 'text-slate-600 bg-slate-100 border-slate-200' },
                                        { label: 'ACORDO', type: 'ACORDO', icon: <Briefcase size={12} />, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                                    ].map(btn => (
                                        <button
                                            key={btn.type}
                                            onClick={() => addInteraction(btn.type)}
                                            className={`px-3 py-2 rounded-lg text-[8px] font-black border flex items-center gap-2 transition-all active:scale-95 ${btn.color}`}
                                        >
                                            {btn.icon} {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar space-y-6">
                                {(selectedFollowup.timeline || []).map((entry, idx) => (
                                    <div key={idx} className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 last:before:hidden">
                                        <div className="absolute left-0 top-1 p-1 bg-white border-2 border-slate-200 rounded-full text-slate-400 z-10">
                                            {getInteractionIcon(entry.type)}
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${entry.type === 'ACORDO' ? 'text-rose-600' : 'text-slate-400'}`}>{entry.type}</span>
                                                <span className="text-[8px] font-bold text-slate-300">{new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">{entry.text}</p>
                                            <div className="flex items-center gap-2 pt-1">
                                                <div className="w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center text-[7px] font-black text-slate-300 border border-slate-100">{entry.user?.[0]}</div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{entry.user}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!selectedFollowup.timeline || selectedFollowup.timeline.length === 0) && (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-20">
                                        <MessageSquare size={32} className="text-slate-400 mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nenhuma interação<br />registrada até o momento</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>{/* fim dos painéis */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowupsView;
