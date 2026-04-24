import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus, ChevronLeft, Download, Upload, MapPin, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ClientManager from './ClientManager';
import { supabase } from '../supabaseClient';
import { convertFileToBase64 } from '../utils/helpers';
import useIsMobile from '../hooks/useIsMobile';

// Modular Components
import DashboardCard from './client/DashboardCard';
import { ClientTierBadge } from './client/ClientTierBadge';
import ClientMarketIntelligence from './client/ClientMarketIntelligence';
import ClientHistorySidebar from './client/ClientHistorySidebar';
import MachineDetailModal from './client/modals/MachineDetailModal';
import TierDashboard from './client/TierDashboard';

// Tabs
import ClientRegistrationTab from './client/tabs/ClientRegistrationTab';
import ClientContactsTab from './client/tabs/ClientContactsTab';
import ClientMachinesTab from './client/tabs/ClientMachinesTab';
import ClientReportsTab from './client/tabs/ClientReportsTab';
import ClientTripsTab from './client/tabs/ClientTripsTab';
import ClientActivitiesTab from './client/tabs/ClientActivitiesTab';

// Helper para normalização robusta de nomes de clientes
const normalizeText = (text) => {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        .replace(/^\d+\s*-\s*/, '') // Remove prefixos como "5779 - "
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^\w\s]/gi, '') // Remove pontuação
        .replace(/\s+/g, ' ') // Colapsa espaços
        .trim();
};

const ClientHistoryView = ({
    tasks, onOpenClientReport, users, currentUser, onEditTask,
    onOpenReport, onViewTechnicalReport, selectedClient, setSelectedClient,
    initialState, onClearInitialState, techTests = [], techFollowups = [],
    analysisTier, setAnalysisTier, onOpenConsolidatedBI, biTimeRange, setBiTimeRange,
    notifySuccess, notifyError
}) => {
    const isMobile = useIsMobile();
    const [searchTerm, setSearchTerm] = useState('');
    const [classificationFilter, setClassificationFilter] = useState('ALL');
    const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
    const [clientsData, setClientsData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTopic, setActiveTopic] = useState(null);
    const [isExplorerActive, setIsExplorerActive] = useState(false);

    // Dashboard States
    const [clientContacts, setClientContacts] = useState([]);
    const [clientReports, setClientReports] = useState([]);
    const [clientMachines, setClientMachines] = useState([]);
    const [clientTests, setClientTests] = useState([]); // Novos testes técnicos
    const [clientFollowups, setClientFollowups] = useState([]); // Acompanhamentos
    const [allTests, setAllTests] = useState([]); // Todos os testes para vínculos de reuso
    const [allInventory, setAllInventory] = useState([]); // Todo o estoque para vínculos de reuso
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [isAddingMachine, setIsAddingMachine] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', position: '', phone: '', has_whatsapp: true });
    const [newMachine, setNewMachine] = useState({ name: '', model: '', serial_number: '', notes: '', photo: '', quantity: 1 });
    const [selectedMachineForView, setSelectedMachineForView] = useState(null);
    const [isEditingMachineDetails, setIsEditingMachineDetails] = useState(false);
    const [machineEditForm, setMachineEditForm] = useState(null);

    // Filters for tasks
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterVisitation, setFilterVisitation] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL'); // ALL, TASKS, TESTS, FOLLOWUPS

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');
            if (error) throw error;
            setClientsData(data || []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    // --- Lógica de Restauração de Estado ---
    useEffect(() => {
        if (initialState) {
            if (initialState.activeTopic) setActiveTopic(initialState.activeTopic);
            if (initialState.filterCategory) setFilterCategory(initialState.filterCategory);

            // Limpar para não re-aplicar se o usuário sair voluntariamente do tópico
            if (onClearInitialState) onClearInitialState();
        }
    }, [initialState]);

    // Fetch detail when client changes
    useEffect(() => {
        if (selectedClient) {
            const clientObj = clientsData.find(c => c.name === selectedClient);
            if (clientObj) {
                fetchClientDetails(clientObj.id, selectedClient);
            }
        } else {
            setClientContacts([]);
            setClientMachines([]);
            setActiveTopic(null);
            setIsExplorerActive(false); // Sempre volta ao dashboard se selection for limpa
        }
    }, [selectedClient, clientsData]);

    const fetchClientDetails = async (clientId, clientName = selectedClient) => {
        if (!clientName) return;
        try {
            // Fetch reports, contacts, and machines
            const clientTaskIds = tasks.filter(t => t.client === clientName).map(t => t.id);

            // Nome normalizado para busca flexível e robusta
            const normalizedClient = normalizeText(clientName);

            const [contactsRes, machinesRes, reportsRes, testsRes, followupsRes, allTestsRes, allInventoryRes] = await Promise.all([
                supabase.from('client_contacts').select('*').eq('client_id', clientId).order('name'),
                supabase.from('machines').select('*').eq('client_id', clientId).order('name'),
                clientTaskIds.length > 0
                    ? supabase.from('task_reports').select('*').in('task_id', clientTaskIds).order('updated_at', { ascending: false })
                    : Promise.resolve({ data: [] }),
                supabase.from('tech_tests')
                    .select('*')
                    .or(`client_name.eq."${clientName}",client_name.ilike."%${normalizedClient}%"`)
                    .order('created_at', { ascending: false }),
                supabase.from('tech_followups')
                    .select('*')
                    .or(`client_name.eq."${clientName}",client_name.ilike."%${normalizedClient}%"`)
                    .order('created_at', { ascending: false }),
                supabase.from('tech_tests').select('*'),
                supabase.from('ee_inventory').select('*')
            ]);

            setClientContacts(contactsRes.data || []);
            setClientMachines(machinesRes.data || []);
            setClientReports(reportsRes.data || []);

            // Refinamento no frontend para garantir match absoluto via normalização
            const testsMatched = (testsRes.data || []).filter(t => normalizeText(t.client_name) === normalizedClient);
            const followupsMatched = (followupsRes.data || []).filter(f => normalizeText(f.client_name) === normalizedClient);

            setClientTests(testsMatched);
            setClientFollowups(followupsMatched);
            setAllTests(allTestsRes.data || []);
            setAllInventory(allInventoryRes.data || []);
        } catch (err) {
            console.error('Error fetching client details:', err);
        }
    };

    const handleAddContact = async (e) => {
        e.preventDefault();
        const clientObj = clientsData.find(c => c.name === selectedClient);
        if (!clientObj || !newContact.name) return;

        try {
            const { error } = await supabase.from('client_contacts').insert([{ ...newContact, client_id: clientObj.id }]);
            if (error) throw error;
            setIsAddingContact(false);
            setNewContact({ name: '', position: '', phone: '', has_whatsapp: true });
            if (activeClientObj) fetchClientDetails(activeClientObj.id, selectedClient);
        } catch (error) { console.error('Error adding contact:', error); }
    };

    const handleMachinePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await convertFileToBase64(file);
                setNewMachine(prev => ({ ...prev, photo: base64 }));
            } catch (err) {
                console.error('Error converting machine photo:', err);
            }
        }
    };

    const handleAddMachine = async (e) => {
        e.preventDefault();
        const clientObj = clientsData.find(c => c.name === selectedClient);
        if (!clientObj || !newMachine.name) return;

        try {
            const { error } = await supabase.from('machines').insert([{ ...newMachine, client_id: clientObj.id }]);
            if (error) throw error;
            setIsAddingMachine(false);
            setNewMachine({ name: '', model: '', serial_number: '', notes: '', photo: '', quantity: 1 });
            if (activeClientObj) fetchClientDetails(activeClientObj.id, selectedClient);
        } catch (err) { console.error('Error adding machine:', err); }
    };

    const handleDeleteContact = async (id) => {
        if (!confirm('Excluir contato?')) return;
        try {
            const { error } = await supabase.from('client_contacts').delete().eq('id', id);
            if (error) throw error;
            if (activeClientObj) fetchClientDetails(activeClientObj.id, selectedClient);
        } catch (err) { console.error('Error deleting contact:', err); }
    };

    const handleEnterEditMode = () => {
        setMachineEditForm({ ...selectedMachineForView });
        setIsEditingMachineDetails(true);
    };

    const handleSaveMachineDetails = async () => {
        if (!machineEditForm || !machineEditForm.name) return;
        try {
            const { error } = await supabase
                .from('machines')
                .update({
                    name: machineEditForm.name,
                    model: machineEditForm.model,
                    serial_number: machineEditForm.serial_number,
                    notes: machineEditForm.notes,
                    quantity: machineEditForm.quantity
                })
                .eq('id', selectedMachineForView.id);

            if (error) throw error;

            // Updated local data
            setClientMachines(prev => prev.map(m => m.id === selectedMachineForView.id ? { ...machineEditForm } : m));
            setSelectedMachineForView({ ...machineEditForm });
            setIsEditingMachineDetails(false);
        } catch (err) {
            console.error('Error saving machine details:', err);
        }
    };

    const handleDeleteMachine = async (id) => {
        if (!confirm('Excluir máquina?')) return;
        try {
            const { error } = await supabase.from('machines').delete().eq('id', id);
            if (error) throw error;
            if (activeClientObj) fetchClientDetails(activeClientObj.id, selectedClient);
        } catch (err) { console.error('Error deleting machine:', err); }
    };

    // Sorting Helper for Alpha-Numeric
    const sortAlphaNum = (a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    };

    const sortedClients = useMemo(() => {
        return clientsData.map(c => c.name).sort(sortAlphaNum);
    }, [clientsData]);

    const filteredClients = sortedClients.filter(c => {
        const matchesSearch = c.toLowerCase().includes(searchTerm.toLowerCase());
        const cData = clientsData.find(cd => cd.name === c);
        const matchesClass = classificationFilter === 'ALL' || cData?.classification === classificationFilter;
        return matchesSearch && matchesClass;
    });

    const activeClientObj = useMemo(() => {
        return clientsData.find(c => c.name === selectedClient);
    }, [selectedClient, clientsData]);

    const clientTasks = useMemo(() => {
        if (!selectedClient) return [];
        const normalizedSelected = normalizeText(selectedClient);

        // 1. Preparar Tarefas do Kanban
        let kanbanList = [];
        if (filterType === 'ALL' || filterType === 'TASKS') {
            kanbanList = tasks.filter(t => normalizeText(t.client) === normalizedSelected).map(t => ({
                ...t,
                is_test: false,
                is_followup: false,
                display_type: 'TAREFA'
            }));
        }

        // 2. Preparar Testes Técnicos
        let testList = [];
        if (filterType === 'ALL' || filterType === 'TESTS') {
            testList = clientTests.map(t => ({
                ...t,
                id: `test-${t.id}`,
                real_id: t.id,
                client: t.client_name,
                createdAt: t.created_at,
                category: 'TECH_TEST',
                is_test: true,
                is_followup: false,
                display_type: t.converted_task_id ? 'TESTE CONVERTIDO' : t.status === 'REPROVADO' ? 'TESTE REPROVADO' : 'TESTE PURO'
            }));
        }

        // 3. Preparar Acompanhamentos
        let followupList = [];
        if (filterType === 'ALL' || filterType === 'FOLLOWUPS') {
            followupList = clientFollowups.map(f => ({
                ...f,
                id: `follow-${f.id}`,
                real_id: f.id,
                client: f.client_name,
                createdAt: f.created_at,
                category: 'TECH_FOLLOWUP',
                is_test: false,
                is_followup: true,
                display_type: f.converted_task_id ? 'ACOMP. CONVERTIDO' : 'ACOMPANHAMENTO',
                status: 'CONCLUÍDO'
            }));
        }

        let list = [...kanbanList, ...testList, ...followupList];

        if (filterCategory) list = list.filter(t => t.category === filterCategory);
        if (filterVisitation !== 'ALL') {
            const isRequired = filterVisitation === 'YES';
            list = list.filter(t => (t.visitation && t.visitation.required) === isRequired);
        }
        if (filterMonth) {
            list = list.filter(t => {
                const date = t.createdAt || t.created_at;
                if (!date) return false;
                const d = new Date(date);
                return (d.getMonth() + 1) === parseInt(filterMonth);
            });
        }
        if (filterYear) {
            list = list.filter(t => {
                const date = t.createdAt || t.created_at;
                if (!date) return false;
                const d = new Date(date);
                return d.getFullYear() === parseInt(filterYear);
            });
        }

        return list.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
    }, [tasks, clientTests, clientFollowups, selectedClient, filterCategory, filterVisitation, filterMonth, filterYear, filterType]);

    const clientTrips = useMemo(() => {
        if (!selectedClient) return [];
        const normalizedSelected = normalizeText(selectedClient);
        const list = [];

        tasks.forEach(task => {
            if (normalizeText(task.client) !== normalizedSelected) return;
            if (!task.visitation?.required) return;

            if (task.travels && task.travels.length > 0) {
                task.travels.forEach((t, travelIdx) => {
                    list.push({
                        ...t,
                        id: t.id || `${task.id}_${travelIdx}`,
                        taskId: task.id,
                        taskTitle: task.title,
                        taskStatus: task.status,
                        category: task.category,
                        isSpecific: true
                    });
                });
            } else {
                list.push({
                    id: task.id + '_main',
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    category: task.category,
                    date: task.due_date,
                    isDateDefined: !!task.due_date,
                    team: [],
                    vehicle_info: task.vehicle_info,
                    trip_km_end: task.trip_km_end,
                    trip_cost: task.trip_cost,
                    trip_cost_currency: task.trip_cost_currency,
                    isSpecific: false
                });
            }
        });
        return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [tasks, selectedClient]);

    const handlePrint = () => {
        if (!onOpenClientReport) return;
        onOpenClientReport({
            clientName: selectedClient,
            tasks: clientTasks,
            filters: { category: filterCategory, month: filterMonth, year: filterYear, visitation: filterVisitation }
        });
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
    const months = [
        { val: 1, label: 'Jan' }, { val: 2, label: 'Fev' }, { val: 3, label: 'Mar' },
        { val: 4, label: 'Abr' }, { val: 5, label: 'Mai' }, { val: 6, label: 'Jun' },
        { val: 7, label: 'Jul' }, { val: 8, label: 'Ago' }, { val: 9, label: 'Set' },
        { val: 10, label: 'Out' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dez' }
    ];

    const handleExcelImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
                notifyError('Erro na Importação', 'O arquivo Excel está vazio ou não pôde ser lido.');
                return;
            }

            // Improved mapping logic: find columns regardless of accents/case
            const firstRow = data[0] || {};
            const columns = Object.keys(firstRow);

            const findCol = (choices) => {
                return columns.find(col => {
                    const normalized = col.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
                    return choices.some(choice => normalized === choice.toUpperCase());
                });
            };

            const clientCol = findCol(['CLIENTE', 'NOME', 'RAZAO SOCIAL', 'NOME DO CLIENTE']);
            const tierCol = findCol(['CLASSIFICACAO', 'CATEGORIA', 'NIVEL', 'TIER']);

            if (!clientCol || !tierCol) {
                notifyError('Colunas não encontradas', `Não foi possível identificar as colunas necessárias: "Cliente" e "Classificação".`);
                return;
            }

            const updates = [];
            const now = new Date().toISOString();

            // Map of found classifications from Excel
            const excelMap = new Map();
            for (const row of data) {
                const name = String(row[clientCol] || '').trim().toLowerCase();
                const rawTier = String(row[tierCol] || '').trim().toUpperCase();

                // Strict filter: only OURO or PRATA from Excel
                if (name && (rawTier === 'OURO' || rawTier === 'PRATA')) {
                    excelMap.set(name, rawTier);
                }
            }

            // Function to normalize App names by removing ID prefixes (e.g., "1523 - ")
            const normalizeAppName = (name) => {
                return String(name || '').replace(/^\d+\s*[-]\s*/, '').trim().toLowerCase();
            };

            // Iterate over ALL registered clients to apply logic
            let ouroPrataCount = 0;
            let bronzeCount = 0;

            for (const client of clientsData) {
                const cleanAppName = normalizeAppName(client.name);
                const excelTier = excelMap.get(cleanAppName);

                if (excelTier) {
                    // Update to OURO or PRATA
                    updates.push({ id: client.id, classification: excelTier, classification_date: now });
                    ouroPrataCount++;
                } else {
                    // bronze par omissão: registered clients NOT in Excel (or not OURO/PRATA) become BRONZE
                    // Only update if not already BRONZE to avoid unnecessary DB calls
                    if (client.classification !== 'BRONZE') {
                        updates.push({ id: client.id, classification: 'BRONZE', classification_date: now });
                        bronzeCount++;
                    }
                }
            }

            if (updates.length > 0) {
                if (confirm(`Resumo da Importação:\n- Clientes OURO/PRATA: ${ouroPrataCount}\n- Clientes movidos para BRONZE: ${bronzeCount}\n\nDeseja aplicar as alterações?`)) {
                    setLoading(true);
                    try {
                        for (const up of updates) {
                            await supabase.from('clients').update({
                                classification: up.classification,
                                classification_date: up.classification_date
                            }).eq('id', up.id);
                        }
                        fetchClients();
                        notifySuccess('Sucesso!', 'Classificações sincronizadas!');
                    } catch (err) {
                        console.error('Erro na atualização:', err);
                        notifyError('Erro no Banco de Dados', 'Erro ao atualizar alguns registros.');
                    } finally {
                        setLoading(false);
                    }
                }
            } else {
                notifyInfo('Aviso', 'Nenhuma atualização relevante encontrada no arquivo.');
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
            {(isExplorerActive || selectedClient) && (
                <ClientHistorySidebar
                    isExplorerActive={isExplorerActive}
                    selectedClient={selectedClient}
                    setSelectedClient={setSelectedClient}
                    setIsExplorerActive={setIsExplorerActive}
                    setIsClientManagerOpen={setIsClientManagerOpen}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    classificationFilter={classificationFilter}
                    setClassificationFilter={setClassificationFilter}
                    filteredClients={filteredClients}
                    clientsData={clientsData}
                    setActiveTopic={setActiveTopic}
                />
            )}

            <div id="client-print-area" className="flex-1 flex flex-col min-w-0 bg-white shadow-2xl relative z-10">
                {!selectedClient ? (
                    analysisTier && analysisTier !== 'ALL' ? (
                        <TierDashboard
                            tier={analysisTier}
                            clients={clientsData}
                            tasks={tasks}
                            timeRange={biTimeRange}
                            onClose={() => setAnalysisTier('ALL')}
                            onSelectClient={(name) => {
                                setSelectedClient(name);
                                setAnalysisTier('ALL');
                            }}
                        />
                    ) : (
                        <ClientMarketIntelligence
                            clientsData={clientsData}
                            biTimeRange={biTimeRange}
                            setBiTimeRange={setBiTimeRange}
                            onOpenConsolidatedBI={onOpenConsolidatedBI}
                            setAnalysisTier={setAnalysisTier}
                            setIsExplorerActive={setIsExplorerActive}
                            setIsClientManagerOpen={setIsClientManagerOpen}
                        />
                    )
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header Area */}
                        <div className={`${isMobile ? 'p-3' : 'p-6'} bg-white border-b border-slate-200 shadow-sm shrink-0`}>
                            <div className="flex justify-between items-start gap-2 md:gap-4">
                                <div className="flex-1 min-w-0">
                                    <button onClick={() => setSelectedClient(null)} className="md:hidden flex items-center gap-1 text-brand-600 font-bold mb-1.5 text-xs">
                                        <ChevronLeft size={16} /> Voltar
                                    </button>
                                    <div className="flex flex-col gap-0.5">
                                        <h1 className={`${isMobile ? 'text-base' : 'text-3xl'} font-black text-slate-800 uppercase tracking-tight leading-tight break-words`}>{selectedClient}</h1>
                                        <div className={`-mt-1 ${isMobile ? 'scale-[0.75]' : 'scale-[0.85]'} origin-left`}>
                                            <ClientTierBadge client={activeClientObj} />
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-4 ${isMobile ? 'mt-0.5' : 'mt-1'} text-slate-500 ${isMobile ? 'text-[9px]' : 'text-xs'} font-medium`}>
                                        <span className="flex items-center gap-1"><MapPin size={isMobile ? 8 : 10} /> {activeClientObj?.city || 'Cidade não inf.'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-row gap-1.5 md:gap-2 shrink-0 self-start mt-1">
                                    <button
                                        onClick={() => document.getElementById('excel-import').click()}
                                        className="flex items-center justify-center p-2 md:px-3 md:py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200"
                                        title="Importar Excel"
                                    >
                                        <Upload size={isMobile ? 14 : 14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">EXCEL</span>
                                    </button>
                                    <input
                                        id="excel-import"
                                        type="file"
                                        accept=".xlsx, .xls"
                                        className="hidden"
                                        onChange={handleExcelImport}
                                    />
                                    <button onClick={handlePrint} className="flex items-center justify-center p-2 md:px-3 md:py-2 bg-slate-800 text-white rounded-xl text-[10px] md:text-sm font-bold hover:bg-slate-700 transition-all shadow-md">
                                        <Printer size={isMobile ? 14 : 16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">IMPRIMIR</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Interaction Area */}
                        <div className={`flex-1 overflow-y-auto custom-scrollbar ${isMobile ? 'p-3' : 'p-6'}`}>
                            {!activeTopic ? (
                                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isMobile ? 'gap-3' : 'gap-6'} animate-in fade-in duration-300`}>
                                    <DashboardCard title="Cadastro" icon={Plus} isCompact onClick={() => setActiveTopic('CADASTRO')} />
                                    <DashboardCard title="Contatos / WhatsApp" icon={Plus} isCompact onClick={() => setActiveTopic('CONTATOS')} />
                                    <DashboardCard title="Máquinas" icon={Plus} isCompact onClick={() => setActiveTopic('MAQUINAS')} />
                                    <DashboardCard title="Histórico de Atividades" icon={Plus} isCompact onClick={() => { setActiveTopic('ATIVIDADES'); setFilterCategory(''); setFilterType('ALL'); }} />
                                    <DashboardCard title="Viagens / Deslocamentos" icon={Plus} isCompact onClick={() => setActiveTopic('VIAGENS')} />
                                    <DashboardCard title="Relatórios" icon={Plus} isCompact onClick={() => setActiveTopic('RELATORIOS')} />
                                </div>
                            ) : (
                                <div className="animate-in slide-in-from-right-4 duration-300">
                                    <button
                                        onClick={() => setActiveTopic(null)}
                                        className={`${isMobile ? 'mb-4' : 'mb-6'} flex items-center gap-2 text-slate-400 hover:text-brand-600 font-bold uppercase text-[10px] md:text-xs transition-colors`}
                                    >
                                        <ChevronLeft size={isMobile ? 14 : 16} /> Voltar ao Painel
                                    </button>

                                    {activeTopic === 'CADASTRO' && <ClientRegistrationTab activeClientObj={activeClientObj} setIsClientManagerOpen={setIsClientManagerOpen} />}
                                    {activeTopic === 'CONTATOS' && (
                                        <ClientContactsTab
                                            clientContacts={clientContacts}
                                            isAddingContact={isAddingContact}
                                            setIsAddingContact={setIsAddingContact}
                                            newContact={newContact}
                                            setNewContact={setNewContact}
                                            handleAddContact={handleAddContact}
                                            handleDeleteContact={handleDeleteContact}
                                        />
                                    )}
                                    {activeTopic === 'MAQUINAS' && (
                                        <ClientMachinesTab
                                            clientMachines={clientMachines}
                                            isAddingMachine={isAddingMachine}
                                            setIsAddingMachine={setIsAddingMachine}
                                            newMachine={newMachine}
                                            setNewMachine={setNewMachine}
                                            handleAddMachine={handleAddMachine}
                                            handleMachinePhotoChange={handleMachinePhotoChange}
                                            handleDeleteMachine={handleDeleteMachine}
                                            setSelectedMachineForView={setSelectedMachineForView}
                                        />
                                    )}
                                    {activeTopic === 'RELATORIOS' && <ClientReportsTab clientReports={clientReports} tasks={tasks} onViewTechnicalReport={onViewTechnicalReport} />}
                                    {activeTopic === 'VIAGENS' && <ClientTripsTab clientTrips={clientTrips} tasks={tasks} onEditTask={onEditTask} />}
                                    {activeTopic === 'ATIVIDADES' && (
                                        <ClientActivitiesTab
                                            clientTasks={clientTasks}
                                            filterMonth={filterMonth}
                                            setFilterMonth={setFilterMonth}
                                            filterYear={filterYear}
                                            setFilterYear={setFilterYear}
                                            filterType={filterType}
                                            setFilterType={setFilterType}
                                            filterCategory={filterCategory}
                                            setFilterCategory={setFilterCategory}
                                            months={months}
                                            years={years}
                                            onEditTask={onEditTask}
                                            activeTopic={activeTopic}
                                            techTests={techTests}
                                            allTests={allTests}
                                            techFollowups={techFollowups}
                                            clientFollowups={clientFollowups}
                                            allInventory={allInventory}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @media print {
                    #client-print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; background: white; z-index: 50; }
                    body * { visibility: hidden; }
                    #client-print-area, #client-print-area * { visibility: visible; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>

            <MachineDetailModal
                selectedMachineForView={selectedMachineForView}
                setSelectedMachineForView={setSelectedMachineForView}
                isEditingMachineDetails={isEditingMachineDetails}
                setIsEditingMachineDetails={setIsEditingMachineDetails}
                machineEditForm={machineEditForm}
                setMachineEditForm={setMachineEditForm}
                handleEnterEditMode={handleEnterEditMode}
                handleSaveMachineDetails={handleSaveMachineDetails}
            />

            {isClientManagerOpen && (
                <ClientManager
                    isOpen={isClientManagerOpen}
                    onClose={() => { fetchClients(); setIsClientManagerOpen(false); }}
                    clients={clientsData}
                    currentUser={currentUser}
                    initialData={activeClientObj}
                    notifySuccess={notifySuccess}
                    notifyError={notifyError}
                />
            )}
        </div>
    );
};

export default ClientHistoryView;
