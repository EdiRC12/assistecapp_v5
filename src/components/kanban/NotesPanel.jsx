import React, { useState, useEffect, useMemo } from 'react';
import { X, StickyNote, Edit2, Trash2, Plus, Lock, Users, Calendar as CalendarIcon } from 'lucide-react';

const NotesPanel = ({ isOpen, onClose, notes, onSave, onDelete, currentUser, horizontal = false, onTaskUpdate }) => {
    const [content, setContent] = useState('');
    const [date, setDate] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [priority, setPriority] = useState('LOW');
    const [loading, setLoading] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [filterMode, setFilterMode] = useState('ALL');
    const [showToday, setShowToday] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        if (editingNote) {
            setContent(editingNote.content);
            setDate(editingNote.note_date || '');
            setIsPublic(editingNote.is_public);
            setPriority(editingNote.priority || 'LOW');
            setIsFormOpen(true);
        } else {
            setContent('');
            setDate('');
            setIsPublic(true);
            setPriority('LOW');
        }
    }, [editingNote]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            const payload = {
                content,
                note_date: date || null,
                is_public: isPublic,
                priority
            };
            if (editingNote) payload.id = editingNote.id;

            await onSave(payload);
            setEditingNote(null);
            if (onTaskUpdate) onTaskUpdate();
            setContent('');
            setDate('');
            setIsPublic(true);
            setPriority('LOW');
            setIsFormOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotes = useMemo(() => {
        let list = [...notes];
        if (filterMode === 'MY') {
            list = list.filter(n => n.user_id === currentUser.id);
        }
        if (showToday) {
            list = list.filter(n => {
                if (n.note_date) {
                    return n.note_date === todayStr;
                }
                return true;
            });
        }
        return list;
    }, [notes, filterMode, showToday, currentUser, todayStr]);

    const priorityColors = {
        LOW: 'bg-sky-100 border-sky-200 shadow-sky-100/30',
        MEDIUM: 'bg-amber-100 border-amber-300 shadow-amber-100/30',
        HIGH: 'bg-rose-100 border-rose-300 shadow-rose-100/30'
    };

    if (!isOpen) return null;

    return (
        <div className={`
            ${horizontal ? 'w-full' : 'w-[280px] md:w-80'}
            h-full max-h-full bg-white md:rounded-xl border border-slate-200 flex flex-col shadow-sm
            fixed inset-0 z-[100] md:relative md:z-auto md:inset-auto
            animate-in slide-in-from-right duration-300 overflow-hidden
        `}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <StickyNote size={18} className="text-brand-500" /> Notas e Lembretes
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 ${horizontal ? 'space-y-4 md:space-y-0 flex flex-col md:flex-row gap-4' : 'space-y-4'}`}>
                <div className={`${horizontal ? 'w-full md:w-72 shrink-0 space-y-4' : 'space-y-4'}`}>
                    <div className="flex flex-col gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/50">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setFilterMode('ALL')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${filterMode === 'ALL' ? 'bg-white text-brand-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                Todas Públicas
                            </button>
                            <button
                                onClick={() => setFilterMode('MY')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${filterMode === 'MY' ? 'bg-white text-brand-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                Minhas Notas
                            </button>
                        </div>
                        <button
                            onClick={() => setShowToday(!showToday)}
                            className={`w-full py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${showToday ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                        >
                            <CalendarIcon size={12} /> {showToday ? 'Mostrando Hoje' : 'Filtrar por Hoje'}
                        </button>
                    </div>

                    {!isFormOpen && !editingNote && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-400 hover:bg-brand-50/50 transition-all flex items-center justify-center gap-2 group bg-white/50"
                        >
                            <Plus size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-tight">Nova Anotação</span>
                        </button>
                    )}

                    {isFormOpen && (
                        <form onSubmit={handleSubmit} className="space-y-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{editingNote ? 'Editar Nota' : 'Nova Nota'}</span>
                                <button type="button" onClick={() => { setEditingNote(null); setIsFormOpen(false); }} className="text-slate-400 hover:text-red-500 p-1"><X size={14} /></button>
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Escreva um lembrete..."
                                className="w-full h-24 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none bg-slate-50/50 font-medium placeholder:text-slate-400"
                                required
                            />
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold bg-slate-50/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${isPublic ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                    >
                                        {isPublic ? <Users size={14} /> : <Lock size={14} />}
                                        {isPublic ? 'Público' : 'Privado'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={`py-1.5 text-[9px] font-black rounded-lg uppercase transition-all border ${priority === p ? (p === 'HIGH' ? 'bg-rose-600 border-rose-700 text-white shadow-md' : p === 'MEDIUM' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-700 border-slate-800 text-white shadow-md') : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            {p === 'LOW' ? 'Baixa' : p === 'MEDIUM' ? 'Média' : 'Alta'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-black py-2.5 rounded-xl text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 uppercase tracking-widest ${editingNote ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200'}`}
                            >
                                {loading ? 'Salvando...' : editingNote ? 'Salvar Alterações' : 'Criar Agora'}
                            </button>
                        </form>
                    )}
                </div>

                <div className={`flex-1 py-1 ${horizontal ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 content-start' : 'space-y-3'}`}>
                    {filteredNotes.map(note => (
                        <div key={note.id} className={`p-4 rounded-2xl border-2 group relative transition-all shadow-md h-fit ${priorityColors[note.priority || 'LOW']}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-black flex items-center gap-1.5 uppercase tracking-tighter ${note.priority === 'HIGH' ? 'text-rose-800' : note.priority === 'MEDIUM' ? 'text-orange-900' : 'text-slate-500'}`}>
                                    {note.is_public ? <Users size={12} className="opacity-70" /> : <Lock size={12} className="opacity-70" />}
                                    {note.note_date ? new Date(note.note_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'}
                                </span>
                                {note.user_id === currentUser.id && (
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                        <button onClick={() => setEditingNote(note)} className="p-1.5 bg-white/50 rounded-lg text-slate-700 hover:text-brand-600 hover:bg-white transition-all shadow-sm border border-slate-200" title="Editar"><Edit2 size={12} /></button>
                                        <button onClick={() => onDelete(note.id)} className="p-1.5 bg-white/50 rounded-lg text-slate-700 hover:text-red-600 hover:bg-white transition-all shadow-sm border border-slate-200" title="Excluir"><Trash2 size={12} /></button>
                                    </div>
                                )}
                            </div>
                            <p className={`text-xs whitespace-pre-wrap leading-relaxed font-bold break-words line-clamp-3 text-ellipsis overflow-hidden ${note.priority === 'HIGH' ? 'text-rose-950' : note.priority === 'MEDIUM' ? 'text-orange-950' : 'text-slate-800'}`}>{note.content}</p>
                            {note.user_id !== currentUser.id && (
                                <div className="mt-3 pt-2.5 border-t border-black/5 text-[10px] text-slate-600 font-bold flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-[8px] border border-brand-200">
                                        {note.users?.username?.[0].toUpperCase()}
                                    </div>
                                    <span className="italic">@{note.users?.username || 'Usuário'}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredNotes.length === 0 && (
                        <div className={`text-center py-10 opacity-40 ${horizontal ? 'col-span-full' : ''}`}>
                            <StickyNote size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs text-slate-500 italic">Nenhuma nota encontrada</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesPanel;
