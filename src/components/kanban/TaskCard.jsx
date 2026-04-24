import React, { useMemo } from 'react';
import { Trash2, Lock, ShieldCheck, Shield, Clock, Users } from 'lucide-react';
import { TaskStatus, Priority, PriorityColors } from '../../constants/taskConstants';
import { UI_TOKENS } from '../../constants/themeConstants';

const TaskCard = ({ task, onEdit, onDelete, users, currentUser, techTests = [], techFollowups = [], isMobile = false }) => {
    const canEdit = useMemo(() => {
        if (!currentUser) return false;
        if (task.visibility === 'PUBLIC') return true;
        if (task.user_id === currentUser.id) return true;
        if (task.assigned_users && task.assigned_users.includes(currentUser.id)) return true;
        return false;
    }, [task, currentUser]);

    const handleDragStart = (e) => {
        if (!canEdit || !task?.id || isMobile) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const dateStr = task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== TaskStatus.DONE;
    const activeStagesCount = task.stages ? Object.values(task.stages).filter((s) => s?.active).length : 0;
    const completedStagesCount = task.stages ? Object.values(task.stages).filter(s => ['COMPLETED', 'SOLUCIONADO', 'FINALIZADO'].includes(s.status)).length : 0;
    const progressPct = activeStagesCount > 0 ? Math.round((completedStagesCount / activeStagesCount) * 100) : 0;

    const themeStyle = currentUser?.theme_style || 'DEFAULT';
    const isFromTest = !!task.parent_test_id;
    const isFromFollowup = !!task.parent_followup_id;
    const isFromMeeting = !!task.meeting_action_id;

    const originCardStyles = useMemo(() => {
        if (isFromMeeting) {
            return themeStyle === 'MIDNIGHT'
                ? 'border-purple-500 bg-purple-950/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] border-l-4 border-l-purple-500'
                : 'border-purple-300 bg-purple-50 shadow-[0_4px_12px_rgba(168,85,247,0.12)] border-l-4 border-l-purple-600';
        }
        if (isFromTest) {
            return themeStyle === 'MIDNIGHT'
                ? 'border-indigo-500 bg-indigo-950/40 shadow-[0_0_15px_rgba(99,102,241,0.2)] border-l-4 border-l-indigo-500'
                : 'border-indigo-300 bg-indigo-50 shadow-[0_4px_12px_rgba(99,102,241,0.12)] border-l-4 border-l-indigo-600';
        }
        if (isFromFollowup) {
            return themeStyle === 'MIDNIGHT'
                ? 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] border-l-4 border-l-emerald-500'
                : 'border-emerald-300 bg-emerald-50 shadow-[0_4px_12px_rgba(16,185,129,0.12)] border-l-4 border-l-emerald-600';
        }
        return themeStyle === 'MIDNIGHT' ? 'bg-slate-800/90 border-white/10' : 'bg-white border-slate-200';
    }, [isFromTest, isFromFollowup, isFromMeeting, themeStyle]);

    return (
        <div
            draggable={isMobile ? false : canEdit}
            onDragStart={handleDragStart}
            className={`p-3 ${UI_TOKENS.RADIUS_XL} ${UI_TOKENS.SHADOW_SM} border hover:${UI_TOKENS.SHADOW_MD} ${UI_TOKENS.TRANSITION_ALL} group relative flex flex-col cursor-pointer card-hover ${originCardStyles} ${!isMobile ? 'animate-slide' : ''}`}
            onClick={() => onEdit(task)}
        >
            <div className="flex justify-between items-start mb-1.5">
                <div className="flex gap-1 items-center">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${PriorityColors[task.priority]}`}>
                        {task.priority === Priority.LOW ? 'Baixa' : task.priority === Priority.MEDIUM ? 'Média' : 'Alta'}
                    </span>
                    {task.visibility === 'PRIVATE' && <Lock size={10} className="text-amber-500" title="Privada" />}
                    {isFromTest && <div className="p-0.5 bg-indigo-600 text-white rounded shadow-sm" title="Origem: Teste Técnico"><ShieldCheck size={10} /></div>}
                    {isFromFollowup && <div className="p-0.5 bg-emerald-600 text-white rounded shadow-sm" title="Origem: Acompanhamento"><Shield size={10} /></div>}
                    {isFromMeeting && <div className="p-0.5 bg-purple-600 text-white rounded shadow-sm" title="Origem: War Room (Reunião)"><Users size={10} /></div>}
                </div>
                {canEdit && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Excluir esta tarefa permanentemente?')) onDelete(task.id); }}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded"
                        title="Excluir Tarefa"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>

            <h3 className={`font-bold ${themeStyle === 'MIDNIGHT' ? 'text-white' : 'text-slate-800'} mb-1 leading-tight text-xs break-words`}>
                {task.client && task.client !== task.title && (
                    <span className={`${themeStyle === 'MIDNIGHT' ? 'text-slate-400' : 'text-slate-600'} block text-[10px] uppercase tracking-wide opacity-75`}>{task.client}</span>
                )}
                <span className="relative flex flex-wrap items-center gap-1.5">
                    {task.title}
                    {isFromTest && <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-wider uppercase inline-flex items-center gap-0.5 shadow-md ring-1 ring-white/20">{task.parent_test_number || 'T-NOVO'}</span>}
                    {isFromFollowup && (
                        <span className="bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-wider uppercase inline-flex items-center gap-0.5 shadow-md ring-1 ring-white/20">
                            {task.parent_followup_number || (task.title?.match(/^#(\d+)/)?.[1] ? `#${task.title.match(/^#(\d+)/)[1]}` : 'ACOMP.')}
                        </span>
                    )}
                    {isFromMeeting && (
                        <span className="bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-wider uppercase inline-flex items-center gap-0.5 shadow-md ring-1 ring-white/20">
                            WAR ROOM
                        </span>
                    )}
                </span>
            </h3>

            {task.description && (
                <p className={`${themeStyle === 'MIDNIGHT' ? 'text-slate-400' : 'text-slate-500'} text-[10px] line-clamp-2 mb-2 italic leading-relaxed break-words`}>
                    {task.description}
                </p>
            )}

            <div className="mt-auto space-y-2">
                {activeStagesCount > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                            <span>Progresso</span>
                            <span>{progressPct}%</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${isOverdue ? 'bg-red-500' : 'bg-brand-500'}`}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/50">
                    <div className="flex -space-x-1.5 overflow-hidden">
                        {(task.assigned_users || []).slice(0, 3).map(uid => {
                            const u = users.find(user => user.id === uid);
                            if (!u) return null;
                            return (
                                <div
                                    key={uid}
                                    className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white shadow-sm ring-1 ring-slate-200"
                                    style={{ backgroundColor: u.color || '#64748b' }}
                                    title={u.username}
                                >
                                    {u.username?.[0]?.toUpperCase()}
                                </div>
                            );
                        })}
                        {(task.assigned_users || []).length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[7px] font-bold text-slate-600 ring-1 ring-slate-200">
                                +{(task.assigned_users || []).length - 3}
                            </div>
                        )}
                        {(task.assigned_users || []).length === 0 && (
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400" title="Sem atribuição">
                                <Users size={10} />
                            </div>
                        )}
                    </div>

                    {dateStr && (
                        <div className={`flex items-center gap-1 text-[9px] font-bold ${isOverdue ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
                            <Clock size={10} />
                            {dateStr}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;
