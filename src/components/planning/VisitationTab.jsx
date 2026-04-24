import React, { useState, useMemo } from 'react';
import { 
    Plus, Search, Briefcase, FlaskConical, 
    MoreHorizontal, ArrowUpCircle, Trash2, 
    Edit2, Calendar, MapPin, Tag, CheckCircle2,
    Clock, RefreshCw, X, Link2, Info
} from 'lucide-react';
import { useVisitationData } from '../../hooks/useVisitationData';
import useIsMobile from '../../hooks/useIsMobile';
import { supabase } from '../../supabaseClient';
import AutocompleteInput from '../controls/AutocompleteInput';

const VisitationTab = ({ 
    currentUser, 
    allClients = [],
    techTests = [], 
    onNewTask, 
    onTaskCreated,
    notifySuccess, 
    notifyError 
}) => {
    const isMobile = useIsMobile();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    
    // Data Hook
    const { 
        visitationPlanning, 
        loading, 
        fetchData, 
        handleDelete 
    } = useVisitationData(currentUser, selectedMonth, selectedYear);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Migration Modal
    const [showMigrateModal, setShowMigrateModal] = useState(false);
    const [migratingItem, setMigratingItem] = useState(null);

    // Form State for New/Edit
    const [formState, setFormState] = useState({
        client_name: '',
        type: 'VISITA TÉCNICA',
        linked_test_id: null,
        notes: '',
        status: 'AGUARDANDO AGENDAMENTO',
        priority: 'MÉDIA'
    });

    const STATUS_COLUMNS = ['AGUARDANDO AGENDAMENTO', 'ADICIONADA A AGENDA', 'CONCLUÍDA'];
    const PRIORITY_OPTIONS = ['BAIXA', 'MÉDIA', 'ALTA', 'CRÍTICA'];
    
    const getPriorityStyles = (p) => {
        switch(p) {
            case 'CRÍTICA': return 'bg-red-50 text-red-600 border-red-100 ring-red-500/20';
            case 'ALTA': return 'bg-orange-50 text-orange-600 border-orange-100 ring-orange-500/20';
            case 'MÉDIA': return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/20';
            default: return 'bg-slate-50 text-slate-500 border-slate-100 ring-slate-500/10';
        }
    };

    // Clients for autocomplete formatted for AutocompleteInput
    const clientOptions = useMemo(() => {
        return allClients.map(c => ({
            id: c.id,
            label: c.name?.toUpperCase() || ''
        }));
    }, [allClients]);

    const filteredPlanning = useMemo(() => {
        return visitationPlanning.filter(p => 
            p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.notes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [visitationPlanning, searchTerm]);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormState({
                client_id: item.client_id,
                client_name: item.client_name,
                type: item.type,
                notes: item.notes,
                linked_test_id: item.linked_test_id,
                priority: item.priority || 'MÉDIA',
                status: item.status || 'AGUARDANDO AGENDAMENTO'
            });
        } else {
            setEditingItem(null);
            setFormState({
                client_id: null,
                client_name: '',
                type: 'VISITA TÉCNICA',
                notes: '',
                linked_test_id: null,
                priority: 'MÉDIA',
                status: 'AGUARDANDO AGENDAMENTO'
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formState.client_name) return;
        
        setIsSaving(true);
        try {
            // Mapeamento explícito para evitar campos inexistentes ou erros de cache
            const payload = {
                client_name: formState.client_name,
                type: formState.type,
                notes: formState.notes,
                linked_test_id: formState.linked_test_id,
                status: formState.status || 'AGUARDANDO AGENDAMENTO',
                priority: formState.priority || 'MÉDIA',
                user_id: currentUser?.id,
                updated_at: new Date().toISOString()
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('visitation_planning')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
                notifySuccess('Sucesso', 'Planejamento atualizado!');
            } else {
                const { error } = await supabase
                    .from('visitation_planning')
                    .insert([payload]);
                if (error) throw error;
                notifySuccess('Sucesso', 'Planejamento criado!');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            notifyError('Erro', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenMigrate = (item) => {
        setMigratingItem(item);
        setShowMigrateModal(true);
    };

    const executeMigration = async (category) => {
        if (!migratingItem) return;
        
        const taskPayload = {
            client: migratingItem.client_name,
            title: `[VISITA] ${migratingItem.client_name}`,
            description: `Tipo: ${migratingItem.type}\nNotas: ${migratingItem.notes || 'Sem observações'}\nMigrado do Planejamento de Visitas.`,
            category: category || 'Visitas',
            status: 'TO_START',
            parent_test_id: migratingItem.linked_test_id,
            parent_visitation_id: migratingItem.id
        };

        if (onNewTask) {
            onNewTask(migratingItem.client_name, taskPayload);
            
            // Mark as migrated or delete? User usually prefers to keep but change status.
            // For now, let's just close modal. The actual "Migration" logic is in the parent.
            setShowMigrateModal(false);
        }
    };

    return (
        <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-auto custom-scrollbar relative`}>
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                <div>
                    <h2 className={`font-black text-slate-800 ${isMobile ? 'text-base' : 'text-xl'} flex items-center gap-2`}>
                        <Briefcase className="text-indigo-600 w-5 h-5" />
                        Planejamento de Visitas
                    </h2>
                    <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                        Gerenciar prospecções e compromissos futuros
                    </p>
                </div>
                
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-md active:scale-95"
                >
                    <Plus size={14} />
                    Novo Planejamento
                </button>
            </div>

            {/* Filters Compact */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente ou notas..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-bold transition-all text-xs"
                    />
                </div>
                
                <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 md:pb-0">
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                        <option value="ALL">TODOS MESES</option>
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                        <option value="ALL">ANOS</option>
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Kanban Columns */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6 min-h-[500px] items-start">
                    {STATUS_COLUMNS.map(status => {
                        const columnItems = filteredPlanning.filter(p => (p.status || 'AGUARDANDO AGENDAMENTO') === status);
                        return (
                            <div key={status} className="flex-1 w-full min-w-[320px] bg-slate-50/50 rounded-[32px] p-4 border border-slate-100 flex flex-col gap-4">
                                <div className="flex items-center justify-between px-3 py-1 mb-2">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            status === 'CONCLUÍDA' ? 'bg-emerald-400' : 
                                            status === 'ADICIONADA A AGENDA' ? 'bg-indigo-400' : 'bg-amber-400'
                                        }`} />
                                        {status}
                                        <span className="ml-1 bg-slate-200/50 text-slate-500 px-2 py-0.5 rounded-full text-[9px]">{columnItems.length}</span>
                                    </h3>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 scroll-smooth max-h-[calc(100vh-340px)] min-h-[400px]">
                                    {columnItems.length === 0 ? (
                                        <div className="bg-white/40 border border-dashed border-slate-200 rounded-3xl py-12 flex flex-col items-center justify-center text-center px-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                <Info size={16} className="text-slate-200" />
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">Sem registros aqui</p>
                                        </div>
                                    ) : (
                                        columnItems.map(item => {
                                            const priority = item.priority || 'MÉDIA';
                                            
                                            const priorityColors = {
                                                'CRÍTICA': { bg: 'bg-rose-50/50', border: 'border-rose-200', bar: 'bg-rose-500', text: 'text-rose-600' },
                                                'ALTA': { bg: 'bg-orange-50/50', border: 'border-orange-200', bar: 'bg-orange-500', text: 'text-orange-600' },
                                                'MÉDIA': { bg: 'bg-amber-50/50', border: 'border-amber-200', bar: 'bg-amber-500', text: 'text-amber-600' },
                                                'BAIXA': { bg: 'bg-slate-50/50', border: 'border-slate-200', bar: 'bg-slate-400', text: 'text-slate-500' }
                                            };

                                            const styles = priorityColors[priority] || priorityColors['MÉDIA'];

                                            return (
                                                <div key={item.id} className={`bg-white rounded-[24px] border-2 ${styles.border} ${styles.bg} p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2`}>
                                                    {/* Top highlight bar by Priority */}
                                                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${styles.bar}`} />
                                                    
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-1">
                                                            <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase w-fit ${getPriorityStyles(priority)}`}>
                                                                {priority}
                                                            </div>
                                                            <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase w-fit bg-slate-100 text-slate-500`}>
                                                                {item.type}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={13} /></button>
                                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={13} /></button>
                                                        </div>
                                                    </div>

                                                    <h4 className="font-black text-slate-800 text-sm leading-tight mb-2 uppercase line-clamp-2" title={item.client_name}>
                                                        {item.client_name}
                                                    </h4>

                                                    {item.linked_test_id && (
                                                        <div className="flex items-center gap-2 text-indigo-500 bg-indigo-50/30 p-2 rounded-xl mb-3 border border-indigo-100/30">
                                                            <FlaskConical size={11} className="shrink-0" />
                                                            <span className="text-[9px] font-black truncate">
                                                                {techTests.find(t => t.id === item.linked_test_id)?.title || 'TESTE VINCULADO'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <p className="text-[10px] text-slate-400 font-bold line-clamp-3 mb-4 min-h-[30px] italic">
                                                        {item.notes || 'Nenhuma observação.'}
                                                    </p>

                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-1">
                                                            <Calendar size={10} /> {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                                        </span>
                                                        
                                                        {status !== 'CONCLUÍDA' && (
                                                            <button 
                                                                onClick={() => handleOpenMigrate(item)}
                                                                className="flex items-center gap-1 text-brand-600 bg-brand-50 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-brand-600 hover:text-white transition-all border border-brand-100 shadow-sm"
                                                            >
                                                                <ArrowUpCircle size={10} />
                                                                MIGRAR
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Local Modal: New/Edit */}
            {showModal && (
                <div className="absolute inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                    {editingItem ? 'Editar Planejamento' : 'Novo Planejamento'}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Definir objetivo da visita técnica</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <AutocompleteInput 
                                    label="Cliente"
                                    icon={Briefcase}
                                    placeholder="BUSCAR OU DIGITAR CLIENTE..."
                                    options={clientOptions}
                                    value={formState.client_name}
                                    onChange={(val) => setFormState({...formState, client_name: val})}
                                />
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-indigo-500">Status do Fluxo</label>
                                        <select 
                                            value={formState.status}
                                            onChange={(e) => setFormState({...formState, status: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer"
                                        >
                                            {STATUS_COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-500">Urgência / Prioridade</label>
                                        <select 
                                            value={formState.priority}
                                            onChange={(e) => setFormState({...formState, priority: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-red-400 transition-all cursor-pointer"
                                        >
                                            {PRIORITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Atividade</label>
                                        <select 
                                            value={formState.type}
                                            onChange={(e) => setFormState({...formState, type: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                                        >
                                            <option value="VISITA TÉCNICA">VISITA TÉCNICA</option>
                                            <option value="PROSPECÇÃO">PROSPECÇÃO</option>
                                            <option value="TREINAMENTO">TREINAMENTO</option>
                                            <option value="PÓS-VENDAS">PÓS-VENDAS</option>
                                            <option value="FEIRA/EVENTO">FEIRA / EVENTO</option>
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Teste (Opcional)</label>
                                        <select 
                                            value={formState.linked_test_id || ''}
                                            onChange={(e) => setFormState({...formState, linked_test_id: e.target.value || null})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Sem vínculo técnico</option>
                                            {techTests.map(t => (
                                                <option key={t.id} value={t.id}>{t.title} - {t.client_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações / Detalhes</label>
                                    <textarea 
                                        value={formState.notes}
                                        onChange={(e) => setFormState({...formState, notes: e.target.value.toUpperCase()})}
                                        placeholder="O QUE PRECISA SER FEITO NESSA VISITA?..."
                                        className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-[11px] font-black uppercase text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] py-3 bg-indigo-600 text-white text-[11px] font-black uppercase rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                                    {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    {editingItem ? 'Salvar Edição' : 'Confirmar Agendamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Migration Modal */}
            {showMigrateModal && migratingItem && (
                <div className="absolute inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden text-center p-8">
                        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ArrowUpCircle size={32} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Migrar para Kanban?</h3>
                        <p className="text-xs text-slate-500 font-medium mb-6">
                            Isso criará uma nova tarefa técnica para o cliente <span className="font-bold text-slate-800">{migratingItem.client_name}</span> no módulo de tarefas.
                        </p>
                        
                        <div className="flex flex-col gap-2">
                            <button onClick={() => executeMigration('Visitas')} className="w-full py-3 bg-brand-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all active:scale-95">Sim, Migrar Agora</button>
                            <button onClick={() => setShowMigrateModal(false)} className="w-full py-3 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase hover:bg-slate-100 transition-all">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitationTab;
