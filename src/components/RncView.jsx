import React, { useState, useEffect, useMemo } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { generateUUID } from '../utils/helpers';
import { supabase } from '../supabaseClient';
import {
    ShieldAlert, Plus, Clock, CheckCircle2,
    AlertCircle, X, History, Save, Target,
    Phone, Mail, MessageCircle, Building2, FileText, Users,
    Filter, ChevronDown, ChevronLeft, Search, CheckSquare,
    ArrowUpRight, DollarSign, Package, Hash,
    Layers, AlertTriangle, Info, RefreshCcw, Trash2, BarChart3
} from 'lucide-react';

// New Modular Components
import RncFilters from './rnc/RncFilters';
import RncCard from './rnc/RncCard';
import RncClientInfo from './rnc/RncClientInfo';
import RncItemsRepeater from './rnc/RncItemsRepeater';
import RncClassification from './rnc/RncClassification';
import RncStatusGrid from './rnc/RncStatusGrid';
import RncMaintenance from './rnc/RncMaintenance';
import RncAttachments from './rnc/RncAttachments';

const RNC_PRIORITY = {
    BAIXA: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
    MEDIA: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
    ALTA: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
    CRITICA: { label: 'Crítica', color: 'bg-red-100 text-red-600' }
};

const RNC_STATUS = {
    ABERTO: { label: 'Aberto', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: AlertCircle },
    EM_EXECUCAO: { label: 'Em Execução', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: Clock },
    VERIFICANDO: { label: 'Aguardando Scopi', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Target },
    FECHADO: { label: 'Finalizado', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2 }
};

const TIMELINE_ICONS = {
    CALL: { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ligação' },
    EMAIL: { icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50', label: 'E-mail' },
    WHATSAPP: { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'WhatsApp' },
    MEETING: { icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Reunião' },
    NOTE: { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Nota' },
    AGREEMENT: { icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Acordo' }
};

const RncView = ({ currentUser, allClients = [], onNewTask, onTasksUpdate, onOpenJourneyReport, auditRefreshKey, notifySuccess, notifyError, notifyWarning, isMeetingView }) => {
    const isMobile = useIsMobile();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [externalIdFilter, setExternalIdFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [isLockedByAudit, setIsLockedByAudit] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const years = [2024, 2025, 2026];

    const handleGenerateManagementReport = async () => {
        if (filteredRecords.length === 0) {
            notifyWarning?.('Sem registros', 'Não há registros filtrados para gerar o fechamento.');
            return;
        }

        if (!window.confirm(`Deseja gerar o Relatório de Gestão para ${filteredRecords.length} registros de RNC em ${months[selectedMonth - 1]} ${selectedYear}?`)) return;

        try {
            const period = `${months[selectedMonth - 1]} ${selectedYear}`;
            const payload = {
                type: 'MGMT_RNC',
                title: `FECHAMENTO RNC - ${period}`,
                period: period,
                totals: { count: filteredRecords.length },
                raw_data: filteredRecords.map(t => ({
                    Data: t.report_date ? new Date(t.report_date + 'T12:00:00').toLocaleDateString('pt-BR') : '---',
                    RNC: t.rnc_number,
                    Cliente: t.client_name,
                    Assunto: t.subject,
                    Status: RNC_STATUS[t.status]?.label || t.status,
                    Prioridade: RNC_PRIORITY[t.priority]?.label || t.priority
                })),
                raw_data_count: filteredRecords.length,
                user_id: currentUser?.id
            };

            const { error } = await supabase.from('saved_reports').insert([payload]);
            if (error) throw error;
            notifySuccess?.('Sucesso', 'Fechamento de Gestão (RNC) salvo na Central.');
        } catch (error) {
            console.error('Error generating MGMT report:', error);
            notifyError?.('Erro ao gerar fechamento', error.message);
        }
    };

    // Categories State (mirroring SacView)
    const [sectors, setSectors] = useState([]);
    const [problemTypes, setProblemTypes] = useState([]);

    const INITIAL_RNC_STATE = {
        rnc_number: '',
        sac_id: null,
        external_id: '', // Scopi Reference
        root_cause_ishikawa: '', // Causa raiz / observações técnicas
        description: '', // Descrição detalhada do problema
        status: 'ABERTO',
        priority: 'MEDIA',
        timeline: [],
        checklist: [],
        commercial_agreement: '',
        attachments: [],
        // Client and Product Information
        client_name: '',
        report_date: new Date().toISOString().split('T')[0],
        city: '',
        invoice_number: '',
        op: '',
        batch_number: '',
        item_code: '',
        item_name: '',
        quantity: 0,
        unit_price: 0,
        total_value: 0,
        requester_name: '',
        requester_sector: '',
        subject: '',
        // Sector and Problem Classification
        sector_id: '',
        problem_type_id: '',
        // Financial Traceability
        has_return: false,
        uom: 'un', // 'un' or 'kg'
        returned_quantity: 0,
        return_destination: '', // 'REWORK' or 'DISCARD'
        final_quantity: 0,
        new_unit_price: 0,
        return_invoice_number: '',
        rework_invoice_number: '',
        item_name_return: '',
        return_items: [],
        // Detailed Destination Breakdown
        rework_qty: 0,
        loss_qty: 0,
        discard_qty: 0,
        collection_status: 'PENDENTE',
        scheduled_collection_date: ''
    };

    const [newRnc, setNewRnc] = useState(INITIAL_RNC_STATE);
    const [newTimelineText, setNewTimelineText] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');

    useEffect(() => {
        fetchRecords();
        fetchSectors();
    }, [auditRefreshKey]);

    useEffect(() => {
        if (newRnc.sector_id) {
            fetchProblemTypes(newRnc.sector_id);
        } else {
            setProblemTypes([]);
        }
    }, [newRnc.sector_id]);

    // Auto-calculate Total Value
    useEffect(() => {
        const qty = parseFloat(newRnc.quantity) || 0;
        const price = parseFloat(newRnc.unit_price) || 0;
        const total = qty * price;
        if (total !== newRnc.total_value) {
            setNewRnc(prev => ({ ...prev, total_value: total }));
        }
    }, [newRnc.quantity, newRnc.unit_price]);

    useEffect(() => {
        const checkAuditLock = async () => {
            if (selectedRecord?.id) {
                // Bloqueio imediato se o status for FECHADO
                if (selectedRecord.status === 'FECHADO') {
                    setIsLockedByAudit(true);
                    return;
                }

                try {
                    const { data, error } = await supabase
                        .from('task_reports')
                        .select('id')
                        .eq('rnc_id', selectedRecord.id)
                        .eq('report_type', 'SERVICE_JOURNEY')
                        .eq('status', 'FINALIZADO')
                        .maybeSingle();

                    if (!error && data) {
                        setIsLockedByAudit(true);
                    } else {
                        setIsLockedByAudit(false);
                    }
                } catch (err) {
                    console.error("Erro ao verificar trava de auditoria RNC:", err);
                    setIsLockedByAudit(false);
                }
            } else {
                setIsLockedByAudit(false);
            }
        };
        checkAuditLock();
    }, [selectedRecord?.id, selectedRecord?.status, showModal, auditRefreshKey]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            // 1. Buscar registros RNC
            const { data: recordsData, error: recordsError } = await supabase
                .from('rnc_records')
                .select('*, sac_tickets!sac_id(client_name, subject, appointment_number, description)')
                .order('created_at', { ascending: false });

            if (recordsError) throw recordsError;

            // 2. Buscar status de auditoria (relatórios finalizados)
            const { data: auditData, error: auditError } = await supabase
                .from('task_reports')
                .select('rnc_id')
                .eq('report_type', 'SERVICE_JOURNEY')
                .eq('status', 'FINALIZADO');

            if (auditError) throw auditError;

            // 3. Mapear status de auditoria para as RNCs
            const auditedRncIds = new Set(auditData.map(a => a.rnc_id));
            const enrichedRecords = (recordsData || []).map(r => ({
                ...r,
                is_audited: auditedRncIds.has(r.id)
            }));

            setRecords(enrichedRecords);
        } catch (error) {
            console.error('Erro ao buscar RNCs:', error);
        } finally {
            setLoading(false);
        }
    };


    const fetchSectors = async () => {
        const { data } = await supabase.from('sac_sectors').select('*').order('name');
        if (data) setSectors(data);
    };

    const fetchProblemTypes = async (sectorId) => {
        const { data } = await supabase
            .from('sac_problem_types')
            .select('*')
            .eq('sector_id', sectorId)
            .order('name');
        if (data) setProblemTypes(data);
    };

    const addReturnItem = () => {
        let items = [...(newRnc.return_items || [])];

        // Se a lista está vazia, primeiro "converte" o item principal em um item da lista
        if (items.length === 0) {
            items.push({
                id: generateUUID(),
                item_code: newRnc.item_code || '',
                item_name: newRnc.item_name || '',
                quantity: newRnc.quantity || 0,
                unit_price: newRnc.unit_price || 0,
                uom: newRnc.uom || 'un',
                returned_quantity: newRnc.returned_quantity || 0,
                return_destination: newRnc.return_destination || null,
                final_quantity: newRnc.final_quantity || 0,
                new_unit_price: newRnc.new_unit_price || 0
            });
        }

        // Adiciona o novo item vazio
        items.push({
            id: generateUUID(),
            item_code: '',
            item_name: '',
            quantity: 0,
            unit_price: 0,
            uom: 'un',
            returned_quantity: 0,
            return_destination: null,
            final_quantity: 0,
            new_unit_price: 0
        });

        setNewRnc(prev => ({
            ...prev,
            return_items: items
        }));
    };

    const removeReturnItem = (id) => {
        setNewRnc(prev => ({
            ...prev,
            return_items: prev.return_items.filter(item => item.id !== id)
        }));
    };

    const updateReturnItem = (id, field, value) => {
        setNewRnc(prev => ({
            ...prev,
            return_items: prev.return_items.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleSaveRnc = async (e) => {
        e.preventDefault();
        
        const effectiveItemName = newRnc.item_name || (newRnc.return_items?.[0]?.item_name);
        
        if (!newRnc.client_name || !effectiveItemName) {
            notifyWarning("Campos Obrigatórios", "Por favor, preencha o cliente e o item (pelo menos um).");
            return;
        }

        setLoading(true);
        try {
            // Sanitização do payload para rnc_records
            const payload = { ...newRnc };
            delete payload.sac_tickets;
            delete payload.is_audited;

            // Converter strings vazias para null em campos de data
            // Evita erro "invalid input syntax for type date" no Postgres/Supabase
            if (payload.report_date === '') payload.report_date = null;
            if (payload.scheduled_collection_date === '') payload.scheduled_collection_date = null;

            // Sincronismo Automático de Status via Relatório (Auditoria)
            if (isEditing && selectedRecord?.id) {
                const { data: reportData } = await supabase
                    .from('task_reports')
                    .select('id')
                    .eq('rnc_id', selectedRecord.id)
                    .eq('report_type', 'SERVICE_JOURNEY')
                    .eq('status', 'FINALIZADO')
                    .maybeSingle();

                if (reportData) {
                    payload.status = 'FECHADO';
                }
            }

            // Obter próximo número de RNC e preparar totais
            if (newRnc.return_items?.length > 0) {
                const first = newRnc.return_items[0];
                payload.item_code = first.item_code;
                payload.item_name = first.item_name;
                payload.quantity = first.quantity;
                payload.unit_price = first.unit_price;
                payload.returned_quantity = first.returned_quantity;
                payload.return_destination = first.return_destination;
                payload.final_quantity = first.final_quantity;
                payload.new_unit_price = first.new_unit_price;
                payload.uom = first.uom;
                // Recalcular total_value com base no primeiro item se múltiplos itens de retorno estiverem sendo usados
                payload.total_value = (parseFloat(first.quantity) || 0) * (parseFloat(first.unit_price) || 0);
            } else {
                // Se não houver itens de retorno, garantir que total_value seja calculado a partir dos campos principais
                payload.total_value = (parseFloat(newRnc.quantity) || 0) * (parseFloat(newRnc.unit_price) || 0);
            }

            let savedRncId = isEditing ? selectedRecord?.id : null;

            if (!isEditing) {
                console.log('[RncView] Gerando número de RNC manual...');
                const { data: lastRnc } = await supabase
                    .from('rnc_records')
                    .select('rnc_number')
                    .order('rnc_number', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const nextNum = lastRnc?.rnc_number ? parseInt(lastRnc.rnc_number) + 1 : 1;
                payload.rnc_number = nextNum;

                // Inserir Nova RNC
                const { data: rncData, error: saveError } = await supabase
                    .from('rnc_records')
                    .insert([payload])
                    .select();

                if (saveError) {
                    // Fallback se 'uom' não existir no banco
                    if (saveError.message?.includes("column \"uom\" of relation \"rnc_records\" does not exist")) {
                        delete payload.uom;
                        const { data: retryData, error: retryErr } = await supabase
                            .from('rnc_records')
                            .insert([payload])
                            .select();
                        if (retryErr) throw retryErr;
                        savedRncId = retryData?.[0]?.id;
                    } else {
                        throw saveError;
                    }
                } else {
                    savedRncId = rncData?.[0]?.id;
                }
            } else {
                // Atualizar RNC Existente
                const { error: saveError } = await supabase
                    .from('rnc_records')
                    .update(payload)
                    .eq('id', selectedRecord.id);

                if (saveError) {
                    // Fallback se 'uom' não existir no banco
                    if (saveError.message?.includes("column \"uom\" of relation \"rnc_records\" does not exist")) {
                        delete payload.uom;
                        const { error: retryErr } = await supabase
                            .from('rnc_records')
                            .update(payload)
                            .eq('id', selectedRecord.id);
                        if (retryErr) throw retryErr;
                    } else {
                        throw saveError;
                    }
                }
            }

            // Reverse synchronization to SAC if linked
            if (newRnc.sac_id) {
                try {
                    const { error: syncError } = await supabase
                        .from('sac_tickets')
                        .update({
                            client_name: newRnc.client_name,
                            report_date: newRnc.report_date || null,
                            city: newRnc.city,
                            invoice_number: newRnc.invoice_number,
                            op: newRnc.op,
                            batch_number: newRnc.batch_number,
                            item_number: newRnc.item_code,
                            item_name: newRnc.item_name,
                            quantity: newRnc.quantity,
                            unit_price: newRnc.unit_price,
                            contact_name: newRnc.requester_name,
                            contact_sector: newRnc.requester_sector,
                            subject: newRnc.subject,
                            // Novos campos fiscais para sincronização
                            has_return: newRnc.has_return,
                            returned_quantity: newRnc.returned_quantity,
                            return_destination: newRnc.return_destination,
                            return_invoice_number: newRnc.return_invoice_number,
                            rework_invoice_number: newRnc.rework_invoice_number,
                            final_quantity: newRnc.final_quantity,
                            new_unit_price: newRnc.new_unit_price,
                            uom: newRnc.uom,
                            // Sincronização de Interações e Decisões
                            checklist: newRnc.checklist || [],
                            commercial_agreement: newRnc.commercial_agreement || '',
                            rework_qty: newRnc.rework_qty || 0,
                            loss_qty: newRnc.loss_qty || 0,
                            discard_qty: newRnc.discard_qty || 0,
                            collection_status: newRnc.collection_status || 'PENDENTE',
                            scheduled_collection_date: newRnc.scheduled_collection_date || null
                        })
                        .eq('id', newRnc.sac_id);
                    
                    if (syncError) {
                        console.error('[RncView] Falha no Sincronismo Reverso (OT):', syncError);
                    } else {
                        console.log('[RncView] Sincronismo Reverso (OT) concluído com sucesso.');
                    }
                } catch (syncErr) {
                    console.error('[RncView] Erro inesperado no Sincronismo Reverso (OT):', syncErr);
                }
            }

            // --- Sincronização Automática com Devoluções (Múltiplos Itens) ---
            const itemsToSync = (newRnc.return_items && newRnc.return_items.length > 0)
                ? newRnc.return_items.filter(it => it.item_name && (parseFloat(it.returned_quantity) > 0 || parseFloat(it.quantity) > 0))
                : (newRnc.has_return && newRnc.item_name) ? [{
                    item_code: newRnc.item_code,
                    item_name: newRnc.item_name,
                    quantity: newRnc.quantity,
                    unit_price: newRnc.unit_price,
                    uom: newRnc.uom || 'un',
                    returned_quantity: newRnc.returned_quantity,
                    return_destination: newRnc.return_destination,
                    final_quantity: newRnc.final_quantity,
                    new_unit_price: newRnc.new_unit_price,
                    rework_qty: newRnc.rework_qty || 0,
                    loss_qty: newRnc.loss_qty || 0,
                    discard_qty: newRnc.discard_qty || 0
                }] : [];

            if (itemsToSync.length > 0 && savedRncId) {
                for (const item of itemsToSync) {
                    const returnPayload = {
                        client_name: newRnc.client_name,
                        item_name: item.item_name,
                        quantity: (parseFloat(item.returned_quantity) || parseFloat(item.quantity) || 0),
                        unit_price: (parseFloat(item.unit_price) || 0),
                        uom: item.uom || 'un',
                        invoice_number: newRnc.invoice_number || null,
                        final_quantity: (parseFloat(item.final_quantity) || 0),
                        new_unit_price: (parseFloat(item.new_unit_price) || 0),
                        return_date: new Date().toISOString().split('T')[0],
                        status: 'PENDENTE',
                        return_destination: item.return_destination || null,
                        op: newRnc.op || null,
                        batch_number: newRnc.batch_number || null,
                        rework_qty: parseFloat(item.rework_qty) || 0,
                        loss_qty: parseFloat(item.loss_qty) || 0,
                        discard_qty: parseFloat(item.discard_qty) || 0,
                        collection_status: newRnc.collection_status || 'PENDENTE',
                        scheduled_collection_date: newRnc.scheduled_collection_date || null
                    };

                    // Busca se já existe um registro para este rnc_id E item_name
                    const { data: existingReturn } = await supabase
                        .from('product_returns')
                        .select('id')
                        .eq('rnc_id', savedRncId)
                        .eq('item_name', returnPayload.item_name)
                        .maybeSingle();

                    if (existingReturn) {
                        await supabase.from('product_returns').update(returnPayload).eq('id', existingReturn.id);
                    } else {
                        await supabase.from('product_returns').insert([returnPayload]);
                    }
                }
            }

            // --- SINCRONISMO DE STATUS (RNC -> Devoluções) ---
            if (savedRncId) {
                const returnStatus = payload.status === 'FECHADO' ? 'CONCLUÍDO' : 'PENDENTE';
                await supabase
                    .from('product_returns')
                    .update({ status: returnStatus })
                    .eq('rnc_id', savedRncId);
            }

            setShowModal(false);
            setNewRnc(INITIAL_RNC_STATE);
            setIsEditing(false);
            fetchRecords();
        } catch (error) {
            console.error('Save error:', error);
            notifyError('Erro ao salvar RNC', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReopenRnc = async (rnc) => {
        if (!window.confirm(`Deseja reabrir a RNC #${rnc.rnc_number}? Isso também reabrirá o relatório técnico e as devoluções vinculadas para edição.`)) return;
        
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
                .eq('rnc_id', rnc.id)
                .eq('report_type', 'SERVICE_JOURNEY');

            // 2. Reabrir a RNC
            await supabase
                .from('rnc_records')
                .update({ status: 'EM_EXECUCAO', updated_at: new Date().toISOString() })
                .eq('id', rnc.id);

            // 3. Reabrir o SAC vinculado (se houver)
            if (rnc.sac_id) {
                await supabase
                    .from('sac_tickets')
                    .update({ status: 'EM_ANALISE', updated_at: new Date().toISOString() })
                    .eq('id', rnc.sac_id);
            }

            // 4. Reabrir Devoluções Vinculadas (se houver)
            await supabase
                .from('product_returns')
                .update({ status: 'PENDENTE' })
                .eq('rnc_id', rnc.id);

            if (notifySuccess) notifySuccess('Reabertura Concluída', `RNC #${rnc.rnc_number} e registros vinculados reabertos com sucesso.`);
            fetchRecords();
            if (onTasksUpdate) onTasksUpdate();
        } catch (error) {
            console.error('Reopen RNC Error:', error);
            if (notifyError) notifyError('Erro ao reabrir RNC', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRnc = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este registro de RNC?')) return;
        try {
            // Unlink from SAC if exists
            const { data: rnc } = await supabase
                .from('rnc_records')
                .select('sac_id')
                .eq('id', id)
                .single();

            if (rnc?.sac_id) {
                await supabase
                    .from('sac_tickets')
                    .update({
                        rnc_id: null,
                        status: 'ABERTO'
                    })
                    .eq('id', rnc.sac_id);
            }

            const { error } = await supabase.from('rnc_records').delete().eq('id', id);
            if (error) throw error;
            fetchRecords();
            notifySuccess('Sucesso', 'RNC excluída com sucesso.');
        } catch (error) {
            notifyError('Erro ao excluir', error.message);
        }
    };

    const addTimelineItem = (type, forcedText = null) => {
        const textToUse = forcedText || newTimelineText;
        if (!textToUse.trim()) return;

        const newItem = {
            id: generateUUID(),
            date: new Date().toISOString(),
            user: currentUser.username,
            type: type,
            text: textToUse.trim()
        };

        setNewRnc(prev => ({
            ...prev,
            timeline: [newItem, ...(prev.timeline || [])]
        }));
        setNewTimelineText('');
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const newItem = {
            id: generateUUID(),
            text: newChecklistItem.trim(),
            completed: false,
            date: new Date().toISOString()
        };
        setNewRnc(prev => ({
            ...prev,
            checklist: [...(prev.checklist || []), newItem]
        }));
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id) => {
        setNewRnc(prev => ({
            ...prev,
            checklist: (prev.checklist || []).map(item =>
                item.id === id ? {
                    ...item,
                    completed: !item.completed,
                    completed_at: !item.completed ? new Date().toISOString() : null
                } : item
            )
        }));
    };

    const removeChecklistItem = (id) => {
        setNewRnc(prev => ({
            ...prev,
            checklist: (prev.checklist || []).filter(item => item.id !== id)
        }));
    };

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        const newAttachments = await Promise.all(
            files.map(async (file) => ({
                id: generateUUID(),
                name: file.name,
                type: file.type,
                url: await convertFileToBase64(file),
                caption: '',
                reception_date: new Date().toISOString().split('T')[0]
            }))
        );

        setNewRnc(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), ...newAttachments]
        }));
    };

    const removeAttachment = (id) => {
        setNewRnc(prev => ({
            ...prev,
            attachments: (prev.attachments || []).filter(a => a.id !== id)
        }));
    };

    const updateAttachmentCaption = (id, caption) => {
        setNewRnc(prev => ({
            ...prev,
            attachments: (prev.attachments || []).map(a =>
                a.id === id ? { ...a, caption } : a
            )
        }));
    };

    const updateAttachmentDate = (id, date) => {
        setNewRnc(prev => ({
            ...prev,
            attachments: (prev.attachments || []).map(a =>
                a.id === id ? { ...a, reception_date: date } : a
            )
        }));
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const search = searchTerm.toLowerCase();
            const client = clientFilter.toLowerCase();
            const scopi = externalIdFilter.toLowerCase();

            const matchesSearch =
                (r.rnc_number?.toString() || '').toLowerCase().includes(search) ||
                (r.root_cause_ishikawa || '').toLowerCase().includes(search) ||
                (r.item_name || '').toLowerCase().includes(search);

            const matchesClient = !clientFilter || (r.client_name || r.sac_tickets?.client_name || '').toLowerCase().includes(client);
            const matchesScopi = !externalIdFilter || (r.external_id || '').toLowerCase().includes(scopi);
            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

            let matchesDate = true;
            if (r.report_date) {
                const d = new Date(r.report_date + 'T12:00:00');
                const matchesMonth = selectedMonth === 'ALL' || (d.getMonth() + 1) === parseInt(selectedMonth);
                const matchesYear = selectedYear === 'ALL' || d.getFullYear() === parseInt(selectedYear);
                matchesDate = matchesMonth && matchesYear;
            } else {
                matchesDate = selectedMonth === 'ALL' && selectedYear === 'ALL';
            }

            return matchesSearch && matchesClient && matchesScopi && matchesStatus && matchesDate;
        });
    }, [records, searchTerm, clientFilter, externalIdFilter, statusFilter, selectedMonth, selectedYear]);

    return (
        <div className={`flex-1 flex flex-col min-h-0 bg-slate-50/50 ${isMeetingView ? 'p-1' : 'p-4 md:p-6'} animate-fade relative`}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center ${isMobile ? 'gap-2 mb-4' : 'gap-4 mb-8'}`}>
                <div>
                    <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black text-slate-800 flex items-center gap-2 md:gap-3`}>
                        <ShieldAlert className="text-brand-600" size={isMobile ? 20 : 28} />
                        {isMobile ? 'Gestão de RNCs' : 'Gestão de RNC (Monitoramento)'}
                    </h1>
                    <p className={`${isMobile ? 'text-[9px]' : 'text-sm'} text-slate-400 font-bold uppercase tracking-widest mt-0.5 md:mt-1`}>{isMobile ? 'Não Conformidades' : 'Rastreabilidade e Execução Geográfica'}</p>
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
                        className={`${isMobile ? 'hidden' : 'px-6 py-3 text-[10px]'} bg-slate-100 text-slate-800 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-95 shadow-sm text-rose-600 mr-2`}
                        title="Gerar Relatório de Gestão (Snapshot)"
                    >
                        <BarChart3 size={16} /> <span className="hidden md:inline text-slate-800">Gerar Fechamento</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setNewRnc(INITIAL_RNC_STATE);
                            setShowModal(true);
                        }}
                        className={`${isMobile ? 'w-full py-2.5 text-[9px]' : 'px-6 py-3 text-[10px]'} bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95`}
                    >
                        <Plus size={isMobile ? 14 : 18} /> Nova RNC
                    </button>
                </div>
            </div>

            {/* Filters */}
            <RncFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                clientFilter={clientFilter}
                setClientFilter={setClientFilter}
                externalIdFilter={externalIdFilter}
                setExternalIdFilter={setExternalIdFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                RNC_STATUS={RNC_STATUS}
            />

            {/* List */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                        <span className="text-slate-400 font-bold text-sm">Carregando registros...</span>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-slate-200 border-dashed py-20 flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <ShieldAlert size={32} />
                        </div>
                        <div>
                            <h3 className="text-slate-600 font-black text-lg">Nenhuma RNC identificada</h3>
                            <p className="text-slate-400 text-sm">Converta um SAC ou crie uma nova RNC.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecords.map(rnc => (
                            <RncCard
                                key={rnc.id}
                                rnc={rnc}
                                RNC_STATUS={RNC_STATUS}
                                onClick={(record) => {
                                    setSelectedRecord(record);
                                    setNewRnc({ ...INITIAL_RNC_STATE, ...record });
                                    setIsEditing(true);
                                    setShowModal(true);
                                }}
                                onOpenJourneyReport={onOpenJourneyReport}
                                onDelete={handleDeleteRnc}
                                onReopen={handleReopenRnc}
                            />
                        ))}
                    </div>
                )}
            </div >

            {/* Modal Simplificado */}
            {
                showModal && (
                    <div className={`absolute inset-0 z-[2000] flex items-center justify-center bg-slate-900/70 backdrop-blur-md ${isMeetingView ? 'p-1' : 'p-2 md:p-4'} animate-fade`}>
                        <div className={`bg-white rounded-[32px] shadow-2xl w-full ${isMeetingView ? 'max-w-5xl' : 'max-w-4xl'} flex flex-col h-full ${isMeetingView ? 'max-h-[98%]' : 'max-h-[96%]'} overflow-hidden animate-slide`}>
                            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-xl font-black text-slate-800">Monitoramento de RNC</h2>
                                            <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-widest uppercase">
                                                {isEditing ? newRnc.rnc_number : 'NOVO REGISTRO'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Rastreabilidade com Scopi e Kanban</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveRnc} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                                {isLockedByAudit && (
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
                                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-emerald-900 font-black text-sm">RNC Auditada e Consolidada</h4>
                                            <p className="text-emerald-600 text-[11px] font-bold">
                                                Esta RNC já possui um relatório de jornada <span className="font-black uppercase italic">Finalizado</span>. A edição dos dados foi bloqueada para preservar a integridade da auditoria técnica.
                                            </p>
                                        </div>
                                        <div className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                            Auditada
                                        </div>
                                    </div>
                                )}

                                <fieldset disabled={isLockedByAudit} className="space-y-6 disabled:opacity-80">
                                    {/* Basic Info & Client/Product */}
                                    <RncClientInfo
                                        newRnc={newRnc}
                                        setNewRnc={setNewRnc}
                                        allClients={allClients}
                                        showClientSuggestions={showClientSuggestions}
                                        setShowClientSuggestions={setShowClientSuggestions}
                                    />

                                    {/* Multi-Item / Return Section */}
                                    <RncItemsRepeater
                                        newRnc={newRnc}
                                        setNewRnc={setNewRnc}
                                        addReturnItem={addReturnItem}
                                        updateReturnItem={updateReturnItem}
                                        removeReturnItem={removeReturnItem}
                                    />

                                    {/* Classification Section */}
                                    <RncClassification
                                        newRnc={newRnc}
                                        setNewRnc={setNewRnc}
                                        sectors={sectors}
                                        setSectors={setSectors}
                                        problemTypes={problemTypes}
                                        setProblemTypes={setProblemTypes}
                                        fetchProblemTypes={fetchProblemTypes}
                                    />

                                    {/* SECTION: GESTÃO DE DEVOLUÇÕES E IMPACTO FINANCEIRO (PARIDADE COM OT) */}
                                    <div className="space-y-6 pt-8 border-t border-slate-100 bg-slate-50/30 p-6 rounded-[24px]">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <History size={14} className="text-rose-600" /> Gestão de Devoluções e Impacto Financeiro
                                            </h3>
                                            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Terá Devolução?</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewRnc({ ...newRnc, has_return: false })}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!newRnc.has_return ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    Não
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewRnc({ ...newRnc, has_return: true })}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${newRnc.has_return ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    Sim
                                                </button>
                                            </div>
                                        </div>

                                        {newRnc.has_return && (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                                {/* GRID 1: Qtd e Destino */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <ArrowUpRight size={12} className="text-rose-600" /> Qtd. Devolvida
                                                            </div>
                                                            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNewRnc({ ...newRnc, uom: 'kg' })}
                                                                    className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${newRnc.uom === 'kg' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    KG
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNewRnc({ ...newRnc, uom: 'un' })}
                                                                    className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${newRnc.uom === 'un' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    UN
                                                                </button>
                                                            </div>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                placeholder="0"
                                                                value={newRnc.returned_quantity || 0}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setNewRnc({
                                                                        ...newRnc,
                                                                        returned_quantity: val,
                                                                        loss_qty: Math.max(0, val - (newRnc.rework_qty || 0) - (newRnc.discard_qty || 0))
                                                                    });
                                                                }}
                                                                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 transition-all pr-12"
                                                            />
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">
                                                                {newRnc.uom || 'kg'}
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
                                                                onClick={() => setNewRnc({ ...newRnc, return_destination: 'REWORK' })}
                                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newRnc.return_destination === 'REWORK' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                                            >
                                                                Retrabalhar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewRnc({ ...newRnc, return_destination: 'DISCARD' })}
                                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newRnc.return_destination === 'DISCARD' ? 'bg-slate-700 text-white border-slate-700 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                                            >
                                                                Descartar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* GRID 2: NFs e Qtd Final */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <Hash size={12} className="text-rose-600" /> No. Nota Devolução
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="NF-e de Devolução"
                                                            value={newRnc.return_invoice_number || ''}
                                                            onChange={(e) => setNewRnc({ ...newRnc, return_invoice_number: e.target.value })}
                                                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 transition-all text-[11px]"
                                                        />
                                                    </div>
                                                    {newRnc.return_destination === 'REWORK' && (
                                                        <div className="space-y-2 animate-in zoom-in-95 duration-200">
                                                            <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                                                                <DollarSign size={12} /> No. Nota Retrabalho
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="NF-e de Reenvio"
                                                                value={newRnc.rework_invoice_number || ''}
                                                                onChange={(e) => setNewRnc({ ...newRnc, rework_invoice_number: e.target.value })}
                                                                className="w-full h-11 px-4 bg-white border border-rose-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 transition-all text-[11px]"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <Package size={12} className="text-rose-600" /> Qtd. Reprocessada / Final
                                                        </label>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={newRnc.final_quantity || 0}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const total = parseFloat(newRnc.returned_quantity) || 0;
                                                                setNewRnc({
                                                                    ...newRnc,
                                                                    final_quantity: val,
                                                                    rework_qty: val,
                                                                    loss_qty: Math.max(0, total - val - (newRnc.discard_qty || 0))
                                                                });
                                                            }}
                                                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <DollarSign size={12} className="text-rose-600" /> Novo Preço Unitário
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={newRnc.new_unit_price || 0}
                                                            onChange={(e) => setNewRnc({ ...newRnc, new_unit_price: parseFloat(e.target.value) || 0 })}
                                                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex flex-col items-center mt-6">
                                                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Impacto Financeiro Total</span>
                                                            <span className="text-sm font-black text-rose-800">
                                                                R$ {((newRnc.returned_quantity || 0) * (newRnc.new_unit_price || newRnc.unit_price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* NOVO: Destinação Detalhada */}
                                                    <div className="col-span-full bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4 shadow-inner mt-4">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destinação Detalhada</label>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${Math.abs((newRnc.rework_qty || 0) + (newRnc.loss_qty || 0) + (newRnc.discard_qty || 0) - (newRnc.returned_quantity || 0)) < 0.01 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                Total: {(newRnc.rework_qty || 0) + (newRnc.loss_qty || 0) + (newRnc.discard_qty || 0)} / {newRnc.returned_quantity || 0}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">Retrabalho</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    className="w-full h-11 px-4 bg-white border border-emerald-100 rounded-xl font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 text-[11px]"
                                                                    value={newRnc.rework_qty || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const total = parseFloat(newRnc.returned_quantity) || 0;
                                                                        setNewRnc({
                                                                            ...newRnc,
                                                                            rework_qty: val,
                                                                            final_quantity: val,
                                                                            loss_qty: Math.max(0, total - val - (newRnc.discard_qty || 0))
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
                                                                    value={newRnc.loss_qty || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        setNewRnc({ ...newRnc, loss_qty: val });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest ml-1">Descarte</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    className="w-full h-11 px-4 bg-white border border-rose-100 rounded-xl font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500 text-[11px]"
                                                                    value={newRnc.discard_qty || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const total = parseFloat(newRnc.returned_quantity) || 0;
                                                                        setNewRnc({
                                                                            ...newRnc,
                                                                            discard_qty: val,
                                                                            loss_qty: Math.max(0, total - (newRnc.rework_qty || 0) - val)
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
                                                            {newRnc.return_destination === 'DISCARD' ? (
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
                                                                    <p className="text-lg font-black text-white">{newRnc.quantity || 0} <span className="text-[10px] text-slate-500">{newRnc.uom || 'un'}</span></p>
                                                                </div>
                                                                <div className="text-right space-y-1">
                                                                    <p className="text-[10px] font-bold text-rose-400">Devolvido</p>
                                                                    <p className="text-lg font-black text-rose-500">{newRnc.returned_quantity || 0}</p>
                                                                </div>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                                                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, ((newRnc.rework_qty || 0) / (newRnc.returned_quantity || 1)) * 100)}%` }}></div>
                                                                <div className="h-full bg-rose-500" style={{ width: `${Math.max(0, 100 - ((newRnc.rework_qty || 0) / (newRnc.returned_quantity || 1)) * 100)}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex flex-col justify-between">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Perda Total (Processo + Descarte)</span>
                                                                <AlertTriangle size={14} className="text-rose-500" />
                                                            </div>
                                                            <div className="mt-2">
                                                                <p className="text-2xl font-black text-rose-500">
                                                                    {(parseFloat(newRnc.loss_qty) || 0) + (parseFloat(newRnc.discard_qty) || 0)}
                                                                    <span className="text-[10px] text-rose-400 ml-1">{newRnc.uom || 'un'}</span>
                                                                </p>
                                                                <p className="text-[9px] font-bold text-rose-300 mt-1 uppercase">
                                                                    Perda Detectada: {newRnc.loss_qty || 0} (P) + {newRnc.discard_qty || 0} (D)
                                                                </p>
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                                <p className="text-[10px] font-bold text-rose-400">Impacto na Perda: <span className="text-white">R$ {(
                                                                    ((parseFloat(newRnc.loss_qty) || 0) + (parseFloat(newRnc.discard_qty) || 0))
                                                                    * (newRnc.unit_price || 0)
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
                                                                    R$ {(newRnc.return_destination === 'DISCARD' ? 0 : ((newRnc.final_quantity || 0) * (newRnc.new_unit_price || newRnc.unit_price || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-emerald-400 mt-1 uppercase">
                                                                    Valor Líquido Recuperado
                                                                </p>
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                                <p className="text-[10px] font-bold text-emerald-400">Eficiência de Reprocesso: <span className="text-white">{newRnc.return_destination === 'DISCARD' ? '0%' : (newRnc.returned_quantity > 0 ? (((newRnc.final_quantity || 0) / (newRnc.returned_quantity || 1)) * 100).toFixed(1) + '%' : '0%')}</span></p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Novo: Controle de Coleta na RNC */}
                                                    <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col md:flex-row gap-6 relative z-10">
                                                        <div className="flex-1 space-y-2">
                                                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Status da Coleta</label>
                                                            <select
                                                                className="w-full h-11 px-4 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
                                                                value={newRnc.collection_status || 'PENDENTE'}
                                                                onChange={(e) => setNewRnc({ ...newRnc, collection_status: e.target.value })}
                                                            >
                                                                <option value="PENDENTE">PENDENTE (AGUARDANDO)</option>
                                                                <option value="PROGRAMADA">PROGRAMADA / AGENDADA</option>
                                                                <option value="COLETADA">COLETADA / EM TRANSITO</option>
                                                                <option value="NAO_SE_APLICA">NÃO SE APLICA</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Data Programada</label>
                                                            <input
                                                                type="date"
                                                                className="w-full h-11 px-4 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all inv-date-input"
                                                                value={newRnc.scheduled_collection_date || ''}
                                                                onChange={(e) => setNewRnc({ ...newRnc, scheduled_collection_date: e.target.value })}
                                                            />
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
                                                                        <p className="text-[11px] font-bold text-white">{newRnc.return_invoice_number || 'Não Informada'}</p>
                                                                    </div>
                                                                </div>
                                                                {newRnc.return_destination === 'REWORK' && (
                                                                    <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                                                                        <RefreshCcw size={14} className="text-emerald-400" />
                                                                        <div>
                                                                            <p className="text-[8px] font-black text-slate-500 uppercase">NF Retrabalho</p>
                                                                            <p className="text-[11px] font-bold text-white">{newRnc.rework_invoice_number || 'Pendente'}</p>
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
                                                                    {newRnc.return_destination === 'DISCARD' 
                                                                        ? `Ocorrência com descarte total de ${newRnc.returned_quantity} ${newRnc.uom || 'un'} autorizado. Prejuízo financeiro direto de R$ ${((newRnc.returned_quantity || 0) * (newRnc.unit_price || 0)).toLocaleString('pt-BR')}.`
                                                                        : `Lote de ${newRnc.returned_quantity} ${newRnc.uom || 'un'} em processo de retrabalho. Recuperação parcial de ${newRnc.final_quantity} ${newRnc.uom || 'un'} (${(newRnc.returned_quantity > 0 ? (((newRnc.final_quantity || 0) / (newRnc.returned_quantity || 1)) * 100).toFixed(1) : 0)}% de eficiência).`
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Process Status Section */}
                                    <RncStatusGrid
                                        newRnc={newRnc}
                                        setNewRnc={setNewRnc}
                                        RNC_STATUS={RNC_STATUS}
                                    />

                                    {/* Maintenance (Checklist & Timeline) Section */}
                                    <RncMaintenance
                                        newRnc={newRnc}
                                        newChecklistItem={newChecklistItem}
                                        setNewChecklistItem={setNewChecklistItem}
                                        addChecklistItem={addChecklistItem}
                                        toggleChecklistItem={toggleChecklistItem}
                                        removeChecklistItem={removeChecklistItem}
                                        newTimelineText={newTimelineText}
                                        setNewTimelineText={setNewTimelineText}
                                        addTimelineItem={addTimelineItem}
                                        TIMELINE_ICONS={TIMELINE_ICONS}
                                    />

                                    {/* Attachments & Commercial Agreement Section */}
                                    <RncAttachments
                                        newRnc={newRnc}
                                        setNewRnc={setNewRnc}
                                        handleFileUpload={handleFileUpload}
                                        removeAttachment={removeAttachment}
                                    />
                                </fieldset>

                                <div className="pt-8 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 h-16 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        {isLockedByAudit ? 'Fechar' : 'Cancelar'}
                                    </button>
                                    {isEditing && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onOpenJourneyReport('RNC', { ...newRnc, id: selectedRecord.id })}
                                                className="flex-1 h-16 bg-amber-50 text-amber-600 border border-amber-100 font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-amber-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <History size={20} />
                                                Relatório
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onNewTask(newRnc.client_name, {
                                                        title: `[RNC INTERNAL #${newRnc.rnc_number}] ${newRnc.subject}`,
                                                        description: `Referente à RNC No. ${newRnc.rnc_number}\nAssunto: ${newRnc.subject}\nCausa: ${newRnc.root_cause_ishikawa}`,
                                                        priority: newRnc.priority,
                                                        parent_rnc_id: selectedRecord.id
                                                    });
                                                }}
                                                className="flex-1 h-16 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-emerald-100"
                                            >
                                                <CheckSquare size={20} />
                                                Gerar Tarefa Kanban
                                            </button>
                                        </>
                                    )}
                                    {!isLockedByAudit ? (
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-[2] h-16 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-black transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-3"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <Save size={20} />
                                                    {isEditing ? 'Atualizar RNC' : 'Salvar RNC'}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="flex-[2] h-16 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-100"
                                        >
                                            <CheckCircle2 size={20} />
                                            Auditado
                                        </button>
                                    )}
                                </div>
                            </form >
                        </div >
                    </div >
                )
            }
        </div >
    );
};

export default RncView;
