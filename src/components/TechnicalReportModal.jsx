import React, { useRef } from 'react';
import { X, Printer, Edit, Paperclip } from 'lucide-react';
import PrintableReport from './PrintableReport';
import { useReactToPrint } from 'react-to-print';

const TechnicalReportModal = ({ report, onClose, onEditTask, taskTypes = [], currentUser, getCategoryLabel }) => {
    const pdfRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: pdfRef,
        documentTitle: report?.title || 'Relatorio_Tecnico',
        onAfterPrint: () => { }
    });

    if (!report) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4" onClick={onClose}>
            <div className="bg-white rounded-[32px] max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                {/* Header Control - Hidden on Print */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-white shrink-0 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                            <Printer size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{report.title}</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">
                                Visualização de Impressão • {report.status === 'FINALIZADO' ? 'Final' : 'Parcial'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {onEditTask && report.task_id && (
                            <button
                                onClick={() => onEditTask(report.task_id)}
                                className="px-3 md:px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] md:text-xs hover:bg-blue-100 transition-colors flex items-center gap-2"
                            >
                                <Edit size={16} /> Editar Tarefa
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="px-3 md:px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-[10px] md:text-xs hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Printer size={16} /> Imprimir Agora
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-2"></div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Attachments Section - ONLY VISIBLE ON SCREEN */}
                {report.media_urls && report.media_urls.length > 0 && (
                    <div className="bg-slate-50 px-8 py-3 border-b border-slate-200 flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Anexos do Relatório:</span>
                        <div className="flex gap-2">
                            {report.media_urls.map((m, idx) => (
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

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-2 md:p-8 bg-slate-100/50 flex justify-center no-scrollbar">
                    <div className="shadow-2xl">
                        <PrintableReport
                            ref={pdfRef}
                            task={{
                                ...report.tasks,
                                id: report.task_id,
                                sac_id: report.sac_id,
                                rnc_id: report.rnc_id,
                                client: report.client_name || report.tasks?.client || report.sac_tickets?.client_name,
                                category: report.tasks?.category || report.report_type,
                                rnc: report.tasks?.rnc,
                                location: report.tasks?.location || report.tasks?.address,
                                solicitante: report.solicitante,
                                contato: report.contato,
                                produto: report.produto,
                                description: report.tasks?.description
                            }}
                            content={report.content || report.ai_analysis || report.raw_notes}
                            media={report.media_urls || []}
                            currentUser={currentUser || report.users}
                            taskTypes={taskTypes}
                            status={report.status}
                            signatureDate={report.signature_date}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechnicalReportModal;
