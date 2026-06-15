import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, 
    AlertTriangle, CheckCircle2, Clock, Trash2, Tag, CalendarRange
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const TravelCalendarTab = ({
    currentUser,
    allClients = [],
    tasks = [],
    onNewTask,
    notifySuccess,
    notifyError
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reservations, setReservations] = useState([]);
    const [loadingReservations, setLoadingReservations] = useState(false);
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [selectedWeekStart, setSelectedWeekStart] = useState('');
    const [reserveState, setReserveState] = useState('');
    const [reserveNotes, setReserveNotes] = useState('');
    const [draggedClient, setDraggedClient] = useState(null);

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

    useEffect(() => {
        fetchReservations();
    }, []);

    // Calculate clients health and check who needs visit (SLA Warning/Expired)
    const pendingClients = useMemo(() => {
        const today = new Date();
        const list = [];

        allClients.forEach(client => {
            if (!client.name) return;
            if (!client.visit_frequency_months) return; // Skip if no schedule is defined

            const lastVisit = getLastVisit(client.name);
            const freq = client.visit_frequency_months;
            const lead = client.visit_lead_time_months || 2;

            let lastVisitDate = null;
            if (lastVisit && lastVisit.date) {
                lastVisitDate = new Date(lastVisit.date);
            }

            let dueDate = null;
            let warningDate = null;

            if (lastVisitDate) {
                dueDate = new Date(lastVisitDate);
                dueDate.setMonth(dueDate.getMonth() + freq);

                warningDate = new Date(dueDate);
                warningDate.setMonth(warningDate.getMonth() - lead);
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
                return isMatch && isUpcoming && t.status !== 'DONE' && t.status !== 'CANCELED';
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

    // Open Reserve Modal for a specific week
    const handleOpenReserve = (weekStartDate) => {
        setSelectedWeekStart(weekStartDate);
        const existing = reservations.find(r => r.week_start === weekStartDate);
        if (existing) {
            setReserveState(existing.state_code);
            setReserveNotes(existing.notes || '');
        } else {
            setReserveState('');
            setReserveNotes('');
        }
        setShowReserveModal(true);
    };

    // Save week reservation
    const handleSaveReservation = async (e) => {
        e.preventDefault();
        if (!reserveState) return;

        try {
            const existing = reservations.find(r => r.week_start === selectedWeekStart);
            const payload = {
                week_start: selectedWeekStart,
                state_code: reserveState,
                notes: reserveNotes.toUpperCase(),
                user_id: currentUser?.id,
                created_at: new Date().toISOString()
            };

            if (existing) {
                const { error } = await supabase
                    .from('travel_reservations')
                    .update(payload)
                    .eq('id', existing.id);
                if (error) throw error;
                notifySuccess('Sucesso', 'Reserva atualizada!');
            } else {
                const { error } = await supabase
                    .from('travel_reservations')
                    .insert([payload]);
                if (error) throw error;
                notifySuccess('Sucesso', 'Semana reservada no calendário!');
            }
            setShowReserveModal(false);
            fetchReservations();
        } catch (err) {
            notifyError('Erro', err.message);
        }
    };

    // Delete week reservation
    const handleDeleteReservation = async () => {
        const existing = reservations.find(r => r.week_start === selectedWeekStart);
        if (!existing) return;

        if (!confirm('Deseja realmente remover a reserva desta semana?')) return;

        try {
            const { error } = await supabase
                .from('travel_reservations')
                .delete()
                .eq('id', existing.id);
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

    const handleDrop = (e, dayDate) => {
        e.preventDefault();
        if (!draggedClient) return;

        const formattedDateStr = dayDate.toISOString().split('T')[0];
        
        // Trigger create task with pre-filled client and date
        if (onNewTask) {
            onNewTask(draggedClient.name, {
                due_date: formattedDateStr,
                client: draggedClient.name,
                location: draggedClient.address || '',
                description: `VISITA AGENDADA VIA CRONOGRAMA DE VIAGENS.`
            });
        }

        setDraggedClient(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div className="flex-grow flex flex-col lg:flex-row min-h-0 bg-slate-50/50 p-4 gap-4 overflow-hidden">
            {/* Sidebar: Pending Visits */}
            <div className="w-full lg:w-80 shrink-0 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-indigo-50/20">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Clock className="text-indigo-600" size={16} />
                        Banco de Visitas
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Clientes aguardando agendamento
                    </p>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {pendingClients.length === 0 ? (
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

                        // Find week reservation
                        const weekReservation = reservations.find(r => r.week_start === weekStartStr);

                        // Find scheduled visits/tasks for this day
                        const dayTasks = tasks.filter(t => {
                            if (!t.due_date) return false;
                            const tDate = t.due_date.split('T')[0];
                            return tDate === dayStr && t.status !== 'DONE' && t.status !== 'CANCELED';
                        });

                        // Only render the reservation highlight on Monday (Seg) cell of each row to avoid visual spam, or across all
                        const isSeg = item.date.getDay() === 1; // 1 = Monday

                        return (
                            <div 
                                key={idx}
                                onDrop={(e) => handleDrop(e, item.date)}
                                onDragOver={handleDragOver}
                                className={`bg-white border-r border-b border-slate-100 p-2 flex flex-col min-h-0 relative group/day hover:bg-slate-50/30 transition-all ${
                                    item.isCurrentMonth ? 'text-slate-800' : 'text-slate-350 bg-slate-50/20'
                                }`}
                            >
                                {/* Week Reservation Banner */}
                                {isSeg && weekReservation && (
                                    <div 
                                        onClick={() => handleOpenReserve(weekStartStr)}
                                        className="absolute -top-1.5 left-1 right-1 z-10 bg-indigo-600 text-white rounded-md text-[8px] font-black uppercase tracking-wider py-0.5 px-1.5 shadow-sm border border-indigo-700 flex items-center justify-between cursor-pointer hover:bg-indigo-700 transform transition-transform"
                                        title={weekReservation.notes}
                                    >
                                        <span className="truncate">✈️ RESERVA: {weekReservation.state_code}</span>
                                    </div>
                                )}

                                {/* Day Number Header */}
                                <div className="flex justify-between items-center mb-1 shrink-0">
                                    <span className={`text-[10px] font-black flex items-center justify-center w-5 h-5 rounded-full ${
                                        isToday ? 'bg-indigo-600 text-white shadow-md' : ''
                                    }`}>
                                        {item.day}
                                    </span>

                                    {/* Action button to reserve week (Only on Mondays) */}
                                    {isSeg && (
                                        <button 
                                            onClick={() => handleOpenReserve(weekStartStr)}
                                            className="opacity-0 group-hover/day:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-all cursor-pointer"
                                            title="Bloquear/Reservar Semana"
                                        >
                                            <Tag size={10} />
                                        </button>
                                    )}
                                </div>

                                {/* Scheduled Tasks/Visits List */}
                                <div className="flex-grow overflow-y-auto scrollbar-hide space-y-1 mt-1 pr-0.5">
                                    {dayTasks.map(task => (
                                        <div 
                                            key={task.id}
                                            className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[9px] font-bold text-slate-700 truncate hover:border-slate-300 transition-colors uppercase"
                                            title={task.title || task.client}
                                        >
                                            📌 {task.client || task.title}
                                        </div>
                                    ))}
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
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bloquear Semana</h3>
                                <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5">
                                    Início em: {formatDate(selectedWeekStart)}
                                </p>
                            </div>
                            <button onClick={() => setShowReserveModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                                <Plus className="rotate-45" size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveReservation} className="p-6 space-y-4">
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
                                {reservations.some(r => r.week_start === selectedWeekStart) && (
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