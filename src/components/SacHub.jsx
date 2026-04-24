import React, { useState, useRef } from 'react';
import { MessageCircle, HeadphonesIcon, AlertOctagon, ChevronRight, ClipboardList, RotateCcw } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import SimpleTicketView from './SimpleTicketView';
import SacView from './SacView';
import RncView from './RncView';
import FollowupsView from './FollowupsView';
import ReturnsView from './returns/ReturnsView';

const TABS = [
    {
        id: 'FOLLOWUPS',
        label: 'FOLLOW-UPS',
        fullLabel: 'Acompanhamentos Técnicos',
        desc: 'Feedbacks e acompanhamentos de clientes',
        color: 'indigo',
        icon: ClipboardList,
        activeText: 'text-indigo-600',
        activeBg: 'bg-indigo-600',
        ring: 'ring-indigo-500',
    },
    {
        id: 'RI',
        label: 'RI',
        fullLabel: 'Registro de Interação',
        desc: 'Atendimentos rápidos e contatos',
        color: 'sky',
        icon: MessageCircle,
        activeText: 'text-sky-600',
        activeBg: 'bg-sky-600',
        ring: 'ring-sky-500',
    },
    {
        id: 'OT',
        label: 'OT',
        fullLabel: 'Ocorrência Técnica',
        desc: 'Reclamações e ocorrências técnicas',
        color: 'amber',
        icon: HeadphonesIcon,
        activeText: 'text-amber-600',
        activeBg: 'bg-amber-600',
        ring: 'ring-amber-500',
    },
    {
        id: 'RNC',
        label: 'RNC',
        fullLabel: 'Relatório de Não Conformidade',
        desc: 'Registros formais de não conformidade',
        color: 'rose',
        icon: AlertOctagon,
        activeText: 'text-rose-600',
        activeBg: 'bg-rose-600',
        ring: 'ring-rose-500',
    },
    {
        id: 'RETURNS',
        label: 'DEVOLUÇÕES',
        fullLabel: 'Controle de Devoluções',
        desc: 'Produtos devolvidos e retrabalho',
        color: 'rose', // Consistent with RNC/Quality
        icon: RotateCcw,
        activeText: 'text-rose-600',
        activeBg: 'bg-rose-600',
        ring: 'ring-rose-500',
    },
];

const SacHub = ({
    currentUser,
    allClients,
    onTasksUpdate,
    onOpenJourneyReport,
    auditRefreshKey,
    onNewTask,
    onNewSacTask,
    onNewRncTask,
    highlightedFollowupId,
    initialTab,
    techFollowups = [],
    onFetchFollowups,
    notifySuccess,
    notifyError,
    notifyWarning
}) => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState(initialTab || 'FOLLOWUPS');
    const [migrateToOtData, setMigrateToOtData] = useState(null);
    const [migrateToRncData, setMigrateToRncData] = useState(null);

    React.useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const activeTabInfo = TABS.find(t => t.id === activeTab) || TABS[0];

    const handleMigrateRiToOt = async (riTicket) => {
        setMigrateToOtData({
            client_name: riTicket.client_name,
            city: riTicket.city,
            external_id: riTicket.external_id,
            description: `[Migrado do RI ${riTicket.appointment_number}] ${riTicket.subject || ''}\n\n${riTicket.description || ''}`.trim(),
            status: 'EM_ABERTO', // Garante que a nova OT comece aberta para edição
            origin_ri_number: riTicket.appointment_number,
            origin_ri_id: riTicket.id,
        });
        setActiveTab('OT');
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Hub Tab Nav */}
            <div className={`shrink-0 bg-white border-b border-slate-200 ${isMobile ? 'px-2 py-2' : 'px-6 py-3'} flex items-center gap-1.5 overflow-x-auto scrollbar-hide`}>
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

                {/* Breadcrumb description */}
                {!isMobile && (
                    <div className="ml-4 flex items-center gap-2 hidden md:flex">
                        <div className={`w-2 h-2 rounded-full ${activeTabInfo.activeBg} animate-pulse`}></div>
                        <span className="text-xs font-bold text-slate-400">{activeTabInfo.desc}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {activeTab === 'RI' && (
                    <SimpleTicketView
                        currentUser={currentUser}
                        allClients={allClients}
                        onNewTask={onNewTask}
                        onMigrateToOT={handleMigrateRiToOt}
                        onOpenJourneyReport={onOpenJourneyReport}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                )}
                {activeTab === 'OT' && (
                    <SacView
                        currentUser={currentUser}
                        allClients={allClients}
                        onTasksUpdate={onTasksUpdate}
                        onOpenJourneyReport={onOpenJourneyReport}
                        auditRefreshKey={auditRefreshKey}
                        onNewTask={onNewTask}
                        migrateFromRi={migrateToOtData}
                        onClearMigrateFromRi={() => setMigrateToOtData(null)}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                )}
                {activeTab === 'RNC' && (
                    <RncView
                        currentUser={currentUser}
                        allClients={allClients}
                        onTasksUpdate={onTasksUpdate}
                        onOpenJourneyReport={onOpenJourneyReport}
                        auditRefreshKey={auditRefreshKey}
                        onNewTask={onNewTask}
                        migrateFromOt={migrateToRncData}
                        onClearMigrateFromOt={() => setMigrateToRncData(null)}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                )}
                {activeTab === 'FOLLOWUPS' && (
                    <FollowupsView
                        currentUser={currentUser}
                        allClients={allClients}
                        techFollowups={techFollowups}
                        onFetchFollowups={onFetchFollowups}
                        onNewTask={onNewTask}
                        onOpenJourneyReport={onOpenJourneyReport}
                        highlightedFollowupId={highlightedFollowupId}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                )}
                {activeTab === 'RETURNS' && (
                    <ReturnsView
                        currentUser={currentUser}
                        allClients={allClients}
                        onOpenJourneyReport={onOpenJourneyReport}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                )}
            </div>
        </div>
    );
};

export default SacHub;
