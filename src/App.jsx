import { supabase } from './supabaseClient';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Plus, Search, LayoutDashboard, Calendar as CalendarIcon, CheckSquare,
    Edit2, Trash2, Clock, Users, ListChecks, Grid,
    X, Sparkles, Loader2, User, Activity, FileText, Hash, Package, Tag, Briefcase, Phone, Mail, Layers,
    ChevronLeft, ChevronRight, ChevronDown, MapPin, Factory, AlertCircle, Info,
    LogIn, Download, Bell, LogOut, History, Paperclip, Image, Film, Music, File,
    UserPlus, Lock, Unlock, Map as MapIcon, Check, Building2, RefreshCw, FolderOpen, Filter, Settings, Plane,
    LayoutGrid, LayoutList, StickyNote, Eye, EyeOff, PanelRight, PanelLeft, PanelBottom, Square, Printer, Menu, Calendar, Mic, DollarSign, Car, Shield, ShieldCheck, MessageSquare, ShieldAlert, AlertTriangle, Headphones, Settings2
} from 'lucide-react';

import UserAvatar from './components/UserAvatar';
import {
    generateServiceJourneyReport,
} from './services/aiService';
import ServiceJourneyReport from './components/ServiceJourneyReport';
import LoginScreen from './components/LoginScreen';
import TaskModal from './components/TaskModal';
import VehicleManager from './components/VehicleManager';
import DailyHub from './components/DailyHub';
import TechnicalReportModal from './components/TechnicalReportModal';
import CategoryAnalysisModal from './components/CategoryAnalysisModal';
import ConsolidatedBIReport from './components/ConsolidatedBIReport';
import PoliPanel from './components/PoliPanel';
import { runStructuralDiagnostics, checkGlobalWeeklyDiagnostic, saveGlobalWeeklyDiagnostic } from './services/diagnosticService';

// New Modular Components
import ProfileModal from './components/modals/ProfileModal';
import SettingsModal from './components/modals/SettingsModal';
import ReportEditor from './components/ReportEditor';
import { THEMES } from './constants/themeConstants';

import {
    TaskStatus, Category, INITIAL_NATIVE_CATEGORIES
} from './constants/taskConstants';
import AppLayout from './components/layout/AppLayout';
import ViewManager from './components/navigation/ViewManager';

// Custom Hooks
import { useTasks } from './hooks/useTasks';
import { useCategories } from './hooks/useCategories';
import { usePoli } from './hooks/usePoli';
import { useNotes } from './hooks/useNotes';
import { useSystemData } from './hooks/useSystemData';
import { useNotification } from './hooks/useNotification';
import { useReminderMonitor } from './hooks/useReminderMonitor';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';


// --- APP ---




// 9. APP
const App = () => {
    // UI Global States
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('kanban');
    const [selectedClient, setSelectedClient] = useState(null);
    const [travelsFilter, setTravelsFilter] = useState('');
    const [calendarLayout, setCalendarLayout] = useState('RIGHT');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [autoOpenHealthCheck, setAutoOpenHealthCheck] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isVehicleManagerOpen, setIsVehicleManagerOpen] = useState(false);
    const [isDailyHubOpen, setIsDailyHubOpen] = useState(false);
    const [dailyHubTab, setDailyHubTab] = useState('TASKS');
    const dailyHubButtonRef = useRef(null);

    // Technical Report View State (Full Report)
    const [selectedTechReport, setSelectedTechReport] = useState(null);
    const [externalTestId, setExternalTestId] = useState(null);
    const [externalFollowupId, setExternalFollowupId] = useState(null);
    const [returnToView, setReturnToView] = useState(null);
    const [returnToState, setReturnToState] = useState(null); // {topic: string, filterCategory: string }
    const [analysisTier, setAnalysisTier] = useState(null);
    const [isConsolidatedBIOpen, setIsConsolidatedBIOpen] = useState(false);
    const [biTimeRange, setBiTimeRange] = useState('30');
    const [auditRefreshKey, setAuditRefreshKey] = useState(0);
    const [activePoliSection, setActivePoliSection] = useState('home');

    // Initial Preparation
    const [globalClients, setGlobalClients] = useState([]);
    const [isOnlineListOpen, setIsOnlineListOpen] = useState(false);
    const [mapFilter, setMapFilter] = useState({
        status: 'ACTIVE', month: 'ALL', year: 'ALL', userId: 'ALL'
    });

    // --- Hooks Integration ---
    const {
        notifications, removeNotification, notifySuccess, notifyError, notifyInfo, notifyWarning
    } = useNotification();

    const {
        tasks, setTasks, loading: tasksLoading, hasMoreTasks, editingTask, setEditingTask,
        techTests, techFollowups, fetchTasks, fetchTaskDetail, handleSaveTask, handleDeleteTask, handleTaskDrop,
        fetchTechTests, fetchTechFollowups
    } = useTasks(supabase, currentUser, { notifySuccess, notifyError, notifyWarning });

    const {
        customCategories, setCustomCategories, handleSaveCategories
    } = useCategories(supabase, currentUser, { notifySuccess, notifyError });

    const {
        notes, setNotes, handleDeleteNote, handleSaveNote, fetchNotes
    } = useNotes(supabase, currentUser, { notifySuccess, notifyError });

    const {
        suggestions, setSuggestions, poliNotification, setPoliNotification, isPoliPanelOpen, setIsPoliPanelOpen, handlePoliAction
    } = usePoli(tasks, setViewMode, setTravelsFilter);

    const {
        users, setUsers, vehicles, setVehicles, testFlows, handleSaveTestFlows, 
        testStatusPresets, handleSaveTestStatusPresets,
        aiConfig, setAiConfigState, handleSaveAiConfig, updateHeartbeat,
        inventoryReasons, handleSaveInventoryReasons,
        sysIntegrity
    } = useSystemData(supabase, currentUser, { notifySuccess, notifyError });

    // --- Signature & Ownership (Discreet) ---
    useEffect(() => {
        console.log("%c[Assistec V6] Platinum Operational Ecosystem", "color: #2563eb; font-weight: bold; font-size: 14px;");
        console.log("%cLead Architect & Developer: Evandro da Silva", "color: #64748b; font-weight: bold;");
        console.log("%cContact: evandrsilv@yahoo.com.br", "color: #94a3b8; font-style: italic;");
        
        // Proof of Author
        window.__ASSISTEC_PLATINUM_CORE__ = {
            author: "Evandro da Silva",
            contact: "evandrsilv@yahoo.com.br",
            id: "evandrsilv-0422",
            license: "Architect-Master-Platinum"
        };
    }, []);

    // --- Background Monitors ---
    useReminderMonitor(notes, { notifyWarning, notifyInfo, handleSaveNote });

    const getWeekNumber = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    // Monitor de Integridade Semanal (Primeiro Login da Semana)
    useEffect(() => {
        if (!currentUser) return;

        const isAdmin = currentUser?.role === 'admin' || 
                        currentUser?.is_admin === true ||
                        currentUser?.email?.toLowerCase().includes('evandro') ||
                        currentUser?.email?.toLowerCase().includes('assistec.com') ||
                        currentUser?.username?.toLowerCase().includes('evandro') ||
                        currentUser?.username?.toLowerCase().includes('silva') ||
                        currentUser?.email?.toLowerCase() === 'evandrsilv@yahoo.com.br';

        if (!isAdmin) return;

        const checkWeeklyIntegrity = async () => {
            try {
                const now = new Date();
                const weekKey = `W${getWeekNumber(now)}Y${now.getFullYear()}`;
                
                // 1. Checagem Global (No Banco de Dados)
                const alreadyRunGlobally = await checkGlobalWeeklyDiagnostic(weekKey);

                if (!alreadyRunGlobally) {
                    console.log(`[Diagnostic] Iniciando verificação semanal GLOBAL (${weekKey})...`);
                    const result = await runStructuralDiagnostics();
                    
                    if (result.summary.fail > 0) {
                        const failingItems = result.results
                            .filter(r => r.status === 'FAIL')
                            .map(r => r.name)
                            .join(', ');

                        // Salva o relatório completo para que o admin possa ver o que falhou sem repetir o teste
                        localStorage.setItem('assistec_last_health_check', result.timestamp);
                        localStorage.setItem('assistec_last_health_score', result.healthScore);
                        localStorage.setItem('assistec_last_diagnostic_report', JSON.stringify(result.results));

                        notifyError(
                            'Saúde do Sistema: Alerta Detectado', 
                            `Falhas em: ${failingItems}. Saúde atual: ${result.healthScore}%. Verifique o Pente Fino imediatamente.`,
                            { 
                                duration: 0, // Sticky
                                actions: [
                                    { 
                                        label: 'Abrir Pente Fino', 
                                        primary: true, 
                                        onClick: () => {
                                            setIsSettingsOpen(true);
                                            setAutoOpenHealthCheck(true);
                                        }
                                    }
                                ]
                            }
                        );
                    } else {
                        // 2. Salva no Banco de Dados (Para todos os admins)
                        await saveGlobalWeeklyDiagnostic(weekKey, result.healthScore);
                        
                        // 3. Cache Local (Para rapidez na UI)
                        localStorage.setItem('assistec_last_health_check', result.timestamp);
                        localStorage.setItem('assistec_last_health_score', result.healthScore);
                        localStorage.removeItem('assistec_last_diagnostic_report'); // Limpa relatórios de erro antigos
                        
                        notifyInfo(
                            'Integridade Semanal Validada', 
                            `O checklist automático global foi concluído. Saúde: ${result.healthScore}%`,
                            { duration: 6000 }
                        );
                    }
                }
            } catch (err) {
                console.error('Erro na sincronização semanal do diagnóstico:', err);
            }
        };

        // Pequeno delay para não sobrepor o carregamento inicial dos dados principais
        const runTimer = setTimeout(checkWeeklyIntegrity, 7000);
        return () => clearTimeout(runTimer);
    }, [currentUser]);

    // Heartbeat Logic: Manter o usuário online enquanto estiver com o app aberto
    useEffect(() => {
        if (!currentUser) return;

        // Atualiza imediatamente ao logar
        updateHeartbeat();

        // Atualiza a cada 2 minutos enquanto estiver logado
        const heartbeatInterval = setInterval(() => {
            updateHeartbeat();
        }, 2 * 60 * 1000);

        return () => clearInterval(heartbeatInterval);
    }, [currentUser]);

    // --- Persistent Login Logic (Device-Based) ---
    useEffect(() => {
        const checkDeviceSession = () => {
            try {
                const savedSession = localStorage.getItem('assistec_device_session');
                if (savedSession) {
                    const sessionData = JSON.parse(savedSession);
                    const now = new Date().getTime();
                    
                    // Verify if session is still valid (not expired)
                    if (sessionData.user && sessionData.expiry > now) {
                        setCurrentUser(sessionData.user);
                    } else {
                        // Clear expired session
                        localStorage.removeItem('assistec_device_session');
                    }
                }
            } catch (e) {
                console.error("Erro ao recuperar sessão do dispositivo:", e);
                localStorage.removeItem('assistec_device_session');
            }
        };

        checkDeviceSession();
    }, []);

    // Missing UI States for Modals
    const [isJourneyReportOpen, setIsJourneyReportOpen] = useState(false);
    const [selectedJourneyData, setSelectedJourneyData] = useState(null);
    const [isClientReportOpen, setIsClientReportOpen] = useState(false);
    const [clientReportData, setClientReportData] = useState(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportTask, setReportTask] = useState(null);
    const [reportData, setReportData] = useState(null);

    const todayStr = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const themeStyle = useMemo(() => currentUser?.theme_style || 'DEFAULT', [currentUser]);

    const theme = useMemo(() => {
        const baseTheme = THEMES[themeStyle] || THEMES.DEFAULT;
        if (themeStyle === 'CUSTOM') {
            return {
                ...baseTheme,
                bg: currentUser?.app_bg || '#f1f5f9'
            };
        }
        return baseTheme;
    }, [themeStyle, currentUser?.app_bg]);

    // Micro-animations and Style Injector
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'dynamic-animations';
        style.innerHTML = `
                                    @keyframes slideIn {
                                        from {opacity: 0; transform: translateY(10px); }
                                    to {opacity: 1; transform: translateY(0); }
            }
                                    @keyframes fadeIn {
                                        from {opacity: 0; }
                                    to {opacity: 1; }
            }
                                    @keyframes pulse-purple {
                                        0 % { box- shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
                                    70% {box - shadow: 0 0 0 10px rgba(147, 51, 234, 0); }
                                    100% {box - shadow: 0 0 0 0 rgba(147, 51, 234, 0); }
            }
                                    .animate-pulse-purple {animation: pulse-purple 2s infinite; }
                                    .animate-slide {animation: slideIn 0.3s ease-out forwards; }
                                    .animate-fade {animation: fadeIn 0.4s ease-out forwards; }
                                    .glass-effect {backdrop - filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
                                    .card-hover:hover {transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                                    .scrollbar-hide::-webkit-scrollbar {display: none; }
                                    .custom-scrollbar::-webkit-scrollbar {width: 6px; }
                                    .custom-scrollbar::-webkit-scrollbar-thumb {background: #cbd5e1; border-radius: 10px; }
                                    .theme-midnight .custom-scrollbar::-webkit-scrollbar-thumb {background: #475569; }
                                    .theme-custom .custom-scrollbar::-webkit-scrollbar-thumb {background: rgba(255,255,255,0.3); }
                                    `;
        document.head.appendChild(style);
        return () => {
            const el = document.getElementById('dynamic-animations');
            if (el) el.remove();
        };
    }, []);

    const fetchGlobalClients = async () => {
        try {
            const { data, error } = await supabase.from('clients').select('*').order('name');
            if (error) throw error;
            setGlobalClients(data || []);
        } catch (err) {
            console.error('Error fetching global clients:', err);
        }
    };

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

    const todayTasksCount = useMemo(() => {
        return tasks.filter(t => {
            if (['DONE', 'CANCELED', 'DEVOLVIDO'].includes(t.status)) return false;
            // 1. Check main due date
            if (isToday(t.due_date)) return true;
            // 2. Check active stages with dates
            if (t.stages) {
                const hasStageToday = Object.values(t.stages).some(s =>
                    s && s.active && isToday(s.date) &&
                    !['COMPLETED', 'SOLUCIONADO', 'FINALIZADO', 'DEVOLVIDO'].includes(s.status)
                );
                if (hasStageToday) return true;
            }
            // 3. Check travels
            if (t.travels && Array.isArray(t.travels)) {
                if (t.travels.some(tr => tr.isDateDefined && isToday(tr.date))) return true;
            }
            return false;
        }).length;
    }, [tasks]);

    const overdueTasksCount = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        return tasks.filter(t => {
            if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED) return false;

            // 1. Verificar data de vencimento direta
            const rawDueDate = t.due_date || t.dueDate;
            if (rawDueDate) {
                const dateStr = rawDueDate.includes('T') ? rawDueDate : `${rawDueDate}T00:00:00`;
                if (new Date(dateStr).getTime() < today) return true;
            }

            // 2. Verificar etapas (stages) ativas e atrasadas
            if (t.stages) {
                const hasOverdueStage = Object.values(t.stages).some(s =>
                    s && s.active && s.date &&
                    !['COMPLETED', 'SOLUCIONADO', 'FINALIZADO'].includes(s.status) &&
                    new Date(s.date.includes('T') ? s.date : `${s.date}T00:00:00`).getTime() < today
                );
                if (hasOverdueStage) return true;
            }

            // 3. Verificar viagens atrasadas
            if (t.travels && Array.isArray(t.travels)) {
                const hasOverdueTravel = t.travels.some(tr =>
                    tr.isDateDefined && tr.date &&
                    new Date(tr.date.includes('T') ? tr.date : `${tr.date}T00:00:00`).getTime() < today
                );
                if (hasOverdueTravel) return true;
            }

            return false;
        }).length;
    }, [tasks]);

    const overdueNotesCount = useMemo(() => {
        const now = new Date();
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        return notes.filter(note => {
            if (note.is_confirmed) return false;
            if (!note.note_date) return false;
            
            const nDate = new Date(note.note_date + 'T12:00:00');
            const noteDateOnly = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate()).getTime();

            // Se a data já passou (ontem ou antes)
            if (noteDateOnly < todayAtMidnight) return true;
            
            // Se for hoje, checa o horário
            if (noteDateOnly === todayAtMidnight && note.note_time) {
                const [hours, minutes] = note.note_time.split(':');
                const targetTime = new Date();
                targetTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                return now.getTime() > targetTime.getTime();
            }

            return false;
        }).length;
    }, [notes]);

    const totalOverdueCount = overdueTasksCount + overdueNotesCount;

    const filteredTasksVisibility = useMemo(() => {
        if (!currentUser) return [];
        return tasks.filter(t => {
            // Visibility Check
            const isOwner = t.user_id === currentUser.id;
            const isAssigned = t.assigned_users && t.assigned_users.includes(currentUser.id);
            if (t.visibility === 'PRIVATE' && !isOwner && !isAssigned) return false;

            // Search Filter
            const matchesSearch = (t.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (t.client?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [tasks, currentUser, searchTerm]);

    const allClients = useMemo(() => {
        const set = new Set(tasks.map(t => t.client).filter(Boolean));
        return Array.from(set).sort();
    }, [tasks]);



    const todayNotesCount = useMemo(() => {
        return notes.filter(n => {
            // Se não tiver data, o lembrete é considerado para "Hoje" por padrão
            if (!n.note_date) return true;
            return isToday(n.note_date);
        }).length;
    }, [notes]);
    const formattedHeaderDate = useMemo(() => {
        const d = new Date();
        const month = d.toLocaleDateString('pt-BR', { month: 'long' });
        return `${d.getDate()} de ${month.charAt(0).toUpperCase() + month.slice(1)}`;
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchGlobalClients();
            // Filtro de mapa padronizado para "Ativas" e "Todos" o restante ao iniciar
            setMapFilter({ status: 'ACTIVE', month: 'ALL', year: 'ALL', userId: 'ALL' });
        } else {
            setGlobalClients([]);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`assistec_mapfilter_${currentUser.id}`, JSON.stringify(mapFilter));
        }
    }, [mapFilter, currentUser]);
    
    // Limpeza automática do filtro de viagens ao navegar para outras abas
    useEffect(() => {
        if (viewMode !== 'travels' && travelsFilter !== '') {
            setTravelsFilter('');
        }
    }, [viewMode, travelsFilter]);



    const handleUpdateProfile = async (updates) => {
        if (!currentUser) return;
        try {
            const { data, error } = await supabase.from('users').update(updates).eq('id', currentUser.id).select().single();
            if (error) throw error;
            
            // 1. Atualizar Estado Local
            setCurrentUser(data); 
            
            // 2. Atualizar Lista de Usuários (para Equipe Online)
            setUsers(users.map(u => u.id === currentUser.id ? { ...u, ...updates } : u)); 

            // 3. ATUALIZAÇÃO CRÍTICA: Sincronizar com a Sessão Persistente (localStorage)
            try {
                const savedSession = localStorage.getItem('assistec_device_session');
                if (savedSession) {
                    const sessionData = JSON.parse(savedSession);
                    sessionData.user = data; // Atualiza com os novos dados (nome, foto, cor)
                    localStorage.setItem('assistec_device_session', JSON.stringify(sessionData));
                }
            } catch (e) {
                console.warn("Erro ao sincronizar localStorage:", e);
            }

            notifySuccess('Perfil atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            // Fallback: Apply local update even if DB fails
            setCurrentUser(prev => ({ ...prev, ...updates }));

            if (!error.message?.includes('layout_mode')) {
                notifyError('Erro ao atualizar perfil', error.message);
            }
        }
    };

    // fetchNotes, handleSaveNote e handleDeleteNote já vêm do hook useNotes (linha 106)





    const handleOpenClientReport = (reportData) => {
        setClientReportData(reportData);
        setIsClientReportOpen(true);
    };

    const handleOpenJourneyReport = async (origin, data) => {
        console.log('--- Iniciando Abertura de Relatório ---', { origin, data });
        try {
            let sac = null;
            let rnc = null;
            let sacId = null;
            let rncId = null;

            if (origin === 'SAC') {
                sac = data;
                sacId = data.id;
                rncId = data.rnc_id;
            } else if (origin === 'RI') {
                sac = { ...data, is_ri: true };
                sacId = data.id;
                rncId = null;
            } else if (origin === 'FOLLOWUP') {
                sac = {
                    ...data,
                    is_followup: true,
                    appointment_number: data.followup_number,
                    subject: data.title,
                    description: data.notes
                };
                sacId = null;
                rncId = null;
            } else if (origin === 'RETURNS') {
                sacId = data.sac_id;
                rncId = data.rnc_id;
                sac = { ...data, is_return: true };
            } else {
                rnc = data;
                rncId = data.id;
                sacId = data.sac_id;
            }

            // Buscar SAC completo se necessário
            if (!sac && sacId) {
                const { data: sacData, error: sacErr } = await supabase.from('sac_tickets').select('*').eq('id', sacId).single();
                if (sacErr) console.warn("Aviso ao buscar SAC:", sacErr);
                sac = sacData;
            }

            // Buscar RNC completa se necessário
            if (!rnc && rncId) {
                const { data: rncData, error: rncErr } = await supabase.from('rnc_records').select('*').eq('id', rncId).single();
                if (rncErr) console.warn("Aviso ao buscar RNC:", rncErr);
                rnc = rncData;
            }

            // Buscar Tarefas vinculadas (sem .order() para evitar erro 400)
            let tasksData = [];
            if (sacId || rncId) {
                const nullId = '00000000-0000-0000-0000-000000000000';
                const { data: tData, error: taskErr } = await supabase
                    .from('tasks')
                    .select('*')
                    .or(`parent_sac_id.eq.${sacId || nullId},parent_rnc_id.eq.${rncId || nullId}`);
                if (taskErr) console.warn("Aviso ao buscar tarefas:", taskErr);
                tasksData = (tData || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }

            if (!sac) {
                sac = {
                    id: null,
                    is_virtual: true,
                    appointment_number: rnc?.rnc_number || 'AVULSA',
                    client_name: rnc?.client_name || 'Cliente RNC',
                    subject: rnc?.subject || 'RNC Avulsa (Monitoramento)',
                    description: rnc?.root_cause_ishikawa || 'Atendimento iniciado diretamente via RNC.',
                    created_at: rnc?.created_at || new Date().toISOString(),
                    status: 'EM_ANALISE'
                };
            }

            setSelectedJourneyData({ sac, rnc, tasks: tasksData });
            setIsJourneyReportOpen(true);
        } catch (error) {
            console.error("Erro CRÍTICO ao carregar jornada:", error);
            notifyError('Erro ao preparar relatório', error.message);
        }
    };

    const handleOpenReport = async (task) => {
        setReportTask(task);
        // Fetch specifically the report for this task
        const { data, error } = await supabase
            .from('task_reports')
            .select('*')
            .eq('task_id', task.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error fetching report:', error);
        }
        setReportData(data || { task_id: task.id, content: '', status: 'DRAFT', media_urls: [] });
        setIsReportOpen(true);
    };

    const handleViewTechnicalReport = async (taskId) => {
        if (!taskId) {
            notifyWarning('Falha na Visualização', 'ID da tarefa não fornecido.');
            return;
        }

        try {
            // Fetch report and associated task data
            const { data: report, error } = await supabase
                .from('task_reports')
                .select('*')
                .eq('task_id', taskId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    notifyWarning('Relatório não encontrado', 'Ainda não existe um relatório técnico para esta tarefa.');
                } else {
                    console.error('Error fetching technical report:', error);
                    notifyError('Erro ao buscar relatório', error.message);
                }
                return;
            }

            const { data: task, error: taskErr } = await supabase.from('tasks').select('*').eq('id', taskId).single();
            if (taskErr || !task) {
                notifyWarning('Tarefa não encontrada', 'O registro pai desta tarefa pode ter sido removido.');
                return;
            }

            setSelectedTechReport({ ...report, tasks: task });
        } catch (err) {
            logRuntimeError({
                name: 'ViewReportError',
                message: err.message,
                stack: err.stack,
                userId: currentUser?.id,
                metadata: { taskId }
            });
            notifyError('Erro Interno', 'Falha ao processar visualização do relatório.');
        }
    };

    const handlePrintTechnicalReport = (report) => {
        if (!report) {
            notifyWarning('Falha na Impressão', 'Os dados do relatório estão corrompidos ou ausentes.');
            return;
        }

        if (!report.content && !report.raw_notes) {
            notifyWarning('Relatório Vazio', 'Não há conteúdo para imprimir neste relatório.');
            return;
        }

        const convertMarkdownToHTML = (markdown) => {
            if (!markdown) return '';
            return markdown
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                .replace(/^\- (.*$)/gim, '<li>$1</li>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
        };

        try {
            const formattedContent = convertMarkdownToHTML(report.content || report.raw_notes || '');
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                notifyWarning('Pop-up Bloqueado', 'Seu navegador bloqueou a janela de impressão. Por favor, habilite pop-ups para este site.');
                return;
            }

            printWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>${report.title || 'Relatório Técnico'}</title>
                                                    <style>
                                                        @media print {@page {margin: 2cm; } }
                                                        body {font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; color: #1e293b; }
                                                        h1 {color: #0f172a; font-size: 28px; margin-bottom: 10px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
                                                        h2 {color: #334155; font-size: 22px; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 15px; }
                                                        h3 {color: #475569; font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
                                                        .meta {background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                                                        .meta-item {font-size: 14px; }
                                                        .meta-item strong {color: #0f172a; display: block; margin-bottom: 5px; }
                                                        .content {line-height: 1.8; font-size: 15px; }
                                                        .content p {margin-bottom: 15px; }
                                                        .content strong {color: #0f172a; }
                                                        .content li {margin-bottom: 8px; margin-left: 20px; }
                                                        img {max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                                                        .media-section {margin-top: 30px; page-break-inside: avoid; }
                                                        .media-grid {display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
                                                        <div>
                                                            <img src="${logo}" alt="" style="height: 60px; width: auto;" />
                                                            <h1 style="color: #0f172a; font-size: 28px; margin: 10px 0 0 0; border: none; padding: 0;">AssisTec</h1>
                                                        </div>
                                                        <div style="text-align: right; font-size: 12px; color: #64748b;">
                                                            <p style="font-weight: bold; margin: 0; color: #0f172a;">${report.title || 'RT'}</p>
                                                            <p style="margin: 5px 0 0 0;">Emitido em: ${new Date().toLocaleDateString('pt-BR')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="meta">
                                                        <div class="meta-item"><strong>Cliente:</strong> ${report.tasks?.client || 'N/A'}</div>
                                                        <div class="meta-item"><strong>Categoria:</strong> ${report.tasks?.category || 'N/A'}</div>
                                                        <div class="meta-item"><strong>Data:</strong> ${report.updated_at ? new Date(report.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</div>
                                                        <div class="meta-item"><strong>Status:</strong> ${report.status === 'FINALIZADO' ? 'Finalizado' : 'Em Aberto'}</div>
                                                    </div>
                                                    <div class="content"><p>${formattedContent}</p></div>
                                                    ${report.media_urls && report.media_urls.length > 0 ? `
                            <div class="media-section">
                                <h2>Anexos</h2>
                                <div class="media-grid">
                                    ${report.media_urls.map(m => {
                                        if (m.type === 'image') return `<img src="${m.url}" alt="Evidência" />`;
                                        return `<div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px;"><strong>Documento:</strong> ${m.name || 'Arquivo'}</div>`;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                                                </body>
                                            </html>
                                            `);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        } catch (err) {
            notifyError('Erro na Impressão', 'Não foi possível gerar a visualização de impressão.');
        }
    };

    const handleFileViewTechnicalReport = (url, filename = 'arquivo') => {
        if (!url || !url.startsWith('data:')) {
            window.open(url, '_blank');
            return;
        }

        try {
            const parts = url.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);

            if (contentType.startsWith('image/') || contentType === 'application/pdf') {
                const newWindow = window.open();
                if (newWindow) newWindow.location.href = blobUrl;
                else {
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = filename;
                    link.click();
                }
            } else {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.click();
            }
        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            notifyError('Erro', 'Não foi possível abrir este arquivo.');
        }
    };




    const handleEditTask = (task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    // handleOpenReport, handleOpenJourneyReport e handleViewTechnicalReport já declarados acima (versões completas)

    const handleLogout = async () => {
        localStorage.removeItem('assistec_device_session');
        setCurrentUser(null);
    };

    const handleCreateTaskFromTraceability = (clientName, data) => {
        // Validação de Duplicidade
        const existingTask = tasks.find(t => 
            (data?.parent_followup_id && t.parent_followup_id === data.parent_followup_id) ||
            (data?.parent_test_id && t.parent_test_id === data.parent_test_id) ||
            (data?.parent_sac_id && t.parent_sac_id === data.parent_sac_id)
        );

        if (existingTask) {
            const confirmDup = window.confirm(
                `⚠️ ATENÇÃO: Já existe uma tarefa vinculada a este registro (#${existingTask.id}).\n\n` +
                `Deseja criar uma segunda tarefa mesmo assim?\n\n` +
                `Dica: Clique em Cancelar se desejar apenas localizar a tarefa já existente.`
            );
            if (!confirmDup) return;
        }

        setEditingTask({
            client: clientName,
            title: data?.title || clientName,
            description: data?.description || '',
            status: TaskStatus?.TO_START || 'TO_START', // Status padrão explícito
            category: Category?.DEVELOPMENT || 'DEVELOPMENT', // Categoria padrão explícita
            production_cost: data?.production_cost || 0,
            parent_test_id: data?.parent_test_id,
            parent_followup_id: data?.parent_followup_id,
            parent_sac_id: data?.parent_sac_id,
            parent_rnc_id: data?.parent_rnc_id,
            visitation: data?.visitation || { required: false, address: '', lat: null, lng: null, date: null }
        });
        setIsModalOpen(true);
    };

    const handleNewTask = (client, taskData) => {
        setEditingTask({ client, ...taskData });
        setIsModalOpen(true);
    };


    // Render Guard (System Integrity)
    if (sysIntegrity === 'RESTRICTED') {
        return (
            <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center z-[9999]">
                <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border border-rose-500/20">
                    <ShieldAlert size={48} className="animate-pulse" />
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Acesso Restrito ao Sistema</h1>
                <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed">
                    A integridade do assistec_platform_core não pôde ser validada ou a licença de operação foi revogada.
                </p>
                <p className="mt-8 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Contact System Administrator for Authorization</p>
                <div className="mt-12 text-[10px] text-slate-700 font-mono">ERR_SYS_INTEGRITY_VIOLATION_0422</div>
            </div>
        );
    }

    if (!currentUser) {
        return <LoginScreen onLogin={setCurrentUser} />;
    }





    // ... inside App component render ...
    const layoutMode = currentUser?.layout_mode || 'VERTICAL';

    return (
        <ErrorBoundary componentName="AppRoot" notifyError={notifyError} currentUser={currentUser}>
            <AppLayout
            currentUser={currentUser}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            setIsProfileOpen={setIsProfileOpen}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            allClients={allClients}
            setSelectedClient={setSelectedClient}
            formattedHeaderDate={formattedHeaderDate}
            todayTasksCount={todayTasksCount}
            todayNotesCount={todayNotesCount}
            totalOverdueCount={totalOverdueCount}
            isDailyHubOpen={isDailyHubOpen}
            setIsDailyHubOpen={setIsDailyHubOpen}
            dailyHubTab={dailyHubTab}
            setDailyHubTab={setDailyHubTab}
            dailyHubButtonRef={dailyHubButtonRef}
            tasks={tasks}
            notes={notes}
            handleSaveNote={handleSaveNote}
            handleDeleteNote={handleDeleteNote}
            setEditingTask={setEditingTask}
            setIsModalOpen={setIsModalOpen}
            fetchTaskDetail={fetchTaskDetail}
            isPoliPanelOpen={isPoliPanelOpen}
            setIsPoliPanelOpen={setIsPoliPanelOpen}
            suggestions={suggestions}
            isOnlineListOpen={isOnlineListOpen}
            setIsOnlineListOpen={setIsOnlineListOpen}
            users={users}
            handleUpdateProfile={handleUpdateProfile}
            setIsSettingsOpen={setIsSettingsOpen}
            setIsVehicleManagerOpen={setIsVehicleManagerOpen}
            handleLogout={handleLogout}
            theme={theme}
        >
            <ViewManager
                supabase={supabase}
                viewMode={viewMode}
                filteredTasksVisibility={filteredTasksVisibility}
                customCategories={customCategories}
                currentUser={currentUser}
                users={users}
                testFlows={testFlows}
                techTests={techTests}
                techFollowups={techFollowups}
                testStatusPresets={testStatusPresets}
                setIsModalOpen={setIsModalOpen}
                setEditingTask={setEditingTask}
                fetchTaskDetail={fetchTaskDetail}
                fetchTasks={fetchTasks}
                setTasks={setTasks}
                tasks={tasks}
                handleSaveTask={handleSaveTask}
                handleDeleteTask={handleDeleteTask}
                handleTaskDrop={handleTaskDrop}
                fetchTechTests={fetchTechTests}
                fetchTechFollowups={fetchTechFollowups}
                notes={notes}
                theme={theme}
                allClients={globalClients}
                mapFilter={mapFilter}
                setMapFilter={setMapFilter}
                handleOpenClientReport={handleOpenClientReport}
                analysisTier={analysisTier}
                setAnalysisTier={setAnalysisTier}
                setIsConsolidatedBIOpen={setIsConsolidatedBIOpen}
                biTimeRange={biTimeRange}
                setBiTimeRange={setBiTimeRange}
                setReturnToState={setReturnToState}
                setReturnToView={setReturnToView}
                setViewMode={setViewMode}
                setExternalTestId={setExternalTestId}
                setExternalFollowupId={setExternalFollowupId}
                handleOpenReport={handleOpenReport}
                handleViewTechnicalReport={handleViewTechnicalReport}
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
                travelsFilter={travelsFilter}
                setTravelsFilter={setTravelsFilter}
                onEditTask={handleEditTask}
                onEditTest={(test) => {
                    setExternalTestId(test.id);
                    setViewMode('controls');
                }}
                onCreateTask={handleCreateTaskFromTraceability}
                onNewTask={handleCreateTaskFromTraceability}
                onOpenJourneyReport={handleOpenJourneyReport}
                onOpenTravels={(clientFilter) => {
                    setTravelsFilter(clientFilter);
                    setViewMode('travels');
                }}
                onFetchFollowups={fetchTechFollowups}
                externalFollowupId={externalFollowupId}
                returnToView={returnToView}
                externalTestId={externalTestId}
                suggestions={suggestions}
                setSuggestions={setSuggestions}
                activePoliSection={activePoliSection}
                setActivePoliSection={setActivePoliSection}
                notifySuccess={notifySuccess}
                notifyError={notifyError}
                notifyInfo={notifyInfo}
                notifyWarning={notifyWarning}
                vehicles={vehicles}
                inventoryReasons={inventoryReasons}
            />

            {/* Modals & Overlays */}
            {!currentUser && <LoginScreen onLogin={setCurrentUser} aiConfig={aiConfig} />}

            {currentUser && (
                <>
                    <TaskModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setEditingTask(undefined);
                            if (returnToState) {
                                setAnalysisTier(returnToState.tier);
                                setSelectedClient(returnToState.client);
                                setReturnToState(null);
                            }
                        }}
                        initialData={editingTask}
                        task={editingTask}
                        onSave={(data) => handleSaveTask(data, setIsModalOpen)}
                        onDelete={handleDeleteTask}
                        currentUser={currentUser}
                        users={users}
                        allClients={allClients}
                        customCategories={customCategories}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                        notifyInfo={notifyInfo}
                    />

                    <ProfileModal
                        isOpen={isProfileOpen}
                        onClose={() => setIsProfileOpen(false)}
                        currentUser={currentUser}
                        onUpdate={handleUpdateProfile}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />

                    <SettingsModal 
                        isOpen={isSettingsOpen} 
                        onClose={() => {
                            setIsSettingsOpen(false);
                            setAutoOpenHealthCheck(false);
                        }}
                        currentUser={currentUser}
                        customCategories={customCategories}
                        onSaveCategories={handleSaveCategories}
                        aiConfig={aiConfig}
                        onSaveAiConfig={handleSaveAiConfig}
                        testFlows={testFlows}
                        onSaveTestFlows={handleSaveTestFlows}
                        testStatusPresets={testStatusPresets}
                        onSaveTestStatusPresets={handleSaveTestStatusPresets}
                        inventoryReasons={inventoryReasons}
                        onSaveInventoryReasons={handleSaveInventoryReasons}
                        autoOpenHealth={autoOpenHealthCheck}
                    />

                    <VehicleManager
                        isOpen={isVehicleManagerOpen}
                        onClose={() => setIsVehicleManagerOpen(false)}
                        currentUser={currentUser}
                        vehicles={vehicles}
                        setVehicles={setVehicles}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />

                    {isConsolidatedBIOpen && (
                        <ConsolidatedBIReport
                            clients={globalClients}
                            tasks={tasks}
                            currentUser={currentUser}
                            onClose={() => setIsConsolidatedBIOpen(false)}
                            timeRange={biTimeRange}
                        />
                    )}

                    {selectedTechReport && (
                        <TechnicalReportModal
                            report={selectedTechReport}
                            onClose={() => setSelectedTechReport(null)}
                            onFileView={handleViewTechnicalReport}
                        />
                    )}

                    {isClientReportOpen && clientReportData && (
                        <CategoryAnalysisModal
                            data={clientReportData}
                            onClose={() => setIsClientReportOpen(false)}
                        />
                    )}

                    {isReportOpen && reportTask && (
                        <ReportEditor
                            task={reportTask}
                            report={reportData}
                            onClose={() => setIsReportOpen(false)}
                            onSave={async () => {
                                setIsReportOpen(false);
                                await fetchTasks();
                            }}
                            notifySuccess={notifySuccess}
                            notifyError={notifyError}
                            notifyWarning={notifyWarning}
                            notifyInfo={notifyInfo}
                        />
                    )}

                    {/* POLI Toast Notification */}
                    {poliNotification && (
                        <div
                            className="fixed bottom-6 right-6 z-[60] bg-white border-l-4 border-purple-600 rounded-xl shadow-2xl p-4 flex items-start gap-4 animate-in slide-in-from-right-10 duration-500 cursor-pointer hover:scale-105 transition-transform max-w-sm"
                            onClick={() => { setIsPoliPanelOpen(true); setPoliNotification(null); }}
                        >
                            <div className="bg-purple-100 p-2 rounded-full text-purple-600 shrink-0">
                                <Sparkles size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Nova do Assistente</span>
                                    {poliNotification.count > 1 && (
                                        <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 rounded-full">+{poliNotification.count}</span>
                                    )}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1">{poliNotification.title}</h4>
                                <p className="text-xs text-slate-500 leading-tight">A POLI encontrou novas sugestões para otimizar seu fluxo. Toque para ver.</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setPoliNotification(null); }}
                                className="text-slate-300 hover:text-slate-500 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {isJourneyReportOpen && selectedJourneyData && (
                        <ServiceJourneyReport
                            journey={selectedJourneyData}
                            currentUser={currentUser}
                            onClose={() => setIsJourneyReportOpen(false)}
                            onSave={() => {
                                fetchTasks();
                                setAuditRefreshKey(prev => prev + 1);
                            }}
                            notifySuccess={notifySuccess}
                            notifyError={notifyError}
                            notifyWarning={notifyWarning}
                            notifyInfo={notifyInfo}
                        />
                    )}

                    {isPoliPanelOpen && (
                        <PoliPanel 
                            suggestions={suggestions}
                            setSuggestions={setSuggestions}
                            onClose={() => setIsPoliPanelOpen(false)}
                            currentUser={currentUser}
                            onAcceptAction={handlePoliAction}
                            notifySuccess={notifySuccess}
                            notifyError={notifyError}
                        />
                    )}
                </>
            )}
            <ToastContainer notifications={notifications} onRemove={removeNotification} />
        </AppLayout>
    </ErrorBoundary>
);
};

export default App;
