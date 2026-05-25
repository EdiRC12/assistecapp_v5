import React, { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Plus, X, MessageSquare, Briefcase, Tag, Trash2 } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const SupportContacts = ({
    supabase,
    currentUser,
    theme,
    notifySuccess,
    notifyError
}) => {
    const isMobile = useIsMobile();

    // Core States
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');

    // Modal State for New Contact Creation
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        category: 'internal',
        company: '',
        notes: ''
    });
    const [saving, setSaving] = useState(false);

    // Fetch support contacts from Supabase
    const fetchContacts = async () => {
        try {
            const { data, error } = await supabase
                .from('support_contacts')
                .select('*')
                .order('name');
            
            if (error) throw error;
            setContacts(data || []);
        } catch (err) {
            console.error('Error fetching support contacts:', err);
            notifyError('Erro ao carregar contatos', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    // Filter categories definitions
    const tabs = [
        { id: 'ALL', label: 'Todos' },
        { id: 'internal', label: 'Internos' },
        { id: 'supplier', label: 'Fornecedores' },
        { id: 'road_service', label: 'Serviços de Estrada' },
        { id: 'machine_contact', label: 'Contatos de Máquinas' }
    ];

    const categoryLabels = {
        internal: '🏢 Interno / Suporte Técnico',
        supplier: '📦 Fornecedor / Peças',
        road_service: '🛠️ Serviço de Estrada',
        machine_contact: '👤 Contato de Máquina'
    };

    // Filter and search contact records
    const filteredContacts = useMemo(() => {
        return contacts.filter(contact => {
            const matchesSearch = 
                (contact.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (contact.company?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (contact.notes?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            
            const matchesTab = activeTab === 'ALL' || contact.category === activeTab;
            
            return matchesSearch && matchesTab;
        });
    }, [contacts, searchQuery, activeTab]);

    // Handle New Contact Save
    const handleSaveContact = async (e) => {
        e.preventDefault();
        if (!newContact.name.trim() || !newContact.phone.trim()) {
            notifyError('Validação', 'Nome e Telefone são campos obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            const record = {
                name: newContact.name.trim(),
                phone: newContact.phone.trim(),
                category: newContact.category,
                company: newContact.company.trim() || null,
                notes: newContact.notes.trim() || null,
                created_by: currentUser?.id
            };

            const { error } = await supabase
                .from('support_contacts')
                .insert([record]);

            if (error) throw error;

            notifySuccess('Contato salvo com sucesso!');
            setIsModalOpen(false);
            setNewContact({ name: '', phone: '', category: 'internal', company: '', notes: '' });
            fetchContacts();
        } catch (err) {
            console.error('Error saving contact:', err);
            notifyError('Erro ao salvar contato', err.message);
        } finally {
            setSaving(false);
        }
    };

    // Handle Contact Delete
    const handleDeleteContact = async (id) => {
        if (!confirm('Deseja realmente remover este contato importante?')) return;

        try {
            const { error } = await supabase
                .from('support_contacts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            notifySuccess('Contato removido');
            fetchContacts();
        } catch (err) {
            console.error('Error deleting contact:', err);
            notifyError('Erro ao deletar contato', err.message);
        }
    };

    // WhatsApp Direct URL Dispatcher
    const handleWhatsAppClick = (phone) => {
        const cleanedPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanedPhone}`, '_blank');
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50 relative">
            
            {/* Search and Tag Filters Panel */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm shrink-0 flex flex-col md:flex-row gap-3 items-center justify-between z-10 relative">
                
                {/* Search Field */}
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, empresa ou função..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 bg-slate-50/50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Categories Tab selector */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 max-w-full w-full md:w-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-brand-50 text-brand-700 border border-brand-100 font-extrabold shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 bg-white border border-slate-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Add new contact button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-black px-4 py-2 rounded-lg text-xs shadow-sm transition-all active:scale-95 w-full md:w-auto justify-center cursor-pointer"
                >
                    <Plus size={14} />
                    <span>Cadastrar Contato</span>
                </button>
            </div>

            {/* List and Grid Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-xs font-bold text-slate-400">Carregando contatos úteis...</span>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Phone size={32} className="text-slate-300 mb-2.5 animate-bounce-slow" />
                        <h4 className="font-extrabold text-slate-800 text-sm">Nenhum contato encontrado</h4>
                        <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                            Nenhum contato cadastrado corresponde à busca ou à categoria selecionada. Cadastre novos contatos acima!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContacts.map((contact) => (
                            <div
                                key={contact.id}
                                className="bg-white rounded-xl shadow-sm border border-slate-150 p-4 relative card-hover transition-all flex flex-col justify-between"
                            >
                                <div>
                                    {/* Card Header Category & Trash */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border uppercase tracking-wider">
                                            {categoryLabels[contact.category] || 'Ponto de Apoio'}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteContact(contact.id)}
                                            className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-all"
                                            title="Excluir contato"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>

                                    {/* Name and Phone */}
                                    <h3 className="font-extrabold text-slate-800 text-sm leading-snug">
                                        {contact.name}
                                    </h3>
                                    
                                    <p className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1.5">
                                        <Phone size={11} className="text-slate-400" />
                                        {contact.phone}
                                    </p>

                                    {/* Optional Company Display */}
                                    {contact.company && (
                                        <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded px-2.5 py-1 flex items-center gap-1.5 w-max max-w-full">
                                            <Briefcase size={10} className="text-slate-400 shrink-0" />
                                            <span className="text-[9px] font-black text-slate-600 truncate uppercase tracking-wider">
                                                {contact.company}
                                            </span>
                                        </div>
                                    )}

                                    {/* Optional Notes */}
                                    {contact.notes && (
                                        <p className="text-[10px] text-slate-400 italic mt-3 bg-slate-50/50 p-2 rounded border border-dotted leading-relaxed">
                                            <strong>Obs:</strong> {contact.notes}
                                        </p>
                                    )}
                                </div>

                                {/* Call Action Bottom Bar */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                                    <button
                                        onClick={() => handleWhatsAppClick(contact.phone)}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-lg text-[10px] shadow-sm transition-all cursor-pointer"
                                    >
                                        <MessageSquare size={12} />
                                        <span>Conversar no WhatsApp</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Creation Modal for New Contacts */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-indigo-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Plus size={18} className="text-white" />
                                <h3 className="font-black text-base">Cadastrar Novo Contato</h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveContact} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Carlos - Operador CNC, Oficina Rota Sul"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                        WhatsApp / Telefone *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 554799999999"
                                        value={newContact.phone}
                                        onChange={(e) => setNewContact(p => ({ ...p, phone: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                        Categoria *
                                    </label>
                                    <select
                                        value={newContact.category}
                                        onChange={(e) => setNewContact(p => ({ ...p, category: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 bg-white"
                                    >
                                        <option value="internal">🏢 Interno / Suporte</option>
                                        <option value="supplier">📦 Fornecedor / Peças</option>
                                        <option value="road_service">🛠️ Serviços de Estrada</option>
                                        <option value="machine_contact">👤 Contatos de Máquina</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Empresa / Setor (Opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: MecânicaBR, Metalúrgica Sul, Engenharia Assistec"
                                    value={newContact.company}
                                    onChange={(e) => setNewContact(p => ({ ...p, company: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Observações Adicionais (Opcional)
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Ex: Fornecedor de engrenagens especiais, só atende horário comercial, falar com Carlos..."
                                    value={newContact.notes}
                                    onChange={(e) => setNewContact(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-black rounded-lg text-xs shadow transition-all active:scale-95 cursor-pointer"
                                >
                                    {saving ? 'Cadastrando...' : 'Confirmar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportContacts;
