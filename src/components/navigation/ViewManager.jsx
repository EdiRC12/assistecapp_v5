import React from 'react';
import KanbanBoard from '../kanban/KanbanBoard';
import CalendarView from '../CalendarView';
import MapView from '../MapView';
import ClientHistoryView from '../ClientHistoryView';
import TravelsView from '../TravelsView';
import ReportsView from '../ReportsView';
import SacHub from '../SacHub';
import RncView from '../RncView';
import PoliView from '../PoliView';
import ControlsView from '../ControlsView';
import GlobalDashboard from '../GlobalDashboard';
import PlanningHub from '../planning/PlanningHub';
import MeetingHub from '../MeetingHub';
import TraceabilityView from '../TraceabilityView';
import { TaskStatus } from '../../constants/taskConstants';
import ErrorBoundary from '../common/ErrorBoundary';

const ViewManager = ({
    supabase,
    viewMode,
    // Kanban Props
    filteredTasksVisibility,
    customCategories,
    currentUser,
    users,
    techTests,
    fetchTechTests,
    techFollowups,
    testFlows,
    testStatusPresets,
    setIsModalOpen,
    setEditingTask,
    fetchTaskDetail,
    handleDeleteTask,
    handleTaskDrop,
    fetchTasks,
    setTasks,
    hasMoreTasks,
    // Calendar Props
    calendarLayout,
    tasks,
    handleSaveTask,
    notes,
    theme,
    // Map Props
    allClients,
    mapFilter,
    setMapFilter,
    // Clients Props
    handleOpenClientReport,
    analysisTier,
    setAnalysisTier,
    setIsConsolidatedBIOpen,
    biTimeRange,
    setBiTimeRange,
    setReturnToState,
    setReturnToView,
    setViewMode,
    setExternalTestId,
    setExternalFollowupId,
    handleOpenReport,
    handleViewTechnicalReport,
    onOpenJourneyReport,
    onOpenTravels,
    selectedClient,
    setSelectedClient,
    // Travels Props
    travelsFilter,
    setTravelsFilter,
    // SAC Props
    onEditTask,
    onEditTest,
    onCreateTask,
    onNewTask,
    onFetchFollowups,
    externalFollowupId,
    returnToView,
    // Controls Props
    externalTestId,
    // Other
    suggestions,
    setSuggestions,
    activePoliSection,
    setActivePoliSection,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    vehicles,
    inventoryReasons
}) => {
    switch (viewMode) {
        case 'kanban':
            return (
                <ErrorBoundary componentName="KanbanBoard" currentUser={currentUser} notifyError={notifyError}>
                    <KanbanBoard
                        tasks={filteredTasksVisibility}
                        customCategories={customCategories}
                        currentUser={currentUser}
                        users={users}
                        techTests={techTests}
                        techFollowups={techFollowups}
                        setIsModalOpen={setIsModalOpen}
                        setEditingTask={setEditingTask}
                        fetchTaskDetail={fetchTaskDetail}
                        handleDeleteTask={handleDeleteTask}
                        handleTaskDrop={handleTaskDrop}
                        fetchTasks={fetchTasks}
                        hasMoreTasks={hasMoreTasks}
                        suggestions={suggestions}
                        setSuggestions={setSuggestions}
                    />
                </ErrorBoundary>
            );

        case 'calendar':
            return (
                <ErrorBoundary componentName="Calendar" currentUser={currentUser} notifyError={notifyError}>
                    <div className={`flex-1 flex overflow-hidden relative ${calendarLayout === 'BOTTOM' ? 'flex-col' : calendarLayout === 'LEFT' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex-1 overflow-auto md:rounded-xl m-1 md:m-4 shadow-sm border ${theme.border}`}>
                            <CalendarView
                                tasks={tasks.filter(t => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)}
                                onEditTask={async (t) => { setIsModalOpen(true); setEditingTask(t); await fetchTaskDetail(t.id); }}
                                onUpdateTask={handleSaveTask}
                                notes={notes}
                                currentUser={currentUser}
                                notifySuccess={notifySuccess}
                                notifyError={notifyError}
                            />
                        </div>
                    </div>
                </ErrorBoundary>
            );

        case 'map':
            return (
                <ErrorBoundary componentName="MapView" currentUser={currentUser} notifyError={notifyError}>
                    <MapView
                        tasks={tasks}
                        allClients={allClients}
                        onEditTask={async (t) => { setIsModalOpen(true); setEditingTask(t); await fetchTaskDetail(t.id); }}
                        mapFilter={mapFilter}
                        setMapFilter={setMapFilter}
                        users={users}
                    />
                </ErrorBoundary>
            );

        case 'clients':
            return (
                <ErrorBoundary componentName="ClientHistoryView" currentUser={currentUser} notifyError={notifyError}>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <ClientHistoryView
                            tasks={tasks}
                            onOpenClientReport={handleOpenClientReport}
                            users={users}
                            currentUser={currentUser}
                            techTests={techTests}
                            techFollowups={techFollowups}
                            analysisTier={analysisTier}
                            setAnalysisTier={setAnalysisTier}
                            onOpenConsolidatedBI={() => setIsConsolidatedBIOpen(true)}
                            biTimeRange={biTimeRange}
                            setBiTimeRange={setBiTimeRange}
                            onEditTask={async (t, meta) => {
                                if (meta) setReturnToState(meta);
                                if (t.is_test) {
                                    if (t.converted_task_id) {
                                        const actualTask = tasks.find(tk => tk.id === t.converted_task_id);
                                        if (actualTask) {
                                            setIsModalOpen(true);
                                            setEditingTask(actualTask);
                                            await fetchTaskDetail(actualTask.id);
                                        } else {
                                            notifyWarning("Tarefa não encontrada", "A tarefa vinculada não foi encontrada no sistema.");
                                        }
                                    } else {
                                        setReturnToView('clients');
                                        setViewMode('controls');
                                        setExternalTestId(t.real_id);
                                    }
                                } else if (t.is_followup) {
                                    setReturnToView('clients');
                                    setViewMode('sac');
                                    setExternalFollowupId(t.real_id);
                                } else {
                                    setIsModalOpen(true);
                                    setEditingTask(t);
                                    await fetchTaskDetail(t.id);
                                }
                            }}
                            onOpenReport={handleOpenReport}
                            onViewTechnicalReport={handleViewTechnicalReport}
                            selectedClient={selectedClient}
                            setSelectedClient={setSelectedClient}
                            notifySuccess={notifySuccess}
                            notifyError={notifyError}
                        />
                    </div>
                </ErrorBoundary>
            );

        case 'travels':
            return (
                <ErrorBoundary componentName="TravelsView" currentUser={currentUser} notifyError={notifyError}>
                    <TravelsView
                        tasks={tasks}
                        allClients={allClients}
                        initialClientFilter={travelsFilter}
                        onClearFilter={() => setTravelsFilter('')}
                        onEditTask={async (t) => { setIsModalOpen(true); setEditingTask(t); await fetchTaskDetail(t.id); }}
                        onUpdateTasks={setTasks}
                        onUpdateTests={fetchTechTests}
                        onBack={() => setViewMode(returnToView || 'kanban')}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        vehicles={vehicles}
                        users={users}
                        hasMore={hasMoreTasks}
                        onLoadMore={() => fetchTasks(true)}
                    />
                </ErrorBoundary>
            );

        case 'visit_pending':
            return (
                <ErrorBoundary componentName="PlanningHub" currentUser={currentUser} notifyError={notifyError}>
                    <PlanningHub
                        currentUser={currentUser}
                        allClients={allClients}
                        tasks={tasks}
                        techTests={techTests}
                        categories={customCategories}
                        onNewTask={(client, taskData) => { setIsModalOpen(true); setEditingTask({ client, ...taskData }); }}
                        onEditTask={async (t) => { setIsModalOpen(true); setEditingTask(t); await fetchTaskDetail(t.id); }}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                </ErrorBoundary>
            );

        case 'reports':
            return (
                <ErrorBoundary componentName="ReportsView" currentUser={currentUser} notifyError={notifyError}>
                    <ReportsView
                        tasks={tasks}
                        onOpenReport={handleOpenReport}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                </ErrorBoundary>
            );

        case 'sac':
            return (
                <ErrorBoundary componentName="SacHub" currentUser={currentUser} notifyError={notifyError}>
                    <SacHub
                        tasks={tasks}
                        currentUser={currentUser}
                        users={users}
                        allClients={allClients}
                        techFollowups={techFollowups}
                        onEditTask={onEditTask}
                        onCreateTask={onCreateTask}
                        onNewTask={onNewTask}
                        onOpenJourneyReport={onOpenJourneyReport}
                        onFetchFollowups={onFetchFollowups}
                        externalFollowupId={externalFollowupId}
                        onClearExternalId={() => setExternalFollowupId(null)}
                        returnToView={returnToView}
                        onBack={() => setViewMode(returnToView || 'kanban')}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                </ErrorBoundary>
            );

        case 'rnc':
            return (
                <ErrorBoundary componentName="RncView" currentUser={currentUser} notifyError={notifyError}>
                    <RncView
                        tasks={tasks}
                        currentUser={currentUser}
                        users={users}
                        allClients={allClients}
                        onCreateTask={onCreateTask}
                        onOpenJourneyReport={onOpenJourneyReport}
                        onOpenTravels={onOpenTravels}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                </ErrorBoundary>
            );

        case 'poli':
            return (
                <ErrorBoundary componentName="PoliView" currentUser={currentUser} notifyError={notifyError}>
                    <PoliView
                        tasks={tasks}
                        notes={notes}
                        users={users}
                        clients={allClients}
                        currentUser={currentUser}
                        suggestions={suggestions}
                        setSuggestions={setSuggestions}
                        activeSection={activePoliSection}
                        setActiveSection={setActivePoliSection}
                        onEditTask={async (t) => { setIsModalOpen(true); setEditingTask(t); await fetchTaskDetail(t.id); }}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                </ErrorBoundary>
            );

        case 'controls':
            return (
                <ErrorBoundary componentName="ControlsView" currentUser={currentUser} notifyError={notifyError}>
                    <ControlsView
                        techTests={techTests}
                        techFollowups={techFollowups}
                        currentUser={currentUser}
                        users={users}
                        allClients={allClients}
                        tasks={tasks}
                        testFlows={testFlows}
                        testStatusPresets={testStatusPresets}
                        customCategories={customCategories}
                        onNewTask={(client, taskData) => { setIsModalOpen(true); setEditingTask({ client, ...taskData }); }}
                        onCreateTask={onCreateTask}
                        externalTestId={externalTestId}
                        onClearExternalId={() => setExternalTestId(null)}
                        returnToView={returnToView}
                        onBack={() => setViewMode(returnToView || 'kanban')}
                        setViewMode={setViewMode}
                        setSuggestions={setSuggestions}
                        activePoliSection={activePoliSection}
                        setActivePoliSection={setActivePoliSection}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        inventoryReasons={inventoryReasons}
                    />
                </ErrorBoundary>
            );

        case 'meetings':
            return (
                <ErrorBoundary componentName="MeetingHub" currentUser={currentUser} notifyError={notifyError}>
                    <MeetingHub
                        supabase={supabase}
                        currentUser={currentUser}
                        tasks={tasks}
                        users={users}
                        allClients={allClients}
                        techTests={techTests}
                        fetchTechTests={fetchTechTests}
                        techFollowups={techFollowups}
                        testFlows={testFlows}
                        testStatusPresets={testStatusPresets}
                        inventoryReasons={inventoryReasons}
                        vehicles={vehicles}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                        onEditTask={onEditTask}
                        onCreateTask={onCreateTask}
                        onNewTask={onNewTask}
                        setIsModalOpen={setIsModalOpen}
                        setEditingTask={setEditingTask}
                        fetchTaskDetail={fetchTaskDetail}
                        setTasks={setTasks}
                        fetchTasks={fetchTasks}
                        hasMoreTasks={hasMoreTasks}
                        customCategories={customCategories}
                        theme={theme}
                    />
                </ErrorBoundary>
            );

        case 'global_dashboard':
            return (
                <ErrorBoundary componentName="GlobalDashboard" currentUser={currentUser} notifyError={notifyError}>
                    <GlobalDashboard
                        tasks={tasks}
                        allClients={allClients}
                        techTests={techTests}
                        techFollowups={techFollowups}
                        suggestions={suggestions}
                        users={users}
                        currentUser={currentUser}
                        setViewMode={setViewMode}
                        setReturnToView={setReturnToView}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                </ErrorBoundary>
            );

        case 'traceability':
            return (
                <ErrorBoundary componentName="TraceabilityView" currentUser={currentUser} notifyError={notifyError}>
                    <TraceabilityView 
                        onEditTask={onEditTask}
                        onEditTest={onEditTest}
                        onOpenJourneyReport={onOpenJourneyReport}
                        onOpenTravels={onOpenTravels}
                        onViewTechnicalReport={handleViewTechnicalReport}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                        notifySuccess={notifySuccess}
                    />
                </ErrorBoundary>
            );

        default:
            return null;
    }
};

export default ViewManager;
