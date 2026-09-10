import React, { useState } from 'react';
import { AlertTriangle, Users, MapPin, CalendarClock, Briefcase, Loader2, Check } from 'lucide-react';

const OverdueSLATab = ({
    overdueClients = [],
    onActionClick,
    supabase,
    notifySuccess,
    notifyError,
    onClientUpdated
}) => {
    const [loadingClientId, setLoadingClientId] = useState(null);

    const handleQuickUpdateSLA = async (clientObj, newFreqVal) => {
        if (!clientObj) return;

        const months = parseInt(newFreqVal);
        const finalFreq = months > 0 ? months : null;
        const clientId = clientObj.id || clientObj.name;

        setLoadingClientId(clientId);

        try {
            if (supabase && clientObj.id) {
                const { error } = await supabase
                    .from('clients')
                    .update({
                        visit_frequency_months: finalFreq,
                        visit_frequency_value: finalFreq,
                        visit_frequency_unit: 'MESES'
                    })
                    .eq('id', clientObj.id);

                if (error) throw error;
            }

            // Atualização local reativa do objeto cliente
            clientObj.visit_frequency_months = finalFreq;

            if (notifySuccess) {
                notifySuccess(
                    'Meta de SLA Atualizada',
                    `${clientObj.name}: Nova meta configurada para ${months > 0 ? `a cada ${months} meses` : 'Sem Meta'}.`
                );
            }

            if (onClientUpdated) {
                onClientUpdated();
            }
        } catch (error) {
            console.error('Erro ao atualizar meta do cliente:', error);
            if (notifyError) {
                notifyError('Erro ao atualizar', error.message || 'Falha ao salvar meta no banco.');
            }
        } finally {
            setLoadingClientId(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            <div className="p-4 md:p-6 pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="text-rose-500" size={24} />
                            Clientes com SLA Vencido
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                            Ajuste a meta diretamente no card se o prazo foi cadastrado errado
                        </p>
                    </div>
                    <div className="bg-rose-100 text-rose-700 px-4 py-2 rounded-xl font-black text-sm">
                        {overdueClients.length} Pendências
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                {overdueClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                        <div className="bg-emerald-100 p-4 rounded-full mb-4">
                            <CalendarClock size={32} className="text-emerald-600" />
                        </div>
                        <p className="font-black text-lg text-slate-700">Tudo em dia!</p>
                        <p className="text-sm font-medium mt-1">Não há clientes com metas de visitas atrasadas no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {overdueClients.map((oc, i) => {
                            const client = oc.client || oc;
                            const isUpdating = loadingClientId === (client.id || client.name);

                            return (
                                <div key={client.id || i} className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                                    
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-black text-slate-800 text-sm pl-2 leading-tight flex-1" title={client.name}>
                                            {client.name}
                                        </h3>
                                        <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-1 rounded-lg shrink-0 ml-2">
                                            {oc.monthsOverdue === 999 ? 'Nunca Visitado' : `Atraso: ${oc.monthsOverdue} meses`}
                                        </span>
                                    </div>
                                    
                                    <div className="pl-2 space-y-2.5 mb-4">
                                        {client.city && client.state && (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                <MapPin size={12} className="text-slate-400" />
                                                {client.city} - {client.state}
                                            </div>
                                        )}

                                        {/* SELETOR RÁPIDO DE META NO CARD */}
                                        <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                <CalendarClock size={14} className="text-indigo-600 shrink-0" />
                                                <span>Meta:</span>
                                            </div>

                                            <div className="relative">
                                                {isUpdating ? (
                                                    <div className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-indigo-600">
                                                        <Loader2 size={12} className="animate-spin" />
                                                        <span>Salvando...</span>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={client.visit_frequency_months || 0}
                                                        onChange={(e) => handleQuickUpdateSLA(client, e.target.value)}
                                                        className="bg-white border border-indigo-200 hover:border-indigo-400 font-bold text-indigo-900 text-xs rounded-lg px-2 py-1 outline-none cursor-pointer transition-colors shadow-2xs"
                                                    >
                                                        <option value="0">Sem Meta / Livre</option>
                                                        <option value="1">A cada 1 mês</option>
                                                        <option value="2">A cada 2 meses</option>
                                                        <option value="3">A cada 3 meses</option>
                                                        <option value="4">A cada 4 meses</option>
                                                        <option value="6">A cada 6 meses</option>
                                                        <option value="12">A cada 12 meses</option>
                                                        <option value="24">A cada 24 meses</option>
                                                    </select>
                                                )}
                                            </div>
                                        </div>

                                        {oc.lastVisitDate && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                                Última visita: {new Date(oc.lastVisitDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 pl-2">
                                        <button 
                                            onClick={() => onActionClick && onActionClick('VISITATION')}
                                            className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-black transition-colors"
                                        >
                                            <Briefcase size={14} />
                                            IR PARA PROSPECÇÃO
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverdueSLATab;
