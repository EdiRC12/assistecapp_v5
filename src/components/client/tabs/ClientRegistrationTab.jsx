import React, { useState } from 'react';
import { Settings, Phone, MapPin, Edit2, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import DashboardCard from '../DashboardCard';

const ClientRegistrationTab = ({ activeClientObj, setIsClientManagerOpen, currentUser, supabase, notifySuccess, notifyError, setSelectedClient }) => {
    const isAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.email?.toLowerCase().includes('evandro');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClient = async () => {
        if (confirmText !== activeClientObj?.name) return;
        setIsDeleting(true);
        try {
            const cid = activeClientObj.id;
            const cname = activeClientObj.name;

            // Deleções em Cascata forçadas (para garantir ausência de órfãos)
            await supabase.from('tasks').delete().eq('client', cname);
            await supabase.from('tech_tests').delete().eq('client_name', cname);
            await supabase.from('tech_followups').delete().eq('client_name', cname);
            
            await supabase.from('materials_rnc').delete().eq('client_id', cid);
            await supabase.from('client_contacts').delete().eq('client_id', cid);
            await supabase.from('client_products').delete().eq('client_id', cid);
            await supabase.from('machines').delete().eq('client_id', cid);

            // Deleção Final do Cliente
            const { error } = await supabase.from('clients').delete().eq('id', cid);
            if (error) throw error;

            notifySuccess('Cliente Excluído', 'O cliente e todos os seus vínculos foram apagados permanentemente.');
            setSelectedClient(null);
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            notifyError('Erro na Exclusão', 'Ocorreu um erro ao tentar excluir os dados do cliente.');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <DashboardCard title="Cadastro Detalhado" icon={Settings}>
            <div className="max-w-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Telefone Principal (Recepção)</p>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <Phone size={18} className="text-brand-500" />
                            <span className="text-lg font-bold text-slate-700">{activeClientObj?.main_phone || activeClientObj?.phone || 'Não cadastrado'}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Cidade / UF</p>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <MapPin size={18} className="text-brand-500" />
                            <span className="text-lg font-bold text-slate-700">{activeClientObj?.city || 'N/A'}/{activeClientObj?.state || ''}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Endereço Completo</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-base text-slate-600 leading-relaxed shadow-inner">
                        {activeClientObj?.address || 'Sem endereço registrado'}
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={() => setIsClientManagerOpen(true)}
                        className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-200"
                    >
                        <Edit2 size={18} /> EDITAR CADASTRO GERAL
                    </button>

                    {isAdmin && (
                        <button
                            onClick={() => {
                                setConfirmText('');
                                setIsDeleteModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm group"
                        >
                            <Trash2 size={18} className="group-hover:animate-pulse" /> Excluir Cliente
                        </button>
                    )}
                </div>
            </div>

            {/* Modal de Exclusão */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-red-800 uppercase">Zona de Perigo</h3>
                            <p className="text-sm text-red-600 mt-2 font-medium">Você está prestes a excluir este cliente permanentemente.</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                                <p className="font-bold text-slate-800 mb-1">Ação em Cascata Ativada</p>
                                Todos os vínculos deste cliente serão apagados junto com ele, incluindo:
                                <ul className="list-disc pl-5 mt-1 space-y-0.5 font-medium">
                                    <li>Tarefas e Relatórios</li>
                                    <li>Contatos e Pessoas</li>
                                    <li>Produtos e Itens</li>
                                    <li>Máquinas e Acompanhamentos</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Para confirmar, digite exatamente o nome: <br/>
                                    <span className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded select-all">{activeClientObj?.name}</span>
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-medium"
                                    placeholder="Digite o nome aqui..."
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteClient}
                                disabled={confirmText !== activeClientObj?.name || isDeleting}
                                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                            >
                                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                {isDeleting ? 'Apagando...' : 'Excluir Tudo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardCard>
    );
};

export default ClientRegistrationTab;
