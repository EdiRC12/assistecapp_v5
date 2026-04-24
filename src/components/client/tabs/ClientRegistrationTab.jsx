import React from 'react';
import { Settings, Phone, MapPin, Edit2 } from 'lucide-react';
import DashboardCard from '../DashboardCard';

const ClientRegistrationTab = ({ activeClientObj, setIsClientManagerOpen }) => {
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
                <div className="pt-4 border-t border-slate-100">
                    <button
                        onClick={() => setIsClientManagerOpen(true)}
                        className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-200"
                    >
                        <Edit2 size={18} /> EDITAR CADASTRO GERAL
                    </button>
                </div>
            </div>
        </DashboardCard>
    );
};

export default ClientRegistrationTab;
