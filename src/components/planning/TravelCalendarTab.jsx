import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, 
    AlertTriangle, CheckCircle2, Clock, Trash2, Tag, CalendarRange, Search, Users, Edit2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const TravelCalendarTab = ({
    currentUser,
    allClients = [],
    tasks = [],
    onNewTask,
    onEditTask,
    notifySuccess,
    notifyError
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reservations, setReservations] = useState([]);
    const [loadingReservations, setLoadingReservations] = useState(false);
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [selectedWeekStart, setSelectedWeekStart] = useState('');
    const [reserveEndDate, setReserveEndDate] = useState('');
    const [editingReservationId, setEditingReservationId] = useState(null);
    const [reserveState, setReserveState] = useState('');
    const [reserveNotes, setReserveNotes] = useState('');
    const [draggedClient, setDraggedClient] = useState(null);
    const [plannedVisits, setPlannedVisits] = useState([]);
    const [loadingPlanned, setLoadingPlanned] = useState(false);
    const [draggedPlannedVisit, setDraggedPlannedVisit] = useState(null);
    const [sidebarTab, setSidebarTab] = useState('PENDING'); // 'PENDING' | 'SEARCH'
    const [clientSearch, setClientSearch] = useState('');
    const searchRef = useRef(null);

    // List of Brazilian States for reservation selector
    const BRAZILIAN_STATES = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    // Helper: format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return new Date(dateStr).toLocaleDateString('pt-BR');
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to calculate the last visit for a client
    const getLastVisit = (clientName) => {
        if (!clientName || !tasks) return null;
        const normalizedClientName = clientName.trim().toLowerCase();
        const visits = [];

        tasks.forEach(task => {
            const taskClient = task.client || task.title;
            if (!taskClient || taskClient.trim().toLowerCase() !== normalizedClientName) return;

            if (task.travels && task.travels.length > 0) {
                task.travels.forEach((t) => {
                    if (t.date) {
                        visits.push({
                            date: t.date,
                            status: t.status || 'PROGRAMADA'
                        });
                    }
                });
            } else if (task.visitation?.required) {
                if (task.due_date) {
                    visits.push({
                        date: task.due_date,
                        status: 'PROGRAMADA'
                    });
                }
            }
        });

        if (visits.length === 0) return null;

        return visits.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        })[0];
    };

    // Fetch travel reservations
    const fetchReservations = async () => {
        setLoadingReservations(true);
        try {
            const { data, error } = await supabase
                .from('travel_reservations')
                .select('*');
            if (error) throw error;
            setReservations(data || []);
        } catch (err) {
            console.error('Error fetching reservations:', err);
        } finally {
            setLoadingReservations(false);
        }
    };

    // Fetch planned visits (drafts)
    const fetchPlannedVisits = async () => {
        setLoadingPlanned(true);
        try {
            const { data, error } = await supabase
                .from('planned_visits')
                .select('*');
            if (error) throw error;
            setPlannedVisits(data || []);
        } catch (err) {
            console.error('Error fetching planned visits:', err);
        } finally {
            setLoadingPlanned(false);
        }
    };

    useEffect(() => {
        fetchReservations();
        fetchPlannedVisits();
    }, []);

    // Calculate clients health and check who needs visit (SLA Warning/Expired)
    const pendingClients = useMemo(() => {
        const today = new Date();
        const list = [];

        allClients.forEach(client => {
            if (!client.name) return;
            
            const hasNewFreq = client.visit_frequency_value !== undefined && client.visit_frequency_value !== null && client.visit_frequency_value > 0;
            const hasLegacyFreq = client.visit_frequency_months !== undefined && client.visit_frequency_months !== null && client.visit_frequency_months > 0;
            
            if (!hasNewFreq && !hasLegacyFreq) return; // Skip if no schedule is defined

            const lastVisit = getLastVisit(client.name);
            let lastVisitDate = null;
            if (lastVisit && lastVisit.date) {
                lastVisitDate = new Date(lastVisit.date);
            }

            let dueDate = null;
            let warningDate = null;

            if (lastVisitDate) {
                dueDate = new Date(lastVisitDate);
                if (hasNewFreq) {
                    const freqVal = client.visit_frequency_value;
                    const freqUnit = client.visit_frequency_unit || 'MESES';
                    if (freqUnit === 'DIAS') {
                        dueDate.setDate(dueDate.getDate() + freqVal);
                    } else if (freqUnit === 'ANOS') {
                        dueDate.setFullYear(dueDate.getFullYear() + freqVal);
                    } else {
                        dueDate.setMonth(dueDate.getMonth() + freqVal);
                    }
                } else {
                    dueDate.setMonth(dueDate.getMonth() + client.visit_frequency_months);
                }

                warningDate = new Date(dueDate);
                if (hasNewFreq) {
                    const leadVal = client.visit_lead_time_value !== undefined && client.visit_lead_time_value !== null ? client.visit_lead_time_value : 2;
                    const leadUnit = client.visit_lead_time_unit || 'MESES';
                    if (leadUnit === 'DIAS') {
                        warningDate.setDate(warningDate.getDate() - leadVal);
                    } else if (leadUnit === 'ANOS') {
                        warningDate.setFullYear(warningDate.getFullYear() - leadVal);
                    } else {
                        warningDate.setMonth(warningDate.getMonth() - leadVal);
                    }
                } else {
                    const leadMonths = client.visit_lead_time_months !== undefined && client.visit_lead_time_months !== null ? client.visit_lead_time_months : 2;
                    warningDate.setMonth(warningDate.getMonth() - leadMonths);
                }
            } else {
                // If never visited, it is always pending/urgent
                dueDate = new Date(today);
                dueDate.setDate(dueDate.getDate() - 1); // Yesterday to flag as overdue
                warningDate = new Date(today);
                warningDate.setMonth(warningDate.getMonth() - 1);
            }

            const isOverdue = today > dueDate;
            const isWarning = today >= warningDate;

            // Check if there is an active future visit task scheduled
            const hasFutureVisit = tasks.some(t => {
                const isMatch = t.client && t.client.trim().toLowerCase() === client.name.trim().toLowerCase();
                const isUpcoming = t.due_date && new Date(t.due_date) >= today;
                const isTravelTask = (t.travels && t.travels.length > 0) || t.visitation?.required;
                return isMatch && isUpcoming && isTravelTask && t.status !== 'DONE' && t.status !== 'CANCELED';
            });

            if ((isWarning || isOverdue) && !hasFutureVisit) {
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                list.push({
                    client,
                    lastVisit,
                    isOverdue,
                    diffDays,
                    dueDate,
                    state: client.state || 'UF'
                });
            }
        });

        return list.sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            return a.diffDays - b.diffDays;
        });
    }, [allClients, tasks]);

    // Memoized travels mapping from all tasks
    // ONLY includes tasks that have real travel entries in task.travels array.
    // Tasks with visitation?.required but no travels are NOT shown here — they are
    // operational tasks (Entrega, Faturamento, etc.) that must not appear in this calendar.
    const mappedTravels = useMemo(() => {
        const list = [];
        tasks.forEach(task => {
            if (task.status === 'CANCELED') return;
            const travels = task.travels || [];
            // Strict filter: only tasks with at least one travel leg in the travels array
            if (travels.length === 0) return;
            travels.forEach((tr, index) => {
                const trDate = tr.date ? tr.date.split('T')[0] : '';
                let displayDate = trDate;
                if (!displayDate || tr.isDateDefined === false) {
                    displayDate = task.due_date ? task.due_date.split('T')[0] : '';
                }
                if (displayDate) {
                    list.push({
                        id: tr.id || `${task.id}_travel_${index}`,
                        taskId: task.id,
                        clientName: task.client || task.title || '',
                        date: displayDate,
                        status: tr.status || 'PROGRAMADA',
                        team: tr.team || [''],
                        driver: tr.vehicle || '',
                        taskObj: task
                    });
                }
            });
        });
        return list;
    }, [tasks]);

    // Calendar Calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday

    // Format week start date string given any date inside that week
    const getWeekStartDateStr = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const startOfWeek = new Date(d.setDate(diff));
        return startOfWeek.toISOString().split('T')[0];
    };

    // Calendar Grid Days
    const calendarDays = useMemo(() => {
        const days = [];
        // Pad previous month days
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthDays - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Pad next month days
        const totalSlots = 42; // 6 rows
        const nextMonthPadding = totalSlots - days.length;
        for (let i = 1; i <= nextMonthPadding; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        return days;
    }, [year, month, firstDayIndex, daysInMonth]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Open Reserve Modal for a specific date or existing reservation
    const handleOpenReserve = (startDateStr, existingRes = null) => {
        if (existingRes) {
            setSelectedWeekStart(existingRes.week_start);
            setReserveEndDate(existingRes.end_date || existingRes.week_start);
            setReserveState(existingRes.state_code);
            setReserveNotes(existingRes.notes || '');
            setEditingReservationId(existingRes.id);
        } else {
            setSelectedWeekStart(startDateStr);
            // By default, suggest an end date up to Friday
            const d = new Date(startDateStr + 'T12:00:00');
            const dayOfWeek = d.getDay(); // 0 is Sunday
            const endD = new Date(d);
            const diffToFriday = 5 - dayOfWeek;
            if (diffToFriday > 0) endD.setDate(d.getDate() + diffToFriday);
            
            setReserveEndDate(endD.toISOString().split('T')[0]);
            setReserveState('');
            setReserveNotes('');
            setEditingReservationId(null);
        }
        setShowReserveModal(true);
    };

    // Save week reservation
    const handleSaveReservation = async (e) => {
        e.preventDefault();
        if (!reserveState) return;
        if (reserveEndDate < selectedWeekStart) {
            notifyError('Erro', 'A data de fim não pode ser menor que a data de início.');
            return;
        }

        try {
            const payload = {
                week_start: selectedWeekStart,
                end_date: reserveEndDate,
                state_code: reserveState,
                notes: reserveNotes.toUpperCase(),
                user_id: currentUser?.id,
                created_at: new Date().toISOString()
            };

            if (editingReservationId) {
                const { error } = await supabase
                    .from('travel_reservations')
                    .update(payload)
                    .eq('id', editingReservationId);
                if (error) throw error;
                notifySuccess('Sucesso', 'Reserva atualizada!');
            } else {
                const { error } = await supabase
                    .from('travel_reservations')
                    .insert([payload]);
                if (error) throw error;
                notifySuccess('Sucesso', 'Reserva criada no calendário!');
            }
            setShowReserveModal(false);
            fetchReservations();
        } catch (err) {
            notifyError('Erro', err.message);
        }
    };

    // Delete week reservation
    const handleDeleteReservation = async () => {
        if (!editingReservationId) return;
        if (!confirm('Deseja realmente remover esta reserva?')) return;

        try {
            const { error } = await supabase
                .from('travel_reservations')
                .delete()
                .eq('id', editingReservationId);
            if (error) throw error;
            notifySuccess('Reserva removida.');
            setShowReserveModal(false);
            fetchReservations();
        } catch (err) {
            notifyError('Erro', err.message);
        }
    };

    // Handle Drag and Drop
    const handleDragStart = (e, client) => {
        setDraggedClient(client);
        e.dataTransfer.setData('text/plain', client.name);
    };

    const handleDragStartPlanned = (e, pv) => {
        setDraggedPlannedVisit(pv);
        e.dataTransfer.setData('text/plain', pv.client_name);
    };

    const handleDragEnd = () => {
        setDraggedClient(null);
        setDraggedPlannedVisit(null);
    };

    const handleDrop = async (e, dayDate) => {
        e.preventDefault();
        const formattedDateStr = dayDate.toISOString().split('T')[0];
        
        if (draggedClient) {
            try {
                const { error } = await supabase
                    .from('planned_visits')
                    .insert([{
                        client_id: draggedClient.id,
                        client_name: draggedClient.name,
                        visit_date: formattedDateStr,
                        user_id: currentUser?.id
                    }]);
                if (error) throw error;
                notifySuccess('Rascunho de viagem planejado com sucesso!');
                fetchPlannedVisits();
            } catch (err) {
                notifyError('Erro', err.message);
            }
            setDraggedClient(null);
        } else if (draggedPlannedVisit) {
            try {
                const { error } = await supabase
                    .from('planned_visits')
                    .update({
                        visit_date: formattedDateStr
                    })
                    .eq('id', draggedPlannedVisit.id);
                if (error) throw error;
                notifySuccess('Data do rascunho de viagem atualizada!');
                fetchPlannedVisits();
            } catch (err) {
                notifyError('Erro ao mover rascunho', err.message);
            }
            setDraggedPlannedVisit(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Search filtered clients
    const searchedClients = useMemo(() => {
        if (!clientSearch.trim()) return [];
        const q = clientSearch.trim().toLowerCase();
        return allClients
            .filter(c => c.name && c.name.toLowerCase().includes(q))
            .slice(0, 20);
    }, [clientSearch, allClients]);

    return (
        <div className="flex-grow flex flex-col lg:flex-row min-h-0 bg-slate-50/50 p-4 gap-4 overflow-hidden">
            {/* Sidebar: Pending Visits + Client Search */}
            <div className="w-full lg:w-80 shrink-0 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
                {/* Tab Header */}
                <div className="p-3 border-b border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setSidebarTab('PENDING')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                sidebarTab === 'PENDING'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
                            }`}
                        >
                            <Clock size={11} />
                            Em Atraso
                        </button>
                        <button
                            onClick={() => { setSidebarTab('SEARCH'); setTimeout(() => searchRef.current?.focus(), 50); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                sidebarTab === 'SEARCH'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
                            }`}
                        >
                            <Search size={11} />
                            Buscar Cliente
                        </button>
                    </div>
                    {sidebarTab === 'SEARCH' && (
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={clientSearch}
                                onChange={e => setClientSearch(e.target.value)}
                                placeholder="Digite o nome do cliente..."
                                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
                            />
                        </div>
                    )}
                    {sidebarTab === 'PENDING' && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                            Clientes aguardando agendamento
                        </p>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {/* --- PENDING TAB --- */}
                    {sidebarTab === 'PENDING' && (
                        pendingClients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                                <h4 className="text-xs font-bold text-slate-600">Tudo em dia!</h4>
                                <p className="text-[10px] max-w-[180px] mt-1">Nenhum cliente precisa de agendamento no momento.</p>
                            </div>
                        ) : (
                            pendingClients.map(({ client, isOverdue, diffDays, lastVisit, state }) => (
                                <div
                                    key={client.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, client)}
                                    onDragEnd={handleDragEnd}
                                    className={`p-3.5 rounded-xl border-2 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden ${
                                        isOverdue
                                            ? 'border-rose-100 hover:border-rose-300'
                                            : 'border-amber-100 hover:border-amber-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                            isOverdue
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                                        }`}>
                                            {isOverdue ? 'Atrasado' : 'Alerta'}
                                        </span>
                                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                            {state}
                                        </span>
                                    </div>
                                    <h4 className="font-extrabold text-slate-800 text-xs uppercase leading-tight line-clamp-2 mb-2">
                                        {client.name}
                                    </h4>
                                    <div className="text-[10px] text-slate-500 font-medium space-y-1">
                                        <p className="flex items-center gap-1">
                                            <CalendarIcon size={11} className="text-slate-400" />
                                            Última: {lastVisit ? formatDate(lastVisit.date) : 'Nenhuma'}
                                        </p>
                                        <p className={`font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                                            <AlertTriangle size={11} />
                                            {isOverdue
                                                ? `Venceu há ${Math.abs(diffDays)} dias`
                                                : `Vence daqui a ${diffDays} dias`}
                                        </p>
                                    </div>
                                    <div className="absolute right-2 bottom-2 bg-slate-50 p-1 rounded border opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Arraste para Agendar</span>
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {/* --- SEARCH TAB --- */}
                    {sidebarTab === 'SEARCH' && (
                        clientSearch.trim() === '' ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                <Search size={28} className="text-indigo-300 mb-3" />
                                <h4 className="text-xs font-bold text-slate-500">Busque um cliente</h4>
                                <p className="text-[10px] max-w-[180px] mt-1">Digite o nome para encontrar e arrastar ao calendário.</p>
                            </div>
                        ) : searchedClients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                <Users size={28} className="text-slate-300 mb-3" />
                                <p className="text-[10px]">Nenhum cliente encontrado.</p>
                            </div>
                        ) : (
                            searchedClients.map(client => (
                                <div
                                    key={client.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, client)}
                                    onDragEnd={handleDragEnd}
                                    className="p-3 rounded-xl border-2 border-indigo-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            Cliente
                                        </span>
                                        {client.state && (
                                            <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                                {client.state}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-extrabold text-slate-800 text-xs uppercase leading-tight line-clamp-2">
                                        {client.name}
                                    </h4>
                                    <div className="absolute right-2 bottom-2 bg-slate-50 p-1 rounded border opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Arraste para Agendar</span>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Calendar Container */}
            <div className="flex-grow bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm min-w-0">
                {/* Calendar Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <CalendarRange className="text-indigo-600" size={18} />
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                            Hoje
                        </button>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Weekdays Labels */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-2 shrink-0">
                    <div>Dom</div>
                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div>Sáb</div>
                </div>

                {/* Calendar Days Grid */}
                <div className="flex-grow grid grid-cols-7 grid-rows-6 min-h-0 bg-slate-200/40">
                    {calendarDays.map((item, idx) => {
                        const dayStr = item.date.toISOString().split('T')[0];
                        const weekStartStr = getWeekStartDateStr(item.date);
                        const isToday = new Date().toDateString() === item.date.toDateString();
                        // Find if this day falls into any reservation range
                        const dayReservation = reservations.find(r => {
                            const endD = r.end_date || r.week_start;
                            return dayStr >= r.week_start && dayStr <= endD;
                        });
                        const isReservationStart = dayReservation && dayReservation.week_start === dayStr;
                        const isReservationEnd = dayReservation && (dayReservation.end_date || dayReservation.week_start) === dayStr;

                        let isSegmentStart = false;
                        let segmentSpan = 1;

                        if (dayReservation) {
                            // A segment starts either on the actual reservation start date, 
                            // OR on a Sunday (which is the first column of the row)
                            isSegmentStart = (dayStr === dayReservation.week_start) || (item.date.getDay() === 0);

                            if (isSegmentStart) {
                                const endD = dayReservation.end_date || dayReservation.week_start;
                                const [ey, em, ed] = endD.split('-');
                                const endDateObj = new Date(ey, em - 1, ed);
                                // Set both to midnight local time for fair comparison
                                const itemDateObj = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());
                                const diffTime = endDateObj.getTime() - itemDateObj.getTime();
                                const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                                const daysLeftInRow = 6 - itemDateObj.getDay();
                                segmentSpan = Math.min(diffDays, daysLeftInRow) + 1;
                            }
                        }

                        // Find scheduled travels mapped from tasks for this day
                        const dayTravels = mappedTravels.filter(tr => tr.date === dayStr);

                        // Find planned visits (drafts) for this day
                        const dayPlanned = plannedVisits.filter(pv => {
                            if (!pv.visit_date) return false;
                            const pvDate = pv.visit_date.split('T')[0];
                            return pvDate === dayStr;
                        });

                        return (
                            <div 
                                key={idx}
                                onDrop={(e) => handleDrop(e, item.date)}
                                onDragOver={handleDragOver}
                                className={`bg-white border-r border-b border-slate-100 p-2 flex flex-col min-h-[100px] relative group/day hover:bg-slate-50/30 transition-all ${
                                    item.isCurrentMonth ? 'text-slate-800' : 'text-slate-350 bg-slate-50/20'
                                }`}
                            >
                                {/* Continuous Date Range Banner Background */}
                                {dayReservation && (
                                    <div 
                                        onClick={() => handleOpenReserve(dayStr, dayReservation)}
                                        className={`absolute top-1 bottom-1 left-0 right-0 bg-indigo-50 border-y border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors ${
                                            isReservationStart ? 'rounded-l-xl border-l ml-1' : ''
                                        } ${
                                            isReservationEnd ? 'rounded-r-xl border-r mr-1' : ''
                                        }`}
                                        title={dayReservation.notes}
                                    />
                                )}

                                {/* Distributed label across cells */}
                                {dayReservation && isSegmentStart && (
                                    <div 
                                        style={{ width: `calc(${segmentSpan * 100}%)` }} 
                                        className="absolute top-1 bottom-1 left-0 flex flex-col items-center justify-center p-2 opacity-30 pointer-events-none overflow-visible z-[5]"
                                    >
                                        <span className="text-3xl font-black text-indigo-700 uppercase tracking-widest leading-none drop-shadow-sm">
                                            {dayReservation.state_code}
                                        </span>
                                        {dayReservation.notes && (
                                            <span className="text-[10px] font-bold text-indigo-800 uppercase text-center line-clamp-2 mt-1 leading-tight w-full px-4 drop-shadow-sm">
                                                {dayReservation.notes}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Day Number Header */}
                                <div className="flex justify-between items-center mb-1 shrink-0 relative z-10">
                                    <span className={`text-[10px] font-black flex items-center justify-center w-5 h-5 rounded-full ${
                                        isToday ? 'bg-indigo-600 text-white shadow-md' : (dayReservation ? 'bg-white shadow-sm text-indigo-700' : '')
                                    }`}>
                                        {item.day}
                                    </span>

                                    {/* Action button to reserve period (Visible on hover any day) */}
                                    <button 
                                        onClick={() => handleOpenReserve(dayStr, dayReservation)}
                                        className="opacity-0 group-hover/day:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-all cursor-pointer bg-white/80"
                                        title={dayReservation ? "Editar Período" : "Bloquear/Reservar Período"}
                                    >
                                        {dayReservation ? <Edit2 size={10} /> : <Tag size={10} />}
                                    </button>
                                </div>

                                {/* Scheduled Tasks/Visits List */}
                                <div className="flex-grow overflow-y-auto scrollbar-hide space-y-1 mt-1 pr-0.5 relative z-10">
                                    {/* Drafts / Planned Visits */}
                                    {dayPlanned.map(pv => (
                                        <div 
                                            key={pv.id}
                                            draggable
                                            onDragStart={(e) => handleDragStartPlanned(e, pv)}
                                            onDragEnd={handleDragEnd}
                                            className="px-1.5 py-1 bg-indigo-50/50 border border-dashed border-indigo-300 rounded-md text-[9px] font-bold text-indigo-750 hover:border-indigo-400 hover:bg-indigo-50/80 transition-all flex items-center justify-between group/pv cursor-grab active:cursor-grabbing uppercase"
                                            title={`${pv.client_name} (Rascunho de Viagem)`}
                                        >
                                            <span className="truncate">✈️ {pv.client_name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover/pv:opacity-100 transition-opacity ml-1 shrink-0">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            const { error } = await supabase
                                                                .from('planned_visits')
                                                                .delete()
                                                                .eq('id', pv.id);
                                                            if (error) throw error;
                                                            
                                                            const clientObj = allClients.find(c => c.id === pv.client_id) || { name: pv.client_name };
                                                            
                                                            if (onNewTask) {
                                                                onNewTask(pv.client_name, {
                                                                    due_date: pv.visit_date,
                                                                    client: pv.client_name,
                                                                    location: clientObj.address || '',
                                                                    description: `VISITA CONFIRMADA VIA CRONOGRAMA DE VIAGENS.`
                                                                });
                                                            }
                                                            fetchPlannedVisits();
                                                        } catch (err) {
                                                            notifyError('Erro ao confirmar viagem', err.message);
                                                        }
                                                    }}
                                                    className="p-0.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                                                    title="Confirmar Viagem (Gerar Tarefa)"
                                                >
                                                    <CheckCircle2 size={9} />
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!confirm('Excluir este rascunho de viagem?')) return;
                                                        try {
                                                            const { error } = await supabase
                                                                .from('planned_visits')
                                                                .delete()
                                                                .eq('id', pv.id);
                                                            if (error) throw error;
                                                            notifySuccess('Rascunho removido.');
                                                            fetchPlannedVisits();
                                                        } catch (err) {
                                                            notifyError('Erro ao excluir', err.message);
                                                        }
                                                    }}
                                                    className="p-0.5 bg-rose-500 text-white rounded hover:bg-rose-600 transition-colors"
                                                    title="Excluir Rascunho"
                                                >
                                                    <Trash2 size={9} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Confirmed Travels */}
                                    {dayTravels.map(travel => {
                                        const isFinalized = travel.status === 'FINALIZADA' || travel.status === 'CONCLUIDA';
                                        return (
                                            <div 
                                                key={travel.id}
                                                onClick={() => onEditTask && onEditTask(travel.taskObj)}
                                                className={`px-1.5 py-0.5 border rounded-md text-[9px] font-bold truncate transition-colors uppercase cursor-pointer ${
                                                    isFinalized 
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70' 
                                                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70'
                                                }`}
                                                title={`${travel.clientName} [${travel.status}]`}
                                            >
                                                {isFinalized ? '✓' : '✈️'} {travel.clientName}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal: Week Reservation */}
            {showReserveModal && (
                <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                    {editingReservationId ? 'Editar Reserva' : 'Bloquear Período'}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5">
                                    Configurar agenda de viagem
                                </p>
                            </div>
                            <button onClick={() => setShowReserveModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                                <Plus className="rotate-45" size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveReservation} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Data de Início</label>
                                    <input 
                                        type="date"
                                        value={selectedWeekStart}
                                        onChange={(e) => setSelectedWeekStart(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Data de Fim</label>
                                    <input 
                                        type="date"
                                        value={reserveEndDate}
                                        onChange={(e) => setReserveEndDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Estado (UF) Destino</label>
                                <select 
                                    value={reserveState}
                                    onChange={(e) => setReserveState(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    required
                                >
                                    <option value="">SELECIONE O ESTADO...</option>
                                    {BRAZILIAN_STATES.map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Notas / Observações</label>
                                <textarea 
                                    value={reserveNotes}
                                    onChange={(e) => setReserveNotes(e.target.value)}
                                    placeholder="DETALHES OU PLANEJAMENTO DA VIAGEM..."
                                    className="w-full h-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                                {editingReservationId && (
                                    <button 
                                        type="button" 
                                        onClick={handleDeleteReservation}
                                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-colors flex items-center justify-center shrink-0"
                                        title="Remover Reserva"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                                <button type="button" onClick={() => setShowReserveModal(false)} className="flex-1 py-2.5 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-[2] py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-1">
                                    <CheckCircle2 size={13} />
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TravelCalendarTab;