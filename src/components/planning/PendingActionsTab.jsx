import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Clock, CheckCircle2, Search, Filter,
    CheckSquare, Plus, Trash2, Layers, X,
    Calendar, Link2, ClipboardList, ChevronDown, ChevronUp, ExternalLink, Building2, ArrowUpCircle, Tag, RefreshCw,
    ArrowRight, ArrowLeft, Play, Check, AlertCircle, FlaskConical, Edit2
} from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { usePendingActionsData } from '../../hooks/usePendingActionsData';
import AutocompleteInput from '../controls/AutocompleteInput';

const STATUS_OPTIONS_PENDING = [
    { id: 'PENDENTE', label: 'A FAZER', color: 'bg-amber-400', ghost: 'bg-amber-50' },
    { id: 'EM ANDAMENTO', label: 'FAZENDO', color: 'bg-indigo-400', ghost: 'bg-indigo-50' },
    { id: 'CONCLUÍDO', label: 'FEITO', color: 'bg-emerald-400', ghost: 'bg-emerald-50' }
];

const PRIORITY_COLORS = {
    'CRÍTICA': { bg: 'bg-rose-50/50', border: 'border-rose-200', bar: 'bg-rose-500', text: 'text-rose-600' },
    'ALTA': { bg: 'bg-orange-50/50', border: 'border-orange-200', bar: 'bg-orange-500', text: 'text-orange-600' },
    'MÉDIA': { bg: 'bg-amber-50/50', border: 'border-amber-200', bar: 'bg-amber-500', text: 'text-amber-600' },
    'BAIXA': { bg: 'bg-slate-50/50', border: 'border-slate-200', bar: 'bg-slate-400', text: 'text-slate-500' }
};

const PendingActionsTab = ({ 
    currentUser, 
    allClients = [],
    onNewTask, 
    onEditTask, 
    onTaskCreated, 
    tasks = [], 
    categories = [], 
    notifySuccess, 
    notifyError 
}) => {
    const isMobile = useIsMobile();
    const { 
        actions, 
        setActions, 
        loading, 
        fetchActions, 
        handleToggleStatus, 
        handleUpdateStatus,
        handleDelete 
    } = usePendingActionsData(currentUser);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});

    // Migration modal state
    const [migratingAction, setMigratingAction] = useState(null);
    const [migrationCategory, setMigrationCategory] = useState('');
    const [migrationNote, setMigrationNote] = useState('');

    // Inline form state
    const [inlineForm, setInlineForm] = useState({});

    // Modal form state
    const [formDescription, setFormDescription] = useState('');
    const [formDeadline, setFormDeadline] = useState('');
    const [formLinkedTaskId, setFormLinkedTaskId] = useState('');
    const [formClient, setFormClient] = useState('');
    const [formPriority, setFormPriority] = useState('MÉDIA');
    const [formStatus, setFormStatus] = useState('PENDENTE');
    const [editingAction, setEditingAction] = useState(null);
    const [formSaving, setFormSaving] = useState(false);
    const [taskSearch, setTaskSearch] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const clientOptions = useMemo(() => {
        return allClients.map(c => ({
            id: c.id,
            label: c.name?.toUpperCase() || ''
        }));
    }, [allClients]);

    const getInlineForm = (key) => inlineForm[key] || { what: '', who: '', when: '', priority: 'MÉDIA', saving: false };
    const setInlineField = (key, field, value) => setInlineForm(prev => ({
        ...prev,
        [key]: { ...getInlineForm(key), [field]: value }
    }));
    const clearInlineForm = (key) => setInlineForm(prev => ({ ...prev, [key]: { what: '', who: '', when: '', saving: false } }));

    const syncStatusToReport = async (action, newStatus) => {
        if (!action.linked_task_id) return;
        try {
            const whatPart = action.description.split(' | ')[0];
            const { data: reports } = await supabase
                .from('task_reports')
                .select('id, manual_actions')
                .eq('task_id', action.linked_task_id)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (!reports || reports.length === 0) return;
            const report = reports[0];
            const manualActions = Array.isArray(report.manual_actions) ? report.manual_actions : [];
            const updated = manualActions.map(ma => (ma.what === whatPart ? { ...ma, completed: newStatus === 'CONCLUÍDO' } : ma));
            await supabase.from('task_reports').update({ manual_actions: updated, updated_at: new Date().toISOString() }).eq('id', report.id);
        } catch (err) { console.error('Sync error:', err); }
    };

    const onToggle = async (action) => {
        const result = await handleToggleStatus(action);
        if (result) await syncStatusToReport(action, result);
    };

    const addActionToGroup = async (groupKey, passedTaskId = null, passedClientName = null) => {
        const form = getInlineForm(groupKey);
        if (!form.what.trim()) return;
        setInlineField(groupKey, 'saving', true);
        try {
            const description = [form.what.trim(), form.who.trim() ? `Resp: ${form.who.trim()}` : null, form.when.trim() ? `Prazo: ${form.when.trim()}` : null].filter(Boolean).join(' | ');
            const payload = { 
                description, 
                status: 'PENDENTE', 
                linked_task_id: passedTaskId, 
                client_name: passedClientName,
                priority: form.priority || 'MÉDIA',
                user_id: currentUser?.id 
            };
            const { data: newRow, error } = await supabase.from('visit_pending_actions').insert(payload).select().single();
            if (error) throw error;
            setActions(prev => [newRow, ...prev]);
            clearInlineForm(groupKey);
        } catch (err) { notifyError('Erro ao adicionar', err.message); }
    };

    const handleOpenModal = (action = null) => {
        if (action) {
            setEditingAction(action);
            setFormDescription(action.description || '');
            setFormDeadline(action.deadline || '');
            setFormLinkedTaskId(action.linked_task_id || '');
            setFormClient(action.client_name || '');
            setFormPriority(action.priority || 'MÉDIA');
            setFormStatus(action.status || 'PENDENTE');
        } else {
            setEditingAction(null);
            setFormDescription('');
            setFormDeadline('');
            setFormLinkedTaskId('');
            setFormClient('');
            setFormPriority('MÉDIA');
            setFormStatus('PENDENTE');
        }
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!formDescription.trim()) return;
        setFormSaving(true);
        try {
            const payload = { 
                description: formDescription.trim(), 
                status: formStatus, 
                user_id: currentUser.id, 
                deadline: formDeadline || null, 
                linked_task_id: formLinkedTaskId || null, 
                client_name: formClient || null, 
                priority: formPriority,
                updated_at: new Date().toISOString()
            };

            if (editingAction) {
                const { error } = await supabase
                    .from('visit_pending_actions')
                    .update(payload)
                    .eq('id', editingAction.id);
                if (error) throw error;
                notifySuccess('Sucesso!', 'Pendência atualizada!');
            } else {
                const { error } = await supabase
                    .from('visit_pending_actions')
                    .insert(payload);
                if (error) throw error;
                notifySuccess('Sucesso!', 'Pendência criada!');
            }
            
            setShowAddModal(false);
            fetchActions();
        } catch (error) { notifyError('Erro ao salvar', error.message); }
        finally { setFormSaving(false); }
    };

    const openMigrateModal = (action) => {
        setMigratingAction(action);
        setMigrationCategory(categories[0]?.id || 'Visitas');
        setMigrationNote('');
    };

    const migrateToTask = async () => {
        if (!migratingAction) return;
        const taskPayload = {
            client: migratingAction.client_name,
            title: migratingAction.description.split(' | ')[0],
            description: [`Migrada de: Pendências de Visitas`, migrationNote ? `Observação: ${migrationNote}` : null, migratingAction.description].filter(Boolean).join('\n'),
            category: migrationCategory,
            status: 'TO_START',
            parent_action_id: migratingAction.id
        };
        if (onNewTask) {
            onNewTask(migratingAction.client_name || '', taskPayload);
            setMigratingAction(null);
            notifySuccess("Migração Iniciada", "Abrindo modal de tarefa...");
        }
    };

    const filteredTasksForLink = useMemo(() => {
        const term = taskSearch.toLowerCase();
        return tasks.filter(t => t.title?.toLowerCase().includes(term) || t.client?.toLowerCase().includes(term)).slice(0, 10);
    }, [tasks, taskSearch]);

    const filteredActions = actions.filter(a => (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) && (statusFilter === 'ALL' || a.status === statusFilter));
    const totalPending = actions.filter(a => a.status === 'PENDENTE').length;
    const totalInProgress = actions.filter(a => a.status === 'EM ANDAMENTO').length;
    const totalDone = actions.filter(a => a.status === 'CONCLUÍDO').length;

    return (
        <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-auto custom-scrollbar relative`}>
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h2 className="text-base md:text-xl font-black text-slate-800 flex items-center gap-2">
                        <CheckSquare className="text-emerald-600 w-5 h-5" />
                        Ações Pendentes
                    </h2>
                    <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">Acompanhamento pós-visita técnica</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 shadow-md active:scale-95 transition-all">
                    <Plus size={14} /> Nova Pendência
                </button>
            </div>

            {/* Stats Compact */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center gap-2 shadow-sm transition-all hover:border-amber-200">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0"><Clock size={16} className="text-amber-500" /></div>
                    <div><p className="text-lg font-black text-slate-800 leading-none">{totalPending}</p><p className="text-[8px] font-black text-slate-400 uppercase">A Fazer</p></div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center gap-2 shadow-sm transition-all hover:border-indigo-200">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0"><RefreshCw size={16} className="text-indigo-600 animate-spin" /></div>
                    <div><p className="text-lg font-black text-slate-800 leading-none">{totalInProgress}</p><p className="text-[8px] font-black text-slate-400 uppercase">Fazendo</p></div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center gap-2 shadow-sm transition-all hover:border-emerald-200">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0"><CheckCircle2 size={16} className="text-emerald-500" /></div>
                    <div><p className="text-lg font-black text-slate-800 leading-none">{totalDone}</p><p className="text-[8px] font-black text-slate-400 uppercase">Feito</p></div>
                </div>
            </div>

            {/* Filters Compact */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar pendência..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 font-bold transition-all text-xs" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-40 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                    <option value="ALL">STATUS</option>
                    <option value="PENDENTE">A FAZER</option>
                    <option value="EM ANDAMENTO">FAZENDO</option>
                    <option value="CONCLUÍDO">FEITO</option>
                </select>
            </div>

            {/* Content Container */}
            {/* Kanban Board */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
                ) : (
                    STATUS_OPTIONS_PENDING.map(({ id: status, label, color, ghost }) => (
                        <div key={status} className={`flex-1 flex flex-col min-w-[300px] h-full ${isMobile && statusFilter !== 'ALL' && statusFilter !== status ? 'hidden' : ''}`}>
                            {/* Column Header */}
                            <div className="flex items-center justify-between mb-4 bg-white/50 p-3 rounded-2xl border border-slate-100/50">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
                                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</h3>
                                    <span className="bg-slate-100 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                        {actions.filter(a => a.status === status).length}
                                    </span>
                                </div>
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-10">
                                {actions.filter(a => 
                                    a.status === status && 
                                    (a.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                                ).length === 0 ? (
                                    <div className={`p-10 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-2 ${ghost}`}>
                                        <AlertCircle size={24} className="text-slate-200" />
                                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">Sem tarefas aqui</p>
                                    </div>
                                ) : (
                                    actions.filter(a => 
                                        a.status === status && 
                                        (a.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map(action => {
                                        const prio = action.priority || 'MÉDIA';
                                        const styles = PRIORITY_COLORS[prio] || PRIORITY_COLORS['MÉDIA'];

                                        return (
                                            <div key={action.id} className={`bg-white rounded-[24px] border-2 ${styles.border} ${styles.bg} p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2`}>
                                                {/* Top highlight bar */}
                                                <div className={`absolute top-0 left-0 right-0 h-1.5 ${styles.bar}`} />
                                                
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex flex-col gap-1">
                                                        <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase w-fit ${
                                                            prio === 'CRÍTICA' ? 'bg-rose-100 text-rose-700' :
                                                            prio === 'ALTA' ? 'bg-orange-100 text-orange-700' :
                                                            prio === 'MÉDIA' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {prio}
                                                        </div>
                                                        {(action.client_name || action.linked_task_id) && (
                                                            <div className="flex items-center gap-1 text-[8px] font-black text-brand-600 uppercase truncate max-w-[150px]">
                                                                <Building2 size={10} className="shrink-0" />
                                                                {action.client_name || tasks.find(t => t.id === action.linked_task_id)?.client || 'PENDÊNCIA'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleOpenModal(action)} title="Editar" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={13} /></button>
                                                        <button onClick={() => openMigrateModal(action)} title="Migrar para Tarefa" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><ArrowUpCircle size={13} /></button>
                                                        <button onClick={() => handleDelete(action.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={13} /></button>
                                                    </div>
                                                </div>

                                                <p className="text-sm font-black text-slate-700 leading-tight mb-3">
                                                    {action.description}
                                                </p>

                                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-1">
                                                            <Calendar size={10} /> {action.deadline ? new Date(action.deadline + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {status === 'PENDENTE' && (
                                                            <button onClick={() => handleUpdateStatus(action.id, 'EM ANDAMENTO')} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><ArrowRight size={14} /></button>
                                                        )}
                                                        {status === 'EM ANDAMENTO' && (
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleUpdateStatus(action.id, 'PENDENTE')} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"><ArrowLeft size={14} /></button>
                                                                <button onClick={() => handleUpdateStatus(action.id, 'CONCLUÍDO')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Check size={14} /></button>
                                                            </div>
                                                        )}
                                                        {status === 'CONCLUÍDO' && (
                                                            <button onClick={() => handleUpdateStatus(action.id, 'EM ANDAMENTO')} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><ArrowLeft size={14} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="absolute inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden animate-in zoom-in-95 p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                    {editingAction ? 'Editar Pendência' : 'Nova Pendência'}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {editingAction ? 'Atualizar registro' : 'Registrar acompanhamento'}
                                </p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                            <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Descrição da atividade..." className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 resize-none" autoFocus />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 md:col-span-2">
                                    <AutocompleteInput 
                                        label="Cliente (Opcional)"
                                        icon={Building2}
                                        placeholder="BUSCAR CLIENTE..."
                                        options={clientOptions}
                                        value={formClient}
                                        onChange={(val) => setFormClient(val)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-indigo-500">Status do Fluxo</label>
                                    <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer">
                                        <option value="PENDENTE">A FAZER</option>
                                        <option value="EM ANDAMENTO">FAZENDO</option>
                                        <option value="CONCLUÍDO">FEITO</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo</label>
                                    <input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-red-500">Urgência / Prioridade</label>
                                    <select value={formPriority} onChange={e => setFormPriority(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-400 transition-all cursor-pointer">
                                        <option value="BAIXA">BAIXA</option>
                                        <option value="MÉDIA">MÉDIA</option>
                                        <option value="ALTA">ALTA</option>
                                        <option value="CRÍTICA">CRÍTICA</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-400 text-[10px] font-black uppercase rounded-2xl">Cancelar</button>
                            <button onClick={handleSave} disabled={!formDescription.trim() || formSaving} className="flex-[2] py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
                                {formSaving ? <RefreshCw className="animate-spin" size={14} /> : (editingAction ? <CheckSquare size={14} /> : <Plus size={14} />)} 
                                {editingAction ? 'Salvar Alterações' : 'Criar Pendência'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Migrate Modal */}
            {migratingAction && (
                <div className="absolute inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4"><ArrowUpCircle size={32} /></div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Migrar para Kanban?</h3>
                        <p className="text-xs text-slate-500 mb-6">Criar tarefa no Kanban para <span className="font-bold">{migratingAction.client_name || 'este cliente'}</span></p>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => migrateToTask()} className="w-full py-3 bg-violet-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg hover:bg-violet-700 transition-all">Sim, Criar Tarefa</button>
                            <button onClick={() => setMigratingAction(null)} className="w-full py-3 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingActionsTab;
