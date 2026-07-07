import React, { useMemo } from 'react';
import { Truck, ExternalLink, Calendar, CalendarDays, Activity } from 'lucide-react';
import { StatusColors, StatusLabels } from '../../../constants/taskConstants';
import DashboardCard from '../DashboardCard';

const ClientTripsTab = ({ clientTrips, tasks, onEditTask, filterYear, setFilterYear, years }) => {
    // Calcular Métricas
    const { totalTrips, averageFrequency } = useMemo(() => {
        const total = clientTrips.length;
        let freq = 'N/A';

        if (total > 1) {
            const dates = clientTrips
                .map(t => new Date(t.date || t.created_at || t.createdAt).getTime())
                .filter(d => !isNaN(d))
                .sort((a, b) => a - b);

            if (dates.length > 1) {
                const firstDate = dates[0];
                const lastDate = dates[dates.length - 1];
                const diffTime = Math.abs(lastDate - firstDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const avgDays = Math.round(diffDays / (dates.length - 1));
                freq = `1 a cada ${avgDays} dias`;
            } else {
                freq = 'Viagens no mesmo dia';
            }
        } else if (total === 1) {
            freq = 'Única viagem';
        }

        return { totalTrips: total, averageFrequency: freq };
    }, [clientTrips]);

    return (
        <div className="flex flex-col gap-4">
            {/* Header com Filtros e Métricas */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total de Viagens</span>
                            <div className="text-xl font-black text-slate-800 leading-none mt-1">{totalTrips}</div>
                        </div>
                    </div>
                    
                    <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <CalendarDays size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Frequência Média</span>
                            <div className="text-sm font-black text-slate-800 leading-none mt-1.5">{averageFrequency}</div>
                        </div>
                    </div>
                </div>

                {/* Filtro de Ano */}
                {years && setFilterYear && (
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
                        <Calendar size={14} className="text-slate-400" />
                        <select
                            value={filterYear || ''}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer w-full"
                        >
                            <option value="">TODOS OS ANOS</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Tabela de Viagens */}
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
                                                {trip.isDateDefined ? new Date(trip.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A Definir'}
                                            </span>
                                            {trip.isDateDefined && <span className="text-[10px] text-slate-400 uppercase">{new Date(trip.date).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })}</span>}
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
        </div>
    );
};

export default ClientTripsTab;
