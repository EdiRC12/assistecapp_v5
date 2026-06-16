import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Search, MapPin, Phone, Save, Briefcase, ChevronLeft, ShieldCheck, MessageSquare, Users, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { normalizeState } from '../utils/addressUtils';

const ClientManager = ({ isOpen, onClose, currentUser, initialData, notifySuccess, notifyError }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    
    // Meta visitation states
    const [metaEditingClient, setMetaEditingClient] = useState(null);
    const [metaFreqVal, setMetaFreqVal] = useState(6);
    const [metaFreqUnit, setMetaFreqUnit] = useState('MESES');
    const [metaLeadVal, setMetaLeadVal] = useState(2);
    const [metaLeadUnit, setMetaLeadUnit] = useState('MESES');
    const [hasMeta, setHasMeta] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        main_phone: '', // Novo padrão: Recepção
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        classification: 'BRONZE',
        visit_frequency_months: null,
        visit_lead_time_months: null
    });

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchClients();
            if (initialData) {
                startEdit(initialData);
            } else {
                resetForm();
            }
        }
    }, [isOpen, currentUser, initialData]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            const parts = [];
            if (formData.street) parts.push(formData.street);
            if (formData.number) parts.push(formData.number);

            let addressStr = parts.join(', ');
            if (formData.neighborhood) addressStr += ` - ${formData.neighborhood}`;
            if (formData.city || formData.state) addressStr += ` - ${formData.city || ''}/${formData.state || ''}`;

            const originalClient = clients.find(c => c.id === formData.id);
            const hasClassificationChanged = !formData.id || originalClient?.classification !== formData.classification;
            const classificationDate = hasClassificationChanged ? new Date().toISOString() : (originalClient?.classification_date || new Date().toISOString());

            const payload = {
                name: formData.name.trim(),
                main_phone: formData.main_phone,
                phone: formData.main_phone, // Manter phone antigo por compatibilidade legada
                street: formData.street,
                number: formData.number,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: normalizeState(formData.state),
                user_id: currentUser.id,
                address: addressStr,
                classification: formData.classification || 'BRONZE',
                classification_date: classificationDate,
                visit_frequency_months: formData.visit_frequency_months !== null && formData.visit_frequency_months !== undefined ? (parseInt(formData.visit_frequency_months) || null) : null,
                visit_lead_time_months: formData.visit_lead_time_months !== null && formData.visit_lead_time_months !== undefined ? (parseInt(formData.visit_lead_time_months) || null) : null
            };

            let error;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('clients')
                    .update(payload)
                    .eq('id', formData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('clients')
                    .insert(payload);
                error = insertError;
            }

            if (error) {
                if (error.code === '23505') {
                    notifyError('Erro de Duplicidade', 'Já existe um cliente cadastrado com este nome.');
                } else {
                    notifyError('Erro ao salvar', error.message);
                }
                return;
            }

            await fetchClients();
            notifySuccess('Sucesso!', formData.id ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.');
            resetForm();
            setIsEditing(false);
        } catch (error) {
            console.error('Unexpected Error:', error);
            notifyError('Erro inesperado', 'Ocorreu uma falha ao processar o salvamento.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchClients();
            notifySuccess('Sucesso', 'Cliente excluído com sucesso.');
        } catch (error) {
            console.error('Error deleting client:', error);
            notifyError('Erro ao excluir', 'Não foi possível excluir o cliente.');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (client) => {
        setFormData({
            id: client.id,
            name: client.name,
            main_phone: client.main_phone || client.phone || '',
            street: client.street || '',
            number: client.number || '',
            neighborhood: client.neighborhood || '',
            city: client.city || '',
            state: client.state || '',
            classification: client.classification || 'BRONZE',
            visit_frequency_months: client.visit_frequency_months !== undefined && client.visit_frequency_months !== null ? client.visit_frequency_months : 6,
            visit_lead_time_months: client.visit_lead_time_months !== undefined && client.visit_lead_time_months !== null ? client.visit_lead_time_months : 2
        });
        setIsEditing(true);
    };

    const resetForm = () => {
        setFormData({ id: null, name: '', main_phone: '', street: '', number: '', neighborhood: '', city: '', state: '', classification: 'BRONZE', visit_frequency_months: null, visit_lead_time_months: null });
        setIsEditing(false);
    };

    // Alpha-Numeric Sorting Helper
    const sortAlphaNum = (a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    };

    const filteredClients = clients
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort(sortAlphaNum);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        {isEditing && (
                            <button onClick={() => setIsEditing(false)} className="md:hidden p-2 -ml-2 hover:bg-slate-200 rounded-lg text-brand-600 transition-colors">
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <div className={`bg-brand-100 p-2 md:p-2.5 rounded-xl text-brand-600 ${isEditing ? 'hidden md:block' : 'block'}`}>
                            <Users size={24} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate">
                                {isEditing ? (formData.id ? 'Editar Cliente' : 'Novo Cliente') : 'Gerenciar Clientes'}
                            </h2>
                            <p className={`text-xs md:text-sm text-slate-500 truncate ${isEditing ? 'hidden md:block' : 'block'}`}>
                                Organize sua base de contatos empresarial
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / List */}
                    <div className={`${isEditing ? 'hidden md:flex' : 'flex'} w-full md:w-1/2 border-r border-slate-100 flex-col bg-white overflow-hidden`}>
                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar clientes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            <button onClick={() => { resetForm(); setIsEditing(true); }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all mb-4">
                                <Plus size={18} /> CADASTRAR NOVO CLIENTE
                            </button>

                            {filteredClients.map(client => (
                                <div key={client.id} className={`p-4 rounded-xl border transition-all text-left group ${formData.id === client.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-700 text-sm">{client.name}</h3>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setMetaEditingClient(client); 
                                                const hasDefinedMeta = (client.visit_frequency_value !== undefined && client.visit_frequency_value !== null && client.visit_frequency_value > 0) || 
                                                                       (client.visit_frequency_months !== undefined && client.visit_frequency_months !== null && client.visit_frequency_months > 0);
                                                setHasMeta(hasDefinedMeta);
                                                
                                                if (client.visit_frequency_value !== undefined && client.visit_frequency_value !== null) {
                                                    setMetaFreqVal(client.visit_frequency_value);
                                                    setMetaFreqUnit(client.visit_frequency_unit || 'MESES');
                                                } else {
                                                    setMetaFreqVal(client.visit_frequency_months || 6);
                                                    setMetaFreqUnit('MESES');
                                                }
                                                
                                                if (client.visit_lead_time_value !== undefined && client.visit_lead_time_value !== null) {
                                                    setMetaLeadVal(client.visit_lead_time_value);
                                                    setMetaLeadUnit(client.visit_lead_time_unit || 'MESES');
                                                } else {
                                                    setMetaLeadVal(client.visit_lead_time_months || 2);
                                                    setMetaLeadUnit('MESES');
                                                }
                                            }} className="p-1.5 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg animate-pulse" title="Metas de Visita"><Calendar size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); startEdit(client); }} className="p-1.5 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg" title="Editar"><Edit2 size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg" title="Excluir"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Phone size={12} />
                                        <span>{client.main_phone || client.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content / Edit Form */}
                    <div className={`${isEditing ? 'flex' : 'hidden md:flex'} w-full md:w-1/2 bg-slate-50 flex-col items-center justify-start md:justify-center p-0 md:p-8 overflow-y-auto custom-scrollbar`}>
                        {isEditing ? (
                            <form onSubmit={handleSave} className="w-full md:max-w-sm bg-white p-6 md:rounded-2xl md:shadow-sm md:border md:border-slate-200 animate-in zoom-in-95 duration-200 my-0 md:my-auto min-h-full md:min-h-0">
                                <h3 className="hidden md:flex text-lg font-bold text-slate-800 mb-6 items-center gap-2 uppercase tracking-tight">
                                    {formData.id ? 'Editar Cadastro' : 'Novo Cadastro'}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Razão Social / Nome *</label>
                                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-bold" placeholder="Ex: Cliente 1234" required />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Telefone Geral (Recepção)</label>
                                        <input type="text" value={formData.main_phone} onChange={(e) => setFormData({ ...formData, main_phone: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all" placeholder="(00) 0000-0000" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Classificação / Tier</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['OURO', 'PRATA', 'BRONZE'].map((tier) => {
                                                const isActive = formData.classification === tier;
                                                const styles = {
                                                    'OURO': {
                                                        active: 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20',
                                                        inactive: 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 hover:border-amber-300'
                                                    },
                                                    'PRATA': {
                                                        active: 'bg-slate-500 border-slate-500 text-white shadow-md shadow-slate-500/20',
                                                        inactive: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                                    },
                                                    'BRONZE': {
                                                        active: 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20',
                                                        inactive: 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300'
                                                    }
                                                };
                                                return (
                                                    <button
                                                        key={tier}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, classification: tier })}
                                                        className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl border text-[11px] font-black transition-all ${
                                                            isActive ? styles[tier].active : styles[tier].inactive
                                                        }`}
                                                    >
                                                        {tier === 'OURO' && '🟡'}
                                                        {tier === 'PRATA' && '⚪'}
                                                        {tier === 'BRONZE' && '🟤'}
                                                        {tier}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Rua</label>
                                            <input type="text" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Rua..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Nº</label>
                                            <input type="text" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="00" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Bairro</label>
                                            <input type="text" value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Bairro..." />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Cidade</label>
                                                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Cidade" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">UF</label>
                                                <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="UF" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors uppercase">Cancelar</button>
                                    <button type="submit" disabled={loading} className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 text-white font-black text-sm shadow-lg hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase">
                                        {loading ? 'Salvando...' : <><Save size={16} /> Salvar</>}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center text-slate-400">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-slate-600 mb-2">Selecione ou Cadastre</h3>
                                <p className="text-xs max-w-xs mx-auto">Gerencie as informações básicas e de recepção da empresa.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Visit Meta Modal */}
            {metaEditingClient && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Metas de Visita</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase mt-0.5 truncate max-w-[240px]">{metaEditingClient.name}</p>
                            </div>
                            <button onClick={() => setMetaEditingClient(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Toggle Habilitar Cronograma */}
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-inner">
                                <input
                                    type="checkbox"
                                    id="enable-meta-toggle-mgr"
                                    checked={hasMeta}
                                    onChange={(e) => setHasMeta(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="enable-meta-toggle-mgr" className="text-[10px] font-black text-slate-700 uppercase tracking-wider cursor-pointer select-none">
                                    Habilitar Cronograma de Visitas
                                </label>
                            </div>

                            {hasMeta && (
                                <div className="space-y-4 border-l-4 border-indigo-500 pl-3 py-1 animate-in slide-in-from-top-3 duration-200">
                                    {/* Frequência */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Frequência Limite</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={metaFreqVal} 
                                                onChange={(e) => setMetaFreqVal(e.target.value)} 
                                                className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                                                required={hasMeta}
                                            />
                                            <select
                                                value={metaFreqUnit}
                                                onChange={(e) => setMetaFreqUnit(e.target.value)}
                                                className="px-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="DIAS">Dias</option>
                                                <option value="MESES">Meses</option>
                                                <option value="ANOS">Anos</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Aviso Prévio */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Antecedência de Alerta</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                value={metaLeadVal} 
                                                onChange={(e) => setMetaLeadVal(e.target.value)} 
                                                className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                                                required={hasMeta}
                                            />
                                            <select
                                                value={metaLeadUnit}
                                                onChange={(e) => setMetaLeadUnit(e.target.value)}
                                                className="px-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="DIAS">Dias</option>
                                                <option value="MESES">Meses</option>
                                                <option value="ANOS">Anos</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setMetaEditingClient(null)} className="flex-1 py-2 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const freqVal = hasMeta ? (parseInt(metaFreqVal) || 6) : null;
                                            const freqUnit = hasMeta ? metaFreqUnit : null;
                                            const leadVal = hasMeta ? (parseInt(metaLeadVal) || 2) : null;
                                            const leadUnit = hasMeta ? metaLeadUnit : null;

                                            // Legacy backward-compatibility conversion to months (rough approximation)
                                            let freqMonths = freqVal;
                                            if (hasMeta) {
                                                if (freqUnit === 'DIAS') freqMonths = Math.max(1, Math.round(freqVal / 30));
                                                if (freqUnit === 'ANOS') freqMonths = freqVal * 12;
                                            } else {
                                                freqMonths = null;
                                            }

                                            let leadMonths = leadVal;
                                            if (hasMeta) {
                                                if (leadUnit === 'DIAS') leadMonths = Math.round(leadVal / 30);
                                                if (leadUnit === 'ANOS') leadMonths = leadVal * 12;
                                            } else {
                                                leadMonths = null;
                                            }

                                            const { error } = await supabase
                                                .from('clients')
                                                .update({
                                                    visit_frequency_value: freqVal,
                                                    visit_frequency_unit: freqUnit,
                                                    visit_lead_time_value: leadVal,
                                                    visit_lead_time_unit: leadUnit,
                                                    visit_frequency_months: freqMonths,
                                                    visit_lead_time_months: leadMonths
                                                })
                                                .eq('id', metaEditingClient.id);
                                            if (error) throw error;
                                            notifySuccess('Sucesso', 'Metas de visitas salvas!');
                                            setMetaEditingClient(null);
                                            fetchClients();
                                        } catch (e) {
                                            notifyError('Erro', e.message);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="flex-[2] py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    Salvar Metas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientManager;
