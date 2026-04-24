import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    StickyNote, Calendar, CheckSquare, Plus, Users, Lock,
    X, Edit2, Trash2, ChevronRight, Clock, AlertCircle,
    CheckCircle2, Info, Plane, ListChecks, Bell
} from 'lucide-react';
import { Priority, PriorityColors, TaskStatus, StatusLabels } from '../constants/taskConstants';

const DailyHub = ({
    isOpen,
    onClose,
    tasks = [],
    notes = [],
    onSaveNote,
    onDeleteNote,
    currentUser,
    onEditTask,
    initialTab = 'TASKS',
    buttonRef // Nova prop para posicionar o portal
}) => {
    const [activeTab, setActiveTab] = useState(initialTab); // TASKS, NOTES
    const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [noteDate, setNoteDate] = useState('');
    const [noteTime, setNoteTime] = useState('');
    const [noteIsPublic, setNoteIsPublic] = useState(true);
    const [notePriority, setNotePriority] = useState('LOW');
    const [editingNote, setEditingNote] = useState(null);
    const [noteFilter, setNoteFilter] = useState('TODAY'); // TODAY, ALL
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Sync activeTab when reopening with a specific tab
    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // Calculate position based on button
    useEffect(() => {
        if (isOpen && buttonRef?.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2
            });
        }
    }, [isOpen, buttonRef]);

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const isToday = (dateStr) => {
        if (!dateStr) return false;
        try {
            const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
            if (isNaN(d.getTime())) return false;
            const now = new Date();
            return d.getFullYear() === now.getFullYear() &&
                   d.getMonth() === now.getMonth() &&
                   d.getDate() === now.getDate();
        } catch (e) {
            return false;
        }
    };

    // Filter today's tasks (Summary View)
    const todayTasks = useMemo(() => {
        return tasks.filter(t => {
            if (['DONE', 'CANCELED', 'DEVOLVIDO'].includes(t.status)) return false;

            let reason = null;

            // 1. Due date
            if (isToday(t.due_date)) reason = 'PRAZO';

            // 2. Stages
            if (!reason && t.stages) {
                const hasStageToday = Object.values(t.stages).some(s =>
                    s && s.active && isToday(s.date) &&
                    !['COMPLETED', 'SOLUCIONADO', 'FINALIZADO', 'DEVOLVIDO'].includes(s.status)
                );
                if (hasStageToday) reason = 'ETAPA';
            }

            // 3. Travels
            if (!reason && t.travels && Array.isArray(t.travels)) {
                if (t.travels.some(tr => tr.isDateDefined && isToday(tr.date))) reason = 'VIAGEM';
            }

            if (reason) {
                t._reason = reason; // Marcador temporário para UI
                return true;
            }
            return false;
        }).sort((a, b) => {
            const pMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
        });
    }, [tasks]);

    // Filter notes
    const filteredNotes = useMemo(() => {
        let list = [...notes];
        console.log('[DailyHub] Notas recebidas para filtrar:', list.length, 'Filtro atual:', noteFilter);
        
        if (noteFilter === 'TODAY') {
            list = list.filter(n => {
                // Se não houver data definida, mostra hoje
                if (!n.note_date) return true;
                return isToday(n.note_date);
            });
        }
        
        const sorted = list.sort((a, b) => new Date(b.created_at || b.id || 0) - new Date(a.created_at || a.id || 0));
        console.log('[DailyHub] Notas filtradas e prontas para exibir:', sorted.length);
        return sorted;
    }, [notes, noteFilter]);

    // Calculate Overdue Items
    const overdueItems = useMemo(() => {
        const now = new Date();
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        // 1. Tarefas Atrasadas (Lógica completa sincronizada com App.jsx)
        const tasksOverdue = tasks.filter(task => {
            if (task.columnId === 'DONE' || task.columnId === 'DEVOLVIDO' || task.status === 'DONE' || task.status === 'CANCELED') return false;

            // a. Verificar data de vencimento direta
            const rawDueDate = task.due_date || task.dueDate || task.date;
            if (rawDueDate) {
                const dateStr = rawDueDate.includes('T') ? rawDueDate : `${rawDueDate}T00:00:00`;
                if (new Date(dateStr).getTime() < todayAtMidnight) return true;
            }

            // b. Verificar etapas (stages) ativas e atrasadas
            if (task.stages) {
                const hasOverdueStage = Object.values(task.stages).some(s =>
                    s && s.active && s.date &&
                    !['COMPLETED', 'SOLUCIONADO', 'FINALIZADO'].includes(s.status) &&
                    new Date(s.date.includes('T') ? s.date : `${s.date}T00:00:00`).getTime() < todayAtMidnight
                );
                if (hasOverdueStage) return true;
            }

            // c. Verificar viagens atrasadas
            if (task.travels && Array.isArray(task.travels)) {
                const hasOverdueTravel = task.travels.some(tr =>
                    tr.isDateDefined && tr.date &&
                    new Date(tr.date.includes('T') ? tr.date : `${tr.date}T00:00:00`).getTime() < todayAtMidnight
                );
                if (hasOverdueTravel) return true;
            }

            return false;
        }).map(t => ({ ...t, itemType: 'TASK' }));

        // 2. Lembretes Atrasados
        const notesOverdue = notes.filter(note => {
            if (note.is_confirmed) return false;
            if (!note.note_date) return false;
            
            const nDate = new Date(note.note_date + 'T12:00:00');
            const noteDateOnly = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate()).getTime();
            
            if (noteDateOnly < todayAtMidnight) return true;
            if (noteDateOnly === todayAtMidnight && note.note_time) {
                const [hours, minutes] = note.note_time.split(':');
                const targetTime = new Date();
                targetTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                return now.getTime() > targetTime.getTime();
            }
            return false;
        }).map(n => ({ ...n, itemType: 'NOTE' }));

        return [...tasksOverdue, ...notesOverdue].sort((a, b) => {
            const dateA = new Date(a.date || a.note_date || 0);
            const dateB = new Date(b.date || b.note_date || 0);
            return dateA - dateB;
        });
    }, [tasks, notes]);

    const handleNoteSubmit = async (e) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        const payload = {
            content: noteContent,
            note_date: noteDate || null,
            note_time: noteTime || null,
            is_public: noteIsPublic,
            priority: notePriority
        };

        if (editingNote) payload.id = editingNote.id;

        await onSaveNote(payload);
        resetNoteForm();
    };

    const resetNoteForm = () => {
        setNoteContent('');
        setNoteDate('');
        setNoteTime('');
        setNoteIsPublic(true);
        setNotePriority('LOW');
        setEditingNote(null);
        setIsNoteFormOpen(false);
    };

    const startEditNote = (note) => {
        setEditingNote(note);
        setNoteContent(note.content);
        setNoteDate(note.note_date || '');
        setNoteTime(note.note_time || '');
        setNoteIsPublic(note.is_public);
        setNotePriority(note.priority || 'LOW');
        setIsNoteFormOpen(true);
    };

    if (!isOpen) return null;

    const content = (
        <>
        <div className="fixed inset-0 z-[9998] bg-black/5" onClick={onClose} />
        <div
            className="fixed w-[95vw] md:w-[450px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden animate-in slide-in-from-top-4 duration-300"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translateX(-50%)'
            }}
        >
            {/* Header Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                    onClick={() => setActiveTab('TASKS')}
                    className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 text-[10px] font-bold transition-all ${activeTab === 'TASKS' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <CheckSquare size={14} />
                    Hoje ({todayTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('NOTES')}
                    className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 text-[10px] font-bold transition-all ${activeTab === 'NOTES' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <StickyNote size={14} />
                    Lembretes ({filteredNotes.length})
                </button>
                {overdueItems.length > 0 && (
                    <button
                        onClick={() => setActiveTab('OVERDUE')}
                        className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 text-[10px] font-bold transition-all ${activeTab === 'OVERDUE' ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-red-400'}`}
                    >
                        <AlertCircle size={14} className={activeTab === 'OVERDUE' ? 'text-red-500' : ''} />
                        Atrasos ({overdueItems.length})
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-4 bg-white">
                {activeTab === 'TASKS' ? (
                    // ... (keep current tasks render)
                    <div className="space-y-3">
                        {todayTasks.length === 0 ? (
                            <div className="text-center py-10 opacity-40">
                                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                                <p className="text-xs text-slate-500 italic">Tudo limpo por hoje!</p>
                            </div>
                        ) : (
                                    todayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all cursor-pointer group relative overflow-hidden"
                                            onClick={() => { onEditTask(task); onClose(); }}
                                        >
                                            <div className="flex justify-between items-start mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm ${PriorityColors[task.priority]}`}>
                                                        {task.priority === Priority.HIGH ? 'Alta' : task.priority === Priority.MEDIUM ? 'Média' : 'Baixa'}
                                                    </span>
                                                    {task._reason && (
                                                        <span className={`flex items-center gap-1 text-[8px] font-bold px-2 py-1 rounded-lg ${
                                                            task._reason === 'VIAGEM' ? 'bg-sky-50 text-sky-600' : 
                                                            task._reason === 'ETAPA' ? 'bg-emerald-50 text-emerald-600' : 
                                                            'bg-rose-50 text-rose-600'
                                                        }`}>
                                                            {task._reason === 'VIAGEM' ? <Plane size={10} /> : 
                                                             task._reason === 'ETAPA' ? <ListChecks size={10} /> : 
                                                             <Clock size={10} />}
                                                            {task._reason}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="w-6 h-6 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 transition-all duration-300">
                                                    <ChevronRight size={14} />
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-0.5">
                                                {task.client && (
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                                                        <Users size={10} />
                                                        {task.client}
                                                    </div>
                                                )}
                                                <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors">
                                                    {task.title}
                                                </h4>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                                    <Clock size={12} className="text-brand-500" />
                                                    <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'A concluir'}</span>
                                                </div>
                                                <div className="text-[9px] font-black text-brand-600/40 uppercase tracking-widest">#{task.id}</div>
                                            </div>
                                        </div>
                                    ))
                        )}
                    </div>
                ) : activeTab === 'NOTES' ? (
                    <div className="space-y-4">
                        {/* Note Filters */}
                        <div className="flex gap-1 bg-slate-100/50 p-1 rounded-lg">
                            <button
                                onClick={() => setNoteFilter('TODAY')}
                                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${noteFilter === 'TODAY' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Hoje
                            </button>
                            <button
                                onClick={() => setNoteFilter('ALL')}
                                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${noteFilter === 'ALL' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Histórico
                            </button>
                        </div>
                        {/* ... existing notes list ... */}
                        <div className="space-y-3">
                            {/* New Note Button/Form */}
                            {!isNoteFormOpen ? (
                                <button
                                    onClick={() => setIsNoteFormOpen(true)}
                                    className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/30 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Lembrete</span>
                                </button>
                            ) : (
                                <form onSubmit={handleNoteSubmit} className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200 animate-in zoom-in-95 duration-200">
                                    <textarea
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        placeholder="Escreva algo importante..."
                                        className="w-full h-20 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none bg-white font-medium"
                                        required
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex gap-1">
                                            <input
                                                type="date"
                                                value={noteDate}
                                                onChange={(e) => setNoteDate(e.target.value)}
                                                className="flex-1 px-2 py-1.5 text-[10px] border border-slate-200 rounded flex h-8 items-center font-bold"
                                            />
                                            <input
                                                type="time"
                                                value={noteTime}
                                                onChange={(e) => setNoteTime(e.target.value)}
                                                className="w-20 px-2 py-1.5 text-[10px] border border-slate-200 rounded flex h-8 items-center font-bold"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setNoteIsPublic(!noteIsPublic)}
                                            className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${noteIsPublic ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-slate-200 text-slate-400'}`}
                                        >
                                            {noteIsPublic ? <Users size={12} /> : <Lock size={12} />}
                                            {noteIsPublic ? 'Público' : 'Privado'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                        {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setNotePriority(p)}
                                                className={`py-1.5 rounded text-[9px] font-black uppercase transition-all border ${notePriority === p ? 'bg-slate-800 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {p === 'LOW' ? 'Baixa' : p === 'MEDIUM' ? 'Média' : 'Alta'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={resetNoteForm}
                                            className="flex-1 py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] py-2 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black rounded-lg transition-all shadow-md active:scale-95 uppercase"
                                        >
                                            {editingNote ? 'Atualizar Nota' : 'Criar Lembrete'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {filteredNotes.map(note => (
                                <div key={note.id} className={`p-4 rounded-xl border-l-[4px] shadow-sm relative group transition-all hover:shadow-md ${note.priority === 'HIGH' ? 'bg-rose-50/50 border-rose-500' : note.priority === 'MEDIUM' ? 'bg-amber-50/50 border-amber-500' : 'bg-sky-50/50 border-sky-500'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-tighter">
                                            {note.is_public ? <Users size={10} /> : <Lock size={10} />}
                                            {note.note_date ? new Date(note.note_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Lembrete'}
                                            {note.note_time && (
                                                <span className="bg-white/50 px-1.5 py-0.5 rounded border border-slate-200 ml-1 text-slate-600 flex items-center gap-1">
                                                    <Bell size={8} className="text-brand-500 animate-pulse" />
                                                    {note.note_time.substring(0, 5)}h
                                                </span>
                                            )}
                                        </span>
                                        {note.user_id === currentUser.id && (
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                                                <button onClick={() => startEditNote(note)} className="text-slate-400 hover:text-brand-600"><Edit2 size={12} /></button>
                                                <button onClick={() => onDeleteNote(note.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-slate-800 break-words whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-4">
                            <h5 className="text-[10px] font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> Itens Vencidos
                            </h5>
                            <p className="text-[9px] text-red-600/70 mt-1">Atenção aos prazos que já passaram.</p>
                        </div>

                        {overdueItems.map((item) => (
                            <div
                                key={`${item.itemType}-${item.id}`}
                                className={`
                                    p-3 rounded-xl border border-red-100 bg-white hover:bg-red-50/30 
                                    transition-all shadow-sm border-l-4 
                                    ${item.itemType === 'TASK' ? 'border-l-red-600 cursor-pointer group' : 'border-l-amber-500'}
                                `}
                                onClick={() => {
                                    if (item.itemType === 'TASK') {
                                        onEditTask(item);
                                        onClose();
                                    }
                                }}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1 ${item.itemType === 'TASK' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                        {item.itemType === 'TASK' ? 'Tarefa Atrasada' : <><StickyNote size={8} /> Lembrete Vencido</>}
                                    </span>
                                    <span className="text-[9px] font-bold text-red-400">
                                        {new Date(item.due_date || item.dueDate || item.note_date || item.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 line-clamp-2">
                                    {item.itemType === 'TASK' && item.client && <span className="opacity-50 font-medium mr-1">{item.client} /</span>}
                                    {item.title || item.content}
                                </h4>
                                {item.itemType === 'NOTE' && item.note_time && (
                                    <p className="text-[9px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                                        <Clock size={10} /> Horário era: {item.note_time.substring(0, 5)}h
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                    <Info size={12} className="text-brand-500" />
                    Clique em uma tarefa para ver detalhes
                </div>
                <button
                    onClick={onClose}
                    className="text-[10px] font-black text-brand-600 hover:bg-white px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200 transition-all uppercase tracking-widest"
                >
                    Fechar
                </button>
            </div>
        </div>
        </>
    );

    return ReactDOM.createPortal(content, document.body);
};

export default DailyHub;
