import React from 'react';
import { Truck, ExternalLink } from 'lucide-react';
import { StatusColors, StatusLabels } from '../../../constants/taskConstants';
import DashboardCard from '../DashboardCard';

const ClientTripsTab = ({ clientTrips, tasks, onEditTask }) => {
    return (
        <DashboardCard title="Histórico de Viagens" icon={Truck}>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Data</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tarefa</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Equipe</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Veículo / KM</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Custo</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {clientTrips.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-20 text-center text-slate-400 italic">
                                    Nenhuma viagem registrada para este cliente.
                                </td>
                            </tr>
                        ) : (
                            clientTrips.map((trip, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 align-top">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold ${!trip.isDateDefined ? 'text-amber-600' : 'text-slate-700'}`}>
                                                {trip.isDateDefined ? new Date(trip.date).toLocaleDateString() : 'A Definir'}
                                            </span>
                                            {trip.isDateDefined && <span className="text-[10px] text-slate-400 uppercase">{new Date(trip.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="font-bold text-xs text-slate-800 line-clamp-2">{trip.taskTitle}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase border ${StatusColors[trip.taskStatus]}`}>
                                                {StatusLabels[trip.taskStatus]}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {trip.team && trip.team.length > 0 ? trip.team.map((m, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] font-medium border border-blue-100">{m}</span>
                                            )) : <span className="text-[9px] text-slate-300 italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="text-xs font-bold text-slate-700">{trip.vehicle_info || trip.vehicle || '-'}</div>
                                        {trip.trip_km_end > 0 && (
                                            <div className="text-[10px] text-brand-600 font-bold mt-1">
                                                {trip.trip_km_end.toLocaleString()} KM
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="text-xs font-bold text-emerald-600">
                                            {trip.trip_cost || trip.cost ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: trip.trip_cost_currency || trip.currency || 'BRL' }).format(trip.trip_cost || trip.cost) : '-'}
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <button
                                            onClick={() => {
                                                const task = tasks.find(t => t.id === trip.taskId);
                                                if (task) onEditTask(task);
                                            }}
                                            className="p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white rounded-lg transition-all"
                                            title="Abrir Tarefa Completa"
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardCard>
    );
};

export default ClientTripsTab;
