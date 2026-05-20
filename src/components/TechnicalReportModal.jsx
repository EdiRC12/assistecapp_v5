import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Edit, Paperclip, Sparkles } from 'lucide-react';
import PrintableReport from './PrintableReport';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../supabaseClient';

const TechnicalReportModal = ({ report, onClose, onEditTask, taskTypes = [], currentUser, getCategoryLabel }) => {
    const pdfRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState('');
    const [printAuditHistory, setPrintAuditHistory] = useState(false);
    const [currentReport, setCurrentReport] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (report) {
            setCurrentReport(report);
            setEditableContent(report.content || report.ai_analysis || report.raw_notes || '');
            setIsEditing(false);
        }
    }, [report]);

    const handlePrint = useReactToPrint({
        contentRef: pdfRef,
        documentTitle: currentReport?.title || 'Relatorio_Tecnico',
        onAfterPrint: () => { }
    });

    const handleSaveEdit = async () => {
        if (!currentReport) return;
        setSaving(true);

        try {
            const existingHistory = Array.isArray(currentReport.edit_history) ? currentReport.edit_history : [];
            const newHistoryEntry = {
                user_id: currentUser?.id || 'unknown',
                username: currentUser?.username || 'Sistema',
                edited_at: new Date().toISOString(),
                action: 'Reeditou o relatório'
            };
            const updatedHistory = [...existingHistory, newHistoryEntry];

            const { data, error } = await supabase
                .from('task_reports')
                .update({
                    content: editableContent,
                    edit_history: updatedHistory,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentReport.id)
                .select()
                .single();

            if (error) throw error;
            
            // Keep relations in currentReport but update modified report fields
            const updatedReport = {
                ...currentReport,
                content: data.content,
                edit_history: data.edit_history,
                updated_at: data.updated_at
            };
            
            setCurrentReport(updatedReport);
            setIsEditing(false);
        } catch (err) {
            console.error('[TechnicalReportModal] Erro ao salvar alterações:', err);
            alert('Não foi possível salvar as alterações: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!currentReport) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4" onClick={onClose}>
            <div className="bg-white rounded-[32px] max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                {/* Header Control - Hidden on Print */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-white shrink-0 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                            <Printer size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{currentReport.title}</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">
                                Visualização de Impressão • {currentReport.status === 'FINALIZADO' ? 'Final' : 'Parcial'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        {/* Toggle Checkbox for Printing History */}
                        {currentReport.edit_history && currentReport.edit_history.length > 0 && (
                            <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200/60 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={printAuditHistory}
                                    onChange={(e) => setPrintAuditHistory(e.target.checked)}
                                    className="rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                                />
                                Imprimir Histórico
                            </label>
                        )}

                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 md:px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-[10px] md:text-xs hover:bg-amber-100 transition-colors flex items-center gap-2 border border-amber-200/40"
                            >
                                <Edit size={16} /> Editar Relatório
                            </button>
                        )}

                        {onEditTask && currentReport.task_id && (
                            <button
                                onClick={() => onEditTask(currentReport.task_id)}
                                className="px-3 md:px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] md:text-xs hover:bg-blue-100 transition-colors flex items-center gap-2"
                            >
                                <Edit size={16} /> Ver Tarefa
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="px-3 md:px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-[10px] md:text-xs hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Printer size={16} /> Imprimir Agora
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Attachments Section - ONLY VISIBLE ON SCREEN */}
                {currentReport.media_urls && currentReport.media_urls.length > 0 && (
                    <div className="bg-slate-50 px-4 md:px-8 py-3 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Anexos do Relatório:</span>
                        <div className="flex flex-wrap gap-2">
                            {currentReport.media_urls.map((m, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = m.url;
                                        link.download = m.name || `anexo_${idx + 1}`;
                                        link.click();
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm whitespace-nowrap"
                                >
                                    <Paperclip size={12} />
                                    {m.name || `Arquivo ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content Area - Split screen if editing */}
                <div className="flex-1 overflow-hidden bg-slate-100/50 flex flex-col md:flex-row">
                    {isEditing && (
                        <div className="w-full md:w-1/2 p-4 md:p-6 border-r border-slate-200 bg-white flex flex-col h-full overflow-y-auto">
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800">
                                <Sparkles className="shrink-0 text-amber-600 mt-0.5" size={18} />
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider">Histórico de Alterações Ativo</h4>
                                    <p className="text-[10px] text-amber-700/90 leading-relaxed mt-1">
                                        Ao salvar, o sistema registrará automaticamente que este relatório foi reaberto e editado por <strong>{currentUser?.username}</strong> em <strong>{new Date().toLocaleString('pt-BR')}</strong>.
                                    </p>
                                </div>
                            </div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Conteúdo do Relatório</label>
                            <textarea
                                value={editableContent}
                                onChange={(e) => setEditableContent(e.target.value)}
                                className="flex-1 min-h-[250px] p-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-500 font-sans text-sm text-slate-700 resize-none shadow-inner"
                                placeholder="Insira o conteúdo do relatório aqui..."
                            />
                            <div className="flex gap-3 mt-4 shrink-0">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-100 transition-all flex items-center justify-center gap-2"
                                >
                                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditableContent(currentReport?.content || currentReport?.ai_analysis || currentReport?.raw_notes || '');
                                        setIsEditing(false);
                                    }}
                                    disabled={saving}
                                    className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center no-scrollbar">
                        <div className="shadow-2xl">
                            <PrintableReport
                                ref={pdfRef}
                                task={{
                                    ...currentReport.tasks,
                                    id: currentReport.task_id,
                                    sac_id: currentReport.sac_id,
                                    rnc_id: currentReport.rnc_id,
                                    client: currentReport.client_name || currentReport.tasks?.client || currentReport.sac_tickets?.client_name,
                                    category: currentReport.tasks?.category || currentReport.report_type,
                                    rnc: currentReport.tasks?.rnc,
                                    location: currentReport.location || currentReport.tasks?.location || currentReport.tasks?.address,
                                    solicitante: currentReport.solicitante,
                                    contato: currentReport.contato,
                                    produto: currentReport.produto,
                                    description: currentReport.tasks?.description,
                                    op: currentReport.tasks?.op || currentReport.op,
                                    item: currentReport.tasks?.item || currentReport.item
                                }}
                                content={isEditing ? editableContent : (currentReport.content || currentReport.ai_analysis || currentReport.raw_notes)}
                                media={currentReport.media_urls || []}
                                currentUser={currentUser || currentReport.users}
                                taskTypes={taskTypes}
                                status={currentReport.status}
                                signatureDate={currentReport.signature_date}
                                manualActions={currentReport.manual_actions || []}
                                editHistory={currentReport.edit_history || []}
                                printAuditHistory={printAuditHistory}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechnicalReportModal;
