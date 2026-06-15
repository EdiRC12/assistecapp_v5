import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus, ChevronLeft, Download, Upload, MapPin, Printer,
    Briefcase, ShieldAlert, MessageSquare, ListChecks, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ClientManager from './ClientManager';
import { supabase } from '../supabaseClient';
import { convertFileToBase64, compressImageToBase64, compressBase64Image } from '../utils/helpers';
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
import ClientProductsTab from './client/tabs/ClientProductsTab';
import ClientVisitsMetaTab from './client/tabs/ClientVisitsMetaTab';

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
    const [clientRncs, setClientRncs] = useState([]); // Relatórios de Não Conformidade
    const [clientSacs, setClientSacs] = useState([]); // Canal de Suporte SAC
    const [loadingMachines, setLoadingMachines] = useState(false);

    const [clientProducts, setClientProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');

    const [isAddingContact, setIsAddingContact] = useState(false);
    const [isAddingMachine, setIsAddingMachine] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', position: '', phone: '', has_whatsapp: true });
    const [newMachine, setNewMachine] = useState({ name: '', model: '', serial_number: '', notes: '', photo: '', photos: [], quantity: 1 });
    const [selectedMachineForView, setSelectedMachineForView] = useState(null);
    const [isEditingMachineDetails, setIsEditingMachineDetails] = useState(false);
    const [machineEditForm, setMachineEditForm] = useState(null);

    // Global filters for client details
    const [globalFilterMonth, setGlobalFilterMonth] = useState('ALL');
    const [globalFilterYear, setGlobalFilterYear] = useState('ALL');

    // Sincroniza os filtros globais com os locais para propagação em cascata automática
    useEffect(() => {
        setFilterMonth(globalFilterMonth === 'ALL' ? '' : globalFilterMonth);
        setFilterYear(globalFilterYear === 'ALL' ? '' : globalFilterYear);
    }, [globalFilterMonth, globalFilterYear]);

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

    const activeClientObj = useMemo(() => {
        return clientsData.find(c => c.name === selectedClient);
    }, [selectedClient, clientsData]);

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
            setClientProducts([]);
            setActiveTopic(null);
            setIsExplorerActive(false); // Sempre volta ao dashboard se selection for limpa
        }
    }, [selectedClient, clientsData]);

    // Lazy Loading para Máquinas: Só carrega quando o tópico MAQUINAS é ativado
    useEffect(() => {
        if (activeTopic === 'MAQUINAS' && selectedClient && activeClientObj) {
            fetchClientMachines(activeClientObj.id);
        }
    }, [activeTopic, selectedClient, activeClientObj]);

    // Lazy Loading para Produtos: Só carrega quando o tópico PRODUTOS é ativado
    useEffect(() => {
        if (activeTopic === 'PRODUTOS' && selectedClient) {
            fetchClientProducts(selectedClient);
        }
    }, [activeTopic, selectedClient]);

    const fetchClientDetails = async (clientId, clientName = selectedClient) => {
        if (!clientName) return;
        try {
            // Fetch reports, contacts, and machines
            const clientTaskIds = tasks.filter(t => t.client === clientName).map(t => t.id);

            // Nome normalizado para busca flexível e robusta
            const normalizedClient = normalizeText(clientName);

            const [contactsRes, reportsRes, testsRes, followupsRes, rncsRes, sacsRes] = await Promise.all([
                supabase.from('client_contacts').select('*').eq('client_id', clientId).order('name'),
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
                supabase.from('rnc_records')
                    .select('id, client_name')
                    .or(`client_name.eq."${clientName}",client_name.ilike."%${normalizedClient}%"`),
                supabase.from('sac_tickets')
                    .select('id, client_name')
                    .or(`client_name.eq."${clientName}",client_name.ilike."%${normalizedClient}%"`)
            ]);

            setClientContacts(contactsRes.data || []);
            // setClientMachines(machinesRes.data || []); // REMOVIDO PARA LAZY LOADING
            setClientReports(reportsRes.data || []);

            // Refinamento no frontend para garantir match absoluto via normalização
            const testsMatched = (testsRes.data || []).filter(t => normalizeText(t.client_name) === normalizedClient);
            const followupsMatched = (followupsRes.data || []).filter(f => normalizeText(f.client_name) === normalizedClient);
            const rncsMatched = (rncsRes.data || []).filter(r => normalizeText(r.client_name) === normalizedClient);
            const sacsMatched = (sacsRes.data || []).filter(s => normalizeText(s.client_name) === normalizedClient);

            setClientTests(testsMatched);
            setClientFollowups(followupsMatched);
            setClientRncs(rncsMatched);
            setClientSacs(sacsMatched);
        } catch (err) {
            console.error('Error fetching client details:', err);
        }
    };

    const fetchClientMachines = async (clientId) => {
        if (!clientId) return;
        setLoadingMachines(true);
        try {
            const { data, error } = await supabase
                .from('machines')
                .select('*')
                .eq('client_id', clientId)
                .order('name');

            if (error) throw error;
            setClientMachines(data || []);
        } catch (err) {
            console.error('Error fetching machines:', err);
            if (notifyError) notifyError('Erro ao carregar máquinas', err.message);
        } finally {
            setLoadingMachines(false);
        }
    };

    const fetchClientProducts = async (clientName) => {
        if (!clientName) return;
        setLoadingProducts(true);
        try {
            const { data, error } = await supabase
                .from('client_products')
                .select('*')
                .eq('client_name', clientName)
                .order('product_name');

            if (error) throw error;
            setClientProducts(data || []);
        } catch (err) {
            console.error('Error fetching client products:', err);
            if (notifyError) notifyError('Erro ao carregar itens', err.message);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleAddProduct = async (e) => {
        if (e) e.preventDefault();
        if (!newProductName.trim() || !selectedClient) return;

        try {
            const { error } = await supabase
                .from('client_products')
                .upsert([{ client_name: selectedClient, product_name: newProductName.trim().toUpperCase() }], { onConflict: 'client_name,product_name' });

            if (error) throw error;
            if (notifySuccess) notifySuccess('Sucesso', 'Item cadastrado com sucesso.');
            setNewProductName('');
            setIsAddingProduct(false);
            fetchClientProducts(selectedClient);
        } catch (err) {
            console.error('Error adding client product:', err);
            if (notifyError) notifyError('Erro ao cadastrar item', err.message);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Excluir este item do catálogo deste cliente?')) return;
        try {
            const { error } = await supabase
                .from('client_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            if (notifySuccess) notifySuccess('Excluído!', 'Item removido do cliente com sucesso.');
            fetchClientProducts(selectedClient);
        } catch (err) {
            console.error('Error deleting client product:', err);
            if (notifyError) notifyError('Erro ao excluir item', err.message);
        }
    };

    const handleUpdateNotes = async (updatedNotes) => {
        if (!activeClientObj) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('clients')
                .update({ operational_notes: updatedNotes })
                .eq('id', activeClientObj.id);

            if (error) throw error;

            // Atualiza o estado local clientsData para sincronização em tempo real na tela
            setClientsData(prev => prev.map(c => c.id === activeClientObj.id ? { ...c, operational_notes: updatedNotes } : c));
            if (notifySuccess) notifySuccess('Sucesso!', 'Notas operacionais atualizadas com sucesso.');
        } catch (err) {
            console.error('Erro ao salvar notas operacionais:', err);
            if (notifyError) notifyError('Erro ao salvar notas', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = (text) => {
        if (!text.trim() || !activeClientObj) return;
        const newNote = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            text: text.trim(),
            created_at: new Date().toISOString()
        };
        const updatedNotes = [newNote, ...(activeClientObj.operational_notes || [])];
        handleUpdateNotes(updatedNotes);
    };

    const handleDeleteNote = (noteId) => {
        if (!window.confirm('Deseja excluir esta nota operacional?')) return;
        if (!activeClientObj) return;
        const updatedNotes = (activeClientObj.operational_notes || []).filter(n => n.id !== noteId);
        handleUpdateNotes(updatedNotes);
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
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const currentPhotos = newMachine.photos || (newMachine.photo ? [newMachine.photo] : []);
        if (currentPhotos.length >= 6) {
            if (notifyWarning) notifyWarning('Limite Atingido', 'Você pode adicionar no máximo 6 fotos.');
            return;
        }

        const remainingSlots = 6 - currentPhotos.length;
        const filesToProcess = files.slice(0, remainingSlots);

        try {
            const base64Array = await Promise.all(filesToProcess.map(file => compressImageToBase64(file)));
            const updatedPhotos = [...currentPhotos, ...base64Array];

            setNewMachine(prev => ({
                ...prev,
                photos: updatedPhotos,
                photo: updatedPhotos[0] // Mantém compatibilidade
            }));

            if (files.length > remainingSlots && notifyInfo) {
                notifyInfo('Aviso', 'Apenas as primeiras 6 fotos foram adicionadas.');
            }
        } catch (err) {
            console.error('Error converting machine photos:', err);
            if (notifyError) notifyError('Erro na foto', 'Não foi possível processar as imagens.');
        }
    };

    const handleAddMachine = async (e) => {
        e.preventDefault();
        const clientObj = clientsData.find(c => c.name === selectedClient);
        if (!clientObj || !newMachine.name) return;

        try {
            const rawPhotos = newMachine.photos?.length > 0 ? newMachine.photos : (newMachine.photo ? [newMachine.photo] : []);
            const compressedPhotos = await Promise.all(rawPhotos.map(photo => compressBase64Image(photo)));

            const machineData = {
                ...newMachine,
                client_id: clientObj.id,
                photos: compressedPhotos
            };

            let { error } = await supabase.from('machines').insert([machineData]);

            // Fallback Resiliente: Se a coluna 'photos' não existir, salva como JSON na coluna 'photo'
            if (error && (error.code === '42703' || error.message.includes('photos'))) {
                console.warn('[handleAddMachine] Coluna photos não encontrada. Usando fallback JSON na coluna photo.');
                const fallbackData = { ...machineData };
                delete fallbackData.photos;
                fallbackData.photo = JSON.stringify(machineData.photos);
                const { error: fallbackError } = await supabase.from('machines').insert([fallbackData]);
                if (fallbackError) throw fallbackError;
            } else if (error) {
                throw error;
            }

            setIsAddingMachine(false);
            setNewMachine({ name: '', model: '', serial_number: '', notes: '', photo: '', photos: [], quantity: 1 });
            fetchClientMachines(clientObj.id);
            if (notifySuccess) notifySuccess('Sucesso!', 'Máquina cadastrada com sucesso!');
        } catch (err) {
            console.error('Error adding machine:', err);
            if (notifyError) notifyError('Erro ao cadastrar', err.message);
        }
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
            const compressedPhotos = await Promise.all(
                (machineEditForm.photos || []).map(photo => compressBase64Image(photo))
            );

            const updatePayload = {
                name: machineEditForm.name,
                model: machineEditForm.model,
                serial_number: machineEditForm.serial_number,
                notes: machineEditForm.notes,
                quantity: machineEditForm.quantity,
                photo: compressedPhotos[0] || '',
                photos: compressedPhotos
            };

        let { error: updateError } = await supabase
            .from('machines')
            .update(updatePayload)
            .eq('id', selectedMachineForView.id);

        // Fallback Resiliente para Update
        if (updateError && (updateError.code === '42703' || updateError.message.includes('photos'))) {
            console.warn('[handleSaveMachineDetails] Coluna photos não encontrada no update. Usando fallback JSON.');
            const fallbackPayload = { ...updatePayload };
            delete fallbackPayload.photos;
            fallbackPayload.photo = JSON.stringify(updatePayload.photos);
            const { error: fallbackError } = await supabase
                .from('machines')
                .update(fallbackPayload)
                .eq('id', selectedMachineForView.id);
            if (fallbackError) throw fallbackError;
        } else if (updateError) {
            throw updateError;
        }

        // Updated local data
        setClientMachines(prev => prev.map(m => m.id === selectedMachineForView.id ? { ...machineEditForm, ...updatePayload } : m));
        setSelectedMachineForView({ ...machineEditForm, ...updatePayload });
        setIsEditingMachineDetails(false);
        if (notifySuccess) notifySuccess('Atualizado', 'Dados da máquina salvos com sucesso.');
    } catch (err) {
        console.error('Error saving machine details:', err);
        if (notifyError) notifyError('Erro ao salvar', err.message);
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
        // Garantir que a lista seja única mesmo se houver duplicatas no banco
        const uniqueNames = Array.from(new Set(clientsData.map(c => c.name)));
        return uniqueNames.sort(sortAlphaNum);
    }, [clientsData]);

const filteredClients = sortedClients.filter(c => {
    const matchesSearch = c.toLowerCase().includes(searchTerm.toLowerCase());
    const cData = clientsData.find(cd => cd.name === c);
    const matchesClass = classificationFilter === 'ALL' || cData?.classification === classificationFilter;
    return matchesSearch && matchesClass;
});

// ==========================================
// FILTROS E MÉTRICAS DO DASHBOARD DO CLIENTE
// ==========================================

const filteredTasksCount = useMemo(() => {
    if (!selectedClient) return 0;
    const normalizedSelected = normalizeText(selectedClient);
    let list = tasks.filter(t => normalizeText(t.client) === normalizedSelected);
    if (globalFilterMonth !== 'ALL') {
        list = list.filter(t => {
            const date = t.createdAt || t.created_at || t.due_date;
            return date && (new Date(date).getMonth() + 1) === parseInt(globalFilterMonth);
        });
    }
    if (globalFilterYear !== 'ALL') {
        list = list.filter(t => {
            const date = t.createdAt || t.created_at || t.due_date;
            return date && new Date(date).getFullYear() === parseInt(globalFilterYear);
        });
    }
    return list.length;
}, [tasks, selectedClient, globalFilterMonth, globalFilterYear]);

const filteredRncsCount = useMemo(() => {
    let list = [...clientRncs];
    if (globalFilterMonth !== 'ALL') {
        list = list.filter(r => {
            const date = r.report_date || r.created_at;
            return date && (new Date(date).getMonth() + 1) === parseInt(globalFilterMonth);
        });
    }
    if (globalFilterYear !== 'ALL') {
        list = list.filter(r => {
            const date = r.report_date || r.created_at;
            return date && new Date(date).getFullYear() === parseInt(globalFilterYear);
        });
    }
    return list.length;
}, [clientRncs, globalFilterMonth, globalFilterYear]);

const filteredSacsCount = useMemo(() => {
    let list = [...clientSacs];
    if (globalFilterMonth !== 'ALL') {
        list = list.filter(s => {
            const date = s.report_date || s.created_at;
            return date && (new Date(date).getMonth() + 1) === parseInt(globalFilterMonth);
        });
    }
    if (globalFilterYear !== 'ALL') {
        list = list.filter(s => {
            const date = s.report_date || s.created_at;
            return date && new Date(date).getFullYear() === parseInt(globalFilterYear);
        });
    }
    return list.length;
}, [clientSacs, globalFilterMonth, globalFilterYear]);

const filteredTestsCount = useMemo(() => {
    let list = [...clientTests];
    if (globalFilterMonth !== 'ALL') {
        list = list.filter(t => {
            const date = t.created_at;
            return date && (new Date(date).getMonth() + 1) === parseInt(globalFilterMonth);
        });
    }
    if (globalFilterYear !== 'ALL') {
        list = list.filter(t => {
            const date = t.created_at;
            return date && new Date(date).getFullYear() === parseInt(globalFilterYear);
        });
    }
    return list.length;
}, [clientTests, globalFilterMonth, globalFilterYear]);

const visitsMetrics = useMemo(() => {
    if (!selectedClient) return { planned: 0, completed: 0 };
    const normalizedSelected = normalizeText(selectedClient);
    let list = tasks.filter(t => normalizeText(t.client) === normalizedSelected && t.visitation?.required);
    if (globalFilterMonth !== 'ALL') {
        list = list.filter(t => {
            const date = t.createdAt || t.created_at || t.due_date;
            return date && (new Date(date).getMonth() + 1) === parseInt(globalFilterMonth);
        });
    }
    if (globalFilterYear !== 'ALL') {
        list = list.filter(t => {
            const date = t.createdAt || t.created_at || t.due_date;
            return date && new Date(date).getFullYear() === parseInt(globalFilterYear);
        });
    }
    const planned = list.length;
    const completed = list.filter(t => t.status === 'CONCLUÍDO').length;
    return { planned, completed };
}, [tasks, selectedClient, globalFilterMonth, globalFilterYear]);

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

        // Filtro de mês e ano para as viagens
        if (filterMonth) {
            const date = task.due_date || task.createdAt || task.created_at;
            if (!date || (new Date(date).getMonth() + 1) !== parseInt(filterMonth)) return;
        }
        if (filterYear) {
            const date = task.due_date || task.createdAt || task.created_at;
            if (!date || new Date(date).getFullYear() !== parseInt(filterYear)) return;
        }

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
}, [tasks, selectedClient, filterMonth, filterYear]);

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

const handleUpdateClientTier = async (newTier) => {
    if (!activeClientObj) return;
    setLoading(true);
    try {
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('clients')
            .update({
                classification: newTier,
                classification_date: now
            })
            .eq('id', activeClientObj.id);

        if (error) throw error;

        // Atualiza o estado local clientsData para sincronização em tempo real na tela
        setClientsData(prev => prev.map(c => c.id === activeClientObj.id ? { ...c, classification: newTier, classification_date: now } : c));
        if (notifySuccess) notifySuccess('Sucesso!', `Classificação atualizada para ${newTier}.`);
    } catch (err) {
        console.error('Erro ao atualizar classificação:', err);
        if (notifyError) notifyError('Erro ao atualizar', err.message);
    } finally {
        setLoading(false);
    }
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
                        onExcelImport={handleExcelImport}
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
                                        <ClientTierBadge client={activeClientObj} onChangeTier={handleUpdateClientTier} />
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
                        {/* Barra de Filtro de Período Global Unificado */}
                        <div className="mb-6 bg-white border border-slate-200 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                            <div>
                                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest block">Período de Análise</span>
                                <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Filtragem global de atividades, viagens e indicadores</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex-1 sm:flex-initial">
                                    <select
                                        value={globalFilterMonth}
                                        onChange={(e) => setGlobalFilterMonth(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer w-full"
                                    >
                                        <option value="ALL">TODOS OS MESES</option>
                                        {months.map((m, i) => (
                                            <option key={i} value={m.val}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex-1 sm:flex-initial">
                                    <select
                                        value={globalFilterYear}
                                        onChange={(e) => setGlobalFilterYear(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer w-full"
                                    >
                                        <option value="ALL">TODOS OS ANOS</option>
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {!activeTopic ? (
                            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                                {/* Dashboard de Estatísticas Dinâmicas */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {/* OS / Tarefas */}
                                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 border border-indigo-100/80 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow transition-all group">
                                        <div>
                                            <span className="text-[10px] font-black text-indigo-500/80 uppercase tracking-widest">OS / Tarefas</span>
                                            <h4 className="text-2xl font-black text-indigo-900 mt-1">{filteredTasksCount}</h4>
                                        </div>
                                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Briefcase size={20} />
                                        </div>
                                    </div>

                                    {/* Ocorrências RNC */}
                                    <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 border border-rose-100/80 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow transition-all group">
                                        <div>
                                            <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest">Ocorrências RNC</span>
                                            <h4 className="text-2xl font-black text-rose-900 mt-1">{filteredRncsCount}</h4>
                                        </div>
                                        <div className="w-10 h-10 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ShieldAlert size={20} />
                                        </div>
                                    </div>

                                    {/* Suporte SAC */}
                                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 border border-amber-100/80 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow transition-all group">
                                        <div>
                                            <span className="text-[10px] font-black text-amber-600/80 uppercase tracking-widest">Atendimentos SAC</span>
                                            <h4 className="text-2xl font-black text-amber-900 mt-1">{filteredSacsCount}</h4>
                                        </div>
                                        <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <MessageSquare size={20} />
                                        </div>
                                    </div>

                                    {/* Visitas de Campo */}
                                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 border border-emerald-100/80 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow transition-all group">
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest">Visitas de Campo</span>
                                            <h4 className="text-2xl font-black text-emerald-900 mt-1">
                                                {visitsMetrics.completed} <span className="text-sm font-bold text-emerald-500/80">/ {visitsMetrics.planned}</span>
                                            </h4>
                                        </div>
                                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <MapPin size={20} />
                                        </div>
                                    </div>

                                    {/* Testes Técnicos */}
                                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/30 border border-cyan-100/80 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow transition-all group col-span-2 md:col-span-1">
                                        <div>
                                            <span className="text-[10px] font-black text-cyan-600/80 uppercase tracking-widest">Testes Técnicos</span>
                                            <h4 className="text-2xl font-black text-cyan-900 mt-1">{filteredTestsCount}</h4>
                                        </div>
                                        <div className="w-10 h-10 bg-cyan-500/10 text-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ListChecks size={20} />
                                        </div>
                                    </div>
                                </div>

                                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isMobile ? 'gap-3' : 'gap-6'}`}>
                                    <DashboardCard title="Cadastro" icon={Plus} isCompact onClick={() => setActiveTopic('CADASTRO')} />
                                    <DashboardCard title="Contatos / WhatsApp" icon={Plus} isCompact onClick={() => setActiveTopic('CONTATOS')} />
                                    <DashboardCard title="Máquinas" icon={Plus} isCompact onClick={() => setActiveTopic('MAQUINAS')} />
                                    <DashboardCard title="Histórico de Atividades" icon={Plus} isCompact onClick={() => { setActiveTopic('ATIVIDADES'); setFilterCategory(''); setFilterType('ALL'); }} />
                                    <DashboardCard title="Viagens / Deslocamentos" icon={Plus} isCompact onClick={() => setActiveTopic('VIAGENS')} />
                                    <DashboardCard title="Relatórios" icon={Plus} isCompact onClick={() => setActiveTopic('RELATORIOS')} />
                                    <DashboardCard title="Itens do Cliente" icon={Plus} isCompact onClick={() => setActiveTopic('PRODUTOS')} />
                                    <DashboardCard title="Notas & Restrições" icon={Plus} isCompact onClick={() => setActiveTopic('NOTAS')} />
                                    <DashboardCard title="Metas de Visitas" icon={Plus} isCompact onClick={() => setActiveTopic('METAS')} />
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-right-4 duration-300">
                                <button
                                    onClick={() => setActiveTopic(null)}
                                    className={`${isMobile ? 'mb-4' : 'mb-6'} flex items-center gap-2 text-slate-400 hover:text-brand-600 font-bold uppercase text-[10px] md:text-xs transition-colors`}
                                >
                                    <ChevronLeft size={isMobile ? 14 : 16} /> Voltar ao Painel
                                </button>

                                {activeTopic === 'CADASTRO' && <ClientRegistrationTab activeClientObj={activeClientObj} setIsClientManagerOpen={setIsClientManagerOpen} currentUser={currentUser} supabase={supabase} notifySuccess={notifySuccess} notifyError={notifyError} setSelectedClient={setSelectedClient} />}
                                {activeTopic === 'METAS' && <ClientVisitsMetaTab activeClientObj={activeClientObj} currentUser={currentUser} supabase={supabase} notifySuccess={notifySuccess} notifyError={notifyError} fetchClients={fetchClients} />}
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
                                        loadingMachines={loadingMachines}
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
                                {activeTopic === 'PRODUTOS' && (
                                    <ClientProductsTab
                                        clientProducts={clientProducts}
                                        loadingProducts={loadingProducts}
                                        isAddingProduct={isAddingProduct}
                                        setIsAddingProduct={setIsAddingProduct}
                                        newProductName={newProductName}
                                        setNewProductName={setNewProductName}
                                        handleAddProduct={handleAddProduct}
                                        handleDeleteProduct={handleDeleteProduct}
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
                                        techFollowups={techFollowups}
                                        clientFollowups={clientFollowups}
                                    />
                                )}
                                {activeTopic === 'NOTAS' && (
                                    <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                                    <ListChecks className="text-brand-600" size={24} /> Notas & Restrições Operacionais
                                                </h2>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                    Restrições de recebimento, recados logísticos e observações diárias
                                                </p>
                                            </div>
                                        </div>

                                        {/* Formulário Premium para Inserção de Notas */}
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            const input = e.target.elements.noteText;
                                            const val = input.value.trim();
                                            if (!val) return;
                                            handleAddNote(val);
                                            input.value = '';
                                        }} className="flex gap-3 mb-6">
                                            <input
                                                type="text"
                                                name="noteText"
                                                placeholder="Digite uma observação, exemplo: 'Recebimento de mercadoria somente terças até as 14 horas'..."
                                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                                            />
                                            <button
                                                type="submit"
                                                className="px-6 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow active:scale-95 shrink-0"
                                            >
                                                Adicionar
                                            </button>
                                        </form>

                                        {/* Lista de Notas */}
                                        <div className="space-y-4">
                                            {!(activeClientObj?.operational_notes && activeClientObj.operational_notes.length > 0) ? (
                                                <div className="border border-slate-200 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                        <ListChecks size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-slate-600 font-black text-sm">Nenhuma nota cadastrada</h4>
                                                        <p className="text-slate-400 text-xs mt-0.5">Adicione observações diárias ou restrições operacionais no formulário acima.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {activeClientObj.operational_notes.map((note) => (
                                                        <div
                                                            key={note.id}
                                                            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-start hover:border-slate-200 transition-all group"
                                                        >
                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">{note.text}</p>
                                                                <span className="text-[10px] font-bold text-slate-400 block mt-2">
                                                                    Cadastrado em: {new Date(note.created_at).toLocaleDateString('pt-BR')} às {new Date(note.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteNote(note.id)}
                                                                className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all shrink-0"
                                                                title="Excluir nota"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
