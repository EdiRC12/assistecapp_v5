import React from 'react';
import {
    LayoutDashboard, Calendar as CalendarIcon, MapPin, Briefcase, Plane,
    CheckSquare, FileText, Headphones, Sparkles, Settings2, LogOut,
    PanelLeft, PanelBottom, ChevronRight, ChevronLeft, X, Menu, Search,
    User as UserIcon, StickyNote, AlertTriangle, LogIn, Settings, Car,
    CheckSquare as CheckSquareIcon, Users as UsersIcon, History
} from 'lucide-react';
import UserAvatar from '../UserAvatar';
import DailyHub from '../DailyHub';
import { UI_TOKENS } from '../../constants/themeConstants';
import useIsMobile from '../../hooks/useIsMobile';

const AppLayout = ({
    children,
    currentUser,
    viewMode,
    setViewMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    searchTerm,
    setSearchTerm,
    setIsProfileOpen,
    allClients,
    setSelectedClient,
    formattedHeaderDate,
    todayTasksCount,
    todayNotesCount,
    totalOverdueCount,
    isDailyHubOpen,
    setIsDailyHubOpen,
    dailyHubTab,
    setDailyHubTab,
    dailyHubButtonRef,
    tasks,
    notes,
    handleSaveNote,
    handleDeleteNote,
    setEditingTask,
    setIsModalOpen,
    fetchTaskDetail,
    isPoliPanelOpen,
    setIsPoliPanelOpen,
    suggestions,
    isOnlineListOpen,
    setIsOnlineListOpen,
    users,
    handleUpdateProfile,
    setIsSettingsOpen,
    setIsVehicleManagerOpen,
    handleLogout,
    theme
}) => {
    const layoutMode = currentUser?.layout_mode || 'VERTICAL';
    const isMobile = useIsMobile();

    const rawMenuItems = [
        { id: 'kanban', label: 'Tarefas', icon: LayoutDashboard, color: 'text-blue-500' },
        { id: 'calendar', label: 'Calendário', icon: CalendarIcon, color: 'text-indigo-500' },
        { id: 'map', label: 'Mapa', icon: MapPin, color: 'text-emerald-500' },
        { id: 'clients', label: 'Clientes', icon: Briefcase, color: 'text-orange-500' },
        { id: 'travels', label: 'Viagens', icon: Plane, color: 'text-sky-500' },
        { id: 'visit_pending', label: 'Agenda', icon: CheckSquare, color: 'text-indigo-500' },
        { id: 'reports', label: 'Relatórios', icon: FileText, color: 'text-indigo-600' },
        { id: 'sac', label: 'SAC', icon: Headphones, color: 'text-rose-500' },
        { id: 'traceability', label: 'Rastreabilidade', icon: History, color: 'text-amber-600' },
        { id: 'meetings', label: 'Reunião', icon: UsersIcon, color: 'text-brand-600' },
        { id: 'poli', label: 'POLI', icon: Sparkles, color: 'text-purple-500' },
        { id: 'controls', label: 'Controles', icon: Settings2, color: 'text-slate-600' },
        { id: 'global_dashboard', label: 'Global', icon: LayoutDashboard, color: 'text-indigo-600' }
    ];

    const mobileAllowedItems = ['kanban', 'calendar', 'map', 'clients', 'reports', 'global_dashboard', 'controls', 'visit_pending', 'traceability'];
    const menuItems = isMobile ? rawMenuItems.filter(item => mobileAllowedItems.includes(item.id)) : rawMenuItems;

    return (
        <div
            className={`flex h-screen font-sans transition-all duration-500 ${currentUser?.theme_style === 'MIDNIGHT' ? 'theme-midnight' : currentUser?.theme_style === 'CUSTOM' ? 'theme-custom' : ''} ${layoutMode === 'HORIZONTAL' ? 'flex-col' : 'flex-row'}`}
            style={{ backgroundColor: theme.bg }}
        >
            {/* Mobile Sidebar Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className={`fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-in fade-in ${UI_TOKENS.TRANSITION_ALL}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* HORIZONTAL NAVBAR (Desktop) */}
            {layoutMode === 'HORIZONTAL' && (
                <nav className={`hidden md:flex items-center justify-between px-6 py-3 border-b ${theme.border} ${theme.sidebar} shadow-sm z-50 shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-brand-600">
                            <CheckSquareIcon size={24} />
                            <h1 className="text-xl font-bold tracking-tight">Assistec</h1>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-1">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.id === 'clients') setSelectedClient(null);
                                        setViewMode(item.id);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === item.id ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <item.icon size={16} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
                            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors">
                                <UserAvatar user={currentUser} size={24} />
                                <span className="text-xs font-bold text-slate-700">{currentUser.username}</span>
                            </button>
                        </div>
                        <button
                            onClick={() => handleUpdateProfile({ layout_mode: layoutMode === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL' })}
                            className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                            title={layoutMode === 'HORIZONTAL' ? "Mudar para Vertical" : "Mudar para Horizontal"}
                        >
                            {layoutMode === 'HORIZONTAL' ? <PanelLeft size={18} /> : <PanelBottom size={18} className="rotate-180" />}
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Configurações">
                            <Settings size={18} />
                        </button>
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Sair">
                            <LogOut size={18} />
                        </button>
                    </div>
                </nav>
            )}

            {/* VERTICAL SIDEBAR */}
            <aside className={`
                ${layoutMode === 'HORIZONTAL' ? 'md:hidden' : 'md:flex'}
                ${isSidebarCollapsed ? 'w-20' : 'w-64'}
                ${theme.sidebar} border-r ${theme.border}
                flex flex-col shrink-0 ${UI_TOKENS.TRANSITION_ALL} ${UI_TOKENS.SHADOW_XL} overflow-y-auto custom-scrollbar
                fixed inset-y-0 left-0 z-50 md:relative
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className={`p-4 border-b ${theme.border} flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-2 overflow-hidden animate-fade">
                            <CheckSquareIcon size={32} className="text-brand-600 shrink-0" />
                            <h1 className="text-2xl font-bold text-brand-600 truncate">Assistec</h1>
                        </div>
                    )}
                    {isSidebarCollapsed && <CheckSquareIcon size={24} className="text-brand-600" />}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 hover:bg-black/5 rounded-lg text-slate-500 opacity-50 hover:opacity-100 transition-all hidden md:block">
                        {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 hover:bg-black/5 rounded-lg text-slate-500 opacity-50 hover:opacity-100 transition-all md:hidden">
                        <X size={20} />
                    </button>
                </div>
                {!isSidebarCollapsed && (
                    <div className="px-4 pb-1">
                        <p className={`text-xs ${theme.subtext} mt-1 truncate`}>Bem-vindo, <span className={`font-semibold ${theme.text}`}>{currentUser.username}</span></p>
                    </div>
                )}
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'clients') setSelectedClient(null);
                                setViewMode(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium transition-all ${viewMode === item.id ? 'bg-brand-500/10 text-brand-600' : `${theme.text} hover:bg-black/5 opacity-80 hover:opacity-100`} group`}
                            title={isSidebarCollapsed ? item.label : ''}
                        >
                            <item.icon size={20} className={`${isSidebarCollapsed ? item.color + ' scale-110' : ''} ${viewMode === item.id ? 'text-brand-600' : ''}`} />
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>
                <div className={`p-2 border-t ${theme.border} mt-1 space-y-1`}>
                    <button onClick={() => setIsProfileOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium ${theme.text} hover:bg-black/5 transition-all active:scale-95`}>
                        <UserAvatar user={currentUser} size={isSidebarCollapsed ? 28 : 22} />
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col items-start leading-none overflow-hidden">
                                <span className="font-bold truncate w-full text-left">{currentUser.username}</span>
                                <span className="text-[10px] text-brand-600 font-bold">Editar Perfil</span>
                            </div>
                        )}
                    </button>

                    <div className={`pt-1 ${isSidebarCollapsed ? 'flex justify-center' : 'px-3'}`}>
                        {isSidebarCollapsed ? (
                            <div className="relative group cursor-pointer" title="Equipe Online">
                                <span className="bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-brand-200">
                                    {users.filter(u => u.last_seen && (new Date() - new Date(u.last_seen) < 5 * 60 * 1000)).length}
                                </span>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsOnlineListOpen(!isOnlineListOpen)}
                                    className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1 hover:text-slate-600 focus:outline-none group"
                                >
                                    <span className="flex items-center gap-2">
                                        Equipe Online
                                        {!isOnlineListOpen && (
                                            <span className="bg-brand-100 text-brand-600 px-1.5 rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity">
                                                {users.filter(u => u.last_seen && (new Date() - new Date(u.last_seen) < 5 * 60 * 1000)).length}
                                            </span>
                                        )}
                                    </span>
                                    <ChevronRight size={14} className={`transform transition-transform ${isOnlineListOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {isOnlineListOpen && (
                                    <div className="flex flex-wrap gap-1 animate-in slide-in-from-top-2 duration-200">
                                        {users.filter(u => u.last_seen && (new Date() - new Date(u.last_seen) < 5 * 60 * 1000)).map(u => (
                                            <UserAvatar key={u.id} user={u} size={28} showStatus={true} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className={`border-t ${theme.border} my-1`}></div>

                    <button onClick={() => setIsVehicleManagerOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium ${theme.text} opacity-70 hover:opacity-100 hover:bg-black/5 transition-all`} title="Frota de Veículos">
                        <Car size={20} />{!isSidebarCollapsed && <span>Frota de Veículos</span>}
                    </button>

                    <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium ${theme.text} opacity-70 hover:opacity-100 hover:bg-black/5 transition-all`} title="Configurações">
                        <Settings size={20} />{!isSidebarCollapsed && <span>Configurações</span>}
                    </button>

                    <button
                        onClick={() => handleUpdateProfile({ layout_mode: layoutMode === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL' })}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-xs font-medium ${theme.text} opacity-60 hover:opacity-100 hover:bg-black/5 transition-all`}
                        title={layoutMode === 'HORIZONTAL' ? "Mudar para Vertical" : "Mudar para Horizontal"}
                    >
                        {layoutMode === 'HORIZONTAL' ? <PanelLeft size={16} /> : <PanelBottom size={16} className="rotate-180" />}
                        {!isSidebarCollapsed && <span>{layoutMode === 'HORIZONTAL' ? 'Menu Vertical' : 'Menu Horizontal'}</span>}
                    </button>

                    <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all`} title="Sair">
                        <LogOut size={20} />{!isSidebarCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative ${isMobile ? 'pb-[80px]' : ''}`}>
                <header className="mb-2 flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center relative">
                    <div className="order-2 md:order-1 flex items-center gap-2">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`p-1.5 ${theme.text} hover:bg-black/5 rounded-lg md:hidden shrink-0 border border-slate-200 bg-white`}
                        >
                            <Menu size={18} />
                        </button>

                        <div className="flex-1 md:w-64 max-w-sm relative group animate-slide">
                            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors ${theme.subtext} group-focus-within:text-brand-600`} size={14} />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`w-full pl-8 pr-3 py-1.5 ${theme.card} rounded-full ${UI_TOKENS.SHADOW_SM} outline-none focus:ring-2 focus:ring-brand-500 text-xs md:text-sm ${UI_TOKENS.TRANSITION_ALL} text-current placeholder:opacity-50 border border-slate-200/60`}
                            />
                            {searchTerm.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                                    {(() => {
                                        const suggestions = allClients.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
                                        if (suggestions.length === 0) return <div className="p-3 text-xs text-slate-400 italic text-center">Nenhum cliente encontrado</div>;
                                        return (
                                            <ul className="max-h-60 overflow-y-auto custom-scrollbar">
                                                {suggestions.map(client => (
                                                    <li
                                                        key={client}
                                                        onClick={() => {
                                                            setSelectedClient(client);
                                                            setViewMode('clients');
                                                            setSearchTerm('');
                                                            setIsMobileMenuOpen(false);
                                                        }}
                                                        className="px-4 py-2 text-xs md:text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-600 cursor-pointer border-b border-slate-50 last:border-none flex items-center gap-2"
                                                    >
                                                        <UserIcon size={14} className="opacity-50" />
                                                        {client}
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        ref={dailyHubButtonRef}
                        className={`order-1 md:order-2 p-1.5 md:p-0 ${theme.header} md:bg-transparent rounded-xl md:rounded-none shadow-sm md:shadow-none border md:border-none ${theme.border} flex items-center justify-center gap-4 animate-fade relative`}
                    >
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tight text-brand-600 leading-none mb-0.5">Hoje</span>
                            <span className={`text-xs md:text-sm font-bold ${theme.text} leading-none whitespace-nowrap`}>{formattedHeaderDate}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200/80" />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (!isDailyHubOpen || dailyHubTab !== 'TASKS') {
                                        setDailyHubTab('TASKS');
                                        setIsDailyHubOpen(true);
                                    } else setIsDailyHubOpen(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105 shadow-sm border ${isDailyHubOpen && dailyHubTab === 'TASKS' ? 'bg-brand-600 text-white border-brand-700 shadow-brand-200' : 'bg-white text-brand-700 border-brand-100 hover:bg-brand-50'}`}
                                title="Tarefas de Hoje"
                            >
                                <CalendarIcon size={14} className={isDailyHubOpen && dailyHubTab === 'TASKS' ? 'text-white' : 'text-brand-500'} />
                                <span className="text-xs font-black">{todayTasksCount}</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (!isDailyHubOpen || dailyHubTab !== 'NOTES') {
                                        setDailyHubTab('NOTES');
                                        setIsDailyHubOpen(true);
                                    } else setIsDailyHubOpen(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105 shadow-sm border ${isDailyHubOpen && dailyHubTab === 'NOTES' ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200' : 'bg-white text-amber-700 border-amber-100 hover:bg-amber-50'}`}
                                title="Notas e Lembretes"
                            >
                                <StickyNote size={14} className={isDailyHubOpen && dailyHubTab === 'NOTES' ? 'text-white' : 'text-amber-500'} />
                                <span className="text-xs font-black">{todayNotesCount}</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (!isDailyHubOpen || dailyHubTab !== 'OVERDUE') {
                                        setDailyHubTab('OVERDUE');
                                        setIsDailyHubOpen(true);
                                    } else setIsDailyHubOpen(false);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105 shadow-sm border ${isDailyHubOpen && dailyHubTab === 'OVERDUE' ? 'bg-red-600 text-white border-red-700 shadow-red-200' : 'bg-white text-red-700 border-red-200 hover:bg-red-50'} group`}
                                title={`${totalOverdueCount} Itens em Atraso`}
                            >
                                <AlertTriangle size={14} className={`${isDailyHubOpen && dailyHubTab === 'OVERDUE' ? 'text-white' : (totalOverdueCount > 0 ? 'text-red-500 animate-pulse' : 'text-red-300')} group-hover:scale-110`} />
                                <span className="text-xs font-black">{totalOverdueCount}</span>
                            </button>
                        </div>
                        <DailyHub
                            isOpen={isDailyHubOpen}
                            onClose={() => setIsDailyHubOpen(false)}
                            tasks={tasks}
                            notes={notes}
                            onSaveNote={handleSaveNote}
                            onDeleteNote={handleDeleteNote}
                            currentUser={currentUser}
                            onEditTask={(t) => { setEditingTask(t); setIsModalOpen(true); fetchTaskDetail(t.id); }}
                            initialTab={dailyHubTab}
                            buttonRef={dailyHubButtonRef}
                        />
                    </div>

                    <div className="order-3 md:order-3 flex items-center justify-end gap-2">
                        <button
                            onClick={() => setIsPoliPanelOpen(!isPoliPanelOpen)}
                            className={`bg-purple-100 text-purple-600 p-1.5 rounded-full hover:bg-purple-200 transition-all hover:scale-105 shadow-sm hidden md:flex relative ${isPoliPanelOpen ? 'ring-2 ring-purple-400 ring-offset-2' : ''} ${suggestions.length > 0 && !isPoliPanelOpen ? 'animate-pulse-purple ring-2 ring-purple-300' : ''}`}
                            title="Sugestões da POLI"
                        >
                            <Sparkles size={16} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 relative flex flex-col min-h-0">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation Bar (Mobile Only) */}
            {isMobile && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[60] px-1 py-1 pb-safe flex items-center justify-start overflow-x-auto overflow-y-hidden custom-scrollbar shadow-[0_-4px_10px_-1px_rgb(0,0,0,0.05)]">
                    <div className="flex gap-1 w-max px-2 h-16">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'clients') setSelectedClient(null);
                                    setViewMode(item.id);
                                }}
                                className={`flex flex-col items-center justify-center w-16 gap-0.5 p-1 rounded-xl transition-all shrink-0 ${viewMode === item.id ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                <div className={`p-1.5 rounded-lg ${viewMode === item.id ? 'bg-brand-50' : ''}`}>
                                    <item.icon size={22} className={viewMode === item.id ? 'text-brand-600' : ''} />
                                </div>
                                <span className={`text-[9px] font-bold tracking-tight truncate w-full text-center ${viewMode === item.id ? 'text-brand-600' : 'text-slate-500'}`}>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
            )}
        </div>
    );
};

export default AppLayout;
