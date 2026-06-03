import React, { useState } from 'react';
import {
    LayoutDashboard, Calendar as CalendarIcon, MapPin, Briefcase, Plane,
    CheckSquare, FileText, Headphones, Sparkles, Settings2, LogOut,
    PanelLeft, PanelBottom, ChevronRight, ChevronLeft, X, Menu, Search,
    User as UserIcon, StickyNote, AlertTriangle, LogIn, Settings, Car,
    CheckSquare as CheckSquareIcon, Users as UsersIcon, History, LifeBuoy,
    ChevronUp, ChevronDown
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
    dailyHubButtonRefHorizontal,
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
    const [isBottomMenuCollapsed, setIsBottomMenuCollapsed] = useState(false);

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
        { id: 'support', label: 'Suporte', icon: LifeBuoy, color: 'text-rose-600' },
        { id: 'controls', label: 'Controles', icon: Settings2, color: 'text-slate-600' },
        { id: 'global_dashboard', label: 'Global', icon: LayoutDashboard, color: 'text-indigo-600' }
    ];

    const mobileAllowedItems = ['kanban', 'calendar', 'map', 'clients', 'reports', 'global_dashboard', 'controls', 'visit_pending', 'traceability', 'support'];
    const menuItems = isMobile ? rawMenuItems.filter(item => mobileAllowedItems.includes(item.id)) : rawMenuItems;


    return (
        <div
            className={`flex h-screen print:h-auto print:block font-sans transition-all duration-500 ${currentUser?.theme_style === 'MIDNIGHT' ? 'theme-midnight' : currentUser?.theme_style === 'CUSTOM' ? 'theme-custom' : ''} ${layoutMode === 'HORIZONTAL' ? 'flex-col' : 'flex-row'}`}
            style={{ backgroundColor: theme.bg }}
        >
            {/* Mobile Sidebar Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className={`fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-in fade-in print:hidden ${UI_TOKENS.TRANSITION_ALL}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* HORIZONTAL NAVBAR (Desktop) */}
            {layoutMode === 'HORIZONTAL' && (
                <nav className={`hidden md:flex items-center justify-between px-6 py-3 border-b ${theme.border} ${theme.sidebar} shadow-sm z-50 shrink-0 print:hidden`}>
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

                        {/* Horizontal Indicators */}
                        <div className="flex items-center gap-1 border-l border-slate-200 ml-2 pl-2">
                            <div ref={dailyHubButtonRefHorizontal} className="flex items-center gap-1">
                                <button
                                    onClick={() => { setDailyHubTab('TASKS'); setIsDailyHubOpen(true); }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 ${isDailyHubOpen && dailyHubTab === 'TASKS' ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white border-brand-700 shadow-sm' : 'bg-white border-slate-200/60 text-brand-700 hover:bg-brand-50'}`}
                                    title="Tarefas"
                                >
                                    <CalendarIcon size={13} className={isDailyHubOpen && dailyHubTab === 'TASKS' ? 'text-white' : 'text-brand-500'} />
                                    <span className="text-[10px] font-black">{todayTasksCount}</span>
                                </button>
                                <button
                                    onClick={() => { setDailyHubTab('NOTES'); setIsDailyHubOpen(true); }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 ${isDailyHubOpen && dailyHubTab === 'NOTES' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white border-slate-200/60 text-amber-700 hover:bg-brand-50'}`}
                                    title="Notas"
                                >
                                    <StickyNote size={13} className={isDailyHubOpen && dailyHubTab === 'NOTES' ? 'text-white' : 'text-amber-500'} />
                                    <span className="text-[10px] font-black">{todayNotesCount}</span>
                                </button>
                                <button
                                    onClick={() => { setDailyHubTab('OVERDUE'); setIsDailyHubOpen(true); }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 ${isDailyHubOpen && dailyHubTab === 'OVERDUE' ? 'bg-gradient-to-br from-red-500 to-red-700 text-white border-red-700 shadow-sm' : 'bg-white border-slate-200/60 text-red-700 hover:bg-red-50'}`}
                                    title="Atrasos"
                                >
                                    <AlertTriangle size={13} className={totalOverdueCount > 0 ? 'animate-pulse' : ''} />
                                    <span className="text-[10px] font-black">{totalOverdueCount}</span>
                                </button>
                                <button
                                    onClick={() => setIsPoliPanelOpen(!isPoliPanelOpen)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 ${isPoliPanelOpen ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-700 shadow-sm' : 'bg-white border-slate-200/60 text-purple-600 hover:bg-purple-50'}`}
                                    title="IA POLI"
                                >
                                    <Sparkles size={13} className={suggestions.length > 0 && !isPoliPanelOpen ? 'animate-pulse' : ''} />
                                    <span className="text-[10px] font-black tracking-tight">POLI</span>
                                </button>
                            </div>
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
                ${theme.sidebar} border-r ${theme.border} print:hidden
                flex flex-col shrink-0 ${UI_TOKENS.TRANSITION_ALL} ${UI_TOKENS.SHADOW_XL} overflow-y-auto custom-scrollbar
                fixed inset-y-0 left-0 z-50 md:relative
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className={`p-4 border-b ${theme.border} flex flex-col gap-1`}>
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-2 overflow-hidden animate-fade text-brand-600">
                                <CheckSquareIcon size={32} className="shrink-0" />
                                <h1 className="text-2xl font-bold truncate tracking-tight">Assistec</h1>
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
                        <div className="px-1 animate-in fade-in slide-in-from-left-2 duration-500">
                            <p className={`text-[10px] ${theme.subtext} font-medium opacity-70`}>Bem-vindo,</p>
                            <p className={`text-sm font-black ${theme.text} leading-tight truncate`}>{currentUser.username}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Indicators (Extra Slim Premium) */}
                <div className={`px-3 py-2 border-b ${theme.border} bg-slate-50/40 backdrop-blur-sm`}>
                    {!isSidebarCollapsed ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-1">
                                <span className={`text-[10px] font-black ${theme.text} tracking-tight opacity-60`}>Hoje, {formattedHeaderDate}</span>
                            </div>
                            <div ref={dailyHubButtonRef} className="grid grid-cols-4 gap-1">
                                <button
                                    onClick={() => { setDailyHubTab('TASKS'); setIsDailyHubOpen(true); }}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] border transition-all duration-300 ${isDailyHubOpen && dailyHubTab === 'TASKS' ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white border-brand-700 shadow-md shadow-brand-100' : 'bg-white border-slate-200/60 text-brand-700 hover:bg-brand-50 hover:border-brand-200'}`}
                                    title="Tarefas"
                                >
                                    <CalendarIcon size={11} className={isDailyHubOpen && dailyHubTab === 'TASKS' ? 'text-white' : 'text-brand-500'} />
                                    <span className="text-[10px] font-black leading-none">{todayTasksCount}</span>
                                </button>
                                <button
                                    onClick={() => { setDailyHubTab('NOTES'); setIsDailyHubOpen(true); }}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] border transition-all duration-300 ${isDailyHubOpen && dailyHubTab === 'NOTES' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-600 shadow-md shadow-amber-100' : 'bg-white border-slate-200/60 text-amber-700 hover:bg-brand-50 hover:border-brand-200'}`}
                                    title="Notas"
                                >
                                    <StickyNote size={11} className={isDailyHubOpen && dailyHubTab === 'NOTES' ? 'text-white' : 'text-amber-500'} />
                                    <span className="text-[10px] font-black leading-none">{todayNotesCount}</span>
                                </button>
                                <button
                                    onClick={() => { setDailyHubTab('OVERDUE'); setIsDailyHubOpen(true); }}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] border transition-all duration-300 ${isDailyHubOpen && dailyHubTab === 'OVERDUE' ? 'bg-gradient-to-br from-red-500 to-red-700 text-white border-red-700 shadow-md shadow-red-100' : 'bg-white border-slate-200/60 text-red-700 hover:bg-red-50 hover:border-brand-200'}`}
                                    title="Atrasos"
                                >
                                    <AlertTriangle size={11} className={totalOverdueCount > 0 ? 'animate-pulse' : ''} />
                                    <span className="text-[10px] font-black leading-none">{totalOverdueCount}</span>
                                </button>
                                <button
                                    onClick={() => setIsPoliPanelOpen(!isPoliPanelOpen)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] border transition-all duration-300 ${isPoliPanelOpen ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-700 shadow-md shadow-purple-100' : 'bg-white border-slate-200/60 text-purple-600 hover:bg-purple-50 hover:border-purple-200'}`}
                                    title="IA POLI"
                                >
                                    <Sparkles size={11} className={suggestions.length > 0 && !isPoliPanelOpen ? 'animate-pulse' : ''} />
                                    <span className="text-[9px] font-black leading-none tracking-tight">POLI</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => { setDailyHubTab('TASKS'); setIsDailyHubOpen(true); }}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center text-brand-600 relative hover:bg-brand-50 transition-all shadow-sm"
                            >
                                <CalendarIcon size={14} />
                                {todayTasksCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">{todayTasksCount}</span>}
                            </button>
                            <button
                                onClick={() => setIsPoliPanelOpen(!isPoliPanelOpen)}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center text-purple-600 hover:bg-purple-50 transition-all shadow-sm"
                            >
                                <Sparkles size={14} />
                            </button>
                        </div>
                    )}
                </div>
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
                <div className={`p-2 border-t ${theme.border} mt-1 flex flex-col shrink-0 relative`}>
                    <button 
                        onClick={() => setIsBottomMenuCollapsed(!isBottomMenuCollapsed)}
                        className={`absolute -top-3.5 right-2 bg-white border ${theme.border} p-1 rounded-full text-slate-400 hover:text-brand-600 transition-all z-10 shadow-sm cursor-pointer`}
                        title={isBottomMenuCollapsed ? "Expandir Menu Inferior" : "Ocultar Menu Inferior"}
                    >
                        {isBottomMenuCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isBottomMenuCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
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
                                        className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1 hover:text-slate-600 focus:outline-none group cursor-pointer"
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

                        <button onClick={() => setIsVehicleManagerOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium ${theme.text} opacity-70 hover:opacity-100 hover:bg-black/5 transition-all cursor-pointer`} title="Frota de Veículos">
                            <Car size={20} />{!isSidebarCollapsed && <span>Frota de Veículos</span>}
                        </button>

                        <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium ${theme.text} opacity-70 hover:opacity-100 hover:bg-black/5 transition-all cursor-pointer`} title="Configurações">
                            <Settings size={20} />{!isSidebarCollapsed && <span>Configurações</span>}
                        </button>

                        <button
                            onClick={() => handleUpdateProfile({ layout_mode: layoutMode === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL' })}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-xs font-medium ${theme.text} opacity-60 hover:opacity-100 hover:bg-black/5 transition-all cursor-pointer`}
                            title={layoutMode === 'HORIZONTAL' ? "Mudar para Vertical" : "Mudar para Horizontal"}
                        >
                            {layoutMode === 'HORIZONTAL' ? <PanelLeft size={16} /> : <PanelBottom size={16} className="rotate-180" />}
                            {!isSidebarCollapsed && <span>{layoutMode === 'HORIZONTAL' ? 'Menu Vertical' : 'Menu Horizontal'}</span>}
                        </button>

                        <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all cursor-pointer`} title="Sair">
                            <LogOut size={20} />{!isSidebarCollapsed && <span>Sair</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col p-0 overflow-hidden print:overflow-visible print:block relative ${isMobile ? 'pb-[80px]' : ''}`}>
                {/* Mobile Compact Header */}
                {isMobile && (
                    <header className="p-4 flex items-center justify-between shrink-0 bg-white border-b border-slate-100 z-10 print:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-100"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest">Assistec</span>
                            <span className="text-[11px] font-bold text-slate-800">{formattedHeaderDate}</span>
                        </div>
                        <button
                            onClick={() => {
                                setDailyHubTab('TASKS');
                                setIsDailyHubOpen(true);
                            }}
                            className="p-2 text-brand-600 bg-brand-50 rounded-xl relative"
                        >
                            <CalendarIcon size={20} />
                            {todayTasksCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                    {todayTasksCount}
                                </span>
                            )}
                        </button>
                    </header>
                )}

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
