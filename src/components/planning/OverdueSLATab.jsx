import React from 'react';
import { AlertTriangle, Users, MapPin, CalendarClock, Briefcase } from 'lucide-react';

const OverdueSLATab = ({ overdueClients = [], onActionClick }) => {
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
                            Clientes aguardando agendamento imediato
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
                        {overdueClients.map((oc, i) => (
                            <div key={i} className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-black text-slate-800 text-sm pl-2 leading-tight flex-1">{oc.client.name}</h3>
                                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-1 rounded-lg shrink-0 ml-2">
                                        {oc.monthsOverdue === 999 ? 'Nunca Visitado' : `Atraso: ${oc.monthsOverdue} meses`}
                                    </span>
                                </div>
                                
                                <div className="pl-2 space-y-2 mb-4">
                                    {oc.client.city && oc.client.state && (
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                            <MapPin size={12} className="text-slate-400" />
                                            {oc.client.city} - {oc.client.state}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                        <CalendarClock size={12} className="text-slate-400" />
                                        Meta Exigida: A cada {oc.client.visit_frequency_months} meses
                                    </div>
                                    {oc.lastVisitDate && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                            Última visita: {oc.lastVisitDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-100 pl-2">
                                    <button 
                                        onClick={() => onActionClick('VISITATION')}
                                        className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-black transition-colors"
                                    >
                                        <Briefcase size={14} />
                                        IR PARA PROSPECÇÃO
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverdueSLATab;
