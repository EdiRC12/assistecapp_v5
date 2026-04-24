import React, { useState } from 'react';
import { 
    Calendar, CheckSquare, ChevronRight, 
    Briefcase, ClipboardList, Clock, AlertTriangle 
} from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import VisitationTab from './VisitationTab';
import PendingActionsTab from './PendingActionsTab';

const TABS = [
    {
        id: 'VISITATION',
        label: 'PROSPECÇÃO',
        fullLabel: 'Planejamento de Visitas',
        desc: 'Agendamentos e prospecções futuras',
        color: 'indigo',
        icon: Briefcase,
        activeText: 'text-indigo-600',
        activeBg: 'bg-indigo-600',
        ring: 'ring-indigo-500',
    },
    {
        id: 'PENDING',
        label: 'AÇÕES PENDENTES',
        fullLabel: 'Pendências de Visita',
        desc: 'Ações e tarefas pós-atendimento',
        color: 'emerald',
        icon: CheckSquare,
        activeText: 'text-emerald-600',
        activeBg: 'bg-emerald-600',
        ring: 'ring-emerald-500',
    }
];

const PlanningHub = ({
    currentUser,
    allClients,
    tasks,
    categories,
    onNewTask,
    onEditTask,
    onTaskCreated,
    techTests, // Needed for Visitation linkage
    notifySuccess,
    notifyError
}) => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('VISITATION');

    const activeTabInfo = TABS.find(t => t.id === activeTab) || TABS[0];

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
            {/* Hub Header & Tab Nav */}
            <div className={`shrink-0 bg-white border-b border-slate-200 transition-all ${isMobile ? 'px-2 py-2' : 'px-6 py-3'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                        <div className={`flex items-center gap-1 bg-slate-100 ${isMobile ? 'p-0.5' : 'p-1'} rounded-2xl w-fit`}>
                            {TABS.map((tab, idx) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <React.Fragment key={tab.id}>
                                        <button
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-1.5 md:gap-2.5 ${isMobile ? 'px-3 py-2' : 'px-5 py-2.5'} rounded-xl transition-all font-black ${isMobile ? 'text-[10px]' : 'text-sm'} whitespace-nowrap ${isActive
                                                ? `${tab.activeBg} text-white shadow-lg ${isMobile ? '' : 'scale-105'}`
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
                                                }`}
                                        >
                                            <Icon size={isMobile ? 12 : 15} />
                                            <span>{tab.label}</span>
                                            <span className="hidden md:block text-[10px] font-bold opacity-70">— {tab.fullLabel}</span>
                                        </button>
                                        {idx < TABS.length - 1 && !isMobile && (
                                            <ChevronRight size={14} className="text-slate-300 shrink-0" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {!isMobile && (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Agenda Operacional</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{activeTabInfo.desc}</p>
                            </div>
                            <div className={`w-10 h-10 ${activeTabInfo.activeBg} text-white rounded-xl flex items-center justify-center shadow-lg`}>
                                <activeTabInfo.icon size={20} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {activeTab === 'VISITATION' ? (
                    <VisitationTab 
                        currentUser={currentUser}
                        allClients={allClients}
                        techTests={techTests}
                        onNewTask={onNewTask}
                        onTaskCreated={onTaskCreated}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                ) : (
                    <PendingActionsTab 
                        currentUser={currentUser}
                        allClients={allClients}
                        tasks={tasks}
                        categories={categories}
                        onNewTask={onNewTask}
                        onEditTask={onEditTask}
                        onTaskCreated={onTaskCreated}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                )}
            </div>
        </div>
    );
};

export default PlanningHub;
