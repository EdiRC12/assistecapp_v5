import React from 'react';
import { Users, Plus, MessageSquare, Trash2, Phone } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import useIsMobile from '../../../hooks/useIsMobile';

const ClientContactsTab = ({
    clientContacts,
    isAddingContact,
    setIsAddingContact,
    newContact,
    setNewContact,
    handleAddContact,
    handleDeleteContact
}) => {
    const isMobile = useIsMobile();
    return (
        <DashboardCard title="Gestão de Contatos" icon={Users}>
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-brand-50 p-4 rounded-xl border border-brand-100 mb-6">
                    <span className="text-sm font-bold text-brand-700 uppercase">Adicionar novo contato estratégico</span>
                    {!isAddingContact && (
                        <button onClick={() => setIsAddingContact(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-brand-500 flex items-center gap-1 shadow-md shadow-brand-200">
                            <Plus size={16} /> NOVO CONTATO
                        </button>
                    )}
                </div>

                {isAddingContact && (
                    <form onSubmit={handleAddContact} className="bg-white p-6 rounded-2xl border-2 border-brand-200 shadow-xl animate-in zoom-in-95 duration-200 mb-8 max-w-xl">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4">Novo Registro</h4>
                        <div className="space-y-4">
                            <input type="text" placeholder="Nome Completo *" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" required />
                            <input type="text" placeholder="Cargo / Departamento" value={newContact.position} onChange={(e) => setNewContact({ ...newContact, position: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" />
                            <input type="text" placeholder="WhatsApp / Telefone Direto" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsAddingContact(false)} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-brand-200">Salvar Contato</button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {clientContacts.map(contact => (
                        <div key={contact.id} className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 text-base">{contact.name}</h4>
                                <div className="flex gap-2">
                                    {contact.phone && (
                                        <a href={`https://wa.me/${contact.phone?.replace(/\D/g, '')}`} target="_blank" className="bg-emerald-100 text-emerald-600 p-2 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                                            <MessageSquare size={18} />
                                        </a>
                                    )}
                                    <button onClick={() => handleDeleteContact(contact.id)} className="bg-red-50 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 lg:opacity-0 opacity-100"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase mb-2">{contact.position || 'Geral'}</div>
                            <p className="text-sm font-mono text-slate-600 flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {contact.phone || 'Sem telefone'}</p>
                        </div>
                    ))}
                    {clientContacts.length === 0 && !isAddingContact && <p className="col-span-full py-20 text-center text-slate-400 italic">Nenhum contato estratégico registrado.</p>}
                </div>
            </div>
        </DashboardCard>
    );
};

export default ClientContactsTab;
