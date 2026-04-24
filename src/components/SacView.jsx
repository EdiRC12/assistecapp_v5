import React, { useState, useEffect, useMemo } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { generateUUID } from '../utils/helpers';
import { supabase } from '../supabaseClient';
import {
    MessageSquare, Plus, Search, Clock, CheckCircle2,
    AlertCircle, X, User, Phone, Mail,
    Tag, Trash2, Edit2,
    ArrowUpRight, MessageCircle, AlertTriangle, History,
    FileText, Hash, Package, DollarSign, Layers, Paperclip,
    MapPin, Building2, UserPlus, Info,
    Briefcase, Save, Calendar, ShieldAlert, Check,
    ListChecks, Target, CheckSquare, Users,
    ExternalLink, RefreshCcw, BarChart3
} from 'lucide-react';

const SAC_STATUS = {
    ABERTO: { label: 'Aberto', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: AlertCircle },
    EM_ANALISE: { label: 'Em Análise', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Clock },
    RESOLVIDO: { label: 'Resolvido', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2 },
    CANCELADO: { label: 'Cancelado', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100', icon: X },
    MIGRADO_RNC: { label: 'Migrado p/ RNC', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: ArrowUpRight }
};

const SAC_PRIORITY = {
    BAIXA: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
    MEDIA: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
    ALTA: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
    CRITICA: { label: 'Crítica', color: 'bg-red-100 text-red-600' }
};

const TIMELINE_ICONS = {
    CALL: { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ligação' },
    EMAIL: { icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50', label: 'E-mail' },
    WHATSAPP: { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'WhatsApp' },
    MEETING: { icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Reunião' },
    NOTE: { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Nota' },
    AGREEMENT: { icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Acordo' }
};

const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

const INITIAL_TICKET_STATE = {
    appointment_number: '',
    client_name: '',
    report_date: new Date().toISOString().split('T')[0],
    city: '',
    external_id: '',
    status: 'ABERTO',
    priority: 'MEDIA',
    sector_id: '',
    problem_type_id: '',
    subject: '',
    description: '',
    invoice_number: '',
    op: '',
    batch_number: '',
    item_number: '',
    item_name: '',
    quantity: 0,
    unit_price: 0,
    total_value: 0,
    contact_phone: '',
    contact_email: '',
    contact_name: '',
    contact_sector: '',
    has_return: false,
    uom: 'un',
    returned_quantity: 0,
    return_destination: '',
    final_quantity: 0,
    new_unit_price: 0,
    commercial_agreement: '',
    timeline: [],
    checklist: [],
    attachments: [],
    rnc_id: null,
    rnc_records: null,
    // Detailed Destination Breakdown
    rework_qty: 0,
    loss_qty: 0,
    discard_qty: 0,
    collection_status: 'PENDENTE',
    scheduled_collection_date: ''
};

const SacView = ({
    currentUser = {},
    allClients = [],
    onTasksUpdate = () => {},
    onOpenJourneyReport = () => {},
    auditRefreshKey = 0,
    onNewTask = () => {},
    migrateFromRi = null,
    onClearMigrateFromRi = () => {},
    notifySuccess = () => {},
    notifyError = () => {},
    notifyWarning = () => {},
}) => {
    const isMobile = useIsMobile();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [isLockedByAudit, setIsLockedByAudit] = useState(false);
    const [sectors, setSectors] = useState([]);
    const [problemTypes, setProblemTypes] = useState([]);
    const [newTicket, setNewTicket] = useState(INITIAL_TICKET_STATE);
    const [newTimelineText, setNewTimelineText] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [tableColumns, setTableColumns] = useState([]); // Armazenar as colunas REAIS do banco
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const years = [2024, 2025, 2026];

    const handleGenerateManagementReport = async () => {
        if (filteredTickets.length === 0) {
            notifyWarning?.('Sem registros', 'Não há registros filtrados para gerar o fechamento.');
            return;
        }

        if (!window.confirm(`Deseja gerar o Relatório de Gestão para ${filteredTickets.length} registros da OT em ${months[selectedMonth - 1]} ${selectedYear}?`)) return;

        try {
            const period = `${months[selectedMonth - 1]} ${selectedYear}`;
            const payload = {
                type: 'MGMT_OT',
                title: `FECHAMENTO OT - ${period}`,
                period: period,
                totals: { count: filteredTickets.length },
                raw_data: filteredTickets.map(t => ({
                    Data: t.report_date ? new Date(t.report_date + 'T12:00:00').toLocaleDateString('pt-BR') : '---',
                    OT: t.appointment_number,
                    Cliente: t.client_name,
                    Assunto: t.subject,
                    Status: SAC_STATUS[t.status]?.label || t.status,
                    Prioridade: SAC_PRIORITY[t.priority]?.label || t.priority
                })),
                raw_data_count: filteredTickets.length,
                user_id: currentUser?.id
            };

            const { error } = await supabase.from('saved_reports').insert([payload]);
            if (error) throw error;
            notifySuccess?.('Sucesso', 'Fechamento de Gestão (OT) salvo na Central.');
        } catch (error) {
            console.error('Error generating MGMT report:', error);
            notifyError?.('Erro ao gerar fechamento', error.message);
        }
    };

    useEffect(() => { fetchTickets(); }, []);

    useEffect(() => {
        const total = (parseFloat(newTicket.quantity) || 0) * (parseFloat(newTicket.unit_price) || 0);
        if (total !== newTicket.total_value) setNewTicket(prev => ({ ...prev, total_value: total }));
    }, [newTicket.quantity, newTicket.unit_price]);

    useEffect(() => {
        const checkAuditLock = async () => {
            if (!selectedTicket?.id) { setIsLockedByAudit(false); return; }
            try {
                const { data } = await supabase.from('task_reports')
                    .select('id').eq('sac_id', selectedTicket.id)
                    .eq('report_type', 'SERVICE_JOURNEY').eq('status', 'FINALIZADO').maybeSingle();
                setIsLockedByAudit(!!data);
            } catch { setIsLockedByAudit(false); }
        };
        checkAuditLock();
    }, [selectedTicket?.id, selectedTicket?.status, showAddModal, auditRefreshKey]);

    useEffect(() => {
        if (migrateFromRi && !showAddModal) {
            setNewTicket({ ...INITIAL_TICKET_STATE, ...migrateFromRi });
            setIsEditing(false); setSelectedTicket(null); setShowAddModal(true);
            if (onClearMigrateFromRi) onClearMigrateFromRi();
        }
    }, [migrateFromRi]);

    useEffect(() => { 
        fetchTickets(); 
        fetchTableSchema(); // Mapear as colunas logo na abertura
    }, [auditRefreshKey]);

    // RECARGA AUTOMÁTICA: Sempre que abrir o modal de uma OT vinculada a RNC, 
    // buscamos os dados mais recentes do banco para garantir que o sincronismo da RNC apareça.
    useEffect(() => {
        const refreshSelectedTicket = async () => {
            if (showAddModal && isEditing && selectedTicket?.id) {
                console.log('[SacView] Recarregando dados da OT para garantir sincronismo RNC...', selectedTicket.id);
                try {
                    const { data, error } = await supabase
                        .from('sac_tickets')
                        .select('*, rnc_records:rnc_records!rnc_id(rnc_number)')
                        .eq('id', selectedTicket.id)
                        .maybeSingle();
                    
                    if (!error && data) {
                        // Atualiza o estado com tratamento para campos JSONB nulos
                        setNewTicket({
                            ...INITIAL_TICKET_STATE,
                            ...data,
                            timeline: data.timeline || [],
                            checklist: data.checklist || []
                        });
                    }
                } catch (err) {
                    console.error('[SacView] Erro ao recarregar dados p/ sincronismo:', err);
                }
            }
        };
        refreshSelectedTicket();
    }, [showAddModal, isEditing, selectedTicket?.id]);

    // Descobrir quais colunas REALMENTE existem na tabela sac_tickets
    const fetchTableSchema = async () => {
        try {
            const { data, error } = await supabase.from('sac_tickets').select('*').limit(1);
            if (!error && data && data.length > 0) {
                const columns = Object.keys(data[0]);
                console.log('[SacView] Colunas detectadas no banco:', columns);
                setTableColumns(columns);
            } else {
                console.log('[SacView] Banco vazio ou erro, usando mapeamento mínimo.');
            }
        } catch (err) { console.error('[SacView] Falha ao mapear schema:', err); }
    };

    const fetchSectors = async () => {
        const { data } = await supabase.from('sac_sectors').select('*').order('name');
        if (data) setSectors(data);
    };

    const fetchProblemTypes = async (sectorId) => {
        if (!sectorId) {
            setProblemTypes([]);
            return;
        }
        const { data } = await supabase
            .from('sac_problem_types')
            .select('*')
            .eq('sector_id', sectorId)
            .order('name');
        if (data) setProblemTypes(data);
    };

    useEffect(() => {
        fetchSectors();
    }, []);

    useEffect(() => {
        if (newTicket.sector_id) {
            fetchProblemTypes(newTicket.sector_id);
        } else {
            setProblemTypes([]);
        }
    }, [newTicket.sector_id]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sac_tickets')
                .select('*, rnc_records:rnc_records!rnc_id(rnc_number)');
            if (error) throw error;
            
            const sortedData = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const { data: auditData } = await supabase.from('task_reports')
                .select('sac_id').eq('report_type', 'SERVICE_JOURNEY').eq('status', 'FINALIZADO');
            const auditedIds = new Set((auditData || []).map(a => a.sac_id));
            setTickets(sortedData.map(t => ({ ...t, is_audited: auditedIds.has(t.id) })));
        } catch (err) { notifyError?.('Erro ao buscar OTs', err.message); }
        finally { setLoading(false); }
    };

    const handleSaveTicket = async (e) => {
        e.preventDefault();
        setLoading(true);
        let savedSacId = isEditing ? selectedTicket?.id : null;
        
        try {
            console.log('[SacView] Iniciando salvamento de OT...', { newTicket, currentUser });
            
            if (!currentUser?.id) {
                throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
            }

            const payload = { ...newTicket };
            
            // Agora que o SQL foi executado, o banco aceita todos os campos.
            // Limpamos apenas campos internos e de controle que não devem ser persistidos ou que o banco gera automaticamente.
            const internalFields = [
                'id', 'created_at', 'rnc_records', 'is_audited', 'rnc_id', 
                'converted_to_task_id', 'is_test'
            ];

            internalFields.forEach(field => delete payload[field]);

            // Sanitização de datas para evitar erro de sintaxe no Postgres (DATE não aceita string vazia "")
            if (payload.report_date === '') payload.report_date = null;
            if (payload.scheduled_collection_date === '') payload.scheduled_collection_date = null;

            // Sincronismo Automático de Status via Relatório (Auditoria)
            if (isEditing && selectedTicket?.id) {
                const { data: reportData } = await supabase
                    .from('task_reports')
                    .select('id')
                    .eq('sac_id', selectedTicket.id)
                    .eq('report_type', 'SERVICE_JOURNEY')
                    .eq('status', 'FINALIZADO')
                    .maybeSingle();

                if (reportData) {
                    payload.status = 'RESOLVIDO';
                }
            }

            if (!isEditing) {
                console.log('[SacView] Gerando número de OT manual...');
                const { data: lastOt } = await supabase
                    .from('sac_tickets')
                    .select('appointment_number')
                    .order('appointment_number', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const nextNum = lastOt?.appointment_number ? 
                    (typeof lastOt.appointment_number === 'string' && lastOt.appointment_number.includes('OT#') ? 
                        parseInt(lastOt.appointment_number.split('OT#')[1]) + 1 : 
                        parseInt(lastOt.appointment_number) + 1) : 1;
                
                // Se estiver migrando do RI, concatenamos os números
                if (migrateFromRi && migrateFromRi.origin_ri_number) {
                    payload.appointment_number = `RI#${migrateFromRi.origin_ri_number} / OT#${nextNum}`;
                } else {
                    payload.appointment_number = nextNum;
                }
                
                payload.created_by = currentUser?.id;
                
                // Limpeza ABSOLUTA de campos de origem (que não existem no banco)
                delete payload.origin_ri_id;
                delete payload.origin_ri_number;
                
                console.log('[SacView] Inserindo em sac_tickets (Payload Final):', payload);
                const { data: insertedTicket, error } = await supabase.from('sac_tickets').insert([payload]).select('id').single();
                if (error) {
                    console.error('[SacView] Erro Supabase no Insert:', error);
                    throw error;
                }
                savedSacId = insertedTicket?.id;
                if (notifySuccess) notifySuccess('Sucesso', 'Atendimento registrado com sucesso.');
            }

            // --- SINCRONIZAÇÃO DE DEVOLUÇÕES ---
            if (payload.has_return && savedSacId) {
                
                if (savedSacId) {
                    const returnPayload = {
                        client_name: payload.client_name,
                        item_name: payload.item_name,
                        quantity: (parseFloat(payload.returned_quantity) || 0),
                        unit_price: (parseFloat(payload.unit_price) || 0),
                        uom: payload.uom || 'un',
                        invoice_number: payload.invoice_number || null,
                        return_date: new Date().toISOString().split('T')[0],
                        status: 'PENDENTE',
                        sac_id: savedSacId,
                        return_destination: payload.return_destination || null,
                        op: payload.op || null,
                        batch_number: payload.batch_number || null,
                        rework_qty: parseFloat(payload.rework_qty) || 0,
                        loss_qty: parseFloat(payload.loss_qty) || 0,
                        discard_qty: parseFloat(payload.discard_qty) || 0
                    };

                    const { data: existingReturn } = await supabase
                        .from('product_returns')
                        .select('id')
                        .eq('sac_id', savedSacId)
                        .maybeSingle();

                    if (existingReturn) {
                        await supabase.from('product_returns').update(returnPayload).eq('id', existingReturn.id);
                    } else {
                        await supabase.from('product_returns').insert([returnPayload]);
                    }
                }
            }

            // --- SINCRONISMO DE DADOS E STATUS (SAC -> Devoluções) ---
            if (savedSacId) {
                const returnStatus = payload.status === 'RESOLVIDO' ? 'CONCLUÍDO' : 'PENDENTE';
                await supabase
                    .from('product_returns')
                    .update({ 
                        status: returnStatus,
                        return_invoice_number: payload.return_invoice_number || null,
                        rework_invoice_number: payload.rework_invoice_number || null,
                        final_quantity: parseFloat(payload.final_quantity) || 0,
                        return_destination: payload.return_destination || null,
                        collection_status: payload.collection_status || 'PENDENTE',
                        scheduled_collection_date: payload.scheduled_collection_date || null
                    })
                    .eq('sac_id', savedSacId);
            }

            setShowAddModal(false); 
            setNewTicket(INITIAL_TICKET_STATE); 
            setIsEditing(false);
            fetchTickets(); 
            onTasksUpdate?.();
        } catch (err) { 
            console.error('[SacView] Catch Error:', err);
            if (notifyError) notifyError('Erro ao salvar', err.message || 'Erro inesperado.'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleReopenTicket = async (ticket) => {
        if (!window.confirm(`Deseja reabrir a OT #${ticket.appointment_number}? Isso também reabrirá o relatório técnico e as devoluções vinculadas.`)) return;
        
        setLoading(true);
        try {
            // 1. Reabrir o Relatório Técnico (se houver)
            await supabase
                .from('task_reports')
                .update({
                    status: 'EM_ABERTO',
                    signed_by: null,
                    signature_date: null,
                    updated_at: new Date().toISOString()
                })
                .eq('sac_id', ticket.id)
                .eq('report_type', 'SERVICE_JOURNEY');

            // 2. Reabrir a OT
            await supabase
                .from('sac_tickets')
                .update({ 
                    status: 'EM_ANALISE', 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', ticket.id);

            // 3. Reabrir a RNC vinculada (se houver)
            if (ticket.rnc_id) {
                await supabase
                    .from('rnc_records')
                    .update({ status: 'EM_EXECUCAO', updated_at: new Date().toISOString() })
                    .eq('id', ticket.rnc_id);
            }

            // 4. Reabrir Devoluções Vinculadas (se houver)
            await supabase
                .from('product_returns')
                .update({ status: 'PENDENTE' })
                .eq('sac_id', ticket.id);

            notifySuccess?.('Reabertura Concluída', `OT #${ticket.appointment_number} reaberta com sucesso.`);
            fetchTickets();
            onTasksUpdate?.();
        } catch (error) {
            console.error('Reopen SAC Error:', error);
            notifyError?.('Erro ao reabrir OT', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTicket = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este atendimento?')) return;
        try {
            const { error } = await supabase.from('sac_tickets').delete().eq('id', id);
            if (error) throw error;
            fetchTickets(); notifySuccess?.('Excluído', 'Atendimento removido com sucesso.');
        } catch (err) { notifyError?.('Erro ao excluir', err.message); }
    };

    const handleMigrateToRnc = async (ticket) => {
        if (!window.confirm('Migrar este atendimento para RNC?')) return;
        try {
            // Gerar número de RNC manual para evitar RPC inexistente
            const { data: lastRnc } = await supabase
                .from('rnc_records')
                .select('rnc_number')
                .order('rnc_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            const nextNum = lastRnc?.rnc_number ? parseInt(lastRnc.rnc_number) + 1 : 1;
            
            const rncPayload = {
                rnc_number: nextNum,
                sac_id: ticket.id,
                client_name: ticket.client_name,
                report_date: ticket.report_date,
                city: ticket.city,
                external_id: ticket.external_id,
                invoice_number: ticket.invoice_number,
                op: ticket.op,
                batch_number: ticket.batch_number,
                item_code: ticket.item_number,
                item_name: ticket.item_name,
                quantity: ticket.quantity,
                unit_price: ticket.unit_price,
                total_value: ticket.total_value,
                requester_name: ticket.contact_name,
                requester_sector: ticket.contact_sector,
                contact_phone: ticket.contact_phone || '',
                contact_email: ticket.contact_email || '',
                subject: ticket.subject,
                description: ticket.description,
                status: 'ABERTO',
                priority: ticket.priority || 'MEDIA',
                timeline: ticket.timeline || [],
                checklist: ticket.checklist || [],
                attachments: ticket.attachments || [],
                commercial_agreement: ticket.commercial_agreement || '',
                sector_id: ticket.sector_id || null, 
                problem_type_id: ticket.problem_type_id || null,
                // Dados de Devolução
                has_return: ticket.has_return || false,
                uom: ticket.uom || 'un',
                returned_quantity: ticket.returned_quantity || 0,
                return_destination: ticket.return_destination || null,
                final_quantity: ticket.final_quantity || 0,
                new_unit_price: ticket.new_unit_price || 0,
                return_invoice_number: ticket.return_invoice_number || '',
                rework_invoice_number: ticket.rework_invoice_number || '',
                collection_status: ticket.collection_status || 'PENDENTE',
                scheduled_collection_date: ticket.scheduled_collection_date || null
            };
            const { data: newRnc, error: rncErr } = await supabase.from('rnc_records').insert([rncPayload]).select().single();
            if (rncErr) throw rncErr;
            await supabase.from('sac_tickets').update({ status: 'MIGRADO_RNC', rnc_id: newRnc.id }).eq('id', ticket.id);
            notifySuccess?.('RNC Criada', `RNC ${newRnc.rnc_number} gerada com sucesso.`);
            setShowAddModal(false); fetchTickets();
        } catch (err) { notifyError?.('Erro ao migrar para RNC', err.message); }
    };

    const addTimelineItem = (type) => {
        if (!newTimelineText.trim()) return;
        const item = { id: generateUUID(), date: new Date().toISOString(), user: currentUser?.username || 'Sistema', type, text: newTimelineText.trim() };
        setNewTicket(prev => ({ ...prev, timeline: [item, ...(prev.timeline || [])] }));
        setNewTimelineText('');
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const item = { id: generateUUID(), text: newChecklistItem.trim(), completed: false };
        setNewTicket(prev => ({ ...prev, checklist: [...(prev.checklist || []), item] }));
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id) => {
        setNewTicket(prev => ({ ...prev, checklist: (prev.checklist || []).map(i => i.id === id ? { ...i, completed: !i.completed, completed_at: !i.completed ? new Date().toISOString() : null } : i) }));
    };

    const removeChecklistItem = (id) => {
        setNewTicket(prev => ({ ...prev, checklist: (prev.checklist || []).filter(i => i.id !== id) }));
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        const newAttachments = await Promise.all(files.map(async (file) => ({
            id: generateUUID(), name: file.name, type: file.type,
            url: await convertFileToBase64(file), caption: '',
            reception_date: new Date().toISOString().split('T')[0]
        })));
        setNewTicket(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...newAttachments] }));
    };

    const removeAttachment = (id) => setNewTicket(prev => ({ ...prev, attachments: (prev.attachments || []).filter(a => a.id !== id) }));
    const updateAttachmentCaption = (id, caption) => setNewTicket(prev => ({ ...prev, attachments: (prev.attachments || []).map(a => a.id === id ? { ...a, caption } : a) }));
    const updateAttachmentDate = (id, date) => setNewTicket(prev => ({ ...prev, attachments: (prev.attachments || []).map(a => a.id === id ? { ...a, reception_date: date } : a) }));

    const filteredTickets = useMemo(() => tickets.filter(t => {
        const s = searchTerm.toLowerCase();
        const matchesSearch = (t.client_name || '').toLowerCase().includes(s) || (t.subject || '').toLowerCase().includes(s) || (t.appointment_number?.toString() || '').includes(s);
        const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
        
        let matchesDate = true;
        if (t.report_date) {
            const d = new Date(t.report_date + 'T12:00:00');
            const matchesMonth = selectedMonth === 'ALL' || (d.getMonth() + 1) === parseInt(selectedMonth);
            const matchesYear = selectedYear === 'ALL' || d.getFullYear() === parseInt(selectedYear);
            matchesDate = matchesMonth && matchesYear;
        } else {
            matchesDate = selectedMonth === 'ALL' && selectedYear === 'ALL';
        }

        return matchesSearch && matchesStatus && matchesDate;
    }), [tickets, searchTerm, statusFilter, selectedMonth, selectedYear]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 p-4 md:p-6 animate-fade">
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center ${isMobile ? 'gap-2 mb-4' : 'gap-4 mb-6'}`}>
                <div>
                    <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black text-slate-800 flex items-center gap-2 md:gap-3`}>
                        <MessageSquare className="text-brand-600" size={isMobile ? 20 : 28} /> {isMobile ? 'Gestão de OTs' : 'Gestão de Ocorrências Técnicas'}
                    </h1>
                    <p className={`${isMobile ? 'text-[9px]' : 'text-sm'} text-slate-400 font-bold uppercase tracking-widest mt-0.5 md:mt-1`}>{isMobile ? 'Ocorrências Técnicas' : 'Rastreabilidade e Monitoramento de Atendimento'}</p>
                </div>
                <div className="flex items-center gap-2">
                    {!isMobile && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm mr-2">
                            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">
                                <option value="ALL">TODOS OS MESES</option>
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <div className="w-px h-4 bg-slate-100" />
                            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">
                                <option value="ALL">TODOS OS ANOS</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    )}
                    
                    <button
                        onClick={handleGenerateManagementReport}
                        className={`${isMobile ? 'hidden' : 'px-6 py-3 text-[10px]'} bg-slate-100 text-slate-800 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-95 shadow-sm text-brand-600 mr-2`}
                        title="Gerar Relatório de Gestão (Snapshot)"
                    >
                        <BarChart3 size={16} /> <span className="hidden md:inline text-slate-800">Gerar Fechamento</span>
                    </button>

                    <button
                        onClick={() => { setIsEditing(false); setNewTicket(INITIAL_TICKET_STATE); setSelectedTicket(null); setShowAddModal(true); }}
                        className={`${isMobile ? 'w-full py-2.5 text-[9px]' : 'px-6 py-3 text-[10px]'} bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95`}
                    >
                        <Plus size={isMobile ? 14 : 18} /> Nova OT
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`flex flex-col sm:flex-row ${isMobile ? 'gap-2 mb-4' : 'gap-3 mb-6'}`}>
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input type="text" placeholder={isMobile ? "Filtrar..." : "Buscar por cliente, assunto ou número..."}
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className={`w-full pl-9 pr-4 ${isMobile ? 'h-9 text-[10px]' : 'h-11 text-sm'} bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-500`}
                    />
                </div>
                <div className={`flex ${isMobile ? 'gap-1.5' : 'gap-2'} flex-wrap`}>
                    <button onClick={() => setStatusFilter('ALL')} className={`${isMobile ? 'px-2.5 h-8 text-[8px]' : 'px-4 h-11 text-[10px]'} rounded-lg md:rounded-xl font-black uppercase tracking-widest transition-all border ${statusFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>Todos</button>
                    {Object.entries(SAC_STATUS).map(([k, v]) => (
                        <button key={k} onClick={() => setStatusFilter(k)} className={`${isMobile ? 'px-2.5 h-8 text-[8px]' : 'px-4 h-11 text-[10px]'} rounded-lg md:rounded-xl font-black uppercase tracking-widest transition-all border ${statusFilter === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>{v.label}</button>
                    ))}
                </div>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                        <span className="text-slate-400 font-bold text-sm">Carregando atendimentos...</span>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-slate-200 border-dashed py-20 flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300"><MessageSquare size={32} /></div>
                        <div>
                            <h3 className="text-slate-600 font-black text-lg">Nenhum atendimento encontrado</h3>
                            <p className="text-slate-400 text-sm">Registre uma nova OT clicando no botão acima.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredTickets.map(ticket => {
                            const StatusInfo = SAC_STATUS[ticket.status] || SAC_STATUS.ABERTO;
                            const PriorityInfo = SAC_PRIORITY[ticket.priority] || SAC_PRIORITY.MEDIA;
                            const StatusIcon = StatusInfo.icon;
                            return (
                                <div key={ticket.id}
                                    onClick={() => { setSelectedTicket(ticket); setNewTicket({ ...INITIAL_TICKET_STATE, ...ticket }); setIsEditing(true); setShowAddModal(true); }}
                                    className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
                                >
                                    {ticket.is_audited && <div className="absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-emerald-500" title="Auditado" />}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[9px] font-black px-2 py-1 rounded-full ${PriorityInfo.color}`}>{PriorityInfo.label}</span>
                                            {ticket.status === 'MIGRADO_RNC' && ticket.rnc_records?.rnc_number && (
                                                <span className="text-[9px] font-black px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">RNC {ticket.rnc_records.rnc_number}</span>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black ${StatusInfo.bg} ${StatusInfo.color}`}>
                                            <StatusIcon size={12} />{StatusInfo.label}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{ticket.appointment_number}</p>
                                        <h3 className="font-black text-slate-800 text-sm mt-0.5 line-clamp-1">{ticket.client_name}</h3>
                                        <p className="text-xs text-slate-500 font-bold line-clamp-2 mt-0.5">{ticket.subject}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={11} />
                                            {ticket.report_date ? new Date(ticket.report_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            {ticket.status === 'RESOLVIDO' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReopenTicket(ticket);
                                                    }}
                                                    title="Reabrir OT e Relatório"
                                                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                                >
                                                    <RefreshCcw size={13} />
                                                </button>
                                            )}
                                            {(ticket.timeline?.length > 0) && <span className="text-[9px] font-black text-slate-400 flex items-center gap-1"><History size={11} />{ticket.timeline.length}</span>}
                                            <button onClick={e => { e.stopPropagation(); handleDeleteTicket(ticket.id); }}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>




            {/* Add/Edit Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade">
                        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl flex flex-col max-h-[96vh] overflow-hidden border border-white/20 animate-slide">
                            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100">
                                        {isEditing ? <Edit2 size={20} /> : <MessageSquare size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-black text-slate-800">{isEditing ? 'Detalhes do Atendimento' : 'Novo Canal SAC'}</h2>
                                            {isEditing && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[10px] font-black uppercase">
                                                    {newTicket.appointment_number}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Traceabilidade técnica e registro de apontamento</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isEditing && newTicket.status !== 'MIGRADO_RNC' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedTicket) {
                                                    handleMigrateToRnc(selectedTicket);
                                                }
                                            }}
                                            className="px-4 py-2 bg-brand-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-700 transition-all flex items-center gap-2"
                                        >
                                            <ArrowUpRight size={16} /> Gerar RNC
                                        </button>
                                    )}
                                    <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>


                            <form onSubmit={handleSaveTicket} className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                                {newTicket.status === 'MIGRADO_RNC' && (
                                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-200">
                                            <ShieldAlert size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-purple-900 font-black text-sm">Atendimento Migrado para RNC</h4>
                                            <p className="text-purple-600 text-[11px] font-bold">
                                                Este registro está bloqueado para edição. Todas as alterações devem ser feitas na <span className="font-black underline italic">RNC {newTicket.rnc_records?.rnc_number || ''}</span>
                                            </p>
                                        </div>
                                        <div className="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                            Somente Leitura
                                        </div>
                                    </div>
                                )}

                                {isLockedByAudit && (
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
                                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-emerald-900 font-black text-sm">Jornada Técnica Auditada</h4>
                                            <p className="text-emerald-600 text-[11px] font-bold">
                                                Este atendimento já possui um relatório de jornada <span className="font-black uppercase italic">Finalizado</span>. A edição dos dados foi bloqueada para preservar a integridade da auditoria.
                                            </p>
                                        </div>
                                        <div className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                            Auditado
                                        </div>
                                    </div>
                                )}

                                <fieldset disabled={newTicket.status === 'MIGRADO_RNC' || isLockedByAudit} className="space-y-8 disabled:opacity-80">
                                    {/* SECTION 1: CABEÇALHO E DATAS */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="md:col-span-2 space-y-2 relative">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <User size={12} className="text-brand-600" /> Cliente
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Digite o nome do cliente..."
                                                value={newTicket.client_name}
                                                onChange={(e) => {
                                                    setNewTicket({ ...newTicket, client_name: e.target.value });
                                                    setShowClientSuggestions(true);
                                                }}
                                                onFocus={() => setShowClientSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                                                required
                                            />
                                            {showClientSuggestions && newTicket.client_name && allClients && allClients.length > 0 && (() => {
                                                const searchTerm = newTicket.client_name.toLowerCase().trim();
                                                const filtered = allClients
                                                    .map(c => typeof c === 'string' ? c : (c?.name || c?.client_name || ''))
                                                    .filter(name => name && name.toLowerCase().includes(searchTerm));

                                                if (filtered.length === 1 && filtered[0].toLowerCase() === searchTerm) {
                                                    return null;
                                                }

                                                return filtered.length > 0 ? (
                                                    <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                                        {filtered.slice(0, 50).map((client, idx) => (
                                                            <button
                                                                key={`${client}-${idx}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewTicket({ ...newTicket, client_name: client });
                                                                    setShowClientSuggestions(false);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition-all border-b border-slate-50 last:border-none flex items-center gap-2"
                                                            >
                                                                <User size={14} className="opacity-50" />
                                                                {client}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={12} className="text-brand-600" /> Data Apontamento
                                            </label>
                                            <input
                                                type="date"
                                                value={newTicket.report_date}
                                                onChange={(e) => setNewTicket({ ...newTicket, report_date: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <MapPin size={12} className="text-brand-600" /> Cidade
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Cidade do Cliente"
                                                value={newTicket.city || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, city: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* SECTION: ID EXTERNO (SCOPI) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <ExternalLink size={12} className="text-amber-600" /> ID Externo (Scopi / Sistema Cliente)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex: SAC-2024-051 ou referência no sistema do cliente"
                                            value={newTicket.external_id || ''}
                                            onChange={(e) => setNewTicket({ ...newTicket, external_id: e.target.value })}
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-bold text-slate-700 transition-all"
                                        />
                                    </div>

                                    {/* SECTION: STATUS E PRIORIDADE */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acompanhamento Atual</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(SAC_STATUS).map(([key, value]) => {
                                                    if (key === 'MIGRADO_RNC' && !isEditing) return null;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setNewTicket({ ...newTicket, status: key })}
                                                            className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase transition-all border flex items-center justify-center gap-2 ${newTicket.status === key
                                                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <value.icon size={12} />
                                                            {value.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade do Chamado</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(SAC_PRIORITY).map(([key, value]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setNewTicket({ ...newTicket, priority: key })}
                                                        className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase transition-all border ${newTicket.priority === key
                                                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {value.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: CHECKLIST E TIMELINE */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                                        {/* CHECKLIST */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ListChecks size={14} className="text-brand-600" /> Próximos Passos (Checklist)
                                                </div>
                                                {newTicket.rnc_id && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black">
                                                        📍 Sincronizado c/ RNC
                                                    </span>
                                                )}
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
                                                    {(newTicket.checklist || []).length === 0 ? (
                                                        <div className="py-10 text-center text-slate-300 italic text-xs">Nenhuma tarefa pendente</div>
                                                    ) : (
                                                        newTicket.checklist.map(item => (
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
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <History size={14} className="text-brand-600" /> Registro de Interações (Timeline)
                                                </div>
                                                {newTicket.rnc_id && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black">
                                                        📍 Sincronizado c/ RNC
                                                    </span>
                                                )}
                                            </label>
                                            <div className="bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm flex flex-col min-h-[300px]">
                                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                                                    <textarea
                                                        placeholder="Descreva a interação aqui..."
                                                        value={newTimelineText}
                                                        onChange={(e) => setNewTimelineText(e.target.value)}
                                                        className="w-full h-20 bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 resize-none font-bold"
                                                    ></textarea>
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
                                                    {(newTicket.timeline || []).length === 0 ? (
                                                        <div className="py-10 text-center text-slate-300 italic text-xs">Nenhuma interação registrada</div>
                                                    ) : (
                                                        newTicket.timeline.map((item, idx) => {
                                                            const config = TIMELINE_ICONS[item.type] || TIMELINE_ICONS.NOTE;
                                                            const Icon = config.icon;
                                                            return (
                                                                <div key={item.id} className="relative pl-8 pb-1 last:pb-0">
                                                                    {idx !== newTicket.timeline.length - 1 && (
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

                                    {/* SECTION 2: SETOR E TIPO DE PROBLEMA */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[28px] border border-slate-200">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Building2 size={12} className="text-brand-600" /> Setor de Origem (Onde ocorreu?)
                                                </label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={newTicket.sector_id || ''}
                                                        onChange={(e) => setNewTicket({ ...newTicket, sector_id: e.target.value, problem_type_id: '' })}
                                                        className="flex-1 h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all cursor-pointer shadow-sm"
                                                        required
                                                    >
                                                        <option value="">Selecione o setor...</option>
                                                        {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const name = prompt('Digite o nome do novo Setor:');
                                                            if (name) {
                                                                const { data, error } = await supabase.from('sac_sectors').insert({ name }).select().single();
                                                                if (error) {
                                                                    notifyError?.('Erro', 'Setor já existe ou erro ao salvar.');
                                                                    return;
                                                                }
                                                                if (data) {
                                                                    setSectors(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
                                                                    setNewTicket(prev => ({ ...prev, sector_id: data.id, problem_type_id: '' }));
                                                                }
                                                            }
                                                        }}
                                                        className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center hover:bg-brand-100 transition-all shadow-sm"
                                                        title="Novo Setor"
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Info size={12} className="text-brand-600" /> Tipo de Problema Específico
                                                </label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={newTicket.problem_type_id || ''}
                                                        onChange={(e) => setNewTicket({ ...newTicket, problem_type_id: e.target.value })}
                                                        className="flex-1 h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all cursor-pointer shadow-sm"
                                                        disabled={!newTicket.sector_id}
                                                        required
                                                    >
                                                        <option value="">Selecione o problema...</option>
                                                        {problemTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        disabled={!newTicket.sector_id}
                                                        onClick={async () => {
                                                            const name = prompt('Digite o nome do novo Tipo de Problema:');
                                                            if (name && newTicket.sector_id) {
                                                                const { data, error } = await supabase.from('sac_problem_types').insert({ 
                                                                    name, 
                                                                    sector_id: newTicket.sector_id 
                                                                }).select().single();
                                                                if (error) {
                                                                    notifyError?.('Erro', 'Erro ao salvar problema.');
                                                                    return;
                                                                }
                                                                if (data) {
                                                                    setProblemTypes(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
                                                                    setNewTicket(prev => ({ ...prev, problem_type_id: data.id }));
                                                                }
                                                            }
                                                        }}
                                                        className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center hover:bg-purple-100 transition-all shadow-sm disabled:opacity-50"
                                                        title="Novo Problema"
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 3: DOCUMENTAÇÃO COMERCIAL/TÉCNICA */}
                                    <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <FileText size={12} className="text-brand-600" /> Nota Fiscal
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Número da NF"
                                                value={newTicket.invoice_number || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, invoice_number: e.target.value })}
                                                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Hash size={12} className="text-brand-600" /> OP (Ordem de Prod.)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="No. da OP"
                                                value={newTicket.op || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, op: e.target.value })}
                                                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Layers size={12} className="text-brand-600" /> Lote de Fabricação
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Identificador Lote"
                                                value={newTicket.batch_number || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, batch_number: e.target.value })}
                                                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                            />
                                        </div>
                                    </div>

                                    {/* ITEM E VALORES */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Tag size={12} className="text-brand-600" /> Cód. Item
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Cód."
                                                value={newTicket.item_number || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, item_number: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="md:col-span-4 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Package size={12} className="text-brand-600" /> Descrição do Item
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nome completo do item"
                                                value={newTicket.item_name || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, item_name: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd</label>
                                            <input
                                                type="number"
                                                value={newTicket.quantity || 0}
                                                onChange={(e) => setNewTicket({ ...newTicket, quantity: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-center"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Unit.</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={newTicket.unit_price || 0}
                                                onChange={(e) => setNewTicket({ ...newTicket, unit_price: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-center"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <div className="bg-brand-50 p-2.5 rounded-xl border border-brand-100 flex flex-col items-center">
                                                <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest">Total Geral</span>
                                                <span className="text-sm font-black text-brand-800">R$ {(newTicket.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: CONTATO */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Phone size={12} className="text-brand-600" /> Telefone de Contato
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="(00) 00000-0000"
                                                value={newTicket.contact_phone || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, contact_phone: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Mail size={12} className="text-brand-600" /> E-mail de Contato
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="email@cliente.com.br"
                                                value={newTicket.contact_email || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, contact_email: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="md:col-span-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <UserPlus size={12} className="text-brand-600" /> Nome do Solicitante
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nome de quem enviou"
                                                value={newTicket.contact_name || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, contact_name: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="md:col-span-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Briefcase size={12} className="text-brand-600" /> Setor do Solicitante
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Comercial, PCP"
                                                value={newTicket.contact_sector || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, contact_sector: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <MessageCircle size={12} className="text-brand-600" /> Assunto Principal
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Breve resumo da demanda"
                                                value={newTicket.subject}
                                                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <AlertTriangle size={12} className="text-brand-600" /> Descrição do Problema / Ocorrência
                                        </label>
                                        <textarea
                                            placeholder="Descreva detalhadamente o que aconteceu..."
                                            value={newTicket.description}
                                            onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                            className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 resize-none"
                                            required
                                        ></textarea>
                                    </div>

                                    {/* ANEXOS */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Paperclip size={12} className="text-brand-600" /> Documentação e Evidências
                                        </label>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-[28px] border border-slate-200 border-dashed">
                                            <label className="aspect-video sm:aspect-square md:aspect-video border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:bg-white transition-all text-slate-400 hover:text-brand-600 group">
                                                <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-black uppercase">Anexar Novo</span>
                                                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                                            </label>

                                            {newTicket.attachments?.map((file) => (
                                                <div key={file.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden group shadow-sm flex flex-col">
                                                    <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
                                                        {file.type.startsWith('image/') ? (
                                                            <img src={file.url} alt="anexo" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FileText size={48} className="text-slate-300" />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttachment(file.id)}
                                                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="p-3 space-y-2">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Legenda / Descrição</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Ex: Foto da etiqueta..."
                                                                value={file.caption || ''}
                                                                onChange={(e) => updateAttachmentCaption(file.id, e.target.value)}
                                                                className="w-full text-xs font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-500"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Data de Recebimento</label>
                                                            <input
                                                                type="date"
                                                                value={file.reception_date || ''}
                                                                onChange={(e) => updateAttachmentDate(file.id, e.target.value)}
                                                                className="w-full text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-brand-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SECTION: GESTÃO DE DEVOLUÇÕES E IMPACTO FINANCEIRO */}
                                    <div className="space-y-6 pt-8 border-t border-slate-100 bg-slate-50/30 p-6 rounded-[24px]">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <History size={14} className="text-rose-600" /> Gestão de Devoluções e Impacto Financeiro
                                            </h3>
                                            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Terá Devolução?</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTicket({ ...newTicket, has_return: false })}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!newTicket.has_return ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    Não
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTicket({ ...newTicket, has_return: true })}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${newTicket.has_return ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    Sim
                                                </button>
                                            </div>
                                        </div>

                                        {newTicket.has_return && (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <ArrowUpRight size={12} className="text-rose-600" /> Qtd. Devolvida
                                                                {newTicket.rnc_id && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black animate-pulse">
                                                                        📍 Sincronizado c/ RNC
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNewTicket({ ...newTicket, uom: 'kg' })}
                                                                    className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${newTicket.uom === 'kg' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    KG
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNewTicket({ ...newTicket, uom: 'un' })}
                                                                    className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${newTicket.uom === 'un' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    UN
                                                                </button>
                                                            </div>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                placeholder="0"
                                                                value={newTicket.returned_quantity || 0}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setNewTicket({
                                                                        ...newTicket,
                                                                        returned_quantity: val,
                                                                        loss_qty: Math.max(0, val - (newTicket.rework_qty || 0) - (newTicket.discard_qty || 0))
                                                                    });
                                                                }}
                                                                className={`w-full h-11 px-4 border rounded-xl outline-none focus:ring-2 font-bold text-slate-700 transition-all pr-12 ${newTicket.rnc_id ? 'bg-indigo-50/50 border-indigo-200 focus:ring-indigo-500' : 'bg-white border-slate-200 focus:ring-rose-500'}`}
                                                            />
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">
                                                                {newTicket.uom}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <Target size={12} className="text-rose-600" /> O que aconteceu com a devolução?
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewTicket({ ...newTicket, return_destination: 'REWORK' })}
                                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newTicket.return_destination === 'REWORK' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                                            >
                                                                Retrabalhar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewTicket({ ...newTicket, return_destination: 'DISCARD' })}
                                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newTicket.return_destination === 'DISCARD' ? 'bg-slate-700 text-white border-slate-700 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                                            >
                                                                Descartar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Controle de Coleta na OT */}
                                                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex flex-col md:flex-row gap-4">
                                                    <div className="flex-1 space-y-1.5">
                                                        <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest pl-1 flex items-center gap-1">
                                                            <Clock size={10} /> Status da Coleta
                                                        </label>
                                                        <select
                                                            className="w-full h-10 px-3 bg-white border border-rose-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                                            value={newTicket.collection_status || 'PENDENTE'}
                                                            onChange={(e) => setNewTicket({ ...newTicket, collection_status: e.target.value })}
                                                        >
                                                            <option value="PENDENTE">PENDENTE (AGUARDANDO)</option>
                                                            <option value="PROGRAMADA">PROGRAMADA / AGENDADA</option>
                                                            <option value="COLETADA">COLETADA / EM TRANSITO</option>
                                                            <option value="NAO_SE_APLICA">NÃO SE APLICA</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex-1 space-y-1.5">
                                                        <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest pl-1 flex items-center gap-1">
                                                            <Calendar size={10} /> Data Programada
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="w-full h-10 px-3 bg-white border border-rose-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                                            value={newTicket.scheduled_collection_date || ''}
                                                            onChange={(e) => setNewTicket({ ...newTicket, scheduled_collection_date: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                {/* GRID 2: NFs e Qtd Final */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Hash size={12} className="text-rose-600" /> No. Nota Devolução
                                                                {newTicket.rnc_id && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black">
                                                                        📍 RNC
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="NF-e de Devolução"
                                                            value={newTicket.return_invoice_number || ''}
                                                            onChange={(e) => setNewTicket({ ...newTicket, return_invoice_number: e.target.value })}
                                                            className={`w-full h-11 px-4 border rounded-xl outline-none focus:ring-2 font-bold text-slate-700 transition-all text-[11px] ${newTicket.rnc_id ? 'bg-indigo-50/50 border-indigo-200 focus:ring-indigo-500' : 'bg-white border-slate-200 focus:ring-rose-500'}`}
                                                        />
                                                    </div>
                                                    {newTicket.return_destination === 'REWORK' && (
                                                        <div className="space-y-2 animate-in zoom-in-95 duration-200">
                                                            <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign size={12} /> No. Nota Retrabalho
                                                                    {newTicket.rnc_id && (
                                                                        <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black">
                                                                            📍 RNC
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="NF-e de Reenvio"
                                                                value={newTicket.rework_invoice_number || ''}
                                                                onChange={(e) => setNewTicket({ ...newTicket, rework_invoice_number: e.target.value })}
                                                                className={`w-full h-11 px-4 border rounded-xl outline-none focus:ring-2 font-bold text-slate-700 transition-all text-[11px] ${newTicket.rnc_id ? 'bg-indigo-50/50 border-indigo-200 focus:ring-indigo-500' : 'bg-rose-100/30 border-rose-200 focus:ring-rose-500'}`}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Package size={12} className="text-rose-600" /> Qtd. Reprocessada / Final
                                                                {newTicket.rnc_id && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black">
                                                                        📍 RNC
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={newTicket.final_quantity || 0}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const total = parseFloat(newTicket.returned_quantity) || 0;
                                                                setNewTicket({
                                                                    ...newTicket,
                                                                    final_quantity: val,
                                                                    rework_qty: val,
                                                                    loss_qty: Math.max(0, total - val - (newTicket.discard_qty || 0))
                                                                });
                                                            }}
                                                            className={`w-full h-11 px-4 border rounded-xl outline-none focus:ring-2 font-bold text-slate-700 transition-all ${newTicket.rnc_id ? 'bg-indigo-50/50 border-indigo-200 focus:ring-indigo-500' : 'bg-white border-slate-200 focus:ring-rose-500'}`}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <DollarSign size={12} className="text-rose-600" /> Novo Preço Unitário
                                                                {newTicket.rnc_id && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black">
                                                                        📍 RNC
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={newTicket.new_unit_price || 0}
                                                            onChange={(e) => setNewTicket({ ...newTicket, new_unit_price: parseFloat(e.target.value) || 0 })}
                                                            className={`w-full h-11 px-4 border rounded-xl outline-none focus:ring-2 font-bold text-slate-700 transition-all ${newTicket.rnc_id ? 'bg-indigo-50/50 border-indigo-200 focus:ring-indigo-500' : 'bg-white border-slate-200 focus:ring-rose-500'}`}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex flex-col items-center mt-6">
                                                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Impacto Financeiro Total</span>
                                                            <span className="text-sm font-black text-rose-800">
                                                                R$ {((newTicket.returned_quantity || 0) * (newTicket.new_unit_price || newTicket.unit_price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* NOVO: Destinação Detalhada */}
                                                    <div className="col-span-full bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4 shadow-inner mt-4">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destinação Detalhada</label>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${Math.abs((newTicket.rework_qty || 0) + (newTicket.loss_qty || 0) + (newTicket.discard_qty || 0) - (newTicket.returned_quantity || 0)) < 0.01 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                Total: {(newTicket.rework_qty || 0) + (newTicket.loss_qty || 0) + (newTicket.discard_qty || 0)} / {newTicket.returned_quantity || 0}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">Retrabalho</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    className="w-full h-11 px-4 bg-white border border-emerald-100 rounded-xl font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 text-[11px]"
                                                                    value={newTicket.rework_qty || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const total = parseFloat(newTicket.returned_quantity) || 0;
                                                                        setNewTicket({
                                                                            ...newTicket,
                                                                            rework_qty: val,
                                                                            final_quantity: val,
                                                                            loss_qty: Math.max(0, total - val - (newTicket.discard_qty || 0))
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest ml-1">Perda Prod.</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    className="w-full h-11 px-4 bg-white border border-amber-100 rounded-xl font-bold text-amber-700 outline-none focus:ring-2 focus:ring-amber-500 text-[11px]"
                                                                    value={newTicket.loss_qty || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        setNewTicket({ ...newTicket, loss_qty: val });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest ml-1">Descarte</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    className="w-full h-11 px-4 bg-white border border-rose-100 rounded-xl font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500 text-[11px]"
                                                                    value={newTicket.discard_qty || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const total = parseFloat(newTicket.returned_quantity) || 0;
                                                                        setNewTicket({
                                                                            ...newTicket,
                                                                            discard_qty: val,
                                                                            loss_qty: Math.max(0, total - (newTicket.rework_qty || 0) - val)
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* DASHBOARD DE CONCILIAÇÃO */}
                                                <div className="mt-8 p-6 bg-slate-900 rounded-[32px] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500 border border-white/5">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                                                    
                                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-brand-500/20 rounded-xl">
                                                                <Layers size={18} className="text-brand-400" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Painel de Conciliação e Eficiência</h3>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase">Resumo financeiro e de volumes da ocorrência</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {newTicket.return_destination === 'DISCARD' ? (
                                                                <div className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-full flex items-center gap-2">
                                                                    <Trash2 size={10} className="text-rose-400" />
                                                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Descarte Total</span>
                                                                </div>
                                                            ) : (
                                                                <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-2">
                                                                    <RefreshCcw size={10} className="text-emerald-400" />
                                                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Retrabalho</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                                                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Fluxo de Volumes</span>
                                                            <div className="flex justify-between items-end">
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-bold text-slate-400">Original</p>
                                                                    <p className="text-lg font-black text-white">{newTicket.quantity || 0} <span className="text-[10px] text-slate-500">{newTicket.uom}</span></p>
                                                                </div>
                                                                <div className="text-right space-y-1">
                                                                    <p className="text-[10px] font-bold text-rose-400">Devolvido</p>
                                                                    <p className="text-lg font-black text-rose-500">{newTicket.returned_quantity || 0}</p>
                                                                </div>
                                                            </div>
                                                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, ((newTicket.rework_qty || 0) / (newTicket.returned_quantity || 1)) * 100)}%` }}></div>
                                                                <div className="h-full bg-rose-500" style={{ width: `${Math.max(0, 100 - ((newTicket.rework_qty || 0) / (newTicket.returned_quantity || 1)) * 100)}%` }}></div>
                                                        </div>

                                                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex flex-col justify-between">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Perda Total (Processo + Descarte)</span>
                                                                <AlertTriangle size={14} className="text-rose-500" />
                                                            </div>
                                                            <div className="mt-2">
                                                                <p className="text-2xl font-black text-rose-500">
                                                                    {(parseFloat(newTicket.loss_qty) || 0) + (parseFloat(newTicket.discard_qty) || 0)}
                                                                    <span className="text-[10px] text-rose-400 ml-1">{newTicket.uom}</span>
                                                                </p>
                                                                <p className="text-[9px] font-bold text-rose-300 mt-1 uppercase">
                                                                    Perda Detectada: {newTicket.loss_qty || 0} (P) + {newTicket.discard_qty || 0} (D)
                                                                </p>
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                                <p className="text-[10px] font-bold text-rose-400">Impacto na Perda: <span className="text-white">R$ {(
                                                                    ((parseFloat(newTicket.loss_qty) || 0) + (parseFloat(newTicket.discard_qty) || 0))
                                                                    * (newTicket.unit_price || 0)
                                                                ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col justify-between">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Saldo de Recuperação</span>
                                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                                            </div>
                                                            <div className="mt-2">
                                                                <p className="text-2xl font-black text-emerald-500">
                                                                    R$ {(newTicket.return_destination === 'DISCARD' ? 0 : ((newTicket.final_quantity || 0) * (newTicket.new_unit_price || newTicket.unit_price || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-emerald-400 mt-1 uppercase">
                                                                    Valor Líquido Recuperado
                                                                </p>
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                                <p className="text-[10px] font-bold text-emerald-400">Eficiência de Reprocesso: <span className="text-white">{newTicket.return_destination === 'DISCARD' ? '0%' : (newTicket.returned_quantity > 0 ? (((newTicket.final_quantity || 0) / (newTicket.returned_quantity || 1)) * 100).toFixed(1) + '%' : '0%')}</span></p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                                        <div className="space-y-4">
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Rastreabilidade Fiscal</span>
                                                            <div className="flex flex-wrap gap-3">
                                                                <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                                                                    <FileText size={14} className="text-brand-400" />
                                                                    <div>
                                                                        <p className="text-[8px] font-black text-slate-500 uppercase">NF Devolução</p>
                                                                        <p className="text-[11px] font-bold text-white">{newTicket.return_invoice_number || 'Não Informada'}</p>
                                                                    </div>
                                                                </div>
                                                                {newTicket.return_destination === 'REWORK' && (
                                                                    <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                                                                        <RefreshCcw size={14} className="text-emerald-400" />
                                                                        <div>
                                                                            <p className="text-[8px] font-black text-slate-500 uppercase">NF Retrabalho</p>
                                                                            <p className="text-[11px] font-bold text-white">{newTicket.rework_invoice_number || 'Pendente'}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Resumo Narrativo</span>
                                                            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                                                <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                                                                    <Info size={12} className="inline mr-2 text-brand-400" />
                                                                    {newTicket.return_destination === 'DISCARD' 
                                                                        ? `Ocorrência com descarte total de ${newTicket.returned_quantity} ${newTicket.uom} autorizado. Prejuízo financeiro direto de R$ ${((newTicket.returned_quantity || 0) * (newTicket.unit_price || 0)).toLocaleString('pt-BR')}.`
                                                                        : `Lote de ${newTicket.returned_quantity} ${newTicket.uom} em processo de retrabalho. Recuperação parcial de ${newTicket.final_quantity} ${newTicket.uom} (${(newTicket.returned_quantity > 0 ? (((newTicket.final_quantity || 0) / (newTicket.returned_quantity || 1)) * 100).toFixed(1) : 0)}% de eficiência).`
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* SECTION: ACORDO COMERCIAL */}
                                    <div className="space-y-4 pt-8 border-t border-slate-100">
                                        <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} /> Acordo Comercial / Decisão Final
                                            </div>
                                            {newTicket.rnc_id && (
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[7px] font-black">
                                                    📍 Alimentado via RNC
                                                </span>
                                            )}
                                        </label>
                                        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[28px] space-y-4">
                                            <textarea
                                                placeholder="Descreva o acordo feito com o cliente (ex: Troca autorizada, Desconto de 10%, etc)..."
                                                value={newTicket.commercial_agreement || ''}
                                                onChange={(e) => setNewTicket({ ...newTicket, commercial_agreement: e.target.value })}
                                                className={`w-full h-24 border rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 transition-all resize-none shadow-sm ${newTicket.rnc_id ? 'bg-indigo-50/30 border-indigo-200 focus:ring-indigo-500' : 'bg-white border-rose-200 focus:ring-rose-500'}`}
                                            ></textarea>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase italic">
                                                <Info size={12} /> Este campo deve registrar o desdobramento comercial final da ocorrência
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                <div className="pt-8 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 h-14 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>

                                    {isEditing && newTicket.status !== 'MIGRADO_RNC' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onOpenJourneyReport('SAC', { ...newTicket, id: selectedTicket.id });
                                                }}
                                                className="flex-1 h-14 bg-amber-50 text-amber-600 border border-amber-100 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <FileText size={18} />
                                                Relatório
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const otId = selectedTicket?.id || newTicket?.id;
                                                    if (!otId) {
                                                        notifyWarning?.('Ação Bloqueada', 'A OT precisa estar salva para gerar uma tarefa.');
                                                        return;
                                                    }
                                                    onNewTask(newTicket.client_name, {
                                                        title: `[OT #${newTicket.appointment_number}] ${newTicket.subject}`,
                                                        description: `Referente à OT No. ${newTicket.appointment_number}\nCliente: ${newTicket.client_name}\nAssunto: ${newTicket.subject}\nDescrição: ${newTicket.description}`,
                                                        priority: newTicket.priority,
                                                        parent_sac_id: otId
                                                    });
                                                }}
                                                className="flex-1 h-14 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-emerald-100"
                                            >
                                                <CheckSquare size={18} />
                                                Gerar Tarefa Kanban
                                            </button>
                                        </>
                                    )}

                                    {newTicket.status !== 'MIGRADO_RNC' && !isLockedByAudit ? (
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-[2] h-14 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-brand-700 transition-all active:scale-95 shadow-xl shadow-brand-100 flex items-center justify-center gap-3"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <Save size={18} />
                                                    {isEditing ? 'Atualizar Atendimento' : 'Salvar Atendimento'}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className={`flex-[2] h-14 ${isLockedByAudit ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-900 shadow-slate-200'} text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl`}
                                        >
                                            {isLockedByAudit ? <Check size={18} /> : <X size={18} />}
                                            {isLockedByAudit ? 'Atendimento Auditado' : 'Fechar Visualização'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SacView;
