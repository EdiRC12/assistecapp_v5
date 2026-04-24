import React from 'react';
import { ListChecks, Plus, CheckCircle2, Trash2, History } from 'lucide-react';

const RncMaintenance = ({
    newRnc,
    newChecklistItem, setNewChecklistItem, addChecklistItem, toggleChecklistItem, removeChecklistItem,
    newTimelineText, setNewTimelineText, addTimelineItem,
    TIMELINE_ICONS
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
            {/* CHECKLIST */}
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ListChecks size={14} className="text-brand-600" /> Próximos Passos (Checklist)
                </label>
                <div className="bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm flex flex-col min-h-[300px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-2">
                        <input
                            type="text"
                            placeholder="Adicionar tarefa..."
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 h-10"
                        />
                        <button
                            type="button"
                            onClick={addChecklistItem}
                            className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 transition-all shadow-md active:scale-95"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1 custom-scrollbar">
                        {(newRnc.checklist || []).length === 0 ? (
                            <div className="py-10 text-center text-slate-300 italic text-xs">Nenhuma tarefa pendente</div>
                        ) : (
                            newRnc.checklist.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-all group">
                                    <button
                                        type="button"
                                        onClick={() => toggleChecklistItem(item.id)}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent hover:border-brand-300'}`}
                                    >
                                        <CheckCircle2 size={14} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-bold ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'} break-words`}>
                                            {item.text}
                                        </div>
                                        {item.completed && item.completed_at && (
                                            <div className="text-[9px] font-black text-emerald-500 uppercase mt-0.5">
                                                Concluído em: {new Date(item.completed_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeChecklistItem(item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* TIMELINE */}
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} className="text-brand-600" /> Registro de Interações (Timeline)
                </label>
                <div className="bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm flex flex-col min-h-[300px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                        <textarea
                            placeholder="O que foi conversado ou feito?"
                            value={newTimelineText}
                            onChange={(e) => setNewTimelineText(e.target.value)}
                            className="w-full h-20 bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 resize-none font-bold"
                        />
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(TIMELINE_ICONS).filter(([k]) => k !== 'AGREEMENT').map(([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => addTimelineItem(key)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${config.bg} ${config.color} ${config.border || 'border-transparent'} hover:scale-105 active:scale-95`}
                                >
                                    <config.icon size={12} />
                                    {config.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-4 space-y-6 custom-scrollbar relative">
                        {(newRnc.timeline || []).length === 0 ? (
                            <div className="py-10 text-center text-slate-300 italic text-xs">Nenhuma interação registrada</div>
                        ) : (
                            newRnc.timeline.map((item, idx) => {
                                const config = TIMELINE_ICONS[item.type] || TIMELINE_ICONS.NOTE;
                                const Icon = config.icon;
                                return (
                                    <div key={item.id} className="relative pl-8 pb-1 last:pb-0">
                                        {idx !== newRnc.timeline.length - 1 && (
                                            <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-100" />
                                        )}
                                        <div className={`absolute left-0 top-0 w-6 h-6 rounded-lg ${config.bg} ${config.color} flex items-center justify-center shadow-sm z-10`}>
                                            <Icon size={12} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-700 uppercase">{config.label}</span>
                                                <span className="text-[9px] font-bold text-slate-400">{new Date(item.date).toLocaleString('pt-BR')}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 font-bold leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 break-words whitespace-pre-wrap">
                                                {item.text}
                                            </p>
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right px-1">
                                                Por: {item.user}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RncMaintenance;
