import React, { useState, useMemo } from 'react';
import {
    Plane, DollarSign, Search, Users, Download, MapPin, Edit2, Save, X, ExternalLink, BarChart3, List as ListIcon, ChevronLeft, AlertTriangle, Info, Calendar, Car, CreditCard, User, ClipboardList, CheckCircle2, Unlink, Printer
} from 'lucide-react';
import {
    TaskStatus, StatusLabels, CategoryLabels, StatusColors
} from '../constants/taskConstants';
import { supabase } from '../supabaseClient';

import useIsMobile from '../hooks/useIsMobile';

const TravelsView = ({ tasks, onEditTask, onBack, vehicles = [], users = [], onUpdateTasks, onUpdateTests, initialClientFilter = '', notifySuccess, notifyError, hasMore, onLoadMore, isMeetingView, fetchTasks }) => {
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
    const [vehicleIssueTypes, setVehicleIssueTypes] = useState([]);
    const [selectedTripForDetail, setSelectedTripForDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [newParticipantName, setNewParticipantName] = useState('');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedTrips, setSelectedTrips] = useState([]); // Array of trip IDs
    const [isProrationModalOpen, setIsProrationModalOpen] = useState(false);
    const [printOrientation, setPrintOrientation] = useState('landscape'); // 'portrait' or 'landscape'
    const [prorationData, setProrationData] = useState({
        km_total: 0,
        cost_fuel: 0,
        cost_lodging: 0,
        cost_food: 0,
        cost_extra: 0,
        cost_airfare: 0,
        cost_car_rental: 0,
        vehicle: '',
        currency: 'BRL',
        fine_amount: 0,
        fine_distribution: 'PRORATE',
        fine_target_id: '',
        occurrence_name: '',
        occurrence_cost: 0,
        occurrence_distribution: 'PRORATE',
        occurrence_target_id: '',
        additional_participants: []
    });

    const fetchOccurrenceTypes = async () => {
        const { data } = await supabase.from('travel_occurrence_types').select('*').order('name');
        if (data) setOccurrenceTypes(data);
    };

    const fetchVehicleIssueTypes = async () => {
        const { data } = await supabase.from('vehicle_issue_types').select('*').order('name');
        if (data) setVehicleIssueTypes(data);
    };

    React.useEffect(() => {
        fetchOccurrenceTypes();
        fetchVehicleIssueTypes();
    }, []);

    // Flatten tasks into trips
    const trips = useMemo(() => {
        const list = [];
        tasks.forEach(task => {
            if (!task.visitation?.required) return;

            // If has specific travels
            if (task.travels && task.travels.length > 0) {
                task.travels.forEach((t, travelIdx) => {
                    const techParticipants = t.tech_participants || [];
                    const techNames = techParticipants.map(uid => users.find(u => u.id === uid)?.username || users.find(u => u.id === uid)?.full_name).filter(Boolean);

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
                        team: [
                            ...(Array.isArray(t.team) ? t.team : [t.team]),
                            ...techNames,
                            ...(t.additional_participants ? t.additional_participants.split(',').map(s => s.trim()) : [])
                        ].filter((name, idx, self) => name && name !== 'N/A' && name !== '' && self.indexOf(name) === idx),
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
                        // Veículo Condição
                        vehicle_status: t.vehicle_status || 'CONFORME',
                        vehicle_issue: t.vehicle_issue || '',
                        // Custos detalhados
                        cost_fuel: t.cost_fuel || 0,
                        cost_lodging: t.cost_lodging || 0,
                        cost_food: t.cost_food || 0,
                        cost_extra: t.cost_extra || 0,
                        cost_airfare: t.cost_airfare || 0,
                        cost_car_rental: t.cost_car_rental || 0,
                        additional_participants: t.additional_participants || '',
                        status: t.status || 'PROGRAMADA',
                        group_id: t.group_id,
                        group_name: t.group_name,
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
                    status: 'PROGRAMADA',
                    vehicle_status: task.vehicle_status || 'CONFORME',
                    vehicle_issue: task.vehicle_issue || '',
                    group_id: task.group_id,
                    group_name: task.group_name,
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
            byVehicle: {},
            irregularityCount: 0,
            irregularityRanking: {} // { issue: { total: 0, vehicles: { vName: count } } }
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

            // Irregularidades
            if (t.vehicle_status === 'IRREGULAR') {
                stats.irregularityCount += 1;
                const issue = t.vehicle_issue || 'Não Especificado';
                const vName = t.vehicle_info || 'Não Identificado';
                
                if (!stats.irregularityRanking[issue]) {
                    stats.irregularityRanking[issue] = { total: 0, vehicles: {} };
                }
                stats.irregularityRanking[issue].total += 1;
                stats.irregularityRanking[issue].vehicles[vName] = (stats.irregularityRanking[issue].vehicles[vName] || 0) + 1;
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

    const groupColorMap = useMemo(() => {
        const map = {};
        let colorIdx = 0;
        const colors = [
            'bg-[#3b82f648] border-l-[20px] border-l-[#3b82f6]',
            'bg-[#f59e0b48] border-l-[20px] border-l-[#f59e0b]',
            'bg-[#10b98148] border-l-[20px] border-l-[#10b981]',
            'bg-[#8b5cf648] border-l-[20px] border-l-[#8b5cf6]'
        ];
        
        filteredTrips.forEach(trip => {
            if (trip.group_id && !map[trip.group_id]) {
                map[trip.group_id] = colors[colorIdx % colors.length];
                colorIdx++;
            }
        });
        return map;
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
            vehicle_status: trip.vehicle_status || 'CONFORME',
            vehicle_issue: trip.vehicle_issue || '',
            additional_participants: trip.additional_participants ? trip.additional_participants.split(',').map(s => s.trim()).filter(Boolean) : [],
            tech_participants: trip.tech_participants || []
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
                    trip_info_finalized: isFinalized,
                    vehicle_status: editData.vehicle_status || 'CONFORME',
                    vehicle_issue: editData.vehicle_issue || ''
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
                        vehicle_status: editData.vehicle_status || 'CONFORME',
                        vehicle_issue: editData.vehicle_issue || '',
                        additional_participants: Array.isArray(editData.additional_participants) ? editData.additional_participants.join(', ') : editData.additional_participants,
                        tech_participants: editData.tech_participants || []
                    };
                }
                
                // --- SINCRONIZAÇÃO DE RESPONSÁVEIS (DASHBOARD) ---
                // Pegar todos os técnicos de TODAS as viagens dessa tarefa + técnico principal da tarefa
                const allTravels = updatedTravels;
                const techSet = new Set();
                
                // Adicionar responsável original da tarefa se existir
                if (originalTask.assigned_to) techSet.add(originalTask.assigned_to);
                if (originalTask.assigned_users) {
                    originalTask.assigned_users.forEach(uid => techSet.add(uid));
                }
                
                // Adicionar técnicos de cada viagem
                allTravels.forEach(tr => {
                    if (tr.tech_participants) {
                        tr.tech_participants.forEach(uid => techSet.add(uid));
                    }
                    // Se a viagem tiver um técnico específico (caso tenhamos essa lógica no futuro)
                });
                
                updatePayload = { 
                    travels: updatedTravels,
                    assigned_users: Array.from(techSet)
                };
            }

            // Gerenciar tipo de ocorrência no banco se for nova
            if (editData.occurrence && !occurrenceTypes.some(o => o.name === editData.occurrence)) {
                await supabase.from('travel_occurrence_types').upsert({ name: editData.occurrence });
                fetchOccurrenceTypes();
            }

            // Gerenciar tipo de problema de veículo no banco se for novo
            if (editData.vehicle_issue && !vehicleIssueTypes.some(o => o.name === editData.vehicle_issue)) {
                await supabase.from('vehicle_issue_types').upsert({ name: editData.vehicle_issue });
                fetchVehicleIssueTypes();
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

    const getPeriodLabel = () => {
        if (!filters.date) return 'PERÍODO TOTAL';
        if (filters.dateMode === 'MONTH') {
            const [year, month] = filters.date.split('-');
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            return `${months[parseInt(month)-1]} / ${year}`;
        }
        return new Date(filters.date).toLocaleDateString('pt-BR');
    };

    const handleOpenProrationModal = () => {
        const selectedData = trips.filter(t => selectedTrips.includes(t.id));
        const firstVehicle = selectedData[0]?.vehicle_info || '';
        const allSameVehicle = selectedData.every(t => t.vehicle_info === firstVehicle);
        
        setProrationData({
            km_total: 0,
            cost_fuel: 0,
            cost_lodging: 0,
            cost_food: 0,
            cost_extra: 0,
            cost_airfare: 0,
            cost_car_rental: 0,
            vehicle: allSameVehicle ? firstVehicle : '',
            currency: 'BRL',
            fine_amount: 0,
            fine_distribution: 'PRORATE',
            fine_target_id: '',
            occurrence_name: '',
            occurrence_cost: 0,
            occurrence_distribution: 'PRORATE',
            occurrence_target_id: '',
            occurrence_obs: '',
            additional_participants: [],
            tech_participants: [],
            vehicle_status: 'CONFORME',
            vehicle_issue: '',
            fine_driver: '',
            fine_payment_type: 'DRIVER',
            fine_payer: 'COMPANY'
        });
        setIsProrationModalOpen(true);
    };

    const handleEditGroup = (targetTrip) => {
        if (!targetTrip.group_id) return;
        
        const allMembers = trips.filter(t => t.group_id === targetTrip.group_id);
        const count = allMembers.length;
        const sample = allMembers[0];
        
        // Determinar se multa/ocorrência eram rateadas ou específicas
        const allSameFine = allMembers.every(t => t.fine_amount === sample.fine_amount);
        const allSameOcc = allMembers.every(t => t.occurrence_cost === sample.occurrence_cost);

        setProrationData({
            group_name: sample.group_name || '',
            km_total: (parseFloat(sample.trip_km_end) || 0) * count,
            cost_fuel: (parseFloat(sample.cost_fuel) || 0) * count,
            cost_lodging: (parseFloat(sample.cost_lodging) || 0) * count,
            cost_food: (parseFloat(sample.cost_food) || 0) * count,
            cost_extra: (parseFloat(sample.cost_extra) || 0) * count,
            cost_airfare: (parseFloat(sample.cost_airfare) || 0) * count,
            cost_car_rental: (parseFloat(sample.cost_car_rental) || 0) * count,
            vehicle: sample.vehicle_info || '',
            currency: sample.trip_cost_currency || 'BRL',
            fine_amount: allSameFine ? (parseFloat(sample.fine_amount) || 0) * count : allMembers.reduce((acc, t) => acc + (parseFloat(t.fine_amount) || 0), 0),
            fine_distribution: allSameFine ? 'PRORATE' : 'SINGLE',
            fine_target_id: allSameFine ? '' : allMembers.find(t => t.fine_amount > 0)?.id || '',
            fine_payer: sample.fine_payer || 'COMPANY',
            fine_driver: sample.fine_driver || '',
            fine_payment_type: sample.fine_payment_type || 'DRIVER',
            occurrence_name: sample.occurrence || '',
            occurrence_cost: allSameOcc ? (parseFloat(sample.occurrence_cost) || 0) * count : allMembers.reduce((acc, t) => acc + (parseFloat(t.occurrence_cost) || 0), 0),
            occurrence_obs: sample.occurrence_obs || '',
            occurrence_distribution: allSameOcc ? 'PRORATE' : 'SINGLE',
            occurrence_target_id: allSameOcc ? '' : allMembers.find(t => t.occurrence_cost > 0)?.id || '',
            additional_participants: sample.additional_participants ? sample.additional_participants.split(',').map(s => s.trim()).filter(Boolean) : [],
            tech_participants: sample.tech_participants || [],
            vehicle_status: sample.vehicle_status || 'CONFORME',
            vehicle_issue: sample.vehicle_issue || ''
        });
        
        setSelectedTrips(allMembers.map(t => t.id));
        setIsProrationModalOpen(true);
    };

    const handleOpenDetail = (trip) => {
        setSelectedTripForDetail(trip);
        setShowDetailModal(true);
    };

    const handleApplyProration = async () => {
        if (!prorationData.vehicle) {
            notifyError('Campo obrigatório', 'Selecione um veículo para o rateio.');
            return;
        }

        const confirm = window.confirm(`Você está prestes a ratear os custos entre ${selectedTrips.length} visitas. Isto irá sobrescrever os dados atuais de KM e Custos destas tarefas. Confirmar?`);
        if (!confirm) return;

        setIsSaving(true);
        try {
            const count = selectedTrips.length;
            const prorated = {
                km: (parseFloat(prorationData.km_total) || 0) / count,
                fuel: (parseFloat(prorationData.cost_fuel) || 0) / count,
                lodging: (parseFloat(prorationData.cost_lodging) || 0) / count,
                food: (parseFloat(prorationData.cost_food) || 0) / count,
                extra: (parseFloat(prorationData.cost_extra) || 0) / count,
                airfare: (parseFloat(prorationData.cost_airfare) || 0) / count,
                car_rental: (parseFloat(prorationData.cost_car_rental) || 0) / count,
                fine: prorationData.fine_distribution === 'PRORATE' ? (parseFloat(prorationData.fine_amount) || 0) / count : 0,
                occurrence_cost: prorationData.occurrence_distribution === 'PRORATE' ? (parseFloat(prorationData.occurrence_cost) || 0) / count : 0,
                participants: Array.isArray(prorationData.additional_participants) ? prorationData.additional_participants.join(', ') : (prorationData.additional_participants || '')
            };

            const groupId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            const groupName = prorationData.group_name || `Rateio ${new Date().toLocaleDateString()} - ${count} Visitas`;

            // Encontrar todas as tarefas afetadas
            const affectedTasks = tasks.filter(task => 
                task.travels?.some(tr => selectedTrips.includes(tr.id)) ||
                (task.visitation?.required && selectedTrips.includes(task.id + '_main'))
            );

            const updates = affectedTasks.map(async task => {
                let updatePayload = {};
                const currentTravels = [...(task.travels || [])];
                let changed = false;

                // Se for viagem específica
                currentTravels.forEach((tr, idx) => {
                    if (selectedTrips.includes(tr.id)) {
                        const isFineTarget = prorationData.fine_distribution === 'SINGLE' && prorationData.fine_target_id === tr.id;
                        const isOccTarget = prorationData.occurrence_distribution === 'SINGLE' && prorationData.occurrence_target_id === tr.id;

                        currentTravels[idx] = {
                            ...tr,
                            km_end: prorated.km,
                            cost: prorated.fuel + prorated.lodging + prorated.food + prorated.extra + prorated.airfare + prorated.car_rental + prorated.fine + (isFineTarget ? parseFloat(prorationData.fine_amount || 0) : 0) + prorated.occurrence_cost + (isOccTarget ? parseFloat(prorationData.occurrence_cost || 0) : 0),
                            cost_fuel: prorated.fuel,
                            cost_lodging: prorated.lodging,
                            cost_food: prorated.food,
                            cost_extra: prorated.extra,
                            cost_airfare: prorated.airfare,
                            cost_car_rental: prorated.car_rental,
                            vehicle: prorationData.vehicle,
                            group_id: groupId,
                            group_name: groupName,
                            is_finalized: true,
                            // Multas e Ocorrências e Acompanhantes
                            has_fine: prorationData.fine_distribution === 'PRORATE' ? (parseFloat(prorationData.fine_amount) > 0) : isFineTarget,
                            fine_amount: prorated.fine + (isFineTarget ? parseFloat(prorationData.fine_amount || 0) : 0),
                            occurrence: prorationData.occurrence_name || tr.occurrence,
                            occurrence_cost: prorated.occurrence_cost + (isOccTarget ? parseFloat(prorationData.occurrence_cost || 0) : 0),
                            additional_participants: prorated.participants
                        };
                        changed = true;
                    }
                });

                if (changed) {
                    updatePayload = { travels: currentTravels };
                } else if (selectedTrips.includes(task.id + '_main')) {
                    // Viagem genérica
                    const isFineTarget = prorationData.fine_distribution === 'SINGLE' && prorationData.fine_target_id === task.id + '_main';
                    const isOccTarget = prorationData.occurrence_distribution === 'SINGLE' && prorationData.occurrence_target_id === task.id + '_main';

                     updatePayload = {
                        trip_km_end: prorated.km,
                        trip_cost: prorated.fuel + prorated.lodging + prorated.food + prorated.extra + prorated.airfare + prorated.car_rental + prorated.fine + (isFineTarget ? parseFloat(prorationData.fine_amount || 0) : 0) + prorated.occurrence_cost + (isOccTarget ? parseFloat(prorationData.occurrence_cost || 0) : 0),
                        cost_fuel: prorated.fuel,
                        cost_lodging: prorated.lodging,
                        cost_food: prorated.food,
                        cost_extra: prorated.extra,
                        cost_airfare: prorated.airfare,
                        cost_car_rental: prorated.car_rental,
                        vehicle_info: prorationData.vehicle,
                        group_id: groupId,
                        group_name: groupName,
                        trip_info_finalized: true,
                        // Multas e Ocorrências e Acompanhantes
                        has_fine: prorationData.fine_distribution === 'PRORATE' ? (parseFloat(prorationData.fine_amount) > 0) : isFineTarget,
                        fine_amount: prorated.fine + (isFineTarget ? parseFloat(prorationData.fine_amount || 0) : 0),
                        occurrence: prorationData.occurrence_name,
                        occurrence_cost: prorated.occurrence_cost + (isOccTarget ? parseFloat(prorationData.occurrence_cost || 0) : 0),
                        additional_participants: prorated.participants
                    };
                }

                if (Object.keys(updatePayload).length > 0) {
                    await supabase.from('tasks').update(updatePayload).eq('id', task.id);
                    
                    // Sincronizar custos de engenharia
                    if (task.parent_test_id) {
                         const { data: testData } = await supabase.from('tech_tests').select('op_cost').eq('id', task.parent_test_id).single();
                         if (testData) {
                             const travelsCost = (updatePayload.travels || task.travels || []).reduce((acc, tr) => acc + (parseFloat(tr.cost) || 0), 0);
                             const manualTripCost = parseFloat(updatePayload.trip_cost !== undefined ? updatePayload.trip_cost : task.trip_cost) || 0;
                             const newGrossTotal = parseFloat(testData.op_cost || 0) + travelsCost + manualTripCost;
                             await supabase.from('tech_tests').update({ gross_total_cost: newGrossTotal }).eq('id', task.parent_test_id);
                         }
                    }
                }
            });

            await Promise.all(updates);
            
            if (fetchTasks) await fetchTasks();
            if (onUpdateTests) await onUpdateTests();
            
            setIsProrationModalOpen(false);
            setSelectionMode(false);
            setSelectedTrips([]);
            notifySuccess('Rateio Concluído!', 'Os custos foram distribuídos entre as viagens selecionadas.');
        } catch (error) {
            console.error('Error applying proration:', error);
            notifyError('Erro no Rateio', 'Não foi possível aplicar o rateio nas tarefas.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDetachFromGroup = async (targetTrip) => {
        if (!targetTrip.group_id) return;

        const confirm = window.confirm(`Deseja desvincular esta visita do grupo "${targetTrip.group_name}"?\n\nOs custos das visitas restantes neste grupo serão recalculados automaticamente.`);
        if (!confirm) return;

        setIsSaving(true);
        try {
            // 1. Encontrar todos os membros do grupo ATUALMENTE no sistema (baseado no memo 'trips')
            const allMembers = trips.filter(t => t.group_id === targetTrip.group_id);
            const remainingMembers = allMembers.filter(t => t.id !== targetTrip.id);

            // 2. Calcular valores totais para redistribuição
            const sample = allMembers[0];
            const prevCount = allMembers.length;
            const totalKm = (parseFloat(sample.trip_km_end) || 0) * prevCount;
            const totalFuel = (parseFloat(sample.cost_fuel) || 0) * prevCount;
            const totalLodging = (parseFloat(sample.cost_lodging) || 0) * prevCount;
            const totalFood = (parseFloat(sample.cost_food) || 0) * prevCount;
            const totalExtra = (parseFloat(sample.cost_extra) || 0) * prevCount;
            const totalAirfare = (parseFloat(sample.cost_airfare) || 0) * prevCount;
            const totalCarRental = (parseFloat(sample.cost_car_rental) || 0) * prevCount;

            const newCount = remainingMembers.length;
            const newProrated = {
                km: totalKm / (newCount || 1),
                fuel: totalFuel / (newCount || 1),
                lodging: totalLodging / (newCount || 1),
                food: totalFood / (newCount || 1),
                extra: totalExtra / (newCount || 1),
                airfare: totalAirfare / (newCount || 1),
                car_rental: totalCarRental / (newCount || 1),
            };

            // 3. Agrupar TODAS as tarefas que precisam de atualização
            const tasksToUpdate = {}; // taskId -> payload

            // Função auxiliar para inicializar payload de uma tarefa
            const getTaskInit = (taskId) => {
                if (tasksToUpdate[taskId]) return tasksToUpdate[taskId];
                const t = tasks.find(tk => tk.id === taskId);
                if (!t) return null;
                tasksToUpdate[taskId] = {
                    id: taskId,
                    travels: t.travels ? [...t.travels] : [],
                    updates: {}
                };
                return tasksToUpdate[taskId];
            };

            // Processar remanescentes
            for (const m of remainingMembers) {
                const ctx = getTaskInit(m.taskId);
                if (!ctx) continue;

                if (m.isSpecific) {
                    const trIdx = ctx.travels.findIndex(tr => tr.id === m.id);
                    if (trIdx !== -1) {
                        ctx.travels[trIdx] = {
                            ...ctx.travels[trIdx],
                            km_end: newProrated.km,
                            cost_fuel: newProrated.fuel,
                            cost_lodging: newProrated.lodging,
                            cost_food: newProrated.food,
                            cost_extra: newProrated.extra,
                            cost_airfare: newProrated.airfare,
                            cost_car_rental: newProrated.car_rental,
                            cost: newProrated.fuel + newProrated.lodging + newProrated.food + newProrated.extra + newProrated.airfare + newProrated.car_rental + (parseFloat(ctx.travels[trIdx].fine_amount) || 0) + (parseFloat(ctx.travels[trIdx].occurrence_cost) || 0)
                        };
                        if (newCount === 1) {
                            ctx.travels[trIdx].group_id = null;
                            ctx.travels[trIdx].group_name = null;
                        }
                    }
                } else {
                    ctx.updates = {
                        ...ctx.updates,
                        trip_km_end: newProrated.km,
                        cost_fuel: newProrated.fuel,
                        cost_lodging: newProrated.lodging,
                        cost_food: newProrated.food,
                        cost_extra: newProrated.extra,
                        cost_airfare: newProrated.airfare,
                        cost_car_rental: newProrated.car_rental,
                        trip_cost: newProrated.fuel + newProrated.lodging + newProrated.food + newProrated.extra + newProrated.airfare + newProrated.car_rental + (parseFloat(tasks.find(tk => tk.id === m.taskId)?.fine_amount) || 0) + (parseFloat(tasks.find(tk => tk.id === m.taskId)?.occurrence_cost) || 0)
                    };
                    if (newCount === 1) {
                        ctx.updates.group_id = null;
                        ctx.updates.group_name = null;
                    }
                }
            }

            const targetCtx = getTaskInit(targetTrip.taskId);
            if (targetCtx) {
                if (targetTrip.isSpecific) {
                    const trIdx = targetCtx.travels.findIndex(tr => tr.id === targetTrip.id);
                    if (trIdx !== -1) {
                        targetCtx.travels[trIdx] = {
                            ...targetCtx.travels[trIdx],
                            group_id: null, group_name: null,
                            cost: 0, cost_fuel: 0, cost_lodging: 0, cost_food: 0, cost_extra: 0, cost_airfare: 0, cost_car_rental: 0, km_end: 0
                        };
                    }
                } else {
                    targetCtx.updates = {
                        ...targetCtx.updates,
                        group_id: null, group_name: null,
                        trip_cost: 0, cost_fuel: 0, cost_lodging: 0, cost_food: 0, cost_extra: 0, cost_airfare: 0, cost_car_rental: 0, trip_km_end: 0
                    };
                }
            }

            for (const taskId in tasksToUpdate) {
                const ctx = tasksToUpdate[taskId];
                const finalPayload = { ...ctx.updates };
                if (ctx.travels.length > 0) finalPayload.travels = ctx.travels;

                if (Object.keys(finalPayload).length > 0) {
                    const t = tasks.find(tk => tk.id === taskId);
                    await supabase.from('tasks').update(finalPayload).eq('id', taskId);

                    if (t?.parent_test_id) {
                        const { data: testData } = await supabase.from('tech_tests').select('op_cost').eq('id', t.parent_test_id).single();
                        if (testData) {
                            const travelsCost = (finalPayload.travels || t.travels || []).reduce((acc, tr) => acc + (parseFloat(tr.cost) || 0), 0);
                            const manualTripCost = parseFloat(finalPayload.trip_cost !== undefined ? finalPayload.trip_cost : t.trip_cost) || 0;
                            const newGrossTotal = parseFloat(testData.op_cost || 0) + travelsCost + manualTripCost;
                            await supabase.from('tech_tests').update({ gross_total_cost: newGrossTotal }).eq('id', t.parent_test_id);
                        }
                    }
                }
            }

            if (fetchTasks) await fetchTasks();
            if (onUpdateTests) await onUpdateTests();
            notifySuccess('Desvinculado!', 'A visita foi removida e os custos foram recalculados.');
        } catch (error) {
            console.error('Error detaching:', error);
            notifyError('Erro ao Desvincular', 'Falha no recálculo dos custos.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${isMeetingView ? 'h-full' : (isMobile ? 'h-full' : 'h-[calc(100vh-3.5rem)]')} flex flex-col overflow-hidden relative`}>
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
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                            <span className="text-[8px] font-black text-slate-400 uppercase px-2">Layout:</span>
                            <button 
                                onClick={() => setPrintOrientation('portrait')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${printOrientation === 'portrait' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="w-2 h-3 border-2 border-current rounded-sm"></div> Retrato
                            </button>
                            <button 
                                onClick={() => setPrintOrientation('landscape')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${printOrientation === 'landscape' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="w-3 h-2 border-2 border-current rounded-sm"></div> Paisagem
                            </button>
                        </div>
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 md:gap-2 bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg"><Printer size={isMobile ? 14 : 16} /> {isMobile ? 'Imprimir' : 'Imprimir Relatório'}</button>
                        <button onClick={handlePrint} className="flex items-center gap-1.5 md:gap-2 bg-slate-800 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl text-[9px] md:text-sm font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 shadow-lg"><Download size={isMobile ? 14 : 16} /> {isMobile ? 'Exportar' : 'Exportar Excel'}</button>
                    </div>
                </div>

                {/* Selection & Action Bar */}
                <div className={`flex items-center justify-between gap-2 mb-2 p-2 rounded-xl border border-dashed transition-all ${selectionMode ? 'bg-indigo-50 border-indigo-200' : 'bg-transparent border-transparent'}`}>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                setSelectionMode(!selectionMode);
                                if (selectionMode) setSelectedTrips([]);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectionMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        >
                            {selectionMode ? <X size={12} /> : <ClipboardList size={12} />}
                            {selectionMode ? 'Cancelar Seleção' : 'Selecionar Para Rateio'}
                        </button>
                        {selectionMode && selectedTrips.length > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 animate-pulse">
                                {selectedTrips.length} viagem(ns) selecionada(s)
                            </span>
                        )}
                    </div>
                    {selectionMode && selectedTrips.length >= 2 && (
                        <button 
                            onClick={handleOpenProrationModal}
                            className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-700 shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                        >
                            <DollarSign size={12} /> Lançar Rateio Entre {selectedTrips.length} Visitas
                        </button>
                    )}
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
                {/* Print Header */}
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-900 text-white p-3 rounded-2xl">
                            <Plane size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Gestão de Viagens</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Controle de Frota e Deslocamentos Assistec</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Período de Referência</div>
                        <div className="text-xl font-black text-brand-600 uppercase">{getPeriodLabel()}</div>
                    </div>
                </div>

                {viewTab === 'LISTA' ? (
                    <div className="min-w-full inline-block align-middle">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm print:shadow-none">
                                <tr>
                                    {selectionMode && <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-10"></th>}
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
                                                    onDoubleClick={() => !selectionMode && !isEditing && handleOpenDetail(trip)}
                                                    onClick={(e) => {
                                                        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) return;
                                                        
                                                        if (selectionMode) {
                                                            setSelectedTrips(prev => 
                                                                prev.includes(trip.id) 
                                                                    ? prev.filter(id => id !== trip.id) 
                                                                    : [...prev, trip.id]
                                                            );
                                                        }
                                                    }}
                                                    className={`transition-all cursor-pointer ${
                                                        isEditing 
                                                            ? 'bg-brand-50/50' 
                                                            : (selectionMode && selectedTrips.includes(trip.id)) 
                                                                ? 'bg-slate-200/70 border-l-[6px] border-l-slate-400' 
                                                                : (trip.group_id ? groupColorMap[trip.group_id] : 'hover:bg-slate-50')
                                                    }`}
                                                >
                                                    {selectionMode && (
                                                        <td className="p-4 align-top">
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedTrips.includes(trip.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                                                {selectedTrips.includes(trip.id) && <CheckCircle2 size={12} />}
                                                            </div>
                                                        </td>
                                                    )}
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
                                                        {trip.group_id && (
                                                            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter mt-1 flex items-center gap-1">
                                                                <DollarSign size={10} /> {trip.group_name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block w-fit">{CategoryLabels[trip.category]}</div>
                                                            {trip.parent_test_id && (
                                                                <div className="text-[8px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded-md w-fit shadow-sm uppercase tracking-wider">
                                                                    {trip.parent_test_number || 'ENGENHARIA'}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm border ${trip.status === 'FINALIZADA' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-blue-600 text-white border-blue-700'}`}>
                                                                    VIAGEM: {trip.status}
                                                                </span>
                                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${StatusColors[trip.taskStatus]}`}>
                                                                    TAREFA: {StatusLabels[trip.taskStatus]}
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

                                                                <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-100">
                                                                    <label className="text-[8px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-1">
                                                                        <User size={10} /> Técnicos Adicionais (Dashboard)
                                                                    </label>
                                                                    <div className="flex gap-1">
                                                                        <select 
                                                                            className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-[9px] outline-none focus:border-brand-500"
                                                                            onChange={e => {
                                                                                const userId = e.target.value;
                                                                                if (userId && !(editData.tech_participants || []).includes(userId)) {
                                                                                    setEditData(p => ({ ...p, tech_participants: [...(p.tech_participants || []), userId] }));
                                                                                }
                                                                                e.target.value = "";
                                                                            }}
                                                                        >
                                                                            <option value="">Selecionar Técnico...</option>
                                                                            {users.filter(u => !(editData.tech_participants || []).includes(u.id)).map(u => (
                                                                                <option key={u.id} value={u.id}>{u.username || u.full_name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {(editData.tech_participants || []).map((uid) => {
                                                                            const user = users.find(u => u.id === uid);
                                                                            return (
                                                                                <span key={uid} className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black shadow-sm uppercase">
                                                                                    {user?.username || user?.full_name || 'Técnico'}
                                                                                    <X size={8} className="cursor-pointer hover:text-rose-200" onClick={() => setEditData(p => ({ ...p, tech_participants: p.tech_participants.filter(id => id !== uid) }))} />
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

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

                                                                <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Condição do Veículo</label>
                                                                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                                        <button 
                                                                            onClick={() => setEditData(p => ({ ...p, vehicle_status: 'CONFORME', vehicle_issue: '' }))}
                                                                            className={`flex-1 py-1 rounded-md text-[8px] font-black transition-all ${editData.vehicle_status === 'CONFORME' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                        >
                                                                            OK
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setEditData(p => ({ ...p, vehicle_status: 'IRREGULAR' }))}
                                                                            className={`flex-1 py-1 rounded-md text-[8px] font-black transition-all ${editData.vehicle_status === 'IRREGULAR' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                        >
                                                                            IRREGULAR
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    {editData.vehicle_status === 'IRREGULAR' && (
                                                                        <div className="mt-1 animate-in slide-in-from-top-1 flex gap-1">
                                                                            <input 
                                                                                type="text" 
                                                                                list="vehicle-issue-list"
                                                                                placeholder="Qual o problema?"
                                                                                value={editData.vehicle_issue}
                                                                                onChange={e => setEditData(p => ({ ...p, vehicle_issue: e.target.value }))}
                                                                                className="flex-1 px-2 py-1 bg-white border border-rose-200 rounded text-[8px] font-bold outline-none focus:border-rose-500 shadow-sm placeholder:font-normal"
                                                                            />
                                                                            <button 
                                                                                onClick={async () => {
                                                                                    if (editData.vehicle_issue) {
                                                                                        const { error } = await supabase.from('vehicle_issue_types').upsert({ name: editData.vehicle_issue });
                                                                                        if (!error) {
                                                                                            fetchVehicleIssueTypes();
                                                                                            notifySuccess('Registrado!', 'Tipo de irregularidade salvo.');
                                                                                        } else {
                                                                                            notifyError('Erro', 'Não foi possível salvar o tipo de irregularidade.');
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="px-1.5 bg-rose-500 text-white rounded hover:bg-rose-600 transition-colors shadow-sm"
                                                                                title="Salvar sugestão"
                                                                            >
                                                                                <Save size={10} />
                                                                            </button>
                                                                        </div>
                                                                    )}
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
                                                                {trip.vehicle_status === 'IRREGULAR' && (
                                                                    <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 w-fit uppercase" title={trip.vehicle_issue}>
                                                                        <AlertTriangle size={8} /> IRREGULAR: {trip.vehicle_issue}
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
                                                                <div className="flex items-center gap-1.5">
                                                                    {trip.group_id && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleEditGroup(trip)}
                                                                                className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors shadow-sm"
                                                                                title="Editar Rateio do Grupo"
                                                                            >
                                                                                <DollarSign size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDetachFromGroup(trip)}
                                                                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                                                                title="Desvincular do Rateio"
                                                                            >
                                                                                <Unlink size={14} />
                                                                            </button>
                                                                        </>
                                                                    )}
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
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isEditing && (
                                                    <tr className="bg-brand-50/50">
                                                        <td colSpan="7" className="p-4 pt-0 border-b border-brand-100">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white border border-brand-100 rounded-2xl shadow-sm">
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

                            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                                <div className="p-4 bg-white text-rose-500 rounded-2xl shadow-sm"><Car size={24} /></div>
                                <div>
                                    <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.15em] mb-1">Irregularidades Frota</div>
                                    <div className="text-2xl font-black text-rose-600 leading-none">{summaryData.irregularityCount} <span className="text-xs font-bold text-rose-300">RELATOS</span></div>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <div className="bg-white rounded-[40px] border border-rose-100 shadow-sm overflow-hidden border-l-4 border-l-rose-500 mb-8">
                            <div className="p-6 border-b border-rose-50 bg-rose-50/10 flex justify-between items-center">
                                <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-rose-500" /> Auditoria e Ranking de Irregularidades
                                </h3>
                                <div className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">{summaryData.irregularityCount} relatos de problemas</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-rose-50/30">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black text-rose-500 uppercase tracking-widest">Tipo de Irregularidade</th>
                                            <th className="p-6 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">Frequência Total</th>
                                            <th className="p-6 text-[10px] font-black text-rose-500 uppercase tracking-widest">Veículos com este Relato</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rose-50">
                                        {Object.entries(summaryData.irregularityRanking).length === 0 ? (
                                            <tr><td colSpan="3" className="p-12 text-center text-slate-400 italic font-medium bg-slate-50/20">Nenhuma irregularidade registrada no período.</td></tr>
                                        ) : (
                                            Object.entries(summaryData.irregularityRanking)
                                                .sort((a, b) => b[1].total - a[1].total)
                                                .map(([issue, data]) => (
                                                <tr key={issue} className="hover:bg-rose-50/20 transition-colors">
                                                    <td className="p-6">
                                                        <div className="text-xs font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                                            {issue}
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-black">{data.total} <span className="text-[10px] opacity-70">x</span></span>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(data.vehicles).map(([v, count]) => (
                                                                <span key={v} className="px-2 py-1 bg-white border border-rose-200 rounded-lg text-[9px] font-bold text-rose-600 uppercase">
                                                                    {v} <span className="text-slate-400">({count})</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

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
                        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 relative overflow-hidden">
                            {selectedTripForDetail.group_id && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-brand-500"></div>
                            )}
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-100">
                                    <ClipboardList size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                                            Ficha da Viagem
                                        </h2>
                                        {selectedTripForDetail.group_id && (
                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-200">
                                                RATEIO: {selectedTripForDetail.group_name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {selectedTripForDetail.client} • ID: {selectedTripForDetail.id.substring(0, 8)}
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
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Equipe de Atendimento</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {/* Técnicos Oficiais (App) */}
                                                {(selectedTripForDetail.tech_participants || []).length > 0 && selectedTripForDetail.tech_participants.map((uid) => {
                                                    const user = users.find(u => u.id === uid);
                                                    return (
                                                        <span key={uid} className="px-2 py-1 bg-brand-600 text-white rounded-md text-[9px] font-black border border-brand-500 shadow-sm uppercase">
                                                            {user?.username || user?.full_name || 'Técnico'}
                                                        </span>
                                                    );
                                                })}
                                                {/* Responsável Principal se não estiver nos participantes */}
                                                {!selectedTripForDetail.tech_participants?.includes(selectedTripForDetail.assigned_to) && (
                                                    <span className="px-2 py-0.5 bg-blue-500 text-white rounded-md text-[9px] font-black border border-blue-400 shadow-sm uppercase">
                                                        {selectedTripForDetail.assigned_name}
                                                    </span>
                                                )}
                                                {/* Acompanhantes Externos */}
                                                {selectedTripForDetail.additional_participants && selectedTripForDetail.additional_participants.split(',').map((p, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-medium border border-slate-200 uppercase">{p.trim()}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status da Frota na Ficha */}
                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                                        <div className={`p-2 rounded-xl ${selectedTripForDetail.vehicle_status === 'IRREGULAR' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <Car size={20} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Condição do Veículo</label>
                                            <span className={`text-xs font-black uppercase ${selectedTripForDetail.vehicle_status === 'IRREGULAR' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {selectedTripForDetail.vehicle_status === 'IRREGULAR' ? 'Irregular / Pendente' : 'Conforme (OK)'}
                                            </span>
                                            {selectedTripForDetail.vehicle_issue && (
                                                <p className="text-[10px] text-slate-500 italic mt-0.5 leading-tight">{selectedTripForDetail.vehicle_issue}</p>
                                            )}
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

                                        {selectedTripForDetail.fine_amount > 0 && (
                                            <div className="pt-3 space-y-2 border-t border-rose-100 mt-2 bg-rose-50/30 p-3 rounded-xl">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-rose-600 font-black flex items-center gap-1 uppercase">
                                                        <AlertTriangle size={14} /> Multa de Trânsito
                                                    </span>
                                                    <span className="font-black text-rose-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.fine_amount || 0)}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase block">Condutor</label>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">{selectedTripForDetail.fine_driver || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase block">Pagamento</label>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">{selectedTripForDetail.fine_payment_type === 'DRIVER' ? 'Condutor' : 'Empresa (Dobro)'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedTripForDetail.occurrence_cost > 0 && (
                                            <div className="pt-3 space-y-2 border-t border-amber-100 mt-2 bg-amber-50/30 p-3 rounded-xl">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-amber-700 font-black flex items-center gap-1 uppercase">
                                                        <AlertCircle size={14} /> Ocorrência / Reparo
                                                    </span>
                                                    <span className="font-black text-amber-700">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTripForDetail.occurrence_cost)}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 mt-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase block">Descrição</label>
                                                    <span className="text-[10px] font-bold text-slate-700 uppercase block">{selectedTripForDetail.occurrence || 'Não especificado'}</span>
                                                    {selectedTripForDetail.occurrence_obs && (
                                                        <p className="text-[9px] text-slate-500 italic mt-1 leading-relaxed border-l-2 border-amber-200 pl-2">{selectedTripForDetail.occurrence_obs}</p>
                                                    )}
                                                </div>
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

            {/* Proration Modal */}
            {isProrationModalOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-indigo-600 p-6 flex justify-between items-center">
                            <div className="flex items-center gap-3 text-white">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Rateio Consolidado</h3>
                                    <p className="text-xs text-indigo-100 font-medium">Distribuir custos entre {selectedTrips.length} visitas</p>
                                </div>
                            </div>
                            <button onClick={() => setIsProrationModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome da Viagem / Grupo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Viagem São Paulo - Maio/2024"
                                        value={prorationData.group_name || ''}
                                        onChange={e => setProrationData(p => ({ ...p, group_name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Veículo Utilizado</label>
                                    <input 
                                        type="text" 
                                        list="vehicle-list"
                                        placeholder="Selecione ou digite o veículo..."
                                        value={prorationData.vehicle}
                                        onChange={e => setProrationData(p => ({ ...p, vehicle: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">KM Total da Viagem</label>
                                    <div className="relative">
                                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="number" 
                                            value={prorationData.km_total}
                                            onChange={e => setProrationData(p => ({ ...p, km_total: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Combustível Total</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                        <input 
                                            type="number" 
                                            value={prorationData.cost_fuel}
                                            onChange={e => setProrationData(p => ({ ...p, cost_fuel: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hospedagem Total</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                        <input 
                                            type="number" 
                                            value={prorationData.cost_lodging}
                                            onChange={e => setProrationData(p => ({ ...p, cost_lodging: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Alimentação Total</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                        <input 
                                            type="number" 
                                            value={prorationData.cost_food}
                                            onChange={e => setProrationData(p => ({ ...p, cost_food: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Passagens Aéreas</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                        <input 
                                            type="number" 
                                            value={prorationData.cost_airfare}
                                            onChange={e => setProrationData(p => ({ ...p, cost_airfare: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Aluguel de Carro</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                        <input 
                                            type="number" 
                                            value={prorationData.cost_car_rental}
                                            onChange={e => setProrationData(p => ({ ...p, cost_car_rental: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Outros Custos / Extra</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                        <input 
                                            type="number" 
                                            value={prorationData.cost_extra}
                                            onChange={e => setProrationData(p => ({ ...p, cost_extra: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 pt-2 border-t border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Users size={14} className="text-indigo-500" /> Acompanhantes da Viagem (Grupo)
                                    </label>
                                    <div className="flex gap-2 mb-3">
                                        <input 
                                            type="text" 
                                            placeholder="Nome do acompanhante..." 
                                            value={newParticipantName}
                                            onChange={e => setNewParticipantName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (newParticipantName.trim()) {
                                                        setProrationData(p => ({ ...p, additional_participants: [...(p.additional_participants || []), newParticipantName.trim()] }));
                                                        setNewParticipantName('');
                                                    }
                                                }
                                            }}
                                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button 
                                            onClick={() => {
                                                if (newParticipantName.trim()) {
                                                    setProrationData(p => ({ ...p, additional_participants: [...(p.additional_participants || []), newParticipantName.trim()] }));
                                                    setNewParticipantName('');
                                                }
                                            }}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                                        >
                                            ADICIONAR
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(prorationData.additional_participants || []).map((name, i) => (
                                            <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 animate-in zoom-in-90">
                                                {name}
                                                <X size={14} className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setProrationData(p => ({ ...p, additional_participants: p.additional_participants.filter((_, idx) => idx !== i) }))} />
                                            </span>
                                        ))}
                                        {(!prorationData.additional_participants || prorationData.additional_participants.length === 0) && (
                                            <span className="text-[10px] text-slate-400 italic">Nenhum acompanhante adicionado ao grupo.</span>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                                            <User size={14} /> Técnicos Oficiais (Dashboard)
                                        </label>
                                        <select 
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                            onChange={e => {
                                                const userId = e.target.value;
                                                if (userId && !(prorationData.tech_participants || []).includes(userId)) {
                                                    setProrationData(p => ({ ...p, tech_participants: [...(p.tech_participants || []), userId] }));
                                                }
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">Selecionar Técnico para o Grupo...</option>
                                            {users.filter(u => !(prorationData.tech_participants || []).includes(u.id)).map(u => (
                                                <option key={u.id} value={u.id}>{u.username || u.full_name}</option>
                                            ))}
                                        </select>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {(prorationData.tech_participants || []).map((uid) => {
                                                const user = users.find(u => u.id === uid);
                                                return (
                                                    <span key={uid} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black shadow-md uppercase">
                                                        {user?.username || user?.full_name || 'Técnico'}
                                                        <X size={14} className="cursor-pointer hover:text-rose-200" onClick={() => setProrationData(p => ({ ...p, tech_participants: p.tech_participants.filter(id => id !== uid) }))} />
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-2 pt-4 border-t border-slate-100">
                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <AlertTriangle size={14} /> Custos Extraordinários (Multas e Incidentes)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Multas Section */}
                                        <div className="space-y-3 bg-rose-50/30 p-4 rounded-2xl border border-rose-100">
                                            <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Multas de Trânsito</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                                <input 
                                                    type="number" 
                                                    value={prorationData.fine_amount}
                                                    onChange={e => setProrationData(p => ({ ...p, fine_amount: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                                />
                                            </div>
                                            {parseFloat(prorationData.fine_amount) > 0 && (
                                                <div className="space-y-3 animate-in slide-in-from-top-2">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setProrationData(p => ({ ...p, fine_distribution: 'PRORATE' }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${prorationData.fine_distribution === 'PRORATE' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                                        >
                                                            Ratear p/ Todos
                                                        </button>
                                                        <button 
                                                            onClick={() => setProrationData(p => ({ ...p, fine_distribution: 'SINGLE' }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${prorationData.fine_distribution === 'SINGLE' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                                        >
                                                            Atribuir a Uma
                                                        </button>
                                                    </div>
                                                    {prorationData.fine_distribution === 'SINGLE' && (
                                                        <select 
                                                            value={prorationData.fine_target_id}
                                                            onChange={e => setProrationData(p => ({ ...p, fine_target_id: e.target.value }))}
                                                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                                        >
                                                            <option value="">Selecione a visita...</option>
                                                            {trips.filter(t => selectedTrips.includes(t.id)).map(t => (
                                                                <option key={t.id} value={t.id}>{t.client} ({t.id.substring(0,4)})</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Quem foi o Condutor?</label>
                                                        <select
                                                            value={prorationData.fine_driver}
                                                            onChange={e => setProrationData(p => ({ ...p, fine_driver: e.target.value }))}
                                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                                                        >
                                                            <option value="">Selecione o Condutor</option>
                                                            {users.map(u => (
                                                                <option key={u.id} value={u.username || u.full_name}>{u.username || u.full_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo de Pagamento</label>
                                                        <select 
                                                            value={prorationData.fine_payment_type}
                                                            onChange={e => setProrationData(p => ({ ...p, fine_payment_type: e.target.value }))}
                                                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] outline-none"
                                                        >
                                                            <option value="DRIVER">Assumida pelo Condutor</option>
                                                            <option value="DOUBLE">Pagar em Dobro (Omitir)</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Quem Pagou?</label>
                                                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                            <button 
                                                                onClick={() => setProrationData(p => ({ ...p, fine_payer: 'COMPANY' }))}
                                                                className={`flex-1 py-1 rounded text-[9px] font-black transition-all ${prorationData.fine_payer === 'COMPANY' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400'}`}
                                                            >
                                                                EMPRESA
                                                            </button>
                                                            <button 
                                                                onClick={() => setProrationData(p => ({ ...p, fine_payer: 'EMPLOYEE' }))}
                                                                className={`flex-1 py-1 rounded text-[9px] font-black transition-all ${prorationData.fine_payer === 'EMPLOYEE' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}
                                                            >
                                                                FUNCIONÁRIO
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ocorrências Section */}
                                        <div className="space-y-3 bg-amber-50/30 p-4 rounded-2xl border border-amber-100">
                                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Ocorrências / Reparos</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                                <input 
                                                    type="number" 
                                                    value={prorationData.occurrence_cost}
                                                    onChange={e => setProrationData(p => ({ ...p, occurrence_cost: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                                />
                                            </div>
                                            {parseFloat(prorationData.occurrence_cost) > 0 && (
                                                <div className="space-y-3 animate-in slide-in-from-top-2">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setProrationData(p => ({ ...p, occurrence_distribution: 'PRORATE' }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${prorationData.occurrence_distribution === 'PRORATE' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                                        >
                                                            Ratear p/ Todos
                                                        </button>
                                                        <button 
                                                            onClick={() => setProrationData(p => ({ ...p, occurrence_distribution: 'SINGLE' }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${prorationData.occurrence_distribution === 'SINGLE' ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                                        >
                                                            Atribuir a Uma
                                                        </button>
                                                    </div>
                                                    {prorationData.occurrence_distribution === 'SINGLE' && (
                                                        <select 
                                                            value={prorationData.occurrence_target_id}
                                                            onChange={e => setProrationData(p => ({ ...p, occurrence_target_id: e.target.value }))}
                                                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                                        >
                                                            <option value="">Selecione a visita...</option>
                                                            {trips.filter(t => selectedTrips.includes(t.id)).map(t => (
                                                                <option key={t.id} value={t.id}>{t.client} ({t.id.substring(0,4)})</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase">O que aconteceu?</label>
                                                        <input 
                                                            type="text"
                                                            placeholder="Ex: Pneu furado..."
                                                            list="occurrence-list"
                                                            value={prorationData.occurrence_name}
                                                            onChange={e => setProrationData(p => ({ ...p, occurrence_name: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Observações Detalhadas</label>
                                                        <textarea 
                                                            value={prorationData.occurrence_obs}
                                                            onChange={e => setProrationData(p => ({ ...p, occurrence_obs: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500 min-h-[60px] resize-none"
                                                            placeholder="Detalhes..."
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Frota / Condição do Veículo */}
                                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Car size={14} /> Condição Geral do Veículo na Viagem
                                        </label>
                                        <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 w-fit">
                                            <button 
                                                onClick={() => setProrationData(p => ({ ...p, vehicle_status: 'CONFORME', vehicle_issue: '' }))}
                                                className={`px-6 py-1.5 rounded-lg text-[10px] font-black transition-all ${prorationData.vehicle_status === 'CONFORME' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                TUDO OK
                                            </button>
                                            <button 
                                                onClick={() => setProrationData(p => ({ ...p, vehicle_status: 'IRREGULAR' }))}
                                                className={`px-6 py-1.5 rounded-lg text-[10px] font-black transition-all ${prorationData.vehicle_status === 'IRREGULAR' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                IRREGULAR
                                            </button>
                                        </div>
                                        {prorationData.vehicle_status === 'IRREGULAR' && (
                                            <div className="animate-in slide-in-from-top-2">
                                                <label className="text-[9px] font-bold text-rose-500 uppercase mb-1 block">Qual o problema detectado?</label>
                                                <input 
                                                    type="text" 
                                                    list="vehicle-issue-list"
                                                    placeholder="Ex: Barulho na suspensão, Luz do painel..."
                                                    value={prorationData.vehicle_issue}
                                                    onChange={e => setProrationData(p => ({ ...p, vehicle_issue: e.target.value }))}
                                                    className="w-full px-4 py-2 bg-white border border-rose-100 rounded-xl text-xs font-bold outline-none focus:border-rose-500 shadow-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                                <div className="flex gap-3">
                                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                                    <div>
                                        <p className="text-xs font-black text-amber-800 uppercase">Resumo do Rateio</p>
                                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed mt-1">
                                            Cada uma das {selectedTrips.length} visitas receberá aproximadamente <span className="font-bold">{(parseFloat(prorationData.km_total || 0) / selectedTrips.length).toFixed(1)} KM</span> e <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((parseFloat(prorationData.cost_fuel || 0) + parseFloat(prorationData.cost_lodging || 0) + parseFloat(prorationData.cost_food || 0) + parseFloat(prorationData.cost_airfare || 0) + parseFloat(prorationData.cost_car_rental || 0) + parseFloat(prorationData.cost_extra || 0)) / selectedTrips.length))}</span> em custos logísticos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsProrationModalOpen(false)}
                                className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleApplyProration}
                                disabled={isSaving}
                                className="px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? 'Processando...' : 'Confirmar e Aplicar Rateio'}
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
            <datalist id="vehicle-issue-list">
                {vehicleIssueTypes.map((o, i) => (
                    <option key={i} value={o.name} />
                ))}
            </datalist>

             {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 1.2cm; size: ${printOrientation}; }
                    body { background: white !important; }
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { 
                        position: static !important;
                        width: 100%;
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    /* Garantir que a tabela e conteúdos fluam entre páginas */
                    .min-w-full, table { 
                        display: table !important; 
                        width: 100% !important; 
                        table-layout: auto !important;
                    }

                    /* Evitar quebras de página no meio de elementos */
                    tr, .bg-white, .rounded-[40px], .card { 
                        page-break-inside: avoid !important; 
                        break-inside: avoid !important; 
                    }

                    .print\\:hidden { display: none !important; }
                    
                    /* Garantir cores e fundos */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .bg-rose-50 { background-color: #fff1f2 !important; }
                    .bg-brand-600 { background-color: #0ea5e9 !important; }
                    .bg-slate-900 { background-color: #0f172a !important; }
                    
                    .rounded-3xl, .rounded-xl, .rounded-[40px] { border-radius: 8px !important; border: 1px solid #eee !important; }
                    
                    ::-webkit-scrollbar { display: none !important; }
                    * { overflow: visible !important; }
                }
            `}</style>
        </div >
    );
};

export default TravelsView;
