import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Loader2, Plus, X, Paperclip, FileText, Trash2, Eye, CheckCircle2, AlertCircle, FileDown, Save, Printer, CheckCircle, Edit, ClipboardList, Copy, Check } from 'lucide-react';
import { generateReportWithGemini, refineReportText, buildAIDataPackage, generateNativeReportFallback } from '../services/aiService';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useReactToPrint } from 'react-to-print';
import { INITIAL_NATIVE_CATEGORIES } from '../constants/taskConstants';
import PrintableReport from './PrintableReport';
import logo from '../assets/logo_plastimarau.png';

// Tipos de tarefa nativos
const NATIVE_TASK_TYPES = INITIAL_NATIVE_CATEGORIES.map(cat => ({
    id: cat.id,
    name: cat.label,
    isNative: true
}));

const ReportEditor = ({
    task: initialTask,
    report,
    onSave,
    onFinalize,
    currentUser,
    onAddStage,
    onOpenPrint,
    onClose,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
}) => {
    // Estado para manter os dados completos da tarefa (incluindo OP, Pedido, etc.)
    const [task, setTask] = useState(initialTask);

    const [reportType, setReportType] = useState(report?.report_type || (report?.status === 'FINALIZADO' ? 'FINAL' : 'PARCIAL'));
    const [isLocked, setIsLocked] = useState(report?.status === 'FINALIZADO');
    const isFinalized = isLocked; // Mantendo o nome para compatibilidade com o restante do código

    // Definindo título inicial baseado no tipo de relatório
    const defaultTitle = reportType === 'FINAL'
        ? `Relatório Final - ${task.client || ''}`
        : `Relatório Parcial - ${task.client || ''}`;

    const [title, setTitle] = useState(report?.title || defaultTitle);
    const [taskTypes, setTaskTypes] = useState(NATIVE_TASK_TYPES);
    const [rawNotes, setRawNotes] = useState(report?.raw_notes || '');
    const [content, setContent] = useState(report?.content || '');
    const [mediaList, setMediaList] = useState(report?.media_urls || []);
    const [suggestedActions, setSuggestedActions] = useState(report?.suggested_actions || []);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingMediaIdx, setEditingMediaIdx] = useState(null);
    const [tempDescription, setTempDescription] = useState('');
    const [useAI, setUseAI] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Novos campos comerciais/pós-venda
    const [solicitanteVisita, setSolicitanteVisita] = useState(report?.solicitante || '');
    const [contatoCliente, setContatoCliente] = useState(report?.contato || '');
    const [produtoRelacionado, setProdutoRelacionado] = useState(report?.produto || '');
    const [manualActions, setManualActions] = useState(Array.isArray(report?.manual_actions) ? report.manual_actions : []);
    const [newActionWhat, setNewActionWhat] = useState('');
    const [newActionWho, setNewActionWho] = useState('');
    const [newActionWhen, setNewActionWhen] = useState('');


    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const pdfRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: pdfRef,
        documentTitle: title || `Relatório_${task.client || 'Tecnico'}`,
        onAfterPrint: () => setShowPrintPreview(false),
        pageStyle: `
            @page { size: A4; margin: 20mm; }
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .overflow-y-auto { overflow: visible !important; height: auto !important; }
            }
        `
    });

    const confirmPrint = () => {
        handlePrint();
    };

    const handleOpenPrintPreview = () => {
        setShowPrintPreview(true);
    };

    // Efeito para carregar dados completos da tarefa e tipos (native + custom)
    useEffect(() => {
        const loadData = async () => {
            // 1. Carregar dados completos da tarefa (garantir OP, Pedido, etc.)
            if (initialTask?.id) {
                const { data: fullTask, error: taskError } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('id', initialTask.id)
                    .single();

                if (!taskError && fullTask) {
                    setTask(fullTask);
                }
            }

            // 2. Carregar categorias customizadas
            try {
                // Tenta buscar na tabela nova de categorias customizadas
                const { data: customCats, error: customError } = await supabase
                    .from('custom_categories')
                    .select('*');

                if (!customError && customCats) {
                    const formattedCustom = customCats.map(c => ({
                        id: c.id,
                        name: c.label || c.name, // Fallback safe
                        isNative: false
                    }));
                    setTaskTypes([...NATIVE_TASK_TYPES, ...formattedCustom]);
                } else {
                    // Se falhar ou tabela não existir, tenta task_types (legado)
                    const { data: legacyCats, error: legacyError } = await supabase
                        .from('task_types')
                        .select('id, name');

                    if (!legacyError && legacyCats) {
                        setTaskTypes([...NATIVE_TASK_TYPES, ...legacyCats]);
                    }
                }
            } catch (err) {
                setTaskTypes(NATIVE_TASK_TYPES);
            }
        };
        loadData();
    }, [initialTask]);

    // --- Resiliência: LocalStorage para Rascunhos ---
    useEffect(() => {
        const draftKey = `assistec_draft_report_${task.id}`;
        if (!report?.id) { // Só carrega draft se não houver um relatório salvo no DB (novo relatório)
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                setRawNotes(draft.rawNotes || '');
                setContent(draft.content || '');
                setTitle(draft.title || title);
                if (draft.mediaList) {
                    setMediaList(draft.mediaList);
                }
                // Carregar campos comerciais do rascunho
                setSolicitanteVisita(draft.solicitanteVisita || '');
                setContatoCliente(draft.contatoCliente || '');
                setProdutoRelacionado(draft.produtoRelacionado || '');
                setManualActions(draft.manualActions || []);
            }
        } else if (report?.media_urls && Array.isArray(report.media_urls)) {
            // Load existing media from saved report
            setMediaList(report.media_urls.map(m => ({ ...m, file: null })));
        }
    }, [task.id, report?.id]);

    useEffect(() => {
        const draftKey = `assistec_draft_report_${task.id}`;
        const timeout = setTimeout(() => {
            // Salvar rascunho incluindo a lista de mídias (apenas as que têm URL e não são blobs temporários gigantes)
            const mediaToSave = mediaList.map(m => ({
                ...m,
                file: null // Nunca salvar o objeto File no localStorage
            }));
            localStorage.setItem(draftKey, JSON.stringify({
                rawNotes, content, title, mediaList: mediaToSave,
                solicitanteVisita, contatoCliente, produtoRelacionado, manualActions
            }));
        }, 1000);
        return () => clearTimeout(timeout);
    }, [rawNotes, content, title, mediaList, task.id, solicitanteVisita, contatoCliente, produtoRelacionado, manualActions]);

    // CRÍTICO: Resetar estados quando task ou report mudam
    useEffect(() => {
        console.log('ReportEditor: Resetando estados - Task:', task.id, 'Report:', report?.id);

        const currentType = report?.report_type || (report?.status === 'FINALIZADO' ? 'FINAL' : 'PARCIAL');
        const currentIsLocked = report?.status === 'FINALIZADO';

        const newDefaultTitle = currentType === 'FINAL'
            ? `Relatório Final - ${task.client || ''}`
            : `Relatório Parcial - ${task.client || ''}`;


        // Atualiza título se report mudar externamente
        // Se não há report (novo relatório) OU se o report mudou, resetar tudo
        if (!report || !report.id) {
            console.log('ReportEditor: Criando NOVO relatório - limpando estados');
            setTitle(newDefaultTitle);
            setRawNotes('');
            setContent('');
            setMediaList([]);
            // Resetar novos campos comerciais
            setSolicitanteVisita('');
            setContatoCliente('');
            setProdutoRelacionado('');
            setManualActions([]);
            setNewActionWhat('');
            setNewActionWho('');
            setNewActionWhen('');
            setSuggestedActions([]);
            setReportType('PARCIAL');
            setIsLocked(false);
        } else {
            console.log('ReportEditor: Editando relatório existente - carregando dados');
            setTitle(report.title || newDefaultTitle);
            setRawNotes(report.raw_notes || '');
            setContent(report.content || '');
            setMediaList(report.media_urls || []);
            setSuggestedActions(report.suggested_actions || []);
            setReportType(currentType);
            setIsLocked(currentIsLocked);
        }
    }, [task.id, report?.id, report?.status]); // Adicionado report?.status para reagir a mudanças de status



    // Função para comprimir imagens
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const maxSize = 1200;
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize;
                            width = maxSize;
                        } else {
                            width = (width / height) * maxSize;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.7);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // NOVO: Refinar texto do relatório
    const handleRefineText = async () => {
        if (!content && !rawNotes) {
            notifyWarning("Escreva algo no relatório ou nas notas antes de refinar.");
            return;
        }
        setIsGenerating(true);
        try {
            const refined = await refineReportText(content || rawNotes, {
                client: task.client,
                category: task.category,
                reportType: reportType
            });
            if (refined) {
                setContent(refined);
            }
        } catch (error) {
            notifyError("Erro ao refinar texto", error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        console.log('ReportEditor: Arquivos selecionados:', files.length);

        const newMedia = await Promise.all(files.map(async (file) => {
            let processedFile = file;
            let fileType = 'document';
            let extractedText = '';

            // Comprimir apenas imagens
            if (file.type.startsWith('image/')) {
                console.log('ReportEditor: Comprimindo imagem:', file.name);
                const compressedBlob = await compressImage(file);
                processedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
                fileType = 'image';
            } else if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
                fileType = 'document';
                extractedText = await extractTextFromPDF(file);
            } else if (file.type.includes('word') || file.type.includes('msword') || file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
                fileType = 'document';
                extractedText = await extractTextFromDocx(file);
            } else if (file.type.includes('excel') || file.type.includes('sheet') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
                fileType = 'document';
                extractedText = await extractTextFromExcel(file);
            }

            const analysisErrorInitial = (fileType === 'document' && (!extractedText || extractedText.trim().length === 0));
            const aiDescriptionInitial = analysisErrorInitial
                ? `[Aviso: Não foi possível extrair texto de "${file.name}". Descreva manualmente ou use a versão final.]`
                : '';

            return {
                type: fileType,
                file: processedFile,
                url: URL.createObjectURL(processedFile),
                timestamp: new Date().toISOString(),
                name: file.name,
                extractedText: '',
                aiDescription: '',
                isAnalyzing: false,
                analysisError: false
            };
        }));

        console.log('ReportEditor: Adicionando arquivos à lista:', newMedia);
        setMediaList(prev => {
            const updated = [...prev, ...newMedia];
            console.log('ReportEditor: MediaList atualizada:', updated);
            return updated;
        });
    };



    const handleImportTaskAttachments = async () => {
        if (!task.attachments || task.attachments.length === 0) {
            notifyInfo("Não há anexos nesta tarefa para importar.");
            return;
        }

        const newMedia = task.attachments.map(att => {
            const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || att.url);
            return {
                type: isImage ? 'image' : 'document',
                file: null,
                url: att.url || att.content,
                timestamp: att.timestamp || new Date().toISOString(),
                name: att.name || (isImage ? 'imagem_tarefa' : 'documento_tarefa'),
                extractedText: '',
                aiDescription: '',
                isAnalyzing: false,
                analysisError: false,
                fromTask: true
            };
        });

        // Evitar duplicatas (checar por URL)
        setMediaList(prev => {
            const existingUrls = prev.map(m => m.url);
            const nonDuplicate = newMedia.filter(m => !existingUrls.includes(m.url));
            if (nonDuplicate.length === 0) {
                notifyInfo("Todos os anexos da tarefa já estão no relatório.");
                return prev;
            }
            return [...prev, ...nonDuplicate];
        });
    };



    const handleFileView = (url, filename = 'arquivo') => {
        if (!url || !url.startsWith('data:')) {
            window.open(url, '_blank');
            return;
        }

        try {
            const parts = url.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);

            if (contentType.startsWith('image/') || contentType === 'application/pdf') {
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.location.href = blobUrl;
                } else {
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
            notifyError("Não foi possível abrir este arquivo.");
        }
    };

    const startEditingDescription = (idx, currentDesc) => {
        setEditingMediaIdx(idx);
        setTempDescription(currentDesc || '');
    };

    const saveManualDescription = () => {
        if (editingMediaIdx === null) return;
        setMediaList(prev => prev.map((m, i) =>
            i === editingMediaIdx ? { ...m, aiDescription: tempDescription, analysisError: false } : m
        ));
        setEditingMediaIdx(null);
        setTempDescription('');
    };

    const copyToClipboard = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            const reportStatusTarget = reportType === 'FINAL' ? 'FINAL' : 'PARCIAL';
            const dataPackage = buildAIDataPackage(rawNotes, mediaList, {
                ...task,
                userName: currentUser?.username,
                manualStatus: reportType === 'FINAL' ? 'FINALIZADO' : 'EM_ABERTO',
                solicitanteVisita,
                contatoCliente,
                produtoRelacionado,
                manualActions
            });

            let result;

            if (useAI) {
                // Geração com IA (Gemini/OpenAI)
                const relevantMedia = mediaList.filter(m => m.aiDescription || m.extractedText);
                result = await generateReportWithGemini(rawNotes, relevantMedia, {
                    ...task,
                    userName: currentUser?.username,
                    manualStatus: reportType === 'FINAL' ? 'FINALIZADO' : 'EM_ABERTO',
                    taskTypes,
                    // Passar dados extras para a IA
                    solicitanteVisita,
                    contatoCliente,
                    produtoRelacionado,
                    manualActions
                });
            } else {
                // Geração Nativa (Direto do App - Pedido do Usuário)
                result = generateNativeReportFallback(dataPackage, reportStatusTarget);
            }

            if (result && result.reportText) {
                setContent(result.reportText);
                setSuggestedActions(result.suggestedActions || []);
                if (notifySuccess) notifySuccess('Sucesso', 'Relatório gerado com sucesso!');
            }
        } catch (error) {
            console.error("Erro na geração:", error);
            if (notifyError) notifyError(`Erro ao gerar relatório`, error.message);
            else alert("Erro ao gerar relatório: " + error.message);
        } finally {
            setIsGenerating(true); // Manter true por um momento para feedback visual se necessário, ou false direto
            setTimeout(() => setIsGenerating(false), 500);
        }
    };

    const syncPendingActionsToTable = async (savedReportId) => {
        if (!task?.id) return;

        try {
            // Delete all existing pending actions for this task to avoid duplicates
            await supabase
                .from('visit_pending_actions')
                .delete()
                .eq('linked_task_id', task.id);

            // Re-insert current manualActions
            if (manualActions.length > 0) {
                const toInsert = manualActions.map(action => ({
                    description: action.what,
                    status: action.completed ? 'CONCLUÍDO' : 'PENDENTE',
                    linked_task_id: task.id,
                    responsible_user_id: null,
                    deadline: null,
                    user_id: currentUser?.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // Store extra metadata in description for display
                    _who: action.who || '',
                    _when: action.when || '',
                }));

                // Map to valid columns only (no _who/_when)
                const validInsert = manualActions.map(action => ({
                    description: [
                        action.what,
                        action.who ? `Resp: ${action.who}` : null,
                        action.when ? `Prazo: ${action.when}` : null,
                    ].filter(Boolean).join(' | '),
                    status: action.completed ? 'CONCLUÍDO' : 'PENDENTE',
                    linked_task_id: task.id,
                    user_id: currentUser?.id,
                    updated_at: new Date().toISOString(),
                }));

                await supabase.from('visit_pending_actions').insert(validInsert);
            }
        } catch (err) {
            console.error('Erro ao sincronizar pendências:', err);
        }
    };

    const handleSave = async (finalize = false) => {
        try {
            console.log('ReportEditor: Salvando relatório. MediaList:', mediaList);

            // Converter arquivos para Base64
            const uploadedMedia = await Promise.all(mediaList.map(async (item) => {
                // Se já tem URL (não é arquivo novo), manter como está
                if (!item.file) {
                    console.log('ReportEditor: Mídia já tem URL:', item.url);
                    return item;
                }

                console.log('ReportEditor: Convertendo para Base64:', item.file.name);

                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            type: item.type,
                            url: reader.result,
                            timestamp: item.timestamp,
                            name: item.name || item.file.name,
                            extractedText: item.extractedText || '',
                            aiDescription: item.aiDescription || ''
                        });
                    };
                    reader.readAsDataURL(item.file);
                });
            }));

            const validMedia = uploadedMedia.filter(m => m !== null);
            console.log('ReportEditor: Mídias válidas para salvar:', validMedia);

            const reportData = {
                task_id: task.id,
                user_id: currentUser?.id,
                title,
                raw_notes: rawNotes,
                content,
                media_urls: validMedia,
                suggested_actions: suggestedActions,
                status: finalize ? 'FINALIZADO' : 'EM_ABERTO',
                report_type: reportType,
                solicitante: solicitanteVisita,
                contato: contatoCliente,
                produto: produtoRelacionado,
                manual_actions: manualActions,
                updated_at: new Date().toISOString()
            };

            if (finalize) {
                // BLOQUEIO: Verificar se existem ações não concluídas
                const pendingActions = manualActions.filter(a => !a.completed);
                if (pendingActions.length > 0) {
                    notifyWarning(`Existem ${pendingActions.length} ações pós-visita pendentes`, `Marque-as como concluídas para prosseguir.`);
                    return;
                }

                reportData.signed_by = currentUser?.id;
                reportData.signature_date = new Date().toISOString();
                setIsLocked(true); // Trava o editor localmente após salvar como finalizado
            }

            let result;
            if (report?.id) {
                // Update existing report
                result = await supabase
                    .from('task_reports')
                    .update(reportData)
                    .eq('id', report.id)
                    .select()
                    .single();
            } else {
                // Insert new report
                result = await supabase
                    .from('task_reports')
                    .insert(reportData)
                    .select()
                    .single();
            }

            const { data, error } = result;

            if (error) {
                console.error("Save error:", error);
                notifyError("Erro ao salvar relatório", error.message);
            } else {
                // Sync manual actions to visit_pending_actions table
                await syncPendingActionsToTable(data.id);

                // Tira o draft de resiliência
                localStorage.removeItem(`assistec_draft_report_${task.id}`);

                notifySuccess(finalize ? "Relatório finalizado!" : "Rascunho salvo.");
                if (onSave) onSave(data);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            notifyError("Erro inesperado ao salvar", err.message);
        }
    };

    const handleReopenReport = async () => {
        if (!report?.id) return;

        if (!window.confirm('Deseja reabrir este relatório para edição? Isso removerá a assinatura atual.')) {
            return;
        }

        try {
            const { data, error } = await supabase
                .from('task_reports')
                .update({
                    status: 'EM_ABERTO',
                    reopened_at: new Date().toISOString(),
                    reopened_by: currentUser?.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', report.id)
                .select()
                .single();

            if (error) {
                console.error("Reopen error:", error);
                notifyError("Erro ao reabrir relatório", error.message);
            } else {
                setIsLocked(false);
                notifySuccess('Relatório reaberto para edição.');
                if (onSave) onSave(data);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            notifyError("Erro inesperado ao reabrir", err.message);
        }
    };

    const handleExportPDF = async () => {
        if (!pdfRef.current) return;
        const canvas = await html2canvas(pdfRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${title}.pdf`);
    };

    const addSuggestedToTask = (action) => {
        if (onAddStage) {
            onAddStage(action);
            setSuggestedActions(prev => prev.filter(a => a !== action));
        }
    };


    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col max-h-[90vh] ${isFinalized ? 'opacity-95' : ''}`}
        >
            {/* 1. HEADER DO MODO (BANNER DINÂMICO - ESTILO AUDITORIA) */}
            <div className={`p-4 ${isFinalized ? 'bg-slate-900' : 'bg-brand-600'} text-white flex items-center justify-between shadow-md z-30 shrink-0`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                        <ClipboardList size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] flex items-center gap-2 text-white">
                            AUDITORIA TÉCNICA: {reportType === 'FINAL' ? 'RELATÓRIO FINAL' : 'RELATÓRIO PARCIAL'}
                            {isFinalized && <CheckCircle size={14} className="text-emerald-400" />}
                        </h2>
                        <p className="text-[9px] md:text-[10px] font-bold opacity-70 leading-tight uppercase tracking-widest mt-0.5">
                            {reportType === 'FINAL'
                                ? 'Ciclo de atendimento concluído e auditado via Brain AI.'
                                : 'Análise intercalar de conformidade técnica em campo.'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <img src={logo} alt="Plastimarau" className="h-10 w-auto opacity-50 contrast-125 hidden md:block" />
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar print:hidden">
                {/* Referências de Campo (Fotos e Documentos) - MOVED TO TOP */}
                <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm space-y-4 print:hidden">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                            <Paperclip size={18} className="text-brand-600" /> Referências de Campo (Apenas para o Técnico)
                        </h3>
                        {!isFinalized && task.attachments?.length > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleImportTaskAttachments(); }}
                                className="text-[10px] font-black bg-brand-50 text-brand-600 flex items-center gap-1 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
                            >
                                <Paperclip size={12} /> Importar da Tarefa ({task.attachments.length})
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                        {!isFinalized && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                                    className="flex flex-col items-center justify-center w-28 h-28 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all shrink-0 group"
                                >
                                    <Paperclip size={28} className="text-slate-400 group-hover:text-brand-600 transition-colors mb-2" />
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Adicionar</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    multiple
                                    className="hidden"
                                />
                            </>
                        )}

                        {mediaList.map((item, idx) => {
                            const itemUrl = item.url || (item.file ? URL.createObjectURL(item.file) : null);

                            return (
                                <div key={idx} className="relative w-28 h-28 bg-black rounded-xl overflow-hidden shrink-0 group shadow-md border border-slate-200">
                                    {item.type === 'image' ? (
                                        <img
                                            src={itemUrl}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform cursor-pointer"
                                            onClick={() => handleFileView(itemUrl, item.name)}
                                            title="Ver imagem"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-2 cursor-pointer" onClick={() => handleFileView(itemUrl, item.name)}>
                                            <div className="p-3 bg-white rounded-lg shadow-sm mb-2">
                                                <FileText size={28} className="text-brand-600" />
                                            </div>
                                            <span className="text-[9px] text-slate-800 text-center font-black truncate w-full px-1">
                                                {item.name || 'Arquivo'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Overlay Control */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        {!isFinalized && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startEditingDescription(idx, item.aiDescription); }}
                                                className="p-2 bg-blue-600 text-white rounded-lg hover:scale-110 transition-all shadow-xl"
                                                title="Adicionar legenda/descrição manual"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleFileView(itemUrl, item.name); }}
                                            className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/40 shadow-xl"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>

                                    {!isFinalized && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMediaList(m => m.filter((_, i) => i !== idx)); }}
                                            className="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase italic px-1">
                        * Estes anexos são apenas para referência do técnico e não serão incluídos na impressão do relatório.
                    </div>
                </div>

                {/* DADOS DE GESTÃO COMERCIAL - NOVO MODELO PADRÃO */}
                {!isFinalized && (
                    <div className="p-5 bg-brand-50/50 rounded-2xl border-2 border-brand-100 space-y-5 shadow-sm">
                        <h3 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.15em] flex items-center gap-2">
                            <Plus size={14} className="bg-brand-600 text-white rounded-full p-0.5" />
                            Dados de Gestão Comercial e Pós-Venda
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Solicitante da Visita */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Solicitante da Visita</label>
                                <div className="flex gap-2">
                                    {['REPRESENTANTE', 'CLIENTE', 'PLASTIMARAU'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setSolicitanteVisita(opt)}
                                            className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${solicitanteVisita === opt
                                                ? 'bg-brand-600 border-brand-600 text-white shadow-md scale-[1.05]'
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-brand-200 hover:text-brand-600'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Campo de Apoio à Gestão se for outra fonte */}
                            <div className="space-y-2 flex flex-col justify-end">
                                <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight italic">
                                    * A origem da visita agora é extraída automaticamente da categoria da tarefa ({task?.category || 'Não definida'}).
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contato no Cliente</label>
                                <input
                                    type="text"
                                    value={contatoCliente}
                                    onChange={(e) => setContatoCliente(e.target.value)}
                                    placeholder="Ex: Angélica (Qualidade)"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cargo em Pauta</label>
                                <input
                                    type="text"
                                    value={produtoRelacionado}
                                    onChange={(e) => setProdutoRelacionado(e.target.value)}
                                    placeholder="Ex: Gerente de Produção"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Status do Relatório e Título - REESTRUTURADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Definição do Tipo de Relatório</label>
                        <div className="flex bg-white p-1 rounded-xl border border-slate-300 shadow-sm">
                            <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => setReportType('PARCIAL')}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-lg text-xs font-black transition-all ${reportType === 'PARCIAL'
                                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500 shadow-sm'
                                    : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <AlertCircle size={18} />
                                PARCIAL
                            </button>
                            <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => {
                                    if (reportType === 'PARCIAL') {
                                        if (window.confirm("DESEJA GERAR O RELATÓRIO FINAL?")) {
                                            setReportType('FINAL');
                                        }
                                    } else {
                                        setReportType('FINAL');
                                    }
                                }}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-lg text-xs font-black transition-all ${reportType === 'FINAL'
                                    ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600 shadow-sm'
                                    : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <CheckCircle size={18} />
                                FINAL
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold italic px-1">
                            {reportType === 'FINAL'
                                ? '* Encerra o ciclo desta atividade e assina o documento.'
                                : '* Mantém o relatório como rascunho de progresso.'}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Título de Visualização</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título do relatório..."
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-black text-slate-800 focus:outline-none focus:border-brand-500 h-[64px]"
                        />
                    </div>
                </div>


                {/* Quick Notes */}
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Notas Rápidas (Ponto a Ponto)</label>
                    <textarea
                        value={rawNotes}
                        onChange={(e) => setRawNotes(e.target.value)}
                        disabled={isFinalized}
                        placeholder="Ex: PeçaX trocada, Vazamento resolvido, Cliente satisfeito..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm min-h-[100px] focus:outline-none focus:border-brand-500 disabled:bg-slate-50 font-medium text-slate-700 shadow-inner"
                    />
                </div>

                {/* SEÇÃO DE GERAÇÃO - REVERSÃO PARA MODELO NATIVO PRIORITÁRIO */}
                {!isFinalized && (
                    <div className="pt-4 border-t-2 border-slate-100 space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useAI ? 'bg-brand-600' : 'bg-slate-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${useAI ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="hidden" />
                                <span className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                                    <Sparkles size={16} className={useAI ? 'text-brand-600' : 'text-slate-400'} />
                                    Usar Assistência de Inteligência Artificial
                                </span>
                            </label>
                            {!useAI && (
                                <span className="text-[9px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg uppercase">Modo Nativo Ativo</span>
                            )}
                        </div>

                        <div className="space-y-4 p-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleGenerateReport(); }}
                                disabled={isGenerating}
                                className={`py-5 rounded-2xl font-black text-sm shadow-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 w-full ${reportType === 'FINAL'
                                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-100'
                                    : 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand-50'
                                    } text-white`}
                            >
                                {useAI ? <Sparkles size={24} /> : <ClipboardList size={24} />}
                                <span className="uppercase tracking-tighter">
                                    {useAI
                                        ? (reportType === 'FINAL' ? 'Gerar Relatório Final com IA' : 'Gerar Rascunho com IA')
                                        : (reportType === 'FINAL' ? 'Gerar Relatório Automático (Nativo)' : 'Carregar Dados da Tarefa (Nativo)')
                                    }
                                </span>
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-center px-4">
                                <AlertCircle size={10} />
                                {useAI
                                    ? "A IA analisará todos os dados e mídias para escrever o relatório."
                                    : "O sistema preencherá o relatório com Clientes, OP, Checklist e Notas automaticamente."}
                            </div>
                        </div>
                    </div>
                )}

                {/* Ações Pós-Visita Manuais (Nova Seção Integrada) */}
                {!isFinalized && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5">
                                <Plus size={14} className="bg-brand-600 text-white rounded-full p-0.5" />
                                Ações Pós-Visita (Atividade | Responsável | Prazo)
                            </h4>
                            <span className="text-[9px] text-slate-400 font-bold uppercase italic">Integração com Kanban</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <div className="md:col-span-5">
                                <input
                                    type="text"
                                    value={newActionWhat}
                                    onChange={(e) => setNewActionWhat(e.target.value)}
                                    placeholder="O que precisa ser feito? (Ex: Enviar Amostra)"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm h-10"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <input
                                    type="text"
                                    value={newActionWho}
                                    onChange={(e) => setNewActionWho(e.target.value)}
                                    placeholder="Quem?"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm h-10"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <input
                                    type="text"
                                    value={newActionWhen}
                                    onChange={(e) => setNewActionWhen(e.target.value)}
                                    placeholder="Quando?"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm h-10"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newActionWhat.trim()) {
                                            const newAction = {
                                                id: Date.now().toString(),
                                                what: newActionWhat.trim(),
                                                who: newActionWho.trim(),
                                                when: newActionWhen.trim(),
                                                completed: false
                                            };
                                            setManualActions(prev => [...prev, newAction]);

                                            // Adicionar também como etapa na lateral da tarefa automaticamente
                                            if (onAddStage) {
                                                const label = `${newAction.what} ${newAction.who ? `(${newAction.who})` : ''} ${newAction.when ? `- ${newAction.when}` : ''}`.trim();
                                                onAddStage(label);
                                            }

                                            setNewActionWhat('');
                                            setNewActionWho('');
                                            setNewActionWhen('');
                                        }
                                    }}
                                    className="w-full h-10 bg-brand-600 text-white rounded-xl shadow-md hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        {manualActions.length > 0 && (
                            <div className="space-y-2 mt-2">
                                {manualActions.map((action, i) => (
                                    <div
                                        key={action.id || i}
                                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${action.completed
                                            ? 'bg-emerald-50 border-emerald-200 opacity-80'
                                            : 'bg-white border-slate-200 hover:border-brand-200 shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setManualActions(prev => prev.map((a, idx) =>
                                                        idx === i ? { ...a, completed: !a.completed } : a
                                                    ));
                                                }}
                                                className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${action.completed
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-white border-slate-200 text-transparent hover:border-brand-400'
                                                    }`}
                                            >
                                                <CheckCircle size={14} />
                                            </button>

                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-black truncate ${action.completed ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                                                    {action.what}
                                                </span>
                                                <div className="flex gap-2 text-[9px] font-bold uppercase">
                                                    {action.who && <span className="text-slate-400">Responsável: <span className="text-brand-600">{action.who}</span></span>}
                                                    {action.when && <span className="text-slate-400">Prazo: <span className="text-amber-600">{action.when}</span></span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {action.completed && (
                                                <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-100 px-2 py-1 rounded-lg mr-1">Liberado</span>
                                            )}
                                            {!action.completed && (
                                                <span className="text-[9px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded-lg mr-1">Pendente</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setManualActions(prev => prev.filter((_, idx) => idx !== i))}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <p className="text-[9px] text-slate-400 font-bold uppercase text-center mt-2 italic">
                                    * Todas as ações devem estar marcadas como concluídas para permitir a finalização do relatório.
                                </p>
                            </div>
                        )}

                        {manualActions.length === 0 && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic border-2 border-dashed border-slate-100 rounded-xl">
                                Nenhuma ação pendente. Adicione acima para controlar o fluxo da visita.
                            </p>
                        )}
                    </div>
                )}

                {/* Final Content Editor */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Corpo do Relatório Técnico</label>
                        <div className="flex gap-4">
                            {content && (
                                <button
                                    onClick={copyToClipboard}
                                    className={`flex items-center gap-1.5 font-black text-[10px] uppercase transition-all ${isCopied ? 'text-emerald-600' : 'text-slate-400 hover:text-brand-600'}`}
                                >
                                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                    {isCopied ? 'Copiado!' : 'Copiar para IA Externa'}
                                </button>
                            )}
                            <button onClick={handleExportPDF} className="flex items-center gap-1.5 text-brand-600 font-black text-[10px] uppercase hover:underline">
                                <FileDown size={14} /> Exportar PDF
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isFinalized}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm min-h-[400px] leading-relaxed focus:outline-none focus:border-brand-500 disabled:bg-slate-50 font-medium text-slate-700 shadow-inner"
                        placeholder="O conteúdo do relatório aparecerá aqui após a geração ou digitação..."
                    />
                </div>

                <div className="space-y-4 pt-6 border-t-2 border-slate-100">
                    {!isFinalized ? (
                        <div className="flex flex-col md:flex-row gap-3">
                            {reportType === 'PARCIAL' && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleSave(false); }} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200">
                                    <Save size={20} /> SALVAR RASCUNHO PARCIAL
                                </button>
                            )}
                            {onOpenPrint && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenPrintPreview(); }} className="flex-1 py-4 bg-brand-50 text-brand-700 rounded-2xl font-black text-sm hover:bg-brand-100 transition-all flex items-center justify-center gap-2 border border-brand-200 uppercase">
                                    <Printer size={20} /> Pré-visualizar
                                </button>
                            )}
                            {reportType === 'FINAL' && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.confirm("Finalizar e assinar este relatório?") && handleSave(true); }} className="flex-[1.5] py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                                    <CheckCircle size={20} /> Assinar e Finalizar
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-3">
                            <button type="button" onClick={handleReopenReport} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black text-sm hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100 uppercase">
                                <Edit size={20} /> Reabrir para Edição
                            </button>
                            {onOpenPrint && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenPrintPreview(); }} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-100 uppercase">
                                    <Printer size={20} /> Imprimir Relatório Final
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div> {/* END OF flex-1 scrollable area */}

            {/* Print Preview Modal - Visível e Robusto */}
            {
                showPrintPreview && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-slate-100 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Printer className="text-brand-600" size={20} /> Pré-visualização de Impressão
                                    </h3>
                                    <p className="text-xs text-slate-500">Confira o relatório antes de imprimir.</p>
                                </div>
                                <button onClick={() => setShowPrintPreview(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400 hover:text-red-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200/50">
                                <div className="shadow-2xl">
                                    <PrintableReport
                                        ref={pdfRef}
                                        task={{
                                            ...task,
                                            solicitante: solicitanteVisita,
                                            origem: task?.category, // Usar categoria da tarefa como origem
                                            contato: contatoCliente,
                                            produto: produtoRelacionado
                                        }}
                                        content={content}
                                        media={mediaList}
                                        currentUser={currentUser}
                                        taskTypes={taskTypes}
                                        signatureDate={isFinalized ? report?.signature_date : null}
                                        status={reportType === 'FINAL' ? 'FINALIZADO' : 'EM_ABERTO'}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                                <button
                                    onClick={() => setShowPrintPreview(false)}
                                    className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmPrint}
                                    className="px-6 py-2.5 bg-brand-600 text-white font-bold text-sm rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 flex items-center gap-2 transition-all transform active:scale-95"
                                >
                                    <Printer size={18} /> Confirmar Impressão
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Global Manual Description Modal - Floating Overlay */}
            {
                !isFinalized && editingMediaIdx !== null && mediaList[editingMediaIdx] && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setEditingMediaIdx(null)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-brand-50 px-6 py-4 flex justify-between items-center border-b border-brand-100">
                                <h3 className="font-bold text-brand-700 flex items-center gap-2">
                                    <Edit size={18} />
                                    Descrição Manual: {mediaList[editingMediaIdx].name.substring(0, 30)}...
                                </h3>
                                <button
                                    onClick={() => setEditingMediaIdx(null)}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Descrição Técnica do Anexo
                                </label>
                                <textarea
                                    autoFocus
                                    value={tempDescription}
                                    onChange={(e) => setTempDescription(e.target.value)}
                                    rows={8}
                                    className="w-full text-sm p-4 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50 resize-none font-medium leading-relaxed text-slate-700"
                                    placeholder="Descreva tecnicamente o que esta imagem ou documento representa. Esta descrição será usada prioritariamente no relatório."
                                />
                            </div>

                            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    onClick={() => setEditingMediaIdx(null)}
                                    className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveManualDescription}
                                    className="px-6 py-2 bg-brand-600 text-white font-bold text-sm rounded-lg hover:bg-brand-700 shadow-md hover:shadow-lg transition-all"
                                >
                                    Salvar Descrição
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ReportEditor;


