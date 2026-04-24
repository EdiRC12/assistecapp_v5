import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Save, Printer, Edit, FileText, CheckCircle2, History, ClipboardList, Copy, Check, CheckSquare, Plus, Layers, Trash2 } from 'lucide-react';
import { generateServiceJourneyReport } from '../services/aiService';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo_plastimarau.png';
import PrintableReport from './PrintableReport';

const ServiceJourneyReport = ({
    journey,
    currentUser,
    onSave,
    onClose,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
}) => {
    const effectiveClientName = (journey.sac?.client_name && journey.sac.client_name.trim())
        ? journey.sac.client_name
        : (journey.rnc?.client_name || 'Não informado');

    const [title, setTitle] = useState(`Relatório de Jornada - ${effectiveClientName}`);
    const [rawNotes, setRawNotes] = useState('');
    const [content, setContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState('editor'); // 'editor' or 'preview'
    const [isCopied, setIsCopied] = useState(false);
    const [mediaList, setMediaList] = useState([]);
    const [reportId, setReportId] = useState(null);
    const [reportType, setReportType] = useState('PARCIAL');
    const [isLocked, setIsLocked] = useState(false);
    const [pendingActions, setPendingActions] = useState([]);
    const [newAction, setNewAction] = useState('');
    const printRef = useRef();

    // Carregar relatório existente ao abrir
    useEffect(() => {
        const fetchExistingReport = async () => {
            try {
                const query = supabase
                    .from('task_reports')
                    .select('*')
                    .eq('report_type', journey.sac?.is_return ? 'SERVICE_RETURN' : 'SERVICE_JOURNEY');

                if (journey.sac?.is_followup) {
                    query.eq('followup_id', journey.sac.id);
                } else if (journey.sac?.is_ri) {
                    query.eq('sac_id', journey.sac.id);
                } else if (journey.sac?.id) {
                    query.eq('sac_id', journey.sac.id);
                } else if (journey.rnc?.id) {
                    query.eq('rnc_id', journey.rnc.id);
                } else {
                    return;
                }

                const { data, error } = await query.maybeSingle();
                if (error) throw error;

                if (data) {
                    setReportId(data.id);
                    setTitle(data.title);
                    setContent(data.content);
                    setRawNotes(data.raw_notes || '');
                    setMediaList(data.media_urls || []);
                    setReportType(data.status === 'FINALIZADO' ? 'FINAL' : 'PARCIAL');
                    setIsLocked(data.status === 'FINALIZADO');
                }
            } catch (err) {
                console.error("Erro ao carregar relatório existente:", err);
            }
        };
        fetchExistingReport();

        // Carregar pendências vinculadas aos IDs da jornada
        const fetchPendingActions = async () => {
            const ids = [];
            if (journey.sac?.id) ids.push(journey.sac.id);
            if (journey.rnc?.id) ids.push(journey.rnc.id);
            if (ids.length === 0) return;

            const { data, error } = await supabase
                .from('visit_pending_actions')
                .select('*')
                .or(`sac_id.in.(${ids.join(',')}),rnc_id.in.(${ids.join(',')})`);

            if (data) setPendingActions(data);
        };
        fetchPendingActions();
    }, [journey.sac?.id, journey.rnc?.id]);

    const handlePrepareReport = async () => {
        if (content && !window.confirm("Já existe conteúdo neste relatório. Deseja regerar os dados? Isso substituirá suas edições manuais.")) {
            return;
        }

        setIsGenerating(true);
        setTimeout(async () => {
            try {
                const result = await generateServiceJourneyReport(rawNotes, [], journey);
                setContent(result.reportText);
                setViewMode('editor'); // Garante que volta para o editor ao gerar
            } catch (error) {
                notifyError("Erro ao organizar dados", error.message);
            } finally {
                setIsGenerating(false);
            }
        }, 600);
    };

    const copyToClipboard = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleSave = async (finalize = false) => {
        setIsSaving(true);
        try {
            const isFinal = finalize || reportType === 'FINAL';
            
            // Log para depuração de IDs (ajuda a ver qual FK está falhando)
            console.log('[ServiceJourneyReport] Preparando payload de salvamento (Ajustado para Schema SacTickets)...', {
                sac: journey.sac,
                is_ri: journey.sac?.is_ri
            });

            const reportData = {
                // Se for RI, gravamos como sac_id para respeitar a FK que aponta para sac_tickets (conforme erro F12)
                sac_id: (journey.sac?.id && !journey.sac?.is_followup) ? journey.sac.id : null,
                followup_id: journey.sac?.is_followup ? journey.sac.id : null,
                rnc_id: journey.rnc?.id || null,
                user_id: currentUser.id,
                title,
                client_name: effectiveClientName,
                content: content || rawNotes,
                raw_notes: rawNotes,
                status: isFinal ? 'FINALIZADO' : 'DRAFT',
                report_type: journey.sac?.is_return ? 'SERVICE_RETURN' : 'SERVICE_JOURNEY',
                media_urls: mediaList,
                updated_at: new Date().toISOString()
            };

            // Removemos ri_id do payload pois ele causa erro de FK no banco atual
            delete reportData.ri_id;

            console.log('[ServiceJourneyReport] Payload Final Enviado:', reportData);

            if (isFinal) {
                reportData.signed_by = currentUser.id;
                reportData.signature_date = new Date().toISOString();
            }

            let result;
            if (reportId) {
                result = await supabase
                    .from('task_reports')
                    .update(reportData)
                    .eq('id', reportId)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from('task_reports')
                    .insert(reportData)
                    .select()
                    .single();
            }

            const { data, error } = result;
            if (error) throw error;

            // Se for FINALIZADO, fechar o SAC/RNC raiz
            if (isFinal) {
                // 1. Fechar o SAC (se não for virtual e não for followup)
                if (journey.sac?.id && !journey.sac?.is_virtual && !journey.sac?.is_followup) {
                    await supabase
                        .from('sac_tickets')
                        .update({ status: 'RESOLVIDO', updated_at: new Date().toISOString() })
                        .eq('id', journey.sac.id);
                }

                // 2. Fechar o Acompanhamento (se for followup)
                if (journey.sac?.is_followup) {
                    await supabase
                        .from('tech_followups')
                        .update({
                            stability_status: 'SOLUCIONADO',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', journey.sac.id);
                }

                // 3. Fechar a RNC (se existir)
                if (journey.rnc?.id) {
                    await supabase
                        .from('rnc_records')
                        .update({ status: 'FECHADO', updated_at: new Date().toISOString() })
                        .eq('id', journey.rnc.id);
                }

                // 4. Fechar Devoluções Vinculadas (se existirem)
                if (journey.rnc?.id || journey.sac?.id) {
                    const returnQuery = supabase.from('product_returns').update({ status: 'CONCLUÍDO' });
                    if (journey.rnc?.id) returnQuery.eq('rnc_id', journey.rnc.id);
                    else if (journey.sac?.id) returnQuery.eq('sac_id', journey.sac.id);
                    await returnQuery;
                }

                // Atualizar estado local para refletir o status finalizado
                setReportType('FINAL');
                setIsLocked(true);
            }

            notifySuccess(isFinal ? "Relatório Finalizado! Atendimento encerrado e bloqueado." : "Rascunho salvo com sucesso.");
            if (onSave) onSave(data);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            notifyError("Erro ao salvar relatório", error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPendingAction = async () => {
        if (!newAction.trim()) return;
        const actionData = {
            description: newAction.trim(),
            status: 'PENDENTE',
            sac_id: (journey.sac?.id && !journey.sac?.is_followup && !journey.sac?.is_ri) ? journey.sac.id : null,
            rnc_id: journey.rnc?.id || null,
            user_id: currentUser.id
        };

        const { data, error } = await supabase.from('visit_pending_actions').insert(actionData).select().single();
        if (!error && data) {
            setPendingActions(prev => [...prev, data]);
            setNewAction('');
        }
    };

    const handleToggleActionStatus = async (action) => {
        const newStatus = action.status === 'PENDENTE' ? 'CONCLUÍDO' : 'PENDENTE';
        const { error } = await supabase.from('visit_pending_actions').update({ status: newStatus }).eq('id', action.id);
        if (!error) {
            setPendingActions(prev => prev.map(a => a.id === action.id ? { ...a, status: newStatus } : a));
        }
    };

    const handleDeleteAction = async (id) => {
        const { error } = await supabase.from('visit_pending_actions').delete().eq('id', id);
        if (!error) {
            setPendingActions(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleReopenReport = async () => {
        if (!window.confirm("Deseja reabrir este relatório para edição? Isso removerá a assinatura e reabrirá o atendimento para modificações.")) return;

        setIsSaving(true);
        try {
            // 1. Reabrir o Relatório
            const { data, error } = await supabase
                .from('task_reports')
                .update({
                    status: 'EM_ABERTO',
                    signed_by: null,
                    signature_date: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', reportId)
                .select()
                .single();

            if (error) throw error;

            // 2. Reabrir o SAC (se não for virtual)
            if (journey.sac?.id && !journey.sac?.is_virtual) {
                await supabase
                    .from('sac_tickets')
                    .update({ status: 'EM_ANALISE', updated_at: new Date().toISOString() })
                    .eq('id', journey.sac.id);
            }

            // 3. Reabrir a RNC (se existir)
            if (journey.rnc?.id) {
                await supabase
                    .from('rnc_records')
                    .update({ status: 'EM_EXECUCAO', updated_at: new Date().toISOString() })
                    .eq('id', journey.rnc.id);
            }

            // 4. Reabrir Devoluções Vinculadas (se existirem) - Lógica da Lâmpada (PENDENTE)
            if (journey.rnc?.id || journey.sac?.id) {
                const retQuery = supabase.from('product_returns').update({ status: 'PENDENTE' });
                if (journey.rnc?.id) retQuery.eq('rnc_id', journey.rnc.id);
                else if (journey.sac?.id) retQuery.eq('sac_id', journey.sac.id);
                await retQuery;
            }

            setIsLocked(false);
            setReportType('PARCIAL');
            notifySuccess("Relatório e Atendimento reabertos para edição.");
            if (onSave) onSave(data);
        } catch (error) {
            console.error("Erro ao reabrir:", error);
            notifyError("Erro ao reabrir", error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const printContent = printRef.current ? printRef.current.innerHTML : '';

        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { 
                            margin: 1.5cm; 
                            size: portrait;
                        }
                        @media print {
                            body { background: white !important; }
                            .printable-area { 
                                width: 210mm !important; 
                                margin: 0 auto !important;
                                padding: 0 !important;
                            }
                        }
                        body { 
                            font-family: 'Inter', sans-serif; 
                            background: #f1f5f9;
                            margin: 0;
                            padding: 20px;
                        }
                        .printable-area { 
                            background: white; 
                            margin: 0 auto; 
                            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                        }
                    </style>
                </head>
                <body onload="setTimeout(() => { window.print(); window.close(); }, 600);">
                    <div class="printable-area">
                        ${printContent}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Adaptar dados da Jornada para o formato esperado pelo PrintableReport
    const journeyAsTask = {
        client: effectiveClientName,
        category: 'SERVICE_JOURNEY',
        subject: journey.sac?.subject || journey.rnc?.subject || 'RNC Avulsa',
        appointment_number: journey.sac?.appointment_number || journey.rnc?.rnc_number || journey.sac?.followup_number,
        description: journey.sac?.description || journey.rnc?.root_cause_ishikawa,
        op: journey.rnc?.op || journey.sac?.op,
        item: journey.rnc?.item_name || journey.sac?.item_name,
        item_number: journey.rnc?.item_code || journey.sac?.item_number,
        rnc: journey.rnc?.rnc_number,
        solicitante: journey.rnc?.requester_name || journey.sac?.contact_name,
        contato: journey.sac?.contact_name || journey.rnc?.requester_name,
        origem: 'SERVICE_JOURNEY',
        followup_id: journey.sac?.is_followup ? journey.sac.id : null,
        sac_id: (journey.sac?.id && !journey.sac?.is_followup && !journey.sac?.is_ri) ? journey.sac.id : null,
        ri_id: journey.sac?.is_ri ? journey.sac.id : null,
        rnc_id: journey.rnc?.id || null,
        // Novos campos para o relatório aprimorado
        has_return: journey.rnc?.has_return || journey.sac?.has_return || false,
        returned_quantity: (journey.rnc?.returned_quantity || journey.sac?.returned_quantity || 0),
        unit_price: (journey.rnc?.unit_price || journey.sac?.unit_price || 0),
        final_quantity: (journey.rnc?.final_quantity || journey.sac?.final_quantity || 0),
        new_unit_price: (journey.rnc?.new_unit_price || journey.sac?.new_unit_price || 0),
        uom: journey.rnc?.uom || journey.sac?.uom || 'un',
        timeline: journey.rnc?.timeline || journey.sac?.timeline || [],
        commercial_agreement: journey.rnc?.commercial_agreement || journey.sac?.commercial_agreement || '',
        created_at: journey.sac?.created_at || journey.rnc?.created_at
    };

    // Consolidar Mídias Disponíveis (SAC + RNC + Tarefas)
    const availableMedia = [
        ...(journey.sac?.attachments || []),
        ...(journey.rnc?.attachments || []),
        ...((journey.tasks || []).flatMap(t => t.attachments || []) || [])
    ].filter((v, i, a) => v && a.findIndex(t => t.url === v.url) === i);

    const handleImportAllMedia = () => {
        setMediaList(availableMedia);
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-slide">
                {/* Header omitted for brevity in replace, but keeping structure */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-900/20 border border-white/10">
                            <History size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                Auditoria Técnica Profissional
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                {journey.sac?.is_followup ? `DOSSIÊ #${journey.sac.followup_number}` : journey.sac?.is_virtual ? 'MONITORAMENTO DIRETO' : `SAC #${journey.sac?.appointment_number}`} • {effectiveClientName} • Jornada Auditada
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                </div>

                {/* Toolbar e Áreas de Editor/Preview continuam aqui */}

                {/* Toolbar */}
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('editor')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
                        >
                            <Edit size={14} className="inline mr-2" /> Editor
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
                        >
                            <FileText size={14} className="inline mr-2" /> Preview Profissional
                        </button>
                    </div>

                    <div className="flex gap-3">
                        {isLocked ? (
                            <button
                                onClick={handleReopenReport}
                                disabled={isSaving}
                                className="bg-amber-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-amber-200 disabled:opacity-50"
                            >
                                <X size={16} /> Reabrir Relatório
                            </button>
                        ) : (
                            <>
                                <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                                    <button
                                        onClick={() => setReportType('PARCIAL')}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportType === 'PARCIAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Parcial
                                    </button>
                                    <button
                                        onClick={() => setReportType('FINAL')}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportType === 'FINAL' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Final
                                    </button>
                                </div>

                                {viewMode === 'editor' && (
                                    <button
                                        onClick={handlePrepareReport}
                                        disabled={isGenerating}
                                        className="bg-brand-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-brand-200 disabled:opacity-50"
                                    >
                                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        {content ? 'Regerar Relatório' : 'Preparar Relatório'}
                                    </button>
                                )}

                                <button
                                    onClick={() => handleSave(reportType === 'FINAL')}
                                    disabled={isSaving}
                                    className={`${reportType === 'FINAL' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-900 shadow-slate-200'} text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50`}
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {reportType === 'FINAL' ? 'Finalizar e Trancar' : 'Salvar Rascunho'}
                                </button>
                            </>
                        )}

                        {content && (
                            <button
                                onClick={copyToClipboard}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCopied ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-white text-slate-400 border border-slate-200'}`}
                            >
                                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                {isCopied ? 'Copiado!' : 'Copiar Texto'}
                            </button>
                        )}

                        <button onClick={handlePrint} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                            <Printer size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Main Area */}
                    <div className="flex-1 relative flex flex-col bg-slate-50/50">
                        {/* Area de Editor - Visível apenas em viewMode editor */}
                        <div className={`flex-1 overflow-y-auto custom-scrollbar ${viewMode === 'editor' ? '' : 'hidden'}`}>
                            <div className="p-8 space-y-6 max-w-4xl mx-auto">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Relatório</label>
                                    <input
                                        type="text"
                                        value={title}
                                        disabled={isLocked}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas Internas do Auditor</label>
                                        <textarea
                                            value={rawNotes}
                                            disabled={isLocked}
                                            onChange={(e) => setRawNotes(e.target.value)}
                                            placeholder="Descreva aqui detalhes internos ou observações não visíveis no relatório final..."
                                            className="w-full h-32 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-slate-600 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 resize-none shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-50"
                                        />
                                    </div>
                                    <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 text-brand-600 mb-2">
                                            <Sparkles size={16} />
                                            <span className="text-[10px] font-black uppercase">Dica do Auditor</span>
                                        </div>
                                        <p className="text-[10px] text-brand-700 leading-relaxed font-medium">As notas internas ajudam a fundamentar o parecer técnico mas não aparecem na pré-visualização. Clique em "Preparar Relatório" para consolidar os dados do SAC/RNC e Kanban.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conteúdo Técnico do Relatório (Editável)</label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic ml-1">* O relatório impresso conterá apenas este texto e os dados de cabeçalho.</p>
                                        </div>
                                        {availableMedia.length > 0 && (
                                            <button
                                                onClick={handleImportAllMedia}
                                                disabled={isLocked}
                                                className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all flex items-center gap-2 border-2 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''} ${mediaList.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-brand-50 border-brand-200 text-brand-600 hover:bg-brand-100'}`}
                                            >
                                                {mediaList.length > 0 ? <CheckCircle2 size={16} /> : <ClipboardList size={16} />}
                                                {mediaList.length > 0 ? 'Mídias Importadas' : `Importar Anexos da Jornada (${availableMedia.length})`}
                                            </button>
                                        )}
                                    </div>

                                    {/* Lista de Mídias Importadas (Visual apenas no Editor) */}
                                    {mediaList.length > 0 && (
                                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                            {mediaList.map((m, idx) => (
                                                <div key={idx} className="relative w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200 group">
                                                    {m.type?.startsWith('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(m.url || m.name) ? (
                                                        <img src={m.url} className="w-full h-full object-cover" alt="Anexo" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                            <FileText size={24} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => setMediaList(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <textarea
                                        value={content}
                                        disabled={isLocked}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Clique em 'Preparar Relatório' para gerar o conteúdo automaticamente ou escreva aqui..."
                                        className="w-full h-[500px] px-8 py-6 bg-white border border-slate-200 rounded-[32px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 shadow-xl leading-relaxed custom-scrollbar disabled:opacity-50 disabled:bg-slate-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Area de Preview - Sempre no DOM para permitir impressão, mas oculta se não estiver ativa */}
                        <div className={`flex-1 overflow-y-auto custom-scrollbar bg-slate-200 p-8 ${viewMode === 'preview' ? 'flex justify-center' : 'absolute pointer-events-none opacity-0 invisible h-0 w-0'}`}>
                            <div className="shadow-2xl scale-95 origin-top transform transition-transform">
                                <PrintableReport
                                    ref={printRef}
                                    task={journeyAsTask}
                                    content={content || rawNotes}
                                    currentUser={currentUser}
                                    taskTypes={[]}
                                    status="FINALIZADO"
                                    media={[]} // O relatório impresso não deve carregar os anexos, conforme solicitado
                                />
                            </div>
                        </div>
                    </div>

                    {/* Context Sidebar */}
                    <div className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                            <History size={16} className="text-slate-400" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Painel de Referência</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <span className="text-[8px] font-black text-brand-600 uppercase block mb-1">
                                    {journey.sac?.is_followup ? 'Dossiê de Acompanhamento' : journey.sac?.is_virtual ? 'Origem RNC Avulsa' : 'Origem SAC'}
                                </span>
                                <p className="text-xs font-bold text-slate-800 line-clamp-3">
                                    {journey.sac?.description || journey.rnc?.root_cause_ishikawa}
                                </p>
                                <div className="mt-2 text-[9px] text-slate-500 font-medium">
                                    Aberto em {new Date(journey.sac?.created_at || journey.rnc?.created_at || new Date()).toLocaleDateString()}
                                </div>
                            </div>

                            {journey.rnc && (
                                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[8px] font-black text-rose-600 uppercase">RNC Detalhada</span>
                                        <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[8px] font-bold">#{journey.rnc.rnc_number}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[10px]"><span className="text-slate-400 font-bold uppercase">NF:</span> {journey.rnc.invoice_number || 'N/I'}</p>
                                        <p className="text-[10px]"><span className="text-slate-400 font-bold uppercase">OP:</span> {journey.rnc.op || 'N/I'}</p>
                                        <p className="text-[10px]"><span className="text-slate-400 font-bold uppercase">Item:</span> {journey.rnc.item_name || 'N/I'}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-4 ml-1">
                                    <ClipboardList size={12} /> Timeline Kanban ({journey.tasks.length})
                                </h4>
                                <div className="space-y-2">
                                    {(journey.tasks || []).map(t => (
                                        <div key={t.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.status === 'DONE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            <p className="font-bold text-slate-700 text-[10px] pl-1 truncate">{t.title}</p>
                                            <div className="flex justify-between items-center mt-1 pl-1">
                                                <span className="text-[8px] text-slate-400 font-medium">{new Date(t.created_at).toLocaleDateString()}</span>
                                                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase ${t.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 text-center' : 'bg-amber-50 text-amber-600 text-center'}`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {journey.tasks.length === 0 && (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                                            <p className="text-[10px] text-slate-300 font-bold uppercase">Sem Histórico Kanban</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    <CheckSquare size={12} /> Pendências de Visita ({pendingActions.length})
                                </h4>

                                {!isLocked && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newAction}
                                            onChange={(e) => setNewAction(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddPendingAction()}
                                            placeholder="Nova pendência..."
                                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                        <button
                                            onClick={handleAddPendingAction}
                                            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {pendingActions.map(action => (
                                        <div key={action.id} className="group p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                                            <button
                                                onClick={() => !isLocked && handleToggleActionStatus(action)}
                                                className={`mt-0.5 shrink-0 ${action.status === 'CONCLUÍDO' ? 'text-emerald-500' : 'text-slate-300'}`}
                                            >
                                                {action.status === 'CONCLUÍDO' ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 border-2 border-slate-200 rounded-md" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[10px] font-bold leading-tight ${action.status === 'CONCLUÍDO' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                    {action.description}
                                                </p>
                                            </div>
                                            {!isLocked && (
                                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            const taskPayload = {
                                                                title: `PENDÊNCIA: ${action.description}`,
                                                                description: `Origem: Jornada da visita - ${effectiveClientName}`,
                                                                status: 'TODO'
                                                            };
                                                            // Logic for creating task can be expanded
                                                            notifyInfo("Convertendo para Kanban...");
                                                        }}
                                                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                        title="Converter em Kanban"
                                                    >
                                                        <Layers size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAction(action.id)}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {pendingActions.length === 0 && (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                                            <p className="text-[10px] text-slate-300 font-bold uppercase italic">Sem pendências registradas</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceJourneyReport;
