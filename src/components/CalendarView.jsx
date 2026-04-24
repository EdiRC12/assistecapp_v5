import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, AlertCircle,
    Factory, Clock, Check, X, Eye, StickyNote, Grid, Shield, ShieldCheck, List
} from 'lucide-react';
import { TaskStatus, StatusLabels, Priority, PriorityColors } from '../constants/taskConstants';
import { generateUUID } from '../utils/helpers';
import useIsMobile from '../hooks/useIsMobile';

const CalendarView = ({ tasks, onEditTask, onUpdateTask, notes = [], currentUser, notifySuccess, notifyError }) => {
    const isMobile = useIsMobile();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('MONTH'); // MONTH, WEEK, YEAR, DAY
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [dragOverDate, setDragOverDate] = useState(null);
    const [touchDragItem, setTouchDragItem] = useState(null);
    const [touchGhostPos, setTouchGhostPos] = useState({ x: 0, y: 0 });
    const [previousViewMode, setPreviousViewMode] = useState(null);
    const [minimizedWeekends, setMinimizedWeekends] = useState(true);
    const calendarRef = useRef(null);
    const popupRef = useRef(null);

    // Logic removed to clean up duplicate code in next step

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

    const [viewModeHasBeenSet, setViewModeHasBeenSet] = useState(false);

    useEffect(() => {
        if (!viewModeHasBeenSet && isMobile !== undefined) {
            setViewMode(isMobile ? 'WEEK' : 'MONTH');
            setViewModeHasBeenSet(true);
        }
    }, [isMobile, viewModeHasBeenSet]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setSelectedEventId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    // Extração de eventos
    const events = useMemo(() => {
        const rawEvents = [];
        if (!Array.isArray(tasks) || !TaskStatus) return [];
        for (const task of tasks) {
            if (!task || task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELED) continue;

            const mainIdentifier = task.client || task.title || 'Sem identificação';
            const priority = task.priority || Priority.MEDIUM;

            // Stages
            if (task.stages) {
                for (const [stageName, stage] of Object.entries(task.stages)) {
                    if (!stage || !stage.active || !stage.date) continue;
                    const isStageFinished = ['COMPLETED', 'SOLUCIONADO', 'FINALIZADO', 'DEVOLVIDO'].includes(stage.status);

                    rawEvents.push({
                        id: `${task.id}-${stageName}`,
                        taskId: task.id,
                        date: stage.date,
                        titleSuffix: stageName === 'Agendamento de Visita' ? 'Visita' : stageName,
                        type: stageName === 'Agendamento de Visita' ? 'VISIT' : 'PRODUCTION',
                        originalTask: task,
                        priority: priority,
                        stageName: stageName,
                        isCompleted: isStageFinished,
                        detailsData: stageName === 'Agendamento de Visita' ? (stage.visitationDetails || {}) : { description: stage.description }
                    });
                }
            }

            // Due Date
            if (task.due_date) {
                const parsedDueDateStr = task.due_date.includes('T') ? task.due_date.split('T')[0] : task.due_date;
                rawEvents.push({
                    id: `${task.id}-due`,
                    taskId: task.id,
                    date: parsedDueDateStr,
                    titleSuffix: 'Entrega',
                    type: 'DEADLINE',
                    originalTask: task,
                    priority: priority,
                    detailsData: { description: task.description }
                });
            }

            // Travels
            if (task.travels && Array.isArray(task.travels)) {
                task.travels.forEach((travel, idx) => {
                    if (travel.isDateDefined && travel.date) {
                        const teamStr = Array.isArray(travel.team) ? travel.team.filter(Boolean).join(', ') : '';
                        rawEvents.push({
                            id: `${task.id}-travel-${travel.id || idx}`,
                            taskId: task.id,
                            date: travel.date,
                            titleSuffix: `Viagem${teamStr ? ` (${teamStr})` : ''}`,
                            type: 'VISIT',
                            originalTask: task,
                            priority: priority,
                            travelId: travel.id,
                            travelIdx: idx,
                            detailsData: { description: `Viagem agendada. Contato: ${travel.contacts || 'Não informado'} (${travel.role || '-'})` }
                        });
                    }
                });
            }
        }

        // Apply Step Counters [x/y]
        const taskIdToEvents = {};
        rawEvents.forEach(ev => {
            if (!taskIdToEvents[ev.taskId]) taskIdToEvents[ev.taskId] = [];
            taskIdToEvents[ev.taskId].push(ev);
        });

        const finalEvents = [];
        Object.values(taskIdToEvents).forEach(taskEvs => {
            // Sort by date to assign correct counter
            taskEvs.sort((a, b) => new Date(a.date) - new Date(b.date));
            const total = taskEvs.length;
            taskEvs.forEach((ev, idx) => {
                const rawIdentifier = ev.originalTask.client || ev.originalTask.title || 'Sem identificação';

                // Truncate logic: If longer than 15 chars, take first ~15 and add ...
                const mainIdentifier = rawIdentifier.length > 20
                    ? rawIdentifier.substring(0, 17).trim() + '...'
                    : rawIdentifier;

                const counter = (total > 1 && ev.type !== 'DEADLINE') ? `[${idx + 1}/${total}] ` : '';
                const isOverdue = ev.date < todayStr && !ev.isCompleted;

                const isFromTest = !!ev.originalTask.parent_test_id;
                const isFromFollowup = !!ev.originalTask.parent_followup_id;

                let prefix = '';
                if (ev.type === 'DEADLINE') prefix = '🚩 ';
                else if (isFromTest) prefix = '🧪 ';
                else if (isFromFollowup) prefix = '🛡️ ';
                else prefix = counter;

                let mobileCounter = '';
                if (total > 1 && ev.type !== 'DEADLINE') {
                    mobileCounter = `[${idx + 1}/${total}]`;
                }

                finalEvents.push({
                    ...ev,
                    isOverdue,
                    isFromTest,
                    isFromFollowup,
                    prefixIconText: prefix.trim(),
                    mobileCounterText: mobileCounter,
                    shortTitle: mainIdentifier,
                    fullTitle: `${prefix}${mainIdentifier} / ${ev.titleSuffix}`
                });
            });
        });

        return finalEvents;
    }, [tasks]);

    const focusedTaskId = useMemo(() => {
        if (!selectedEventId) return null;
        const ev = events.find(e => e.id === selectedEventId);
        return ev ? ev.taskId : null;
    }, [selectedEventId, events]);

    // Handlers
    // Weekend Mini-logic
    const getWeekendStatus = useMemo(() => {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDate = new Date(year, month, 1 - monthStart.getDay());
        const endDate = new Date(year, month + 1, 7 - monthEnd.getDay() - 1);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const hasTasksOnSun = events.some(e => {
            const d = new Date(e.date + 'T00:00:00');
            return d.getDay() === 0 && e.date >= startStr && e.date <= endStr;
        });
        const hasTasksOnSat = events.some(e => {
            const d = new Date(e.date + 'T00:00:00');
            return d.getDay() === 6 && e.date >= startStr && e.date <= endStr;
        });

        return {
            sun: !minimizedWeekends || hasTasksOnSun,
            sat: !minimizedWeekends || hasTasksOnSat
        };
    }, [events, minimizedWeekends, month, year]);

    const gridTemplate = useMemo(() => {
        const columns = [];
        columns.push(getWeekendStatus.sun ? (isMobile ? '20px' : '1fr') : (isMobile ? '12px' : '50px')); // Dom resizes more aggressively on mobile
        for (let i = 1; i <= 5; i++) columns.push('1fr');  // Seg-Sex
        columns.push(getWeekendStatus.sat ? (isMobile ? '20px' : '1fr') : (isMobile ? '12px' : '50px')); // Sáb resizes more aggressively on mobile
        return columns.join(' ');
    }, [getWeekendStatus, isMobile]);

    const handleMoveEvent = async (eventId, newDate) => {
        const ev = events.find(e => e.id === eventId);
        if (!ev) return;
        const task = ev.originalTask;
        if (!task) return;

        // Proteção de Permissão no Calendário
        if (currentUser) {
            const canEditTask = task.visibility === 'PUBLIC' ||
                task.user_id === currentUser.id ||
                (task.assigned_users && task.assigned_users.includes(currentUser.id));

            if (!canEditTask) {
                notifyError('Acesso Negado', 'Você não tem permissão para modificar esta tarefa privada.');
                return;
            }
        }

        const dateStr = newDate instanceof Date ? newDate.toISOString().split('T')[0] : newDate;
        if (ev.type === 'DEADLINE') {
            onUpdateTask({ ...task, due_date: dateStr });
        } else if (ev.type === 'VISIT' && (ev.travelId !== undefined || ev.travelIdx !== undefined)) {
            let targetIdx = -1;
            if (ev.travelId) targetIdx = task.travels.findIndex(tr => tr.id === ev.travelId);
            if (targetIdx === -1 && ev.travelIdx !== undefined) targetIdx = ev.travelIdx;

            if (targetIdx !== -1 && task.travels[targetIdx]) {
                const updatedTravels = [...task.travels];
                updatedTravels[targetIdx] = {
                    ...updatedTravels[targetIdx],
                    date: dateStr,
                    id: updatedTravels[targetIdx].id || generateUUID()
                };
                onUpdateTask({ ...task, travels: updatedTravels });
            }
        } else {
            const updatedStages = { ...task.stages };
            updatedStages[ev.stageName] = { ...updatedStages[ev.stageName], date: dateStr };
            onUpdateTask({ ...task, stages: updatedStages });
        }
    };



    const handlePrev = () => {
        if (viewMode === 'MONTH') setCurrentDate(new Date(year, month - 1, 1));
        else if (viewMode === 'WEEK') setCurrentDate(new Date(year, month, day - 7));
        else if (viewMode === 'DAY') setCurrentDate(new Date(year, month, day - 1));
        else setCurrentDate(new Date(year - 1, month, 1));
    };
    const handleNext = () => {
        if (viewMode === 'MONTH') setCurrentDate(new Date(year, month + 1, 1));
        else if (viewMode === 'WEEK') setCurrentDate(new Date(year, month, day + 7));
        else if (viewMode === 'DAY') setCurrentDate(new Date(year, month, day + 1));
        else setCurrentDate(new Date(year + 1, month, 1));
    };
    const handleToday = () => { setCurrentDate(new Date()); setViewMode(isMobile ? 'WEEK' : 'MONTH'); };
    const handleMonthClick = (monthIndex) => { setCurrentDate(new Date(year, monthIndex, 1)); setViewMode('MONTH'); };
    const handleDayDoubleClick = (dayNum) => { 
        setPreviousViewMode(viewMode);
        setCurrentDate(new Date(year, month, dayNum)); 
        setViewMode('DAY'); 
    };

    // Drag
    const handleDragStart = (e, event) => { if (isMobile) { e.preventDefault(); return; } e.stopPropagation(); e.dataTransfer.setData('application/json', JSON.stringify({ taskId: event.taskId, type: event.type, stageName: event.stageName, travelId: event.travelId, travelIdx: event.travelIdx })); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e, dateStr) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverDate !== dateStr) setDragOverDate(dateStr); };
    const handleDrop = (e, targetDateStr) => {
        e.preventDefault(); setDragOverDate(null);
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;
        try {
            const { taskId, type, stageName } = JSON.parse(dataStr);
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            // Proteção de Permissão no Drop
            if (currentUser) {
                const canEditTask = task.visibility === 'PUBLIC' ||
                    task.user_id === currentUser.id ||
                    (task.assigned_users && task.assigned_users.includes(currentUser.id));

                if (!canEditTask) {
                    notifyError('Acesso Negado', 'Você não tem permissão para modificar esta tarefa privada.');
                    return;
                }
            }

            if (type === 'DEADLINE') onUpdateTask({ id: taskId, due_date: targetDateStr });
            else if (type === 'VISIT' && !stageName) {
                // It is a Travel event from 'travels' array
                const { travelId, travelIdx } = JSON.parse(dataStr);
                let targetIdx = -1;
                if (travelId) targetIdx = task.travels.findIndex(tr => tr.id === travelId);
                if (targetIdx === -1 && travelIdx !== undefined) targetIdx = travelIdx;

                if (targetIdx !== -1 && task.travels[targetIdx]) {
                    const updatedTravels = [...task.travels];
                    updatedTravels[targetIdx] = {
                        ...updatedTravels[targetIdx],
                        date: targetDateStr,
                        id: updatedTravels[targetIdx].id || generateUUID()
                    };
                    onUpdateTask({ id: taskId, travels: updatedTravels });
                }
            } else if ((type === 'PRODUCTION' || type === 'VISIT') && stageName) {
                const currentStage = task.stages[stageName];
                if (currentStage) onUpdateTask({ id: taskId, stages: { ...task.stages, [stageName]: { ...currentStage, date: targetDateStr } } });
            }
        } catch (error) { console.error(error); }
    };

    // Status Change
    const handleStatusChange = (event, newStatus) => {
        const task = event.originalTask;
        if (!task) return;

        if (event.type === 'DEADLINE') {
            // Update task status
            onUpdateTask({ ...task, status: newStatus });
        } else if (event.stageName) {
            // Update stage status
            const stage = task.stages[event.stageName];
            const updatedStages = {
                ...task.stages,
                [event.stageName]: { ...stage, status: newStatus }
            };
            onUpdateTask({ ...task, stages: updatedStages });
        }
        setSelectedEventId(null);
    };

    // Touch Drag Support
    useEffect(() => {
        if (!touchDragItem) return;

        const handleTouchMove = (e) => {
            if (e.cancelable) e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            setTouchGhostPos({ x: touch.clientX, y: touch.clientY });

            // Detect drop target
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!el) return;
            const cell = el.closest('[data-date]');
            if (cell) {
                const date = cell.getAttribute('data-date');
                if (dragOverDate !== date) setDragOverDate(date);
            } else {
                if (dragOverDate) setDragOverDate(null);
            }
        };

        const handleTouchEnd = (e) => {
            const touch = e.changedTouches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (el) {
                const cell = el.closest('[data-date]');
                if (cell) {
                    const date = cell.getAttribute('data-date');
                    if (date) {
                        // Invoke handleDrop
                        const fakeEvent = {
                            preventDefault: () => { },
                            dataTransfer: {
                                getData: () => JSON.stringify({
                                    taskId: touchDragItem.taskId,
                                    type: touchDragItem.type,
                                    stageName: touchDragItem.stageName,
                                    travelId: touchDragItem.travelId,
                                    travelIdx: touchDragItem.travelIdx
                                })
                            }
                        };
                        handleDrop(fakeEvent, date);
                    }
                }
            }
            setTouchDragItem(null);
            setDragOverDate(null);
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [touchDragItem, dragOverDate, tasks]); // Dependencies

    const handleTouchStart = (e, event) => {
        if (isMobile) return;
        // e.stopPropagation(); // Let it bubble if needed, but usually we want to grab
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        setTouchDragItem(event);
        setTouchGhostPos({ x: touch.clientX, y: touch.clientY });
    };

    const getEventsForDay = (dayNum) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        return events.filter(e => e.date === dateStr);
    };

    const getEventsCountForMonth = (mIndex) => {
        return events.filter(e => {
            const [eY, eM] = e.date.split('-').map(Number);
            return eY === year && (eM - 1) === mIndex;
        }).length;
    };

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    // Week Generation
    const weekDays = useMemo(() => {
        const startOfWeek = new Date(year, month, day);
        const dayOfWeek = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
        // Adjust startOfWeek to the Sunday of the current week
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(current.getDate() + i);
            days.push(current);
        }
        return days;
    }, [year, month, day]);

    // Render list style day card
    const renderDayCard = (currentDayObj) => {
        const cDateStr = currentDayObj.toISOString().split('T')[0];
        const dEvents = events.filter(e => e.date === cDateStr);
        const isToday = cDateStr === todayStr;

        if (dEvents.length === 0) return null; // Or return a small placeholder if needed in the future

        return (
            <div key={cDateStr} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 ${isToday ? 'ring-2 ring-brand-500' : ''}`}>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h3 className={`text-base font-bold ${isToday ? 'text-brand-600' : 'text-slate-800'} capitalize flex items-center gap-2`}>
                        {currentDayObj.getDate()} de {monthNames[currentDayObj.getMonth()]}
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][currentDayObj.getDay()]}
                        </span>
                    </h3>
                    {isToday && <span className="text-[10px] font-bold bg-brand-100 text-brand-600 px-2 py-1 rounded-full uppercase">Hoje</span>}
                </div>

                <div className="space-y-3">
                    {dEvents.map(ev => {
                        const isOver = ev.date < todayStr && !ev.isCompleted;
                        let borderClass = isOver ? 'border-l-4 border-l-red-500' : ev.type === 'VISIT' ? 'border-l-4 border-l-emerald-500' : ev.type === 'DEADLINE' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-amber-500';

                        return (
                            <div key={ev.id} className={`bg-slate-50 rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow ${borderClass}`}>
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1 w-full relative cursor-pointer group-hover:bg-slate-100/50 rounded p-1 -m-1" onClick={() => onEditTask(ev.originalTask)}>
                                        <div className="flex items-center flex-wrap gap-2 mb-2">
                                            {ev.type === 'VISIT' ? <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin size={10} /> Visita</span> :
                                                ev.type === 'DEADLINE' ? <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> Entrega</span> :
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Factory size={10} /> Produção</span>}
                                            <span className="text-xs text-slate-400 font-mono">{ev.date.split('-').reverse().join('/')}</span>
                                        </div>
                                        <h3 className="text-sm md:text-base font-bold text-slate-800 group-hover:text-brand-600 break-words">{ev.title}</h3>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-2 rounded border border-slate-100 pointer-events-none">{renderDetails(ev)}</div>
                                    </div>
                                    <div className="w-full md:w-32 shrink-0">
                                        {renderStatusOptions(ev)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Event Details Renderer
    const renderDetails = (event) => {
        if (event.type === 'VISIT') {
            const details = event.detailsData;
            // If it's a Travel (only has description) or has specific visit details
            if (details?.scheduledWith || details?.accompaniedBy || details?.contactInfo) {
                return (
                    <div className="space-y-1 text-xs">
                        {details?.scheduledWith && <p><span className="font-semibold text-slate-700">Com:</span> {details.scheduledWith}</p>}
                        {details?.accompaniedBy && <p><span className="font-semibold text-slate-700">Acomp:</span> {details.accompaniedBy}</p>}
                        {details?.contactInfo && <p><span className="font-semibold text-slate-700">Contato:</span> {details.contactInfo}</p>}
                        {details?.description && <p className="text-slate-600 italic pt-1 border-t border-slate-100 mt-1">{details.description}</p>}
                    </div>
                )
            }
        }
        return (
            <div className="text-xs">
                {event.detailsData?.description ? <p className="text-slate-600 line-clamp-4">{event.detailsData.description}</p> : <p className="text-slate-400 italic">Sem descrição.</p>}
            </div>
        )
    };

    // Status Options Renderer
    const renderStatusOptions = (event) => {
        let options = [];
        let currentStatus = '';

        if (event.type === 'DEADLINE') {
            currentStatus = event.originalTask.status;
            options = Object.keys(TaskStatus).map(k => ({ value: k, label: StatusLabels[k] }));
        } else if (event.stageName) {
            // Stage Statuses
            currentStatus = event.originalTask.stages[event.stageName]?.status;
            options = [
                { value: 'NOT_STARTED', label: 'Não Iniciada' },
                { value: 'IN_PROGRESS', label: 'Em Andamento' },
                { value: 'COMPLETED', label: 'Finalizada' },
            ];
            if (event.type === 'VISIT') {
                // Keep same options for now
            }
        } else if (event.type === 'VISIT' && (event.travelId || event.travelIdx !== undefined)) {
            // Travels don't have individual status yet, maybe use task status or disable?
            // For now, returning null to avoid crash and confusion
            return <div className="mt-2 pt-2 border-t border-slate-100"><p className="text-[10px] text-slate-400 italic">Viagem agendada</p></div>;
        } else {
            return null;
        }

        return (
            <div className="mt-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Status Atual</label>
                {isMobile ? (
                    <div className="text-xs font-bold text-slate-700 p-1.5 bg-slate-50 rounded border border-slate-200">
                        {options.find(o => o.value === currentStatus)?.label || currentStatus || 'Indefinido'}
                    </div>
                ) : (
                    <select
                        value={currentStatus || ''}
                        onChange={(e) => handleStatusChange(event, e.target.value)}
                        className="w-full text-xs p-1.5 rounded border border-slate-200 bg-slate-50 outline-none focus:border-brand-500"
                    >
                        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                )}
            </div>
        );
    }

    return (
        <div ref={calendarRef} className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 border-b border-slate-200 bg-slate-50 gap-3">
                <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
                    {viewMode === 'DAY' && (
                        <button
                            onClick={() => setViewMode(previousViewMode || (isMobile ? 'WEEK' : 'MONTH'))}
                            className="p-2 md:p-2 bg-brand-600 text-white rounded-lg shadow-lg flex items-center gap-1 shrink-0"
                            title="Voltar"
                        >
                            <ChevronLeft size={20} />
                            <span className="text-sm font-bold md:hidden">Voltar</span>
                        </button>
                    )}
                    <h2 className="text-lg md:text-2xl font-bold text-slate-800 capitalize flex-1 sm:min-w-[200px] truncate">
                        {viewMode === 'MONTH' ? <>{monthNames[month]} <span className="text-slate-500 font-medium">{year}</span></> :
                            viewMode === 'WEEK' ? <span className="text-base md:text-lg">Semana ({weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} - {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1})</span> :
                                viewMode === 'DAY' ? <>{day} de {monthNames[month]}</> :
                                    <span className="text-slate-800 font-bold">{year}</span>}
                    </h2>
                    <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-sm shrink-0">
                        <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-slate-100 text-slate-600 rounded-l-lg"><ChevronLeft size={20} /></button>
                        <button onClick={handleToday} className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:sm font-medium border-l border-r border-slate-300 hover:bg-slate-100 text-slate-700">Hoje</button>
                        <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-slate-100 text-slate-600 rounded-r-lg"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-4 w-full sm:w-auto mt-1 sm:mt-0">
                    <div className="flex bg-slate-200 p-0.5 rounded-lg shrink-0 overflow-x-auto">
                        <button onClick={() => setViewMode('WEEK')} className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${viewMode === 'WEEK' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><List size={14} /> Semana</button>
                        <button onClick={() => setViewMode('MONTH')} className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${viewMode === 'MONTH' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarIcon size={14} /> Mês</button>
                        <button onClick={() => setViewMode('YEAR')} className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${viewMode === 'YEAR' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Grid size={14} /> Ano</button>
                    </div>
                    {(viewMode === 'MONTH' || viewMode === 'WEEK') && (<div className="hidden lg:flex gap-4 text-xs font-medium text-slate-500 border-l pl-4 border-slate-300"><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div><span>Atrasado</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></div><span>Visita</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div><span>Etapa</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div><span>Prazo</span></div></div>)}
                    {viewMode === 'DAY' && <button onClick={() => setViewMode(previousViewMode || (isMobile ? 'WEEK' : 'MONTH'))} className="hidden sm:block text-xs text-brand-600 font-bold hover:underline">Voltar</button>}
                </div>
            </div>

            {/* Content */}
            {viewMode === 'MONTH' && (
                <>
                    <div className="grid border-b border-slate-300 bg-slate-200" style={{ gridTemplateColumns: gridTemplate }}>
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => {
                            const isWeekend = i === 0 || i === 6;
                            const isExpanded = i === 0 ? getWeekendStatus.sun : i === 6 ? getWeekendStatus.sat : true;
                            return (
                                <div
                                    key={i}
                                    onClick={() => isWeekend && setMinimizedWeekends(!minimizedWeekends)}
                                    className={`py-3 text-center text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${isWeekend ? 'cursor-pointer hover:bg-white/20' : ''}`}
                                    style={{
                                        color: isWeekend ? '#64748b' : '#0f172a',
                                    }}
                                >
                                    {isExpanded ? d : d[0]}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex-1 grid auto-rows-fr overflow-y-auto" style={{ gridTemplateColumns: gridTemplate }}>
                        {calendarDays.map((calDay, index) => {
                            if (calDay === null) return <div key={`empty-${index}`} className="bg-slate-50/50 border-b border-r border-slate-100 min-h-[100px] md:min-h-[120px]" />;
                            const cDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(calDay).padStart(2, '0')}`;
                            const dEvents = getEventsForDay(calDay);
                            const isCurrentMonth = true; // calendarDays only contains days of the current month (nulls handled above)
                            const currentDayObj = new Date(year, month, calDay);
                            const isWeekend = currentDayObj.getDay() === 0 || currentDayObj.getDay() === 6;
                            const isExpanded = currentDayObj.getDay() === 0 ? getWeekendStatus.sun : currentDayObj.getDay() === 6 ? getWeekendStatus.sat : true;
                            const isToday = cDateStr === todayStr;
                            const isDrag = dragOverDate === cDateStr;

                            return (
                                <div
                                    key={calDay}
                                    data-date={cDateStr}
                                    onDragOver={(e) => handleDragOver(e, cDateStr)}
                                    onDrop={(e) => handleDrop(e, cDateStr)}
                                    onClick={() => {
                                        if (window.innerWidth < 768) {
                                            setPreviousViewMode('MONTH');
                                            setCurrentDate(new Date(year, month, calDay));
                                            setViewMode('DAY');
                                        }
                                    }}
                                    className={`border-b border-r border-slate-200 p-0.5 md:p-2 min-h-[65px] md:min-h-[120px] flex flex-col gap-0 md:gap-1 group ${isDrag ? 'bg-emerald-50 ring-2 ring-emerald-400' : isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50 cursor-pointer md:cursor-default'}`}
                                    style={{
                                        backgroundColor: isWeekend ? '#f1f5f9' : (isCurrentMonth ? '#ffffff' : '#f8fafc'),
                                        opacity: !isCurrentMonth ? 0.6 : (isWeekend ? 0.9 : 1),
                                        borderLeft: isWeekend && index % 7 === 6 ? '2px solid #e2e8f0' : 'none',
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-0 md:mb-1 cursor-pointer" onDoubleClick={() => handleDayDoubleClick(calDay)} title="Clique duplo para ver detalhes">
                                        <span className={`text-[8px] md:text-xs w-4 h-4 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-all hover:scale-110 ${isToday ? 'bg-brand-600 text-white font-bold shadow-md' : 'bg-white'}`}
                                            style={!isToday ? {
                                                color: isCurrentMonth ? (isWeekend ? '#64748b' : '#334155') : '#cbd5e1',
                                                fontWeight: '800'
                                            } : {}}
                                        >
                                            {calDay}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1 flex-1 relative overflow-y-auto custom-scrollbar pr-1">
                                        {dEvents.map(ev => {
                                            const isSel = selectedEventId === ev.id;
                                            const isRelated = focusedTaskId && focusedTaskId === ev.taskId;
                                            const otherFocusActive = focusedTaskId && focusedTaskId !== ev.taskId;

                                            // Cor baseada na PRIORIDADE (Definida em taskConstants)
                                            const priorityClass = PriorityColors[ev.priority] || PriorityColors[Priority.LOW];

                                            return (
                                                <div key={ev.id} className="relative">
                                                    <div
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, ev)}
                                                        onTouchStart={(e) => handleTouchStart(e, ev)}
                                                        onClick={(e) => {
                                                            if (window.innerWidth >= 768) {
                                                                e.stopPropagation();
                                                                isSel ? setSelectedEventId(null) : setSelectedEventId(ev.id);
                                                            }
                                                        }}
                                                        onDoubleClick={(e) => { e.stopPropagation(); onEditTask(ev.originalTask); setSelectedEventId(null); }}
                                                        className={`w-full px-0.5 py-0.5 md:px-2 md:py-1.5 rounded-sm md:rounded text-[7px] md:text-[10px] font-bold border shadow-sm cursor-grab flex items-center gap-0.5 md:gap-1 transition-all duration-300 leading-tight md:leading-normal
                                                            ${ev.isOverdue ? 'bg-red-600 text-white border-red-700' :
                                                                ev.type === 'DEADLINE' ? 'bg-blue-600 text-white border-blue-700' :
                                                                ev.isFromTest ? 'bg-indigo-600 text-white border-indigo-700' :
                                                                    ev.isFromFollowup ? 'bg-emerald-600 text-white border-emerald-700' :
                                                                        priorityClass} 
                                                            ${isSel ? 'ring-2 ring-brand-500 z-50 scale-105 shadow-md' : 'z-10'} 
                                                            ${isRelated && !isSel ? 'ring-1 ring-brand-300 border-brand-200' : ''} 
                                                            ${otherFocusActive ? 'opacity-20 grayscale-[0.5]' : 'opacity-100'} 
                                                            ${ev.isCompleted ? 'opacity-50 line-through grayscale-[0.3]' : ''}`}
                                                        style={{
                                                            borderLeftWidth: '3px',
                                                            borderLeftColor: ev.isOverdue ? '#fff' :
                                                                ev.type === 'DEADLINE' ? '#93c5fd' :
                                                                ev.isFromTest ? '#a5b4fc' :
                                                                    ev.isFromFollowup ? '#6ee7b7' :
                                                                        (ev.isCompleted ? '#94a3b8' : (ev.priority === Priority.HIGH ? '#dc2626' : ev.priority === Priority.MEDIUM ? '#d97706' : '#0284c7'))
                                                        }}
                                                    >
                                                        {ev.isOverdue && <AlertCircle size={10} className="shrink-0 animate-pulse" />}
                                                        {(ev.isFromTest || ev.isFromFollowup) && !ev.isOverdue && !ev.isCompleted && (ev.isFromTest ? <ShieldCheck size={10} className="shrink-0" /> : <Shield size={10} className="shrink-0" />)}
                                                        {ev.type === 'DEADLINE' && !ev.isOverdue && !ev.isCompleted && <Clock size={10} className="shrink-0" />}
                                                        {ev.isCompleted && <Check size={10} className="shrink-0 text-slate-500" />}

                                                        {/* Texto Visível apenas Desktop ou Mobile adaptado */}
                                                        <span className="truncate pointer-events-none hidden md:inline">{ev.fullTitle}</span>
                                                        <span className="truncate pointer-events-none md:hidden flex-1 overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            <span className="opacity-80 font-normal mr-0.5">{ev.mobileCounterText}</span>
                                                            {ev.shortTitle.split(' ')[0]} {/* Apenas primeira palavra no mobile super espremido */}
                                                        </span>
                                                    </div>
                                                    {isSel && (
                                                        <div
                                                            ref={popupRef}
                                                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-[90vw] max-w-sm md:w-80 animate-in fade-in zoom-in duration-200"
                                                            style={{ margin: 0 }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex justify-between items-start mb-3 border-b pb-2">
                                                                <h4 className="text-sm font-bold text-slate-800 leading-tight pr-4">{ev.fullTitle}</h4>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${ev.priority === Priority.HIGH ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
                                                                        {ev.type === 'DEADLINE' ? 'Prazo Final' : ev.type === 'VISIT' ? 'Visita' : 'Produção'}
                                                                    </div>
                                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedEventId(null); }} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                                                </div>
                                                            </div>
                                                            <div className="mb-4">
                                                                {renderDetails(ev)}
                                                            </div>
                                                            {renderStatusOptions(ev)}
                                                            <div className="flex gap-2 pt-3 mt-2 border-t border-slate-100">
                                                                <button onClick={() => { onEditTask(ev.originalTask); setSelectedEventId(null); }} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"><Eye size={14} /> Ver Detalhes</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {viewMode === 'WEEK' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/50 relative">
                    {/* Linha indicadora de Hoje, se Hoje estiver na semana atual */}
                    <div className="max-w-4xl mx-auto">
                        {weekDays.some(currentDayObj => {
                            const cDateStr = currentDayObj.toISOString().split('T')[0];
                            const dEvents = events.filter(e => e.date === cDateStr);
                            return dEvents.length > 0;
                        }) ? (
                            weekDays.map(currentDayObj => renderDayCard(currentDayObj))
                        ) : (
                            <div className="text-center py-20 text-slate-400 bg-white rounded-xl shadow-sm border border-slate-200">
                                <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">Nenhum evento para esta semana.</p>
                                <p className="text-xs mt-1">Avance para encontrar mais programações.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'YEAR' && (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {monthNames.map((name, idx) => {
                            const count = getEventsCountForMonth(idx);
                            const isCurrent = idx === new Date().getMonth() && year === new Date().getFullYear();
                            return (
                                <div key={name} onClick={() => handleMonthClick(idx)} className={`relative p-6 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:border-brand-300 hover:scale-[1.02] ${isCurrent ? 'bg-white border-brand-200 ring-2 ring-brand-100' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-4"><h3 className={`text-lg font-bold ${isCurrent ? 'text-brand-700' : 'text-slate-700'}`}>{name}</h3>{isCurrent && <span className="text-[10px] font-bold bg-brand-100 text-brand-600 px-2 py-1 rounded-full uppercase">Atual</span>}</div>
                                    <div className="flex items-center gap-2"><div className={`text-3xl font-bold ${count > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{count}</div><span className="text-xs font-medium text-slate-500 uppercase">Eventos</span></div>
                                    {count > 0 && (<div className="mt-4 flex gap-1">{Array.from({ length: Math.min(count, 5) }).map((_, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400"></div>))}{count > 5 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}</div>)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {viewMode === 'DAY' && (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {getEventsForDay(day).length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhum evento para este dia.</p>
                            </div>
                        ) : (
                            getEventsForDay(day).map(ev => {
                                const isOver = ev.date < todayStr && !ev.isCompleted;
                                let borderClass = isOver ? 'border-l-4 border-l-red-500' : ev.type === 'VISIT' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-500';
                                return (
                                    <div key={ev.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow ${borderClass}`}>
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div className="flex-1 w-full relative cursor-pointer group-hover:bg-slate-100/50 rounded p-1 -m-1" onClick={() => onEditTask(ev.originalTask)}>
                                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                                    {ev.type === 'VISIT' ? <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin size={10} /> Visita</span> :
                                                        ev.type === 'DEADLINE' ? <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> Entrega</span> :
                                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Factory size={10} /> Produção</span>}
                                                    <span className="text-xs text-slate-400 font-mono">{ev.date.split('-').reverse().join('/')}</span>
                                                </div>
                                                <h3 className="text-base md:text-lg font-bold text-slate-800 cursor-pointer hover:text-brand-600 break-words">{ev.title}</h3>
                                                <div className="mt-2 text-sm text-slate-600 bg-slate-50/50 p-2 md:p-0 rounded md:bg-transparent pointer-events-none">{renderDetails(ev)}</div>
                                            </div>
                                            <div className="w-full md:w-48 shrink-0">
                                                {renderStatusOptions(ev)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Drag Ghost */}
            {touchDragItem && (
                <div
                    style={{
                        position: 'fixed',
                        left: touchGhostPos.x,
                        top: touchGhostPos.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        pointerEvents: 'none'
                    }}
                    className="bg-brand-600 text-white p-2 rounded-lg shadow-2xl opacity-90 text-xs font-bold whitespace-nowrap border-2 border-white"
                >
                    {touchDragItem.title}
                </div>
            )}
        </div>
    );
};

export default CalendarView;
