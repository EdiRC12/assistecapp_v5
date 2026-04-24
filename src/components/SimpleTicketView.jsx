import React, { useState, useEffect, useMemo } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { generateUUID } from '../utils/helpers';
import { supabase } from '../supabaseClient';
import {
    Phone, Mail, MessageCircle, Building2, FileText, Users,
    Plus, Search, X, AlertCircle, Clock, CheckCircle2,
    ArrowUpRight, Trash2, Edit2, Calendar, MapPin, User,
    ChevronRight, Send, AlertTriangle, Check, History, CheckSquare, BarChart3
} from 'lucide-react';

const RI_STATUS = {
    ABERTO: { label: 'Aberto', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: AlertCircle },
    EM_ANALISE: { label: 'Em Análise', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Clock },
    RESOLVIDO: { label: 'Resolvido', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2 },
    CANCELADO: { label: 'Cancelado', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100', icon: X },
    MIGRADO_OT: { label: 'Migrado p/ OT', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: ArrowUpRight },
};

const RI_PRIORITY = {
    BAIXA: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
    MEDIA: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
    ALTA: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
    CRITICA: { label: 'Crítica', color: 'bg-red-100 text-red-600' },
};

const TIMELINE_TYPES = {
    CALL: { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ligação' },
    EMAIL: { icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50', label: 'E-mail' },
    WHATSAPP: { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'WhatsApp' },
    MEETING: { icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Reunião' },
    NOTE: { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Nota' },
    AGREEMENT: { icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Acordo' },
};

const INITIAL_RI_STATE = {
    client_name: '',
    report_date: new Date().toISOString().split('T')[0],
    city: '',
    external_id: '',
    subject: '',
    description: '',
    status: 'ABERTO',
    priority: 'MEDIA',
    timeline: [],
    checklist: [],
    converted_to_ot_id: null,
};

const SimpleTicketView = ({ currentUser, allClients = [], onNewTask, onMigrateToOT, onOpenJourneyReport, notifySuccess, notifyError, notifyWarning }) => {
    const isMobile = useIsMobile();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newRI, setNewRI] = useState(INITIAL_RI_STATE);
    const [newTimelineText, setNewTimelineText] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const years = [2024, 2025, 2026];

    const handleGenerateManagementReport = async () => {
        if (filteredTickets.length === 0) {
            notifyWarning?.('Sem registros', 'Não há registros filtrados para gerar o fechamento.');
            return;
        }

        if (!window.confirm(`Deseja gerar o Relatório de Gestão para ${filteredTickets.length} registros de RI em ${months[selectedMonth - 1]} ${selectedYear}?`)) return;

        try {
            const period = `${months[selectedMonth - 1]} ${selectedYear}`;
            const payload = {
                type: 'MGMT_RI',
                title: `FECHAMENTO RI - ${period}`,
                period: period,
                totals: { count: filteredTickets.length },
                raw_data: filteredTickets.map(t => ({
                    Data: t.report_date ? new Date(t.report_date + 'T12:00:00').toLocaleDateString('pt-BR') : '---',
                    RI: t.appointment_number,
                    Cliente: t.client_name,
                    Assunto: t.subject,
                    Status: RI_STATUS[t.status]?.label || t.status,
                    Prioridade: RI_PRIORITY[t.priority]?.label || t.priority
                })),
                raw_data_count: filteredTickets.length,
                user_id: currentUser?.id
            };

            const { error } = await supabase.from('saved_reports').insert([payload]);
            if (error) throw error;
            notifySuccess?.('Sucesso', 'Fechamento de Gestão (RI) salvo na Central.');
        } catch (error) {
            console.error('Error generating MGMT report:', error);
            notifyError?.('Erro ao gerar fechamento', error.message);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('simple_tickets')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            console.error('Erro ao buscar RIs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            console.log('[SimpleTicketView] Iniciando salvamento...', { newRI, currentUser });
            
            if (!currentUser?.id) {
                throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
            }

            const payload = { 
                ...newRI, 
                user_id: currentUser.id, 
                updated_at: new Date().toISOString() 
            };

            // Limpeza de campos que podem não existir no banco de dados (schema simple_tickets)
            delete payload.id;
            delete payload.created_at;
            delete payload.converted_to_ot_id;
            delete payload.converted_to_task_id;
            delete payload.checklist; // Caso não exista a coluna JSONB para checklist
            delete payload.is_test;
            delete payload.active;

            if (!isEditing) {
                console.log('[SimpleTicketView] Gerando número de RI manual...');
                // Fallback robusto: busca o último número direto na tabela
                const { data: lastRi, error: lastRiErr } = await supabase
                    .from('simple_tickets')
                    .select('appointment_number')
                    .order('appointment_number', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (lastRiErr) {
                    console.error('[SimpleTicketView] Erro ao buscar último RI:', lastRiErr);
                    // Não trava o salvamento, tenta usar o timestamp ou apenas 1
                }

                const nextNum = lastRi?.appointment_number ? parseInt(lastRi.appointment_number) + 1 : 1;
                payload.appointment_number = nextNum;
                
                console.log('[SimpleTicketView] Inserindo em simple_tickets:', payload);
                const { error } = await supabase.from('simple_tickets').insert([payload]);
                if (error) throw error;
                if (notifySuccess) notifySuccess('Sucesso', 'Registro de Interação criado.');
            } else {
                console.log('[SimpleTicketView] Atualizando simple_tickets:', selectedTicket.id);
                const { error } = await supabase.from('simple_tickets').update(payload).eq('id', selectedTicket.id);
                if (error) throw error;
                if (notifySuccess) notifySuccess('Sucesso', 'Registro atualizado.');
            }

            setShowModal(false);
            setNewRI(INITIAL_RI_STATE);
            setIsEditing(false);
            fetchTickets();
        } catch (err) {
            console.error('[SimpleTicketView] Catch Error:', err);
            notifyError('Erro ao salvar RI', err.message || 'Erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!selectedTicket) return;
        const confirmMsg = newStatus === 'RESOLVIDO'
            ? 'Deseja finalizar este atendimento?'
            : 'Deseja reabrir este atendimento?';

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('simple_tickets')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedTicket.id);

            if (error) throw error;

            // Log de histórico automático na timeline
            const timelineItem = {
                id: generateUUID(),
                date: new Date().toISOString(),
                user: currentUser.username,
                type: 'NOTE',
                text: `Status alterado para: ${RI_STATUS[newStatus].label}`,
            };

            await supabase
                .from('simple_tickets')
                .update({
                    timeline: [timelineItem, ...(selectedTicket.timeline || [])]
                })
                .eq('id', selectedTicket.id);

            setShowModal(false);
            fetchTickets();
        } catch (err) {
            console.error('Status update error:', err);
            notifyError('Erro ao atualizar status', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        // Verifica se há relatório vinculado antes de confirmar
        const { data: linkedReport } = await supabase
            .from('task_reports')
            .select('id, title')
            .eq('sac_id', id)
            .maybeSingle();

        const confirmMsg = linkedReport
            ? `Excluir este Registro de Interação?\n\n⚠️ ATENÇÃO: Existe um relatório vinculado ("${linkedReport.title || 'Relatório sem título'}") que também será excluído permanentemente.`
            : 'Excluir este Registro de Interação?';

        if (!window.confirm(confirmMsg)) return;

        // Excluir o relatório vinculado primeiro (se existir)
        if (linkedReport) {
            await supabase.from('task_reports').delete().eq('id', linkedReport.id);
        }

        const { error } = await supabase.from('simple_tickets').delete().eq('id', id);
        if (error) { notifyError('Erro ao excluir', error.message); return; }

        if (linkedReport) {
            notifySuccess('Excluído!', 'Registro de Interação e relatório vinculado removidos.');
        } else {
            notifySuccess('Excluído!', 'Registro de Interação removido com sucesso.');
        }
        fetchTickets();
    };

    const handleMigrateToOT = async () => {
        if (!selectedTicket) return;
        if (!window.confirm('Deseja migrar este RI para uma Ocorrência Técnica (OT)? O RI será marcado como MIGRADO.')) return;
        setIsMigrating(true);
        try {
            // Call parent handler which opens SacView pre-filled
            if (onMigrateToOT) {
                await onMigrateToOT(selectedTicket);
            }
            // Mark RI as migrated
            await supabase.from('simple_tickets').update({ status: 'MIGRADO_OT', updated_at: new Date().toISOString() }).eq('id', selectedTicket.id);
            setShowModal(false);
            fetchTickets();
        } catch (err) {
            console.error('Migration error:', err);
            notifyError('Erro ao migrar', err.message);
        } finally {
            setIsMigrating(false);
        }
    };

    const addTimelineItem = (type) => {
        if (!newTimelineText.trim()) return;
        const item = {
            id: generateUUID(),
            date: new Date().toISOString(),
            user: currentUser.username,
            type,
            text: newTimelineText.trim(),
        };
        setNewRI(prev => ({ ...prev, timeline: [item, ...(prev.timeline || [])] }));
        setNewTimelineText('');
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const item = { id: generateUUID(), text: newChecklistItem.trim(), completed: false, date: new Date().toISOString() };
        setNewRI(prev => ({ ...prev, checklist: [...(prev.checklist || []), item] }));
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id) => {
        setNewRI(prev => ({
            ...prev,
            checklist: (prev.checklist || []).map(item =>
                item.id === id ? { ...item, completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null } : item
            )
        }));
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const search = searchTerm.toLowerCase();
            const client = clientFilter.toLowerCase();

            const matchesSearch =
                (t.appointment_number?.toString() || '').includes(search) ||
                (t.subject || '').toLowerCase().includes(search) ||
                (t.description || '').toLowerCase().includes(search);

            const matchesClient = !clientFilter || (t.client_name || '').toLowerCase().includes(client);
            const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

            let matchesDate = true;
            if (t.report_date) {
                const d = new Date(t.report_date + 'T12:00:00');
                const matchesMonth = selectedMonth === 'ALL' || (d.getMonth() + 1) === parseInt(selectedMonth);
                const matchesYear = selectedYear === 'ALL' || d.getFullYear() === parseInt(selectedYear);
                matchesDate = matchesMonth && matchesYear;
            } else {
                matchesDate = selectedMonth === 'ALL' && selectedYear === 'ALL';
            }

            return matchesSearch && matchesClient && matchesStatus && matchesDate;
        });
    }, [tickets, searchTerm, clientFilter, statusFilter, selectedMonth, selectedYear]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 p-4 md:p-6 animate-fade">
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center ${isMobile ? 'gap-2 mb-4' : 'gap-4 mb-8'}`}>
                <div>
                    <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black text-slate-800 flex items-center gap-2 md:gap-3`}>
                        <Phone className="text-sky-600" size={isMobile ? 20 : 28} />
                        {isMobile ? 'Registros de Interação' : 'Registro de Interação (RI)'}
                    </h1>
                    <p className={`${isMobile ? 'text-[9px]' : 'text-sm'} text-slate-400 font-bold uppercase tracking-widest mt-0.5 md:mt-1`}>{isMobile ? 'Triagem de Atendimento' : 'Atendimentos Rápidos e Triagem'}</p>
                </div>
                <div className="flex items-center gap-2">
                    {!isMobile && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm mr-2">
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
                        className={`${isMobile ? 'hidden' : 'px-6 py-3 text-[10px]'} bg-slate-100 text-slate-800 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-95 shadow-sm text-sky-600 mr-2`}
                        title="Gerar Relatório de Gestão (Snapshot)"
                    >
                        <BarChart3 size={16} /> <span className="hidden md:inline text-slate-800">Gerar Fechamento</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setNewRI(INITIAL_RI_STATE);
                            setShowModal(true);
                        }}
                        className={`${isMobile ? 'w-full py-2.5 text-[9px]' : 'px-6 py-3 text-[10px]'} bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95`}
                    >
                        <Plus size={isMobile ? 14 : 18} /> Novo Atendimento
                    </button>
                </div>
            </div>

            {/* Filters Bar (Cascading Logic Style) */}
            <div className={`bg-white ${isMobile ? 'p-2 rounded-2xl gap-2 mb-4' : 'p-4 rounded-3xl gap-4 mb-6'} border border-slate-200 shadow-sm flex flex-wrap items-center`}>
                <div className="relative min-w-[140px] flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400`} size={isMobile ? 14 : 18} />
                    <input
                        type="text"
                        placeholder={isMobile ? "Assunto..." : "Buscar por Assunto..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full ${isMobile ? 'pl-9 py-1.5 text-[10px]' : 'pl-12 py-2 text-sm'} bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold transition-all`}
                    />
                </div>

                <div className={`relative ${isMobile ? 'min-w-[120px]' : 'min-w-[200px]'} flex-1`}>
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400`} size={isMobile ? 14 : 18} />
                    <input
                        type="text"
                        placeholder={isMobile ? "Cliente..." : "Filtrar por Cliente..."}
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className={`w-full ${isMobile ? 'pl-9 py-1.5 text-[10px]' : 'pl-12 py-2 text-sm'} bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold transition-all`}
                    />
                </div>

                <div className={`relative ${isMobile ? 'w-full' : 'min-w-[160px]'}`}>
                    <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400`} size={isMobile ? 14 : 18} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`w-full ${isMobile ? 'pl-9 py-1.5 text-[10px]' : 'pl-12 py-2 text-sm'} bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold appearance-none cursor-pointer transition-all`}
                    >
                        <option value="ALL">Status</option>
                        {Object.entries(RI_STATUS).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
                        <span className="text-slate-400 font-bold text-sm">Carregando registros...</span>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-slate-200 border-dashed py-20 flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-sky-200">
                            <MessageCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-slate-600 font-black text-lg">Nenhum RI encontrado</h3>
                            <p className="text-slate-400 text-sm">Crie um novo Registro de Interação para começar.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTickets.map(ticket => {
                            const status = RI_STATUS[ticket.status] || RI_STATUS.ABERTO;
                            const priority = RI_PRIORITY[ticket.priority] || RI_PRIORITY.MEDIA;
                            return (
                                <div
                                    key={ticket.id}
                                    onClick={() => { setSelectedTicket(ticket); setNewRI({ ...INITIAL_RI_STATE, ...ticket }); setIsEditing(true); setShowModal(true); }}
                                    className="bg-white rounded-[28px] border border-slate-200 p-6 hover:shadow-xl transition-all cursor-pointer group shadow-sm flex flex-col gap-3 relative"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">{ticket.appointment_number || 'RI sem número'}</span>
                                            <h3 className="text-lg font-black text-slate-800 mt-0.5 leading-tight">{ticket.client_name || 'Cliente não informado'}</h3>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-lg ${status.bg} ${status.color} flex items-center gap-1.5`}>
                                            <status.icon size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-tight">{status.label}</span>
                                        </div>
                                    </div>

                                    {ticket.subject && (
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-500 text-xs line-clamp-2">
                                            {ticket.subject}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 items-center">
                                        {ticket.city && (
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                                <MapPin size={11} />{ticket.city}
                                            </span>
                                        )}
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${priority.color}`}>
                                            {priority.label}
                                        </span>
                                        {ticket.timeline?.length > 0 && (
                                            <span className="text-[9px] font-black text-slate-400">
                                                {ticket.timeline.length} interaç{ticket.timeline.length === 1 ? 'ão' : 'ões'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                                            <Calendar size={11} />
                                            {ticket.report_date ? new Date(ticket.report_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                                        </span>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(ticket.id); }}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-fade">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden animate-slide">
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-100">
                                    <MessageCircle size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-black text-slate-800">Registro de Interação</h2>
                                        <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-widest uppercase">
                                            {isEditing ? newRI.appointment_number : 'NOVO RI'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Atendimento Rápido — Nível 1</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Client, Date, City */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1 space-y-2 relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <User size={12} className="text-sky-500" /> Cliente *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Nome do cliente..."
                                        value={newRI.client_name}
                                        onChange={e => { setNewRI({ ...newRI, client_name: e.target.value }); setShowClientSuggestions(true); }}
                                        onFocus={() => setShowClientSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-slate-700 transition-all"
                                    />
                                    {showClientSuggestions && newRI.client_name && (() => {
                                        const search = newRI.client_name.toLowerCase().trim();
                                        const names = (allClients || []).map(c => typeof c === 'string' ? c : c?.name || c?.client_name || '').filter(Boolean);
                                        const filtered = names.filter(n => n.toLowerCase().includes(search));
                                        if (filtered.length === 1 && filtered[0].toLowerCase() === search) return null;
                                        return filtered.length > 0 ? (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-48 overflow-y-auto">
                                                {filtered.slice(0, 30).map((client, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => { setNewRI({ ...newRI, client_name: client }); setShowClientSuggestions(false); }}
                                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-all border-b border-slate-50 last:border-none flex items-center gap-2"
                                                    >
                                                        <User size={13} className="opacity-50" />{client}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={12} className="text-sky-500" /> Data
                                    </label>
                                    <input
                                        type="date"
                                        value={newRI.report_date || ''}
                                        onChange={e => setNewRI({ ...newRI, report_date: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-slate-700 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} className="text-sky-500" /> Cidade
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Cidade do cliente"
                                        value={newRI.city || ''}
                                        onChange={e => setNewRI({ ...newRI, city: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-slate-700 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Subject & External ID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assunto *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Motivo do contato..."
                                        value={newRI.subject || ''}
                                        onChange={e => setNewRI({ ...newRI, subject: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-slate-700 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Externo (Scopi)</label>
                                    <input
                                        type="text"
                                        placeholder="Referência Scopi (opcional)"
                                        value={newRI.external_id || ''}
                                        onChange={e => setNewRI({ ...newRI, external_id: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-slate-700 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                                <textarea
                                    rows={3}
                                    placeholder="Detalhes adicionais do atendimento..."
                                    value={newRI.description || ''}
                                    onChange={e => setNewRI({ ...newRI, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-slate-700 transition-all resize-none"
                                />
                            </div>

                            {/* Status & Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                                    <select
                                        value={newRI.status}
                                        onChange={e => setNewRI({ ...newRI, status: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-slate-700 transition-all"
                                    >
                                        {Object.entries(RI_STATUS).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</label>
                                    <div className="flex gap-2">
                                        {Object.entries(RI_PRIORITY).map(([key, val]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setNewRI({ ...newRI, priority: key })}
                                                className={`flex-1 py-2.5 text-[9px] font-black rounded-xl uppercase transition-all border ${newRI.priority === key ? `${val.color} border-current shadow-md` : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                            >
                                                {val.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-4 pt-6 border-t border-slate-100">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} className="text-sky-500" /> Interações (Timeline)
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Descreva a interação..."
                                        value={newTimelineText}
                                        onChange={e => setNewTimelineText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTimelineItem('NOTE'); } }}
                                        className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-sm text-slate-700 transition-all"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(TIMELINE_TYPES).map(([key, val]) => {
                                        const Icon = val.icon;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => addTimelineItem(key)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 ${val.bg} ${val.color} border-current/20`}
                                            >
                                                <Icon size={13} /> {val.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {(newRI.timeline || []).length > 0 && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {(newRI.timeline || []).map(item => {
                                            const tInfo = TIMELINE_TYPES[item.type] || TIMELINE_TYPES.NOTE;
                                            const Icon = tInfo.icon;
                                            return (
                                                <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${tInfo.bg} border-current/10`}>
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/60 ${tInfo.color}`}>
                                                        <Icon size={13} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700">{item.text}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                            {tInfo.label} · {item.user} · {new Date(item.date).toLocaleString('pt-BR')}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewRI(prev => ({ ...prev, timeline: (prev.timeline || []).filter(t => t.id !== item.id) }))}
                                                        className="text-slate-300 hover:text-rose-400 transition-colors shrink-0"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Checklist */}
                            <div className="space-y-3 pt-6 border-t border-slate-100">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Check size={14} className="text-sky-500" /> Checklist
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Adicionar item ao checklist..."
                                        value={newChecklistItem}
                                        onChange={e => setNewChecklistItem(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                                        className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-sm text-slate-700 transition-all"
                                    />
                                    <button type="button" onClick={addChecklistItem} className="w-11 h-11 bg-sky-500 text-white rounded-xl flex items-center justify-center hover:bg-sky-600 transition-all">
                                        <Plus size={18} />
                                    </button>
                                </div>
                                {(newRI.checklist || []).length > 0 && (
                                    <div className="space-y-1.5">
                                        {(newRI.checklist || []).map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <button type="button" onClick={() => toggleChecklistItem(item.id)} className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                                    {item.completed && <CheckCircle2 size={12} />}
                                                </button>
                                                <span className={`flex-1 text-sm font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                                                <button type="button" onClick={() => setNewRI(prev => ({ ...prev, checklist: (prev.checklist || []).filter(c => c.id !== item.id) }))} className="text-slate-300 hover:text-rose-400 transition-colors">
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100">
                                {isEditing && newRI.status !== 'MIGRADO_OT' && (
                                    <div className="flex gap-2 w-full mb-2">
                                        <button
                                            type="button"
                                            onClick={() => onNewTask(newRI.client_name, {
                                                title: `[RI #${newRI.appointment_number}] ${newRI.subject}`,
                                                parent_sac_id: selectedTicket.id,
                                                description: newRI.description || '',
                                            })}
                                            className="flex-1 h-11 px-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                                        >
                                            <CheckSquare size={16} /> Gerar Tarefa Kanban
                                        </button>
                                        
                                        <button
                                            type="button"
                                            onClick={handleMigrateToOT}
                                            disabled={isMigrating}
                                            className="h-11 px-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <ArrowUpRight size={14} />
                                            {isMigrating ? '...' : 'Migrar para OT'}
                                        </button>
                                    </div>
                                )}

                                {isEditing && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onOpenJourneyReport('RI', selectedTicket)}
                                            className="h-11 px-4 bg-amber-50 text-amber-600 border border-amber-100 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-amber-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <History size={16} />
                                            Relatório
                                        </button>
                                        {(newRI.status === 'RESOLVIDO' || newRI.status === 'CANCELADO') ? (
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange('ABERTO')}
                                                disabled={loading}
                                                className="h-11 px-4 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <History size={14} />
                                                Reabrir
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange('RESOLVIDO')}
                                                disabled={loading}
                                                className="h-11 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={14} />
                                                Finalizar
                                            </button>
                                        )}
                                    </>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 h-11 px-4 min-w-[140px] font-black rounded-xl text-[10px] transition-all shadow-lg active:scale-95 disabled:opacity-50 uppercase tracking-widest bg-sky-600 hover:bg-sky-700 text-white shadow-sky-100"
                                >
                                    {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleTicketView;
