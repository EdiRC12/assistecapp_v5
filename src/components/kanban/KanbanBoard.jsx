import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Search, ChevronDown, ChevronLeft, Filter, LayoutList, LayoutGrid, RefreshCw, X, Calendar as CalendarIcon, StickyNote, AlertTriangle, Plus, BarChart3, Pin, PinOff
} from 'lucide-react';
import TaskCard from './TaskCard';
import KanbanDashboard from './KanbanDashboard';
import { StatusBgColors, UI_TOKENS } from '../../constants/themeConstants';
import { TaskStatus, Priority, StatusLabels } from '../../constants/taskConstants';
import useIsMobile from '../../hooks/useIsMobile';

const KanbanBoard = ({
    tasks,
    customCategories,
    currentUser,
    users,
    techTests,
    techFollowups,
    setIsModalOpen,
    setEditingTask,
    fetchTaskDetail,
    handleDeleteTask,
    handleTaskDrop,
    fetchTasks,
    hasMoreTasks,
    suggestions = [],
    setSuggestions
}) => {
    // Kanban States
    const [selectedBoard, setSelectedBoard] = useState('ALL');
    const [isKanbanFilterOpen, setIsKanbanFilterOpen] = useState(false);
    const [isCustomTypesDropdownOpen, setIsCustomTypesDropdownOpen] = useState(false);
    const customTypesDropdownRef = useRef(null);
    const [kanbanDate, setKanbanDate] = useState(new Date());
    const [kanbanFilterMode, setKanbanFilterMode] = useState('YEAR'); // 'YEAR' or 'MONTH'
    const [kanbanUserFilter, setKanbanUserFilter] = useState('ALL'); // ALL or MY
    const [kanbanViewMode, setKanbanViewMode] = useState('list');
    const [focusedColumn, setFocusedColumn] = useState(null);
    const [pinnedColumns, setPinnedColumns] = useState([]);
    const [columnWidths, setColumnWidths] = useState({});
    const [columnHeights, setColumnHeights] = useState({});
    const [columnFilters, setColumnFilters] = useState({});
    const [resizingColumn, setResizingColumn] = useState(null);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'dashboard'
    const isMobile = useIsMobile();

    // Initial Load Preferences
    useEffect(() => {
        if (!currentUser) return;

        try {
            const savedPinned = localStorage.getItem(`assistec_pinned_${currentUser.id}`);
            if (savedPinned) setPinnedColumns(JSON.parse(savedPinned));
        } catch (e) { console.error("Erro ao carregar colunas fixadas:", e); }

        try {
            const savedWidths = localStorage.getItem(`assistec_widths_${currentUser.id}`);
            if (savedWidths) setColumnWidths(JSON.parse(savedWidths));
        } catch (e) { console.error("Erro ao carregar larguras de coluna:", e); }

        try {
            const savedHeights = localStorage.getItem(`assistec_heights_${currentUser.id}`);
            if (savedHeights) setColumnHeights(JSON.parse(savedHeights));
        } catch (e) { console.error("Erro ao carregar alturas de coluna:", e); }

        const savedViewMode = localStorage.getItem(`assistec_viewmode_${currentUser.id}`);
        if (savedViewMode) setKanbanViewMode(savedViewMode);
    }, [currentUser]);

    // Save Preferences
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_pinned_${currentUser.id}`, JSON.stringify(pinnedColumns));
        }
    }, [pinnedColumns, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_widths_${currentUser.id}`, JSON.stringify(columnWidths));
        }
    }, [columnWidths, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_heights_${currentUser.id}`, JSON.stringify(columnHeights));
        }
    }, [columnHeights, currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_viewmode_${currentUser.id}`, kanbanViewMode);
        }
    }, [kanbanViewMode, currentUser]);

    // Handle Click Outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isCustomTypesDropdownOpen && customTypesDropdownRef.current && !customTypesDropdownRef.current.contains(event.target)) {
                setIsCustomTypesDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCustomTypesDropdownOpen]);

    // Resizing Logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingColumn) return;
            const columnId = resizingColumn;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const columnElement = document.getElementById(`kanban-column-${columnId}`);
            if (!columnElement) return;

            const rect = columnElement.getBoundingClientRect();
            let newWidth = mouseX - rect.left;
            let newHeight = mouseY - rect.top;

            if (newWidth < 60) {
                setPinnedColumns(p => p.filter(id => id !== columnId));
                setResizingColumn(null);
                return;
            }
            if (newWidth > 800) newWidth = 800;
            if (newHeight < 100) newHeight = 100;
            if (newHeight > 2000) newHeight = 2000;

            if (!pinnedColumns.includes(columnId) && newWidth > 120 && columnId !== focusedColumn) {
                setPinnedColumns(p => [...p, columnId]);
            }

            setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
            setColumnHeights(prev => ({ ...prev, [columnId]: newHeight }));
        };

        const handleMouseUp = () => setResizingColumn(null);

        if (resizingColumn) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColumn, pinnedColumns, focusedColumn]);

    const priorities = useMemo(() => ({
        [Priority.HIGH]: 3,
        [Priority.MEDIUM]: 2,
        [Priority.LOW]: 1
    }), []);

    const kanbanBoards = useMemo(() => {
        if (!currentUser) return { ALL: { label: 'Tarefas', tasks: [] } };

        const kanbanYear = kanbanDate.getFullYear();
        const kanbanMonth = kanbanDate.getMonth();

        const dateFilteredTasks = tasks.filter(t => {
            // Se não houver data, deve aparecer sempre na lista de "A INICIAR" 
            // no contexto atual para evitar que a tarefa fique invisível ao ser criada.
            if (!t.due_date) return true;

            const dateToCheck = t.due_date;
            const taskDate = new Date(dateToCheck);
            if (isNaN(taskDate.getTime())) return true;

            if (kanbanFilterMode === 'YEAR') {
                return taskDate.getFullYear() === kanbanYear;
            } else if (kanbanFilterMode === 'MONTH') {
                return taskDate.getFullYear() === kanbanYear && taskDate.getMonth() === kanbanMonth;
            } else {
                return taskDate.getFullYear() === kanbanYear &&
                    taskDate.getMonth() === kanbanMonth &&
                    taskDate.getDate() === kanbanDate.getDate();
            }
        });

        const boards = {
            ALL: { label: 'Todas as Tarefas', tasks: dateFilteredTasks }
        };

        customCategories.forEach(cat => {
            boards[cat.id] = {
                label: cat.label,
                tasks: dateFilteredTasks.filter(t => t.category === cat.id)
            };
        });

        return boards;
    }, [customCategories, tasks, currentUser, kanbanDate, kanbanFilterMode]);


    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className={`sticky top-0 bg-slate-100 z-20 -mx-3 md:-mx-6 ${isMobile ? 'px-3 py-1.5' : 'px-6 py-2'} border-b border-slate-200 shrink-0 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3`}>
                <div className="flex-1 flex items-center gap-2 overflow-x-visible relative min-w-0">
                    <div className="flex-1 flex space-x-1.5 overflow-x-auto custom-scrollbar scrollbar-hide snap-x select-none">
                        {Object.entries(kanbanBoards).map(([key, board]) => {
                            const category = customCategories.find(cat => cat.id === key);
                            const isNative = !category || category.isNative;
                            if (!isNative && key !== 'ALL') return null;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedBoard(key)}
                                    className={`px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest whitespace-nowrap ${UI_TOKENS.TRANSITION_ALL} border snap-start ${selectedBoard === key ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                >
                                    {board.label}
                                </button>
                            );
                        })}
                    </div>

                    {customCategories.some(cat => !cat.isNative) && (
                        <div className="relative shrink-0" ref={customTypesDropdownRef}>
                            <button
                                onClick={() => setIsCustomTypesDropdownOpen(!isCustomTypesDropdownOpen)}
                                className={`px-2.5 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-1 ${UI_TOKENS.TRANSITION_ALL} border ${customCategories.some(cat => !cat.isNative && selectedBoard === cat.id) ? 'bg-brand-100 border-brand-400 text-brand-700' : 'bg-white border-slate-200 text-slate-500 shadow-sm hover:border-slate-300'}`}
                            >
                                Editados
                                <ChevronDown size={10} className={`transition-transform duration-300 ${isCustomTypesDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isCustomTypesDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 min-w-[160px] overflow-hidden py-1 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar px-1">
                                        {customCategories.filter(cat => !cat.isNative).map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => { setSelectedBoard(cat.id); setIsCustomTypesDropdownOpen(false); }}
                                                className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedBoard === cat.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-row items-center justify-between md:justify-end gap-1.5 md:gap-2 shrink-0 md:w-auto w-full">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className={`${isMobile ? 'h-8 px-3' : 'h-8 md:px-3'} rounded-xl bg-brand-600 text-white flex items-center justify-center gap-2 hover:bg-brand-700 transition-all shadow-lg active:scale-95`}
                        title="Nova Tarefa"
                    >
                        <Plus size={isMobile ? 16 : 16} />
                        <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">Nova Tarefa</span>
                    </button>

                    <div className="relative">
                        <div className="flex bg-slate-200/50 p-0.5 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Visão de Quadro"
                            >
                                <LayoutGrid size={12} /> <span className="hidden xs:inline">Quadro</span>
                            </button>
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Visão de Dashboard"
                            >
                                <BarChart3 size={12} /> <span className="hidden xs:inline">Dash</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsKanbanFilterOpen(!isKanbanFilterOpen)}
                            className={`h-8 px-3 rounded-xl flex items-center gap-2 ${UI_TOKENS.TRANSITION_FAST} border ${isKanbanFilterOpen ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                        >
                            <Filter size={isMobile ? 14 : 14} />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">Filtros</span>
                            <ChevronDown size={isMobile ? 12 : 12} className={`transition-transform duration-200 ${isKanbanFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isKanbanFilterOpen && (
                            <div className="absolute top-full right-0 mt-2 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col gap-3 min-w-[320px] animate-in fade-in slide-in-from-top-4 duration-200">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período</label>
                                    <div className="flex bg-slate-50 rounded-lg border border-slate-200 flex items-center h-9 px-1 overflow-hidden">
                                        <select
                                            value={kanbanFilterMode === 'DAY' ? kanbanDate.getDate() : 'ALL'}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'ALL') {
                                                    setKanbanFilterMode('MONTH');
                                                } else {
                                                    setKanbanFilterMode('DAY');
                                                    const newDate = new Date(kanbanDate);
                                                    newDate.setDate(parseInt(val));
                                                    setKanbanDate(newDate);
                                                }
                                            }}
                                            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-[60px] px-1 h-full cursor-pointer hover:bg-slate-100 transition-colors border-r border-slate-200"
                                        >
                                            <option value="ALL">Mês</option>
                                            {Array.from({ length: new Date(kanbanDate.getFullYear(), kanbanDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(d => (
                                                <option key={d} value={d}>Dia {String(d).padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={kanbanDate.getMonth()}
                                            onChange={(e) => {
                                                const newDate = new Date(kanbanDate);
                                                newDate.setMonth(parseInt(e.target.value));
                                                setKanbanDate(newDate);
                                            }}
                                            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-[50px] px-1 h-full cursor-pointer hover:bg-slate-100 transition-colors border-r border-slate-200 appearance-none text-center"
                                        >
                                            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                                                <option key={i} value={i}>{m}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={kanbanDate.getFullYear()}
                                            onChange={(e) => {
                                                const newDate = new Date(kanbanDate);
                                                newDate.setFullYear(parseInt(e.target.value));
                                                setKanbanDate(newDate);
                                            }}
                                            className="bg-transparent text-xs font-bold text-brand-600 outline-none flex-1 px-1 h-full cursor-pointer hover:bg-slate-100 transition-colors appearance-none text-center"
                                        >
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visualizar</label>
                                        <div className="flex bg-slate-100 p-0.5 rounded-lg h-9 border border-slate-200">
                                            <button
                                                onClick={() => setKanbanUserFilter('ALL')}
                                                className={`flex-1 rounded-md text-[10px] font-bold uppercase transition-all ${kanbanUserFilter === 'ALL' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Todas
                                            </button>
                                            <button
                                                onClick={() => setKanbanUserFilter('MY')}
                                                className={`flex-1 rounded-md text-[10px] font-bold uppercase transition-all ${kanbanUserFilter === 'MY' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Minhas
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layout</label>
                                        <div className="flex bg-slate-100 p-0.5 rounded-lg h-9 border border-slate-200">
                                            <button
                                                onClick={() => setKanbanViewMode('list')}
                                                className={`w-9 h-full flex items-center justify-center rounded-md transition-all ${kanbanViewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <LayoutList size={14} />
                                            </button>
                                            <button
                                                onClick={() => setKanbanViewMode('grid')}
                                                className={`w-9 h-full flex items-center justify-center rounded-md transition-all ${kanbanViewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <LayoutGrid size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-4 items-start overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
                {viewMode === 'dashboard' ? (
                    <KanbanDashboard
                        tasks={kanbanBoards[selectedBoard]?.tasks || []}
                        currentUser={currentUser}
                        users={users}
                        setSuggestions={setSuggestions}
                        suggestions={suggestions}
                    />
                ) : (
                    Object.keys(TaskStatus).map(statusKey => {
                        if (focusedColumn && focusedColumn !== statusKey) return null;
                        const isFocused = focusedColumn === statusKey;
                        const isPinned = pinnedColumns.includes(statusKey);
                        const isCollapsed = !isFocused && !isPinned; // Default is collapsed
                        const customWidth = columnWidths[statusKey];
                        const customHeight = columnHeights[statusKey];

                        let columnTasks = kanbanBoards[selectedBoard]?.tasks.filter(t => t.status === statusKey) || [];

                        if (kanbanUserFilter === 'MY') {
                            columnTasks = columnTasks.filter(t =>
                                t.user_id === currentUser.id ||
                                (t.assigned_users && t.assigned_users.includes(currentUser.id))
                            );
                        }

                        const colFilter = columnFilters[statusKey] || '';
                        if (colFilter) {
                            columnTasks = columnTasks.filter(t => (t.client || '').toLowerCase().includes(colFilter.toLowerCase()));
                        }

                        columnTasks.sort((a, b) => {
                            const pA = priorities[a.priority] || 0;
                            const pB = priorities[b.priority] || 0;
                            if (pB !== pA) return pB - pA;
                            return new Date(a.due_date || a.created_at || a.createdAt) - new Date(b.due_date || b.created_at || b.createdAt);
                        });

                        if (!isFocused && isCollapsed) {
                            const label = StatusLabels[statusKey];
                            const isDone = statusKey === TaskStatus.DONE;
                            const isCanceled = statusKey === TaskStatus.CANCELED;
                            const isPending = statusKey === TaskStatus.PENDING;
                            const isInProgress = statusKey === TaskStatus.IN_PROGRESS;
                            const isWaiting = statusKey === TaskStatus.WAITING_CLIENT;

                            let bgClass = 'bg-white border-slate-200 shadow-slate-100';
                            let textClass = 'text-slate-700';

                            if (isDone) { bgClass = 'bg-emerald-50 border-emerald-200 shadow-emerald-100'; textClass = 'text-emerald-700'; }
                            else if (isCanceled) { bgClass = 'bg-red-50 border-red-200 shadow-red-100'; textClass = 'text-red-700'; }
                            else if (isPending) { bgClass = 'bg-slate-50 border-slate-200 shadow-slate-100'; textClass = 'text-slate-700'; }
                            else if (isInProgress) { bgClass = 'bg-blue-50 border-blue-200 shadow-blue-100'; textClass = 'text-blue-700'; }
                            else if (isWaiting) { bgClass = 'bg-amber-50 border-amber-200 shadow-amber-100'; textClass = 'text-amber-700'; }

                            return (
                                <div
                                    key={statusKey}
                                    id={`kanban-column-${statusKey}`}
                                    className={`w-28 h-28 ${bgClass} border-2 rounded-2xl flex flex-col items-center justify-center p-2 cursor-pointer hover:shadow-lg transition-all shrink-0 select-none relative group shadow-sm drop-target`}
                                    onClick={() => setFocusedColumn(statusKey)}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-4', 'ring-brand-500/20'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('ring-4', 'ring-brand-500/20'); }}
                                    onDrop={(e) => {
                                        if (isMobile) return;
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('ring-4', 'ring-brand-500/20');
                                        const taskId = e.dataTransfer.getData('taskId');
                                        handleTaskDrop(taskId, statusKey);
                                    }}
                                >
                                    <div
                                        className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize hover:bg-brand-500/20 rounded-br-2xl"
                                        onMouseDown={(e) => { e.stopPropagation(); setResizingColumn(statusKey); }}
                                    />
                                    <span className={`text-[10px] font-black uppercase text-center leading-tight mb-2 ${textClass}`}>
                                        {label}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${isDone ? 'bg-emerald-100 text-emerald-800' : isCanceled ? 'bg-red-100 text-red-800' : isPending ? 'bg-slate-100 text-slate-800' : isInProgress ? 'bg-blue-100 text-blue-800' : isWaiting ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {columnTasks.length}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={statusKey}
                                id={`kanban-column-${statusKey}`}
                                style={{
                                    width: isFocused ? '100%' : (customWidth || 320),
                                    height: '100%',
                                    minHeight: '300px'
                                }}
                                className={`${StatusBgColors[statusKey]} rounded-2xl p-4 border-2 border-transparent shadow-sm flex flex-col transition-all duration-300 relative ${isFocused ? 'max-w-5xl mx-auto' : 'shrink-0'}`}
                                onDoubleClick={() => setFocusedColumn(isFocused ? null : statusKey)}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand-500/30', 'bg-brand-50/10'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('border-brand-500/30', 'bg-brand-50/10'); }}
                                onDrop={(e) => {
                                    if (isMobile) return;
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('ring-4', 'ring-brand-500/20');
                                    const taskId = e.dataTransfer.getData('taskId');
                                    handleTaskDrop(taskId, statusKey);
                                }}
                            >
                                {!isFocused && (
                                    <div
                                        className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize hover:bg-brand-500/30 rounded-br-2xl transition-colors z-20 flex items-end justify-end p-0.5 group"
                                        onMouseDown={(e) => { e.stopPropagation(); setResizingColumn(statusKey); }}
                                        title="Arraste para redimensionar (L x A)"
                                    >
                                        <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-400 group-hover:border-brand-600 rounded-br-sm"></div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 mb-5 px-1 shrink-0">
                                    <div className="flex justify-between items-center select-none">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight">
                                            {StatusLabels[statusKey]}
                                            <span className="bg-white/60 px-2 py-0.5 rounded-full text-[10px] text-slate-600 shadow-sm border border-white/50">{columnTasks.length}</span>
                                        </h3>

                                        <div className="flex items-center gap-1">
                                            {isFocused && (
                                                <button onClick={() => setFocusedColumn(null)} className="flex items-center gap-1.5 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase text-slate-700 transition-all border border-slate-200 shadow-sm"><X size={14} /> Voltar</button>
                                            )}
                                            {!isFocused && isPinned && (
                                                <button onClick={() => setPinnedColumns(p => p.filter(k => k !== statusKey))} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-white/50 rounded-full transition-colors" title="Fechar (Desalfinetar)"><X size={16} /></button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    if (isPinned) {
                                                        setPinnedColumns(p => p.filter(k => k !== statusKey));
                                                    } else {
                                                        setPinnedColumns(p => [...p, statusKey]);
                                                    }
                                                }}
                                                className={`p-1.5 rounded-full transition-colors ${isPinned ? 'bg-brand-100 text-brand-600 hover:bg-brand-200' : 'text-slate-400 hover:text-brand-600 hover:bg-white/50'}`}
                                                title={isPinned ? "Desalfinetar" : "Alfinetar para manter aberto"}
                                            >
                                                {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setColumnWidths(p => { const n = { ...p }; delete n[statusKey]; return n; });
                                                    setColumnHeights(p => { const n = { ...p }; delete n[statusKey]; return n; });
                                                }}
                                                className="hidden md:flex text-slate-400 hover:text-brand-600 p-1.5 hover:bg-white/50 rounded-full transition-colors"
                                                title="Resetar Tamanho"
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar..."
                                            value={columnFilters[statusKey] || ''}
                                            onChange={e => setColumnFilters(p => ({ ...p, [statusKey]: e.target.value }))}
                                            className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-white/40 border border-white/20 focus:bg-white transition-all outline-none placeholder:text-slate-500"
                                        />
                                    </div>
                                </div>

                                <div className={`overflow-y-auto flex-1 custom-scrollbar pr-1.5 pb-20 ${kanbanViewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 content-start' : 'space-y-3'}`}>
                                    {columnTasks.map(task => (
                                        <TaskCard key={task.id} task={task} onEdit={async (t) => { setIsModalOpen(true); setEditingTask(t); await fetchTaskDetail(t.id); }} onDelete={handleDeleteTask} users={users} currentUser={currentUser} techTests={techTests} techFollowups={techFollowups} isMobile={isMobile} />
                                    ))}

                                    {hasMoreTasks && columnTasks.length > 0 && (
                                        <div className="py-4 flex justify-center">
                                            <button
                                                onClick={() => fetchTasks(true)}
                                                className="px-6 py-2 bg-white/50 hover:bg-white text-brand-600 text-[10px] font-bold uppercase rounded-full border border-brand-200 transition-all shadow-sm active:scale-95"
                                            >
                                                Carregar mais tarefas...
                                            </button>
                                        </div>
                                    )}

                                    {columnTasks.length === 0 && (
                                        <div className={`${kanbanViewMode === 'grid' ? 'col-span-1 sm:col-span-2' : ''} text-center py-8 text-slate-500 text-sm italic opacity-75 bg-white/20 rounded-lg mx-2 border border-white/20`}>
                                            Nenhuma tarefa
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default KanbanBoard;
