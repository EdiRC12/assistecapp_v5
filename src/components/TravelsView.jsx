import React, { useState, useMemo } from 'react';
import {
    Plane, DollarSign, Search, Users, Download, MapPin, Edit2, Save, X, ExternalLink, BarChart3, List as ListIcon, ChevronLeft, AlertTriangle, Info, Calendar, Car, CreditCard, User, ClipboardList, CheckCircle2
} from 'lucide-react';
import {
    TaskStatus, StatusLabels, CategoryLabels, StatusColors
} from '../constants/taskConstants';
import { supabase } from '../supabaseClient';

import useIsMobile from '../hooks/useIsMobile';

const TravelsView = ({ tasks, onEditTask, onBack, vehicles = [], users = [], onUpdateTasks, onUpdateTests, initialClientFilter = '', notifySuccess, notifyError, hasMore, onLoadMore, isMeetingView }) => {
    const isMobile = useIsMobile();
    const [filters, setFilters] = useState({ client: initialClientFilter, status: '', team: '', date: '', dateMode: 'ALL', category: '', incident: '' });

    // Update filter if initialClientFilter changes (e.g. navigated from POLI again)
    React.useEffect(() => {
        setFilters(prev => ({ ...prev, client: initialClientFilter }));
    }, [initialClientFilter]);
    const [viewTab, setViewTab] = useState('LISTA'); // 'LISTA' or 'RESUMO'
    const [editingRow, setEditingRow] = useState(null); // idx of trip being edited
    const [editData, setEditData] = useState({}); // data being edited
    const [isSaving, setIsSaving] = useState(false);
    const [occurrenceTypes, setOccurrenceTypes] = useState([]);
    const [selectedTripForDetail, setSelectedTripForDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [newParticipantName, setNewParticipantName] = useState('');

    const fetchOccurrenceTypes = async () => {
        const { data } = await supabase.from('travel_occurrence_types').select('*').order('name');
        if (data) setOccurrenceTypes(data);
    };

    React.useEffect(() => {
        fetchOccurrenceTypes();
    }, []);

    // Flatten tasks into trips
    const trips = useMemo(() => {
        const list = [];
        tasks.forEach(task => {
            if (!task.visitation?.required) return;

            // If has specific travels
            if (task.travels && task.travels.length > 0) {
                task.travels.forEach((t, travelIdx) => {
                    list.push({
                        id: t.id || `${task.id}_${travelIdx}`,
                        taskId: task.id,
                        travelIdx: travelIdx,
                        client: task.client || task.title,
                        taskStatus: task.status,
                        category: task.category,
                        location: task.location, // Global location
                        date: t.date,
                        isDateDefined: t.isDateDefined,
                        team: Array.isArray(t.team) ? t.team : [t.team],
                        contacts: t.contacts,
                        role: t.role,
                        description: task.description,
                        // Prioritize travel-specific fields, fallback to task-level
                        trip_cost: t.cost !== undefined ? t.cost : task.trip_cost,
                        trip_cost_currency: t.currency || task.trip_cost_currency || 'BRL',
                        trip_km_start: t.km_start !== undefined ? t.km_start : task.trip_km_start,
                        trip_km_end: t.km_end !== undefined ? t.km_end : task.trip_km_end,
                        vehicle_info: t.vehicle || task.vehicle_info,
                        parent_test_id: task.parent_test_id,
                        parent_test_number: task.parent_test_number, // Novo campo para rastreabilidade
                        // Novos campos
                        has_fine: t.has_fine || false,
                        fine_driver: t.fine_driver || '',
                        fine_amount: t.fine_amount || 0,
                        occurrence: t.occurrence || '',
                        occurrence_obs: t.occurrence_obs || '',
                        occurrence_cost: t.occurrence_cost || 0,
                        // Custos detalhados
                        cost_fuel: t.cost_fuel || 0,
                        cost_lodging: t.cost_lodging || 0,
                        cost_food: t.cost_food || 0,
                        cost_extra: t.cost_extra || 0,
                        cost_airfare: t.cost_airfare || 0,
                        cost_car_rental: t.cost_car_rental || 0,
                        additional_participants: t.additional_participants || '',
                        isSpecific: true
                    });
                });
            } else {
                // Legacy or just marked as required but no trips added yet (shows as generic trip)
                list.push({
                    id: task.id + '_main',
                    taskId: task.id,
                    travelIdx: -1, // Indicates task-level
                    client: task.client || task.title,
                    taskStatus: task.status,
                    category: task.category,
                    location: task.location,
                    date: task.due_date, // Fallback
                    isDateDefined: !!task.due_date,
                    team: [],
                    contacts: task.contacts?.client || '',
                    role: '',
                    description: task.description,
                    trip_cost: task.trip_cost,
                    trip_cost_currency: task.trip_cost_currency,
                    trip_km_start: task.trip_km_start,
                    trip_km_end: task.trip_km_end,
                    vehicle_info: task.vehicle_info,
                    cost_fuel: task.cost_fuel || 0,
                    cost_lodging: task.cost_lodging || 0,
                    cost_food: task.cost_food || 0,
                    cost_extra: task.cost_extra || 0,
                    cost_airfare: task.cost_airfare || 0,
                    cost_car_rental: task.cost_car_rental || 0,
                    parent_test_id: task.parent_test_id,
                    parent_test_number: task.parent_test_number, 
                    isSpecific: false
                });
            }
        });
        return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [tasks]);

    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            if (filters.client) {
                const search = filters.client.toLowerCase();
                const matchesClient = trip.client.toLowerCase().includes(search) || search.includes(trip.client.toLowerCase());
                const matchesTest = trip.parent_test_number && (
                    trip.parent_test_number.toLowerCase().includes(search) || 
                    search.includes(trip.parent_test_number.toLowerCase())
                );
                const matchesTaskId = trip.taskId && (
                    trip.taskId.toLowerCase().includes(search) || 
                    search.includes(trip.taskId.toLowerCase())
                );

                if (!matchesClient && !matchesTest && !matchesTaskId) return false;
            }
            if (filters.status && trip.taskStatus !== filters.status) return false;
            if (filters.category && trip.category !== filters.category) return false;
            if (filters.team) {
                const search = filters.team.toLowerCase();
                if (!trip.team.some(m => m.toLowerCase().includes(search))) return false;
            }
            if (filters.date) {
                if (!trip.date) return false;
                if (filters.dateMode === 'DAY') {
                    if (trip.date !== filters.date) return false;
                } else if (filters.dateMode === 'MONTH') {
                    const dStr = trip.date.substring(0, 7);
                    const fStr = filters.date.substring(0, 7);
                    if (dStr !== fStr) return false;
                }
            }
            if (filters.incident) {
                if (filters.incident === 'FINE' && !trip.has_fine) return false;
                if (filters.incident === 'OCCURRENCE' && !trip.occurrence) return false;
            }
            return true;
        });
    }, [trips, filters]);

    const summaryData = useMemo(() => {
        const stats = {
            totalKm: 0,
            costs: {},
            totalFuel: 0,
            totalLodging: 0,
            totalFood: 0,
            totalExtra: 0,
            totalAirfare: 0,
            totalCarRental: 0,
            totalFines: 0,
            totalOccurrenceLoss: 0,
            fineCount: 0,
            occurrenceCount: 0,
            tripCount: filteredTrips.length,
            clientCount: new Set(filteredTrips.map(t => t.client)).size,
            byPerson: {},
            byVehicle: {}
        };

        filteredTrips.forEach(t => {
            const km = parseFloat(t.trip_km_end) || 0;
            stats.totalKm += km;

            const curr = t.trip_cost_currency || 'BRL';
            stats.costs[curr] = (stats.costs[curr] || 0) + (parseFloat(t.trip_cost) || 0);

            // Somar categorias
            stats.totalFuel += parseFloat(t.cost_fuel) || 0;
            stats.totalLodging += parseFloat(t.cost_lodging) || 0;
            stats.totalFood += parseFloat(t.cost_food) || 0;
            stats.totalExtra += parseFloat(t.cost_extra) || 0;
            stats.totalAirfare += parseFloat(t.cost_airfare) || 0;
            stats.totalCarRental += parseFloat(t.cost_car_rental) || 0;

            // Incidentes
            if (t.has_fine) {
                stats.totalFines += parseFloat(t.fine_amount) || 0;
                stats.fineCount += 1;
            }
            if (t.occurrence) {
                stats.totalOccurrenceLoss += parseFloat(t.occurrence_cost) || 0;
                stats.occurrenceCount += 1;
            }

            // Agrupamento por Veículo
            const vehicleKey = t.vehicle_info || 'Não Identificado';
            if (!stats.byVehicle[vehicleKey]) {
                stats.byVehicle[vehicleKey] = { km: 0, trips: 0, logisticsCost: 0, incidentCost: 0 };
            }
            stats.byVehicle[vehicleKey].km += km;
            stats.byVehicle[vehicleKey].trips += 1;
            stats.byVehicle[vehicleKey].logisticsCost += (
                (parseFloat(t.cost_fuel) || 0) + 
                (parseFloat(t.cost_lodging) || 0) + 
                (parseFloat(t.cost_food) || 0) + 
                (parseFloat(t.cost_extra) || 0) +
                (parseFloat(t.cost_airfare) || 0) +
                (parseFloat(t.cost_car_rental) || 0)
            );
            stats.byVehicle[vehicleKey].incidentCost += (parseFloat(t.occurrence_cost) || 0) + (t.has_fine ? (parseFloat(t.fine_amount) || 0) : 0);

            t.team.forEach(person => {
                if (!stats.byPerson[person]) {
                    stats.byPerson[person] = { 
                        km: 0, 
                        cost: 0, 
                        trips: 0,
                        logisticsCost: 0,
                        incidentCost: 0
                    };
                }
                stats.byPerson[person].km += km;
                stats.byPerson[person].cost += (parseFloat(t.trip_cost) || 0);
                stats.byPerson[person].trips += 1;
                
                // Custo de logística (operacional) proporcional ao membro? 
                stats.byPerson[person].logisticsCost += (
                    (parseFloat(t.cost_fuel) || 0) + 
                    (parseFloat(t.cost_lodging) || 0) + 
                    (parseFloat(t.cost_food) || 0) + 
                    (parseFloat(t.cost_extra) || 0) +
                    (parseFloat(t.cost_airfare) || 0) +
                    (parseFloat(t.cost_car_rental) || 0)
                );
                
                // Custos de incidentes
                if (t.has_fine && t.fine_driver === person) {
                    stats.byPerson[person].incidentCost += (parseFloat(t.fine_amount) || 0);
                }
                stats.byPerson[person].incidentCost += (parseFloat(t.occurrence_cost) || 0);
            });
        });

        // Investimento total em logística (operacional)
        stats.totalLogistics = Object.values(stats.costs).reduce((acc, val) => acc + val, 0);
        
        // Custo total de não conformidade (Incidentes)
        stats.totalIncidents = stats.totalFines + stats.totalOccurrenceLoss;

        // Custo Total Consolidado
        stats.totalConsolidated = stats.totalLogistics + stats.totalIncidents;

        return stats;
    }, [filteredTrips]);

    const handleStartEdit = (idx, trip) => {
        // Trava de segurança: Confirmar antes de editar dados já consolidados
        const hasData = parseFloat(trip.trip_km_end) > 0 && parseFloat(trip.trip_cost) > 0 && trip.vehicle_info;
        if (hasData) {
            if (!window.confirm("Esta viagem já possui dados registrados. Deseja realmente editar estas informações?")) {
                return;
            }
        }

        setEditingRow(idx);
        setEditData({
            km_total: trip.trip_km_end,
            vehicle: trip.vehicle_info,
            cost: trip.trip_cost,
            currency: trip.trip_cost_currency,
            // Novos
            has_fine: trip.has_fine,
            fine_driver: trip.fine_driver,
            fine_amount: trip.fine_amount,
            fine_payment_type: trip.fine_payment_type,
            fine_payer: trip.fine_payer,
            occurrence_obs: trip.occurrence_obs || '',
            occurrence_cost: trip.occurrence_cost || 0,
            cost_fuel: trip.cost_fuel || 0,
            cost_lodging: trip.cost_lodging || 0,
            cost_food: trip.cost_food || 0,
            cost_extra: trip.cost_extra || 0,
            cost_airfare: trip.cost_airfare || 0,
            cost_car_rental: trip.cost_car_rental || 0,
            additional_participants: trip.additional_participants ? trip.additional_participants.split(',').map(s => s.trim()).filter(Boolean) : []
        });
    };

    const handleSaveEdit = async (trip) => {
        const km = parseFloat(editData.km_total) || 0;
        const vehicle = editData.vehicle?.trim() || '';
        
        // Calcular custo total considerando categorias para validação
        const categorizedTotal = 
            (parseFloat(editData.cost_fuel) || 0) + 
            (parseFloat(editData.cost_lodging) || 0) + 
            (parseFloat(editData.cost_food) || 0) + 
            (parseFloat(editData.cost_extra) || 0) +
            (parseFloat(editData.cost_airfare) || 0) +
            (parseFloat(editData.cost_car_rental) || 0);
            
        const cost = trip.travelIdx === -1 ? (parseFloat(editData.cost) || 0) : categorizedTotal;

        if (km === 0 || cost === 0 || !vehicle) {
            if (!window.confirm("Atenção: Você está tentando salvar com informações pendentes (KM, Custo ou Veículo). Deseja salvar assim mesmo? Isso manterá o alerta da POLI ativo.")) {
                return;
            }
        }

        setIsSaving(true);
        try {
            const originalTask = tasks.find(t => t.id === trip.taskId);
            if (!originalTask) return;

            let updatePayload = {};
            const isFinalized = km > 0 && cost > 0 && vehicle !== '';

            if (trip.travelIdx === -1) {
                updatePayload = {
                    trip_km_start: 0,
                    trip_km_end: km,
                    vehicle_info: vehicle,
                    trip_cost: cost,
                    trip_cost_currency: editData.currency || 'BRL',
                    trip_info_finalized: isFinalized
                };
            } else {
                const totalCost = 
                    (parseFloat(editData.cost_fuel) || 0) + 
                    (parseFloat(editData.cost_lodging) || 0) + 
                    (parseFloat(editData.cost_food) || 0) + 
                    (parseFloat(editData.cost_extra) || 0) +
                    (parseFloat(editData.cost_airfare) || 0) +
                    (parseFloat(editData.cost_car_rental) || 0);

                const updatedTravels = [...(originalTask.travels || [])];
                if (updatedTravels[trip.travelIdx]) {
                    updatedTravels[trip.travelIdx] = {
                        ...updatedTravels[trip.travelIdx],
                        km_start: 0,
                        km_end: km,
                        vehicle: vehicle,
                        cost: totalCost,
                        currency: editData.currency || 'BRL',
                        is_finalized: isFinalized,
                        // Novos
                        has_fine: editData.has_fine,
                        fine_driver: editData.fine_driver,
                        fine_amount: parseFloat(editData.fine_amount) || 0,
                        fine_payment_type: editData.fine_payment_type,
                        fine_payer: editData.fine_payer,
                        occurrence: editData.occurrence,
                        occurrence_obs: editData.occurrence_obs,
                        occurrence_cost: parseFloat(editData.occurrence_cost) || 0,
                        cost_fuel: parseFloat(editData.cost_fuel) || 0,
                        cost_lodging: parseFloat(editData.cost_lodging) || 0,
                        cost_food: parseFloat(editData.cost_food) || 0,
                        cost_extra: parseFloat(editData.cost_extra) || 0,
                        cost_airfare: parseFloat(editData.cost_airfare) || 0,
                        cost_car_rental: parseFloat(editData.cost_car_rental) || 0,
                        additional_participants: Array.isArray(editData.additional_participants) ? editData.additional_participants.join(', ') : editData.additional_participants
                    };
                }
                updatePayload = { travels: updatedTravels };
            }

            // Gerenciar tipo de ocorrência no banco se for nova
            if (editData.occurrence && !occurrenceTypes.some(o => o.name === editData.occurrence)) {
                await supabase.from('travel_occurrence_types').upsert({ name: editData.occurrence });
                fetchOccurrenceTypes();
            }

            // --- ATUALIZAÇÃO OTIMISTA (LOCAL) ---
            // Atualizamos o estado local IMEDIATAMENTE para o usuário ver a mudança
            if (onUpdateTasks) {
                const updatedLocalTask = { ...originalTask, ...updatePayload };
                const newTasks = tasks.map(t => t.id === trip.taskId ? updatedLocalTask : t);
                onUpdateTasks(newTasks); // Passamos a lista atualizada para o pai
            }

            // --- PERSISTÊNCIA (BACKGROUND) ---
            const dbPromises = [supabase.from('tasks').update(updatePayload).eq('id', trip.taskId)];

            // Sincronizar custo no teste em paralelo se necessário
            if (originalTask.parent_test_id) {
                const syncTestCost = async () => {
                    const { data: testData } = await supabase.from('tech_tests').select('op_cost').eq('id', originalTask.parent_test_id).single();
                    if (testData) {
                        const currentTravels = updatePayload.travels || originalTask.travels || [];
                        const travelsCost = currentTravels.reduce((acc, tr) => acc + (parseFloat(tr.cost) || 0), 0);
                        const manualTripCost = parseFloat(updatePayload.trip_cost !== undefined ? updatePayload.trip_cost : originalTask.trip_cost) || 0;
                        const newGrossTotal = parseFloat(testData.op_cost || 0) + travelsCost + manualTripCost;
                        await supabase.from('tech_tests').update({ gross_total_cost: newGrossTotal }).eq('id', originalTask.parent_test_id);
                        if (onUpdateTests) onUpdateTests();
                    }
                };
                dbPromises.push(syncTestCost());
            }

            await Promise.all(dbPromises);
            setEditingRow(null);
            notifySuccess('Sucesso!', 'Dados da viagem atualizados.');
        } catch (error) {
            console.error('Error saving trip details:', error);
            notifyError('Erro ao salvar', 'Ocorreu um problema ao salvar no banco de dados.');
            // Em caso de erro real, poderíamos reverter o estado local aqui, 
            // mas geralmente o Supabase não falha nestes updates simples.
            if (onUpdateTasks) await onUpdateTasks(); 
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleOpenDetail = (trip) => {
        setSelectedTripForDetail(trip);
        setShowDetailModal(true);
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${isMeetingView ? 'h-full' : (isMobile ? 'h-full' : 'h-[calc(100vh-8rem)]')} flex flex-col overflow-hidden relative`}>
            {/* Header & Tabs */}
            <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-slate-200 bg-slate-50 print:hidden`}>
                <div className={`flex justify-between items-center ${isMobile ? 'mb-2' : 'mb-4'}`}>
                    <div className="flex flex-col">
                        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight`}>
                            {onBack && (
                                <button 
                                    onClick={onBack}
                                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors mr-1"
                                    title="Voltar"
                                >
                                    <ChevronLeft size={isMobile ? 20 : 24} className="text-slate-600" />
                                </button>
                            )}
                            <Plane className="text-brand-600" size={isMobile ? 20 : 24} /> {isMobile ? 'Viagens' : 'Controle de Viagens'}
                        </h2>
                        <div className={`flex items-center gap-2 ${isMobile ? 'mt-1' : 'mt-2'}`}>
                            <button
                                onClick={() => setViewTab('LISTA')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'LISTA' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                            >
                                <ListIcon size={12} /> {isMobile ? 'LISTA' : 'LISTA DETALHADA'}
                            </button>
                            <button
                                onClick={() => setViewTab('RESUMO')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'RESUMO' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                            >
                                <BarChart3 size={12} /> {isMobile ? 'RESUMO' : 'RESUMO MENSAL'}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        {!isMobile && (
                            <div className="hidden md:flex flex-col items-end mr-4">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Métricas do Filtro</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-brand-700">{summaryData.totalKm.toLocaleString()} KM</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-xs font-bold text-emerald-600">
                                        {Object.entries(summaryData.costs).map(([curr, total]) => `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: curr }).format(total)}`).join(' / ') || 'R$ 0,00'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <button onClick={handlePrint} className="flex items-center gap-1.5 md:gap-2 bg-slate-800 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl text-[9px] md:text-sm font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 shadow-lg"><Download size={isMobile ? 14 : 16} /> {isMobile ? 'Exportar' : 'Exportar Excel'}</button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className={`grid grid-cols-2 md:grid-cols-12 gap-2 pt-2 border-t border-slate-200/50`}>
                    <div className="relative col-span-2 md:col-span-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input type="text" placeholder="Cliente / Registro..." value={filters.client} onChange={e => setFilters(p => ({ ...p, client: e.target.value }))} className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 text-slate-600 appearance-none cursor-pointer overflow-hidden text-ellipsis transition-all">
                            <option value="">Status</option>
                            {Object.keys(TaskStatus).map(k => <option key={k} value={k}>{StatusLabels[k]}</option>)}
                        </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <select value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))} className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 text-slate-600 appearance-none cursor-pointer overflow-hidden text-ellipsis transition-all">
                            <option value="">Tipos</option>
                            {Object.keys(CategoryLabels).map(k => <option key={k} value={k}>{CategoryLabels[k]}</option>)}
                        </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <select value={filters.incident} onChange={e => setFilters(p => ({ ...p, incident: e.target.value }))} className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 text-slate-600 appearance-none cursor-pointer overflow-hidden text-ellipsis transition-all">
                            <option value="">Alertas</option>
                            <option value="FINE">Apenas Multas ⚠️</option>
                            <option value="OCCURRENCE">Apenas Ocorrências ℹ️</option>
                        </select>
                    </div>

                    <div className="relative col-span-1 md:col-span-2">
                        <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input type="text" placeholder="Equipe..." value={filters.team} onChange={e => setFilters(p => ({ ...p, team: e.target.value }))} className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                    </div>

                    <div className="flex gap-1 col-span-2 md:col-span-2">
                        <select value={filters.dateMode} onChange={e => setFilters(p => ({ ...p, dateMode: e.target.value }))} className="w-full px-1 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 text-slate-600 appearance-none cursor-pointer transition-all">
                            <option value="ALL">Período</option>
                            <option value="MONTH">Mês</option>
                            <option value="DAY">Dia</option>
                        </select>
                        {filters.dateMode !== 'ALL' && (
                            <input type={filters.dateMode === 'MONTH' ? 'month' : 'date'} value={filters.date} onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} className="flex-1 px-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 text-slate-600 transition-all" />
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-white" id="print-area">
                {viewTab === 'LISTA' ? (
                    <div className="min-w-full inline-block align-middle">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm print:shadow-none">
                                <tr>
                                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Data</th>
                                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Cliente / Local</th>
                                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Detalhes</th>
                                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Equipe</th>
                                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Veículo / KM</th>
                                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Custo</th>
                                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTrips.length === 0 ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">Nenhuma viagem encontrada.</td></tr>
                                ) : (
                                    filteredTrips.map((trip, idx) => {
                                        const isEditing = editingRow === idx;
                                        return (
                                            <React.Fragment key={idx}>
                                                <tr 
                                                    onDoubleClick={() => handleOpenDetail(trip)}
                                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isEditing ? 'bg-brand-50/30' : ''}`}
                                                >
                                                    <td className="p-4 align-top">
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-bold ${!trip.isDateDefined ? 'text-amber-600' : 'text-slate-700'}`}>
                                                                {trip.isDateDefined ? new Date(trip.date).toLocaleDateString() : 'A Definir'}
                                                            </span>
                                                            {trip.isDateDefined && <span className="text-[10px] text-slate-400 uppercase">{new Date(trip.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="font-bold text-xs text-slate-800">{trip.client}</div>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1"><MapPin size={10} /> {trip.location || 'Local não definido'}</div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block w-fit">{CategoryLabels[trip.category]}</div>
                                                            {trip.parent_test_id && (
                                                                <div className="text-[8px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded-md w-fit shadow-sm uppercase tracking-wider">
                                                                    {trip.parent_test_number || 'ENGENHARIA'}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${StatusColors[trip.taskStatus]}`}>
                                                                    {StatusLabels[trip.taskStatus]}
                                                                </span>
                                                                {trip.has_fine && (
                                                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-black border border-rose-200" title="Possui Multa">
                                                                        <AlertTriangle size={10} /> MULTA
                                                                    </span>
                                                                )}
                                                                {trip.occurrence && (
                                                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-black border border-amber-200" title={trip.occurrence}>
                                                                        <Info size={10} /> OCORRÊNCIA
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex flex-wrap gap-1">
                                                            {trip.team.length > 0 ? trip.team.map((m, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] font-medium border border-blue-100">{m}</span>
                                                            )) : <span className="text-[9px] text-slate-300 italic">-</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top min-w-[200px]">
                                                        {isEditing ? (
                                                            <div className="flex flex-col gap-3 w-full max-w-[200px] bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                                                {/* Veículo */}
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                        <Car size={10} /> Veículo
                                                                    </label>
                                                                    <input 
                                                                        type="text" 
                                                                        list="vehicle-list" 
                                                                        value={editData.vehicle} 
                                                                        onChange={e => setEditData(p => ({ ...p, vehicle: e.target.value }))}
                                                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none focus:border-brand-500 shadow-sm"
                                                                    />
                                                                </div>

                                                                {/* Acompanhantes - Sistema de Tags */}
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                        <Users size={10} /> Acompanhantes
                                                                    </label>
                                                                    <div className="flex gap-1">
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder="Nome..." 
                                                                            value={newParticipantName}
                                                                            onChange={e => setNewParticipantName(e.target.value)}
                                                                            onKeyDown={e => {
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    if (newParticipantName.trim()) {
                                                                                        setEditData(p => ({ ...p, additional_participants: [...(p.additional_participants || []), newParticipantName.trim()] }));
                                                                                        setNewParticipantName('');
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-[9px] outline-none focus:border-brand-500"
                                                                        />
                                                                        <button 
                                                                            onClick={() => {
                                                                                if (newParticipantName.trim()) {
                                                                                    setEditData(p => ({ ...p, additional_participants: [...(p.additional_participants || []), newParticipantName.trim()] }));
                                                                                    setNewParticipantName('');
                                                                                }
                                                                            }}
                                                                            className="p-1 px-2 bg-brand-500 text-white rounded font-black text-[10px] hover:bg-brand-600 transition-colors"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {(editData.additional_participants || []).map((name, i) => (
                                                                            <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded text-[8px] font-black border border-brand-100 uppercase">
                                                                                {name}
                                                                                <X size={8} className="cursor-pointer hover:text-rose-500" onClick={() => setEditData(p => ({ ...p, additional_participants: p.additional_participants.filter((_, idx) => idx !== i) }))} />
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* KM Final */}
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                        <BarChart3 size={10} /> KM Final Chegada
                                                                    </label>
                                                                    <input 
                                                                        type="number" 
                                                                        value={editData.km_total} 
                                                                        onFocus={(e) => e.target.select()}
                                                                        onChange={e => setEditData(p => ({ ...p, km_total: e.target.value }))}
                                                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none focus:border-brand-500 shadow-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <div className="text-xs font-bold text-slate-700">{trip.vehicle_info || '-'}</div>
                                                                {trip.trip_km_end > 0 && (
                                                                    <div className="text-[10px] text-brand-600 font-bold mt-1">
                                                                        {trip.trip_km_end.toLocaleString()} KM <span className="text-slate-400 font-normal italic">percorridos</span>
                                                                    </div>
                                                                )}
                                                                {trip.additional_participants && (
                                                                    <div className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase">
                                                                        + {trip.additional_participants.split(',').length} acompanhante(s)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top bg-slate-50/30">
                                                        {isEditing ? (
                                                            <div className="flex flex-col gap-2 w-36">
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-0.5"><Car size={8} /> Combust.</label>
                                                                        <input type="number" step="0.01" value={editData.cost_fuel} onChange={e => setEditData(p => ({ ...p, cost_fuel: e.target.value }))} className="px-1 py-1 border border-slate-300 rounded text-[9px] font-bold outline-none bg-white shadow-sm focus:border-emerald-500" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-0.5"><MapPin size={8} /> Hosped.</label>
                                                                        <input type="number" step="0.01" value={editData.cost_lodging} onChange={e => setEditData(p => ({ ...p, cost_lodging: e.target.value }))} className="px-1 py-1 border border-slate-300 rounded text-[9px] font-bold outline-none bg-white shadow-sm focus:border-emerald-500" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-0.5"><Users size={8} /> Alimen.</label>
                                                                        <input type="number" step="0.01" value={editData.cost_food} onChange={e => setEditData(p => ({ ...p, cost_food: e.target.value }))} className="px-1 py-1 border border-slate-300 rounded text-[9px] font-bold outline-none bg-white shadow-sm focus:border-emerald-500" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-0.5"><Plane size={8} /> Passag.</label>
                                                                        <input type="number" step="0.01" value={editData.cost_airfare} onChange={e => setEditData(p => ({ ...p, cost_airfare: e.target.value }))} className="px-1 py-1 border border-slate-300 rounded text-[9px] font-bold outline-none bg-white shadow-sm focus:border-emerald-500" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-0.5"><Car size={8} /> Alugue.</label>
                                                                        <input type="number" step="0.01" value={editData.cost_car_rental} onChange={e => setEditData(p => ({ ...p, cost_car_rental: e.target.value }))} className="px-1 py-1 border border-slate-300 rounded text-[9px] font-bold outline-none bg-white shadow-sm focus:border-emerald-500" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-0.5">+ Extra</label>
                                                                        <input type="number" step="0.01" value={editData.cost_extra} onChange={e => setEditData(p => ({ ...p, cost_extra: e.target.value }))} className="px-1 py-1 border border-slate-300 rounded text-[9px] font-bold outline-none bg-white shadow-sm focus:border-emerald-500" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between border-t border-slate-200 pt-1 mt-1">
                                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Total Geral</span>
                                                                    <span className="text-[10px] font-black text-emerald-600">
                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: editData.currency }).format(
                                                                            (parseFloat(editData.cost_fuel) || 0) + 
                                                                            (parseFloat(editData.cost_lodging) || 0) + 
                                                                            (parseFloat(editData.cost_food) || 0) + 
                                                                            (parseFloat(editData.cost_extra) || 0) +
                                                                            (parseFloat(editData.cost_airfare) || 0) +
                                                                            (parseFloat(editData.cost_car_rental) || 0)
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm font-black text-emerald-600">
                                                                {trip.trip_cost ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: trip.trip_cost_currency || 'BRL' }).format(trip.trip_cost) : '-'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex items-center gap-2">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleSaveEdit(trip)}
                                                                        disabled={isSaving}
                                                                        className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded transition-colors"
                                                                        title="Salvar Alterações"
                                                                    >
                                                                        <Save size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingRow(null)}
                                                                        className="p-1.5 bg-slate-100 text-slate-400 hover:bg-slate-200 rounded transition-colors"
                                                                        title="Cancelar"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleStartEdit(idx, trip)}
                                                                        className="p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded transition-colors"
                                                                        title="Editar Informações da Viagem"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { const original = tasks.find(t => t.id === trip.taskId); if (original) onEditTask(original); }}
                                                                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                                        title="Abrir Tarefa Completa"
                                                                    >
                                                                        <ExternalLink size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Edit Row - Extras (Multas e Ocorrências) */}
                                                {isEditing && (
                                                    <tr className="bg-brand-50/50">
                                                        <td colSpan="7" className="p-4 pt-0 border-b border-brand-100">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white border border-brand-100 rounded-2xl shadow-sm">
                                                                {/* Fines Section */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                                                            <AlertTriangle size={14} className="text-rose-500" /> Registro de Multa
                                                                        </label>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-bold text-slate-500 mr-1">Possui multa?</span>
                                                                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                                                <button 
                                                                                    onClick={() => setEditData(p => ({ ...p, has_fine: true }))}
                                                                                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${editData.has_fine ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                                >
                                                                                    SIM
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => setEditData(p => ({ ...p, has_fine: false }))}
                                                                                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${!editData.has_fine ? 'bg-slate-400 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                                >
                                                                                    NÃO
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {editData.has_fine && (
                                                                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-1 duration-200">
                                                                            <div className="col-span-2">
                                                                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Quem Tomou? (Condutor)</label>
                                                                                <select
                                                                                    value={editData.fine_driver}
                                                                                    onChange={e => setEditData(p => ({ ...p, fine_driver: e.target.value }))}
                                                                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500"
                                                                                >
                                                                                    <option value="">Selecione o Condutor</option>
                                                                                    {users.map(u => (
                                                                                        <option key={u.id} value={u.username || u.full_name || u.email}>
                                                                                            {u.username || u.full_name || u.email}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Valor da Multa</label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={editData.fine_amount}
                                                                                    onChange={e => setEditData(p => ({ ...p, fine_amount: e.target.value }))}
                                                                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-rose-600 outline-none focus:ring-2 focus:ring-rose-500"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Tipo de Pagamento</label>
                                                                                <select 
                                                                                    value={editData.fine_payment_type}
                                                                                    onChange={e => setEditData(p => ({ ...p, fine_payment_type: e.target.value }))}
                                                                                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none"
                                                                                >
                                                                                    <option value="DRIVER">Assumida pelo Condutor</option>
                                                                                    <option value="DOUBLE">Pagar em Dobro (Omitir)</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="col-span-2">
                                                                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Quem Pagou?</label>
                                                                                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 inline-flex">
                                                                                    <button 
                                                                                        onClick={() => setEditData(p => ({ ...p, fine_payer: 'COMPANY' }))}
                                                                                        className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${editData.fine_payer === 'COMPANY' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                                    >
                                                                                        EMPRESA
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => setEditData(p => ({ ...p, fine_payer: 'EMPLOYEE' }))}
                                                                                        className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${editData.fine_payer === 'EMPLOYEE' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                                    >
                                                                                        FUNCIONÁRIO
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Occurrences Section */}
                                                                <div className="space-y-4">
                                                                    <div className="border-b border-slate-100 pb-2">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                                                            <Info size={14} className="text-amber-500" /> Registro de Ocorrência
                                                                        </label>
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="col-span-2 md:col-span-1">
                                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">O que aconteceu?</label>
                                                                            <div className="flex gap-2">
                                                                                <input 
                                                                                    type="text"
                                                                                    list="occurrence-list"
                                                                                    value={editData.occurrence}
                                                                                    onChange={e => setEditData(p => ({ ...p, occurrence: e.target.value }))}
                                                                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 font-bold"
                                                                                    placeholder="Ex: Pneu furado..."
                                                                                />
                                                                                <button 
                                                                                    onClick={async () => {
                                                                                        if (editData.occurrence) {
                                                                                            await supabase.from('travel_occurrence_types').upsert({ name: editData.occurrence });
                                                                                            fetchOccurrenceTypes();
                                                                                            notifySuccess('Registrado!', 'Tipo de ocorrência salvo no banco.');
                                                                                        }
                                                                                    }}
                                                                                    className="px-3 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black hover:bg-amber-600 transition-colors shadow-sm"
                                                                                    title="Salvar sugestão"
                                                                                >
                                                                                    <Save size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-span-2 md:col-span-1">
                                                                            <label className="text-[9px] font-black text-rose-500 uppercase block mb-1 flex items-center gap-1">
                                                                                <DollarSign size={10} /> Valor do Prejuízo / Reparo
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={editData.occurrence_cost}
                                                                                onChange={e => setEditData(p => ({ ...p, occurrence_cost: e.target.value }))}
                                                                                className="w-full px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs outline-none focus:border-rose-500 font-bold text-rose-600"
                                                                                placeholder="R$ 0,00"
                                                                            />
                                                                        </div>

                                                                        <div className="col-span-2">
                                                                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Observações Adicionais</label>
                                                                            <textarea 
                                                                                value={editData.occurrence_obs}
                                                                                onChange={e => setEditData(p => ({ ...p, occurrence_obs: e.target.value }))}
                                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 min-h-[60px] resize-none"
                                                                                placeholder="Detalhes sobre o reparo ou imprevisto..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {hasMore && (
                            <div className="p-6 flex justify-center bg-slate-50/30 border-t border-slate-100 print:hidden">
                                <button
                                    onClick={onLoadMore}
                                    className="flex items-center gap-2 px-10 py-3 bg-brand-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-xl hover:shadow-brand-100 hover:-translate-y-0.5 transition-all active:scale-95"
                                >
                                    Carregar Mais Viagens
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-slate-50/10">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Plane size={24} /></div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Deslocamento Total</div>
                                    <div className="text-2xl font-black text-slate-800 leading-none">{summaryData.totalKm.toLocaleString()} <span className="text-xs font-bold text-slate-400">KM</span></div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Custo Logística <span className="text-[8px] font-bold text-slate-300">(OPERACIONAL)</span></div>
                                    <div className="text-2xl font-black text-emerald-600 leading-none">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalLogistics)}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 border-l-4 border-l-amber-500">
                                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><AlertTriangle size={24} /></div>
                                <div>
                                    <div className="text-[10px] font-black text-amber-600/60 uppercase tracking-[0.15em] mb-1">Custos Incidentes <span className="text-[8px] font-bold text-amber-300">(REATIVO)</span></div>
                                    <div className="text-2xl font-black text-amber-700 leading-none">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalIncidents)}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-110 transition-transform"><DollarSign size={80} className="text-white" /></div>
                                <div className="p-4 bg-slate-800 text-brand-400 rounded-2xl z-10"><BarChart3 size={24} /></div>
                                <div className="z-10">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Custo Geral Consolidado</div>
                                    <div className="text-2xl font-black text-brand-400 leading-none">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalConsolidated)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sub-Header: Viagens and Clientes info */}
                        <div className="flex flex-wrap gap-4 items-center justify-between bg-white/50 p-4 rounded-3xl border border-slate-200 border-dashed">
                             <div className="flex gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">{summaryData.tripCount} Viagens Realizadas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">{summaryData.clientCount} Clientes Atendidos</span>
                                </div>
                             </div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                * Soma de Logística + Incidentes = Custo Geral
                             </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Custo Detalhado por Categoria */}
                            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <DollarSign size={16} className="text-emerald-500" /> Detalhamento Operacional
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 uppercase">Resumo Financeiro</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">⛽ Combustível</div>
                                        <div className="text-lg font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalFuel)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">🏨 Hospedagem</div>
                                        <div className="text-lg font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalLodging)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">🍽️ Alimentação</div>
                                        <div className="text-lg font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalFood)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">✈️ Passagens</div>
                                        <div className="text-lg font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalAirfare)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">🚗 Aluguel</div>
                                        <div className="text-lg font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalCarRental)}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-emerald-600 transition-colors">➕ Extra</div>
                                        <div className="text-lg font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalExtra)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Resumo de Incidentes e Perdas */}
                            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-amber-500" /> Auditoria de Incidentes
                                    </h3>
                                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 uppercase">Impacto Financeiro</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black text-xs">{summaryData.fineCount}</div>
                                            <div>
                                                <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none">Multas de Trânsito</div>
                                                <div className="text-xs font-bold text-slate-500 mt-1 italic">Total acumulado</div>
                                            </div>
                                        </div>
                                        <div className="text-lg font-black text-rose-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalFines)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-black text-xs">{summaryData.occurrenceCount}</div>
                                            <div>
                                                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">Ocorrências / Prejuízos</div>
                                                <div className="text-xs font-bold text-slate-500 mt-1 italic">Danos e reparos</div>
                                            </div>
                                        </div>
                                        <div className="text-lg font-black text-amber-700">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalOccurrenceLoss)}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-3xl text-white flex justify-between items-center shadow-lg shadow-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total de Custos de Incidentes</span>
                                    <span className="text-xl font-black text-emerald-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.totalIncidents)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Fleet Usage Breakdown Table */}
                        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Car size={18} className="text-blue-500" /> Uso da Frota (Resumo por Veículo)
                                </h3>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Métricas de {Object.keys(summaryData.byVehicle).length} veículos</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Veículo (Modelo/Placa)</th>
                                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Viagens</th>
                                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">KM Acumulada</th>
                                            <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right">Custo em Viagens</th>
                                            <th className="p-6 text-[10px] font-black text-amber-500 uppercase tracking-widest text-right">Ocorrências</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.entries(summaryData.byVehicle).length === 0 ? (
                                            <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic font-medium">Nenhum dado de veículo para o filtro selecionado.</td></tr>
                                        ) : (
                                            Object.entries(summaryData.byVehicle).sort((a, b) => b[1].km - a[1].km).map(([vehicle, stats]) => (
                                                <tr key={vehicle} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                                <Car size={14} />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{vehicle}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-xs text-slate-600 text-center font-bold">{stats.trips}</td>
                                                    <td className="p-6 text-xs text-slate-600 text-center font-black">{stats.km.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">KM</span></td>
                                                    <td className="p-6 text-xs text-emerald-600 text-right font-black">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.logisticsCost)}
                                                    </td>
                                                    <td className="p-6 text-xs text-amber-600 text-right font-black">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.incidentCost)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Person Breakdown Table */}
                        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={18} className="text-brand-500" /> Resumo de Atividades por Colaborador
                                </h3>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dados de {filteredTrips.length} viagens filtradas</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaborador</th>
                                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Viagens</th>
                                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">KM Percorridos</th>
                                            <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right">Custo Logística</th>
                                            <th className="p-6 text-[10px] font-black text-rose-500 uppercase tracking-widest text-right">Custos Incidentes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.entries(summaryData.byPerson).length === 0 ? (
                                            <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic font-medium">Nenhum dado para o filtro selecionado.</td></tr>
                                        ) : (
                                            Object.entries(summaryData.byPerson).sort((a, b) => b[1].km - a[1].km).map(([person, stats]) => (
                                                <tr key={person} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                                                {person.charAt(0)}
                                                            </div>
                                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{person}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-xs text-slate-600 text-center font-bold">{stats.trips}</td>
                                                    <td className="p-6 text-xs text-slate-600 text-center font-black">{stats.km.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">KM</span></td>
                                                    <td className="p-6 text-xs text-emerald-600 text-right font-black">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.logisticsCost)}
                                                    </td>
                                                    <td className="p-6 text-xs text-rose-600 text-right font-black">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.incidentCost)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-6 rounded-[32px] text-white flex items-start gap-4">
                            <BarChart3 className="text-brand-400 shrink-0 mt-1" size={20} />
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-1">Nota de Auditoria</h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                    Este painel consolida automaticamente todos os custos operacionais (Logística) e custos reativos (Não Conformidade). 
                                    Os valores apresentados refletem o impacto financeiro direto das viagens cadastradas, permitindo monitorar o cumprimento do orçamento e a recorrência de incidentes por colaborador.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes da Viagem */}
            {showDetailModal && selectedTripForDetail && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[96%]">
                        {/* Header Modal */}
                        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-100">
                                    <ClipboardList size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                                        Ficha da Viagem
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {selectedTripForDetail.client}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowDetailModal(false)} 
                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-slate-800 transition-all hover:bg-slate-100 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Corpo do Modal */}
                        <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                            {/* Grid Principal: Info Operacional */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-slate-300" size={18} />
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Data da Viagem</label>
                                            <span className="text-sm font-bold text-slate-700">
                                                {selectedTripForDetail.isDateDefined ? new Date(selectedTripForDetail.date).toLocaleDateString('pt-BR', { dateStyle: 'long' }) : 'Data não definida'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Car className="text-slate-300" size={18} />
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Veículo Utilizado</label>
                                            <span className="text-sm font-bold text-slate-700">
                                                {selectedTripForDetail.vehicle_info || 'Não informado'} 
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <MapPin className="text-slate-300" size={18} />
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Distância Percorrida</label>
                                            <span className="text-sm font-bold text-slate-700">
                                                {selectedTripForDetail.trip_km_end > 0 ? `${selectedTripForDetail.trip_km_end.toLocaleString()} KM` : 'Não informado'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Users className="text-slate-300" size={18} />
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Equipe Técnica</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {selectedTripForDetail.team.length > 0 ? selectedTripForDetail.team.map((m, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100">{m}</span>
                                                )) : <span className="text-xs text-slate-400">Nenhum membro registrado</span>}
                                                {selectedTripForDetail.additional_participants && (
                                                    <div className="w-full mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase w-full mb-1">Acompanhantes</span>
                                                        {selectedTripForDetail.additional_participants.split(',').map((p, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-medium border border-slate-200 uppercase">{p.trim()}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <DollarSign size={14} className="text-emerald-500" /> Resumo Financeiro
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500">Custo da Viagem (KM/Pedágio)</span>
                                            <span className="font-bold text-slate-700">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: selectedTripForDetail.trip_cost_currency || 'BRL' }).format(selectedTripForDetail.trip_cost || 0)}
                                            </span>
                                        </div>
                                        <div className="pt-2 space-y-1 border-t border-slate-100 mt-2">
                                            {selectedTripForDetail.cost_fuel > 0 && (
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>⛽ Combustível</span>
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.cost_fuel)}</span>
                                                </div>
                                            )}
                                            {selectedTripForDetail.cost_lodging > 0 && (
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>🏨 Hospedagem</span>
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.cost_lodging)}</span>
                                                </div>
                                            )}
                                            {selectedTripForDetail.cost_food > 0 && (
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>🍽️ Alimentação</span>
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.cost_food)}</span>
                                                </div>
                                            )}
                                            {selectedTripForDetail.cost_extra > 0 && (
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>➕ Extra</span>
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.cost_extra)}</span>
                                                </div>
                                            )}
                                            {selectedTripForDetail.cost_airfare > 0 && (
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>✈️ Passagens Aéreas</span>
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.cost_airfare)}</span>
                                                </div>
                                            )}
                                            {selectedTripForDetail.cost_car_rental > 0 && (
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>🚗 Aluguel de Carro</span>
                                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.cost_car_rental)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {selectedTripForDetail.has_fine && (
                                            <div className="flex justify-between items-center text-xs pt-2">
                                                <span className="text-rose-500 font-bold flex items-center gap-1">
                                                    <AlertTriangle size={12} /> Custo Incidente (Multa)
                                                </span>
                                                <span className="font-bold text-rose-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.fine_amount || 0)}
                                                </span>
                                            </div>
                                        )}

                                        {selectedTripForDetail.occurrence_cost > 0 && (
                                            <div className="flex justify-between items-center text-xs pt-1">
                                                <span className="text-amber-600 font-bold flex items-center gap-1">
                                                    <DollarSign size={12} /> Prejuízo (Ocorrência)
                                                </span>
                                                <span className="font-bold text-amber-700">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.occurrence_cost)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="pt-3 border-t border-slate-200 flex justify-between items-center mt-2">
                                            <span className="text-xs font-black text-slate-800 uppercase">Impacto Total</span>
                                            <span className="text-lg font-black text-slate-900 leading-none">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                    (parseFloat(selectedTripForDetail.trip_cost) || 0) + 
                                                    (selectedTripForDetail.has_fine ? (parseFloat(selectedTripForDetail.fine_amount) || 0) : 0) +
                                                    (parseFloat(selectedTripForDetail.occurrence_cost) || 0)
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seção de Incidentes (Multas e Ocorrências) */}
                            {(selectedTripForDetail.has_fine || selectedTripForDetail.occurrence) && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <Info size={16} className="text-amber-500" /> Detalhes de Incidentes e Auditoria
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {selectedTripForDetail.has_fine && (
                                            <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100 space-y-4">
                                                <div className="flex items-center gap-2 text-rose-600">
                                                    <AlertTriangle size={18} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Registro de Multa</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center py-1 border-b border-rose-100/50">
                                                        <span className="text-[10px] text-rose-400 font-bold uppercase">Condutor</span>
                                                        <span className="text-xs font-bold text-slate-700">{selectedTripForDetail.fine_driver || 'Não identificado'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-1 border-b border-rose-100/50">
                                                        <span className="text-[10px] text-rose-400 font-bold uppercase">Valor da Infração</span>
                                                        <span className="text-xs font-bold text-rose-600">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.fine_amount || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-1 border-b border-rose-100/50">
                                                        <span className="text-[10px] text-rose-400 font-bold uppercase">Tipo de Reembolso</span>
                                                        <span className="text-[10px] font-bold text-slate-700 px-2 py-0.5 bg-white rounded uppercase whitespace-nowrap">
                                                            {selectedTripForDetail.fine_payment_type === 'DOUBLE' ? 'Pagar em Dobro' : 'Assumida p/ Condutor'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2">
                                                        <span className="text-[10px] text-rose-400 font-bold uppercase">Responsável</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${selectedTripForDetail.fine_payer === 'COMPANY' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                            {selectedTripForDetail.fine_payer === 'COMPANY' ? 'EMPRESA' : 'FUNCIONÁRIO'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedTripForDetail.occurrence && (
                                            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 space-y-4">
                                                <div className="flex items-center gap-2 text-amber-600">
                                                    <Info size={18} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Ocorrência</span>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-amber-500 uppercase block mb-1">Título / Tipo</label>
                                                        <p className="text-xs font-bold text-slate-700 italic">"{selectedTripForDetail.occurrence}"</p>
                                                    </div>
                                                    {selectedTripForDetail.occurrence_obs && (
                                                        <div>
                                                            <label className="text-[9px] font-bold text-amber-500 uppercase block mb-1">Observações</label>
                                                            <p className="text-xs text-slate-600 leading-relaxed bg-white/50 p-3 rounded-xl border border-amber-100/50">
                                                                {selectedTripForDetail.occurrence_obs}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {selectedTripForDetail.occurrence_cost > 0 && (
                                                        <div className="pt-3 border-t border-amber-200/50 flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-amber-700 uppercase">Valor do Prejuízo</span>
                                                            <span className="text-sm font-black text-amber-800">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.occurrence_cost)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Seção de Resumo Case */}
                            <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100/50 space-y-3">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ClipboardList size={14} /> Relatório Consolidado da Viagem
                                </label>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                    {(() => {
                                        const dateStr = selectedTripForDetail.isDateDefined 
                                            ? new Date(selectedTripForDetail.date).toLocaleDateString('pt-BR', { dateStyle: 'long' }) 
                                            : 'uma data a definir';
                                        
                                        const teamStr = selectedTripForDetail.team.length > 0 
                                            ? selectedTripForDetail.team.join(', ') 
                                            : 'a equipe técnica';
                                        
                                        const additionalStr = selectedTripForDetail.additional_participants 
                                            ? ` (com acompanhamento de: ${selectedTripForDetail.additional_participants})`
                                            : '';
                                        
                                        const objectiveStr = selectedTripForDetail.parent_test_id 
                                            ? `realização do teste técnico ${selectedTripForDetail.parent_test_number || '#' + selectedTripForDetail.parent_test_id.substring(0,8)}`
                                            : `realização de ${CategoryLabels[selectedTripForDetail.category] || 'uma atividade programada'}`;
                                        
                                        const fineStr = selectedTripForDetail.has_fine 
                                            ? ` Durante o trajeto, registrou-se uma multa de trânsito no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.fine_amount || 0)}.`
                                            : '';
                                        
                                        const occurrenceStr = selectedTripForDetail.occurrence 
                                            ? ` Houve também o relato da seguinte ocorrência: "${selectedTripForDetail.occurrence}"${selectedTripForDetail.occurrence_cost > 0 ? ` (Custo de reparo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.occurrence_cost)})` : ''}.`
                                            : '';
                                        
                                        const totalImpact = (parseFloat(selectedTripForDetail.trip_cost) || 0) + 
                                                           (selectedTripForDetail.has_fine ? (parseFloat(selectedTripForDetail.fine_amount) || 0) : 0) +
                                                           (parseFloat(selectedTripForDetail.occurrence_cost) || 0);
                                        const impactStr = ` O investimento total logístico (incluindo deslocamento, estadia e taxas) foi de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalImpact)}.`;

                                        return (
                                            <>
                                                No dia <span className="text-slate-900 font-bold">{dateStr}</span>, a equipe composta por <span className="text-slate-900 font-bold">{teamStr}</span>{additionalStr} deslocou-se ao cliente <span className="text-slate-900 font-bold">{selectedTripForDetail.client}</span> com o objetivo de {objectiveStr}.
                                                A atividade foi concluída com um percurso total de <span className="text-slate-900 font-bold">{(selectedTripForDetail.trip_km_end || 0).toLocaleString()} KM</span> utilizando o veículo <span className="text-slate-900 font-bold">{selectedTripForDetail.vehicle_info || 'não informado'}</span>.
                                                {fineStr}
                                                {occurrenceStr}
                                                {impactStr}
                                            </>
                                        );
                                    })()}
                                </p>
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="p-6 md:p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="px-8 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                            >
                                <CheckCircle2 size={16} /> Fechar Visualização
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Datalists */}
            <datalist id="occurrence-list">
                {occurrenceTypes.map((o, i) => (
                    <option key={i} value={o.name} />
                ))}
            </datalist>
            <datalist id="vehicle-list">
                {vehicles.map(v => (
                    <option key={v.id} value={`${v.model} (${v.plate})`} />
                ))}
            </datalist>

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}</style>
        </div >
    );
};

export default TravelsView;
