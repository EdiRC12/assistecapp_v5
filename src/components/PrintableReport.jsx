import React, { forwardRef } from 'react';
import logo from '../assets/logo_plastimarau.png';

const PrintableReport = forwardRef(({ task, content, currentUser, reportAuthor, taskTypes, signatureDate, status, manualActions, media = [], editHistory = [], printAuditHistory = false, internalNotes = '', printInternalNotes = false }, ref) => {
    const isFinalized = status === 'FINALIZADO';
    
    // Cascata de Autoria Segura:
    const authorName = task.responsible_names || reportAuthor?.username || currentUser?.username || 'N/A';
    
    // Helper para formatar categoria
    const getCategoryName = (catId) => {
        if (!catId) return 'N/A';
        
        const internalLabels = {
            'DEVELOPMENT': 'Testes / Desenvolvimentos',
            'RNC': 'Atendimento de RNC',
            'AFTER_SALES': 'Pós Vendas',
            'TRAINING': 'Treinamentos',
            'FAIRS': 'Feiras / Eventos',
            'TECHNICAL_VISIT': 'Visita Técnica',
            'COMMERCIAL': 'Comercial',
            'SERVICE_JOURNEY': 'Jornada de Atendimento'
        };

        if (catId === 'SERVICE_JOURNEY') {
            if (task.followup_id) return 'Dossiê (Acompanhamento)';
            if (task.rnc_id) return 'RNC (Não Conformidade)';
            if (task.ri_id) return 'RI (Registro de Interação)';
            if (task.sac_id) return 'OT (Ocorrência Técnica)';
            return 'Jornada de Atendimento';
        }
        
        const type = taskTypes?.find(t => t.id === catId || t.name === catId || t.label === catId);
        if (type) return type.label || type.name || catId;
        
        return internalLabels[catId] || catId;
    };

    return (
        <div ref={ref} className="printable-area p-4 md:p-10 bg-white w-full md:w-[210mm] text-slate-800 font-sans">
            {/* Header Plastimarau - Modern & Clean */}
            <div className="flex flex-col items-center border-b-2 border-brand-600 pb-6 mb-8">
                <div className="flex items-center justify-between w-full mb-4">
                    <img src={logo} alt="Plastimarau" className="h-14 w-auto object-contain" />
                    <div className="text-right">
                        <h1 className="text-2xl font-black text-brand-600 tracking-tighter leading-none mb-1">AssisTec</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            {isFinalized ? 'Relatório Técnico Final' : 'Relatório Técnico Parcial'} | {getCategoryName(task.category).split(' ')[0]}
                            {editHistory && editHistory.length > 0 && ` | Rev. ${editHistory.length}`}
                        </p>
                        {String(task.appointment_number || '').includes('/') && (
                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1">
                                <span className="bg-rose-50 px-2 py-0.5 rounded border border-rose-100 italic">
                                    Migração Identificada em {new Date(task.created_at).toLocaleDateString()}
                                </span>
                            </p>
                        )}
                    </div>
                </div>
                <div className="w-full flex justify-between items-center px-1">
                    <div className="h-[1px] bg-slate-200 flex-1 mr-4"></div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        Documento emitido em {new Date().toLocaleDateString()}
                    </p>
                    <div className="h-[1px] bg-slate-200 flex-1 ml-4"></div>
                </div>
            </div>

            {/* Info Section - simplified and aligned left */}
            <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm text-left page-break-inside-avoid">
                <div className="flex flex-col gap-4 mb-4">
                    {/* Linha de Cliente - Destaque */}
                    <div className="flex items-start gap-3 pb-3 border-b border-slate-200">
                        <span className="text-[10px] uppercase font-black text-brand-600 min-w-[90px] mt-1">Cliente:</span>
                        <span className="text-lg font-black text-slate-900 leading-tight">
                            {task.client || 'N/A'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-12 mt-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Tarefa / Categoria:</span>
                            <span className="text-sm font-black text-slate-900">{getCategoryName(task.category)}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Localização (Cidade/UF):</span>
                            <span className="text-sm font-bold text-slate-800">
                                {task.location || 'N/A'}
                            </span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Ordem de Produção (OP) / RNC:</span>
                            <span className="text-sm font-bold text-slate-800">{task.op || 'N/A'} {task.rnc ? ` / RNC: ${task.rnc}` : ''}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Pedido de Compra / Item:</span>
                            <span className="text-sm font-bold text-slate-800">{task.pedido || task.purchase_order || 'N/A'} {task.item ? ` / Item: ${task.item}` : ''}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Solicitante da Visita:</span>
                            <span className="text-sm font-bold text-slate-800">{task.solicitante || 'Não informado'}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Contato no Cliente / Cargo:</span>
                            <span className="text-sm font-bold text-slate-800">{task.contato || 'Não informado'} {task.produto ? ` (${task.produto})` : ''}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Responsáveis Técnicos:</span>
                            <span className="text-sm font-bold text-slate-800">{authorName}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-brand-600">Status e Emissão:</span>
                            <span className="text-[10px] font-black text-slate-900 uppercase">
                                {isFinalized ? 'FINALIZADO' : 'PARCIAL'} | {new Date().toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Impacto Financeiro e Acordos - NEW SECTION */}
            {task.has_return && (
                <div className="mb-8 border-2 border-brand-100 rounded-2xl overflow-hidden shadow-sm page-break-inside-avoid">
                    <div className="bg-brand-50 px-6 py-2 border-b border-brand-100 flex justify-between items-center">
                        <h2 className="text-[10px] font-black uppercase text-brand-700 tracking-widest flex items-center gap-2">
                            Resumo de Impacto Financeiro e Devoluções
                        </h2>
                        <span className="text-[9px] font-bold text-brand-600 bg-white px-2 py-0.5 rounded-full border border-brand-200">
                            Ajuste de Estoque / Financeiro
                        </span>
                    </div>
                    <div className="p-6 bg-white grid grid-cols-4 gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Qtd para Retorno</span>
                            <span className="text-sm font-bold text-slate-800">{task.returned_quantity} {task.uom}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Valor Unitário</span>
                            <span className="text-sm font-bold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(task.unit_price)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Valor Total Impacto</span>
                            <span className="text-sm font-black text-rose-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(task.returned_quantity * task.unit_price)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Acordo Final (Qtd/Valor)</span>
                            <span className="text-sm font-bold text-emerald-600">
                                {task.final_quantity > 0 ? `${task.final_quantity} ${task.uom} ` : ''}
                                {task.new_unit_price > 0 ? `| ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(task.new_unit_price)}` : 'Sem Acordo Financeiro'}
                            </span>
                        </div>
                        {task.commercial_agreement && (
                            <div className="col-span-4 mt-2 pt-4 border-t border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Acordo Comercial / Observações Fiscais</span>
                                <p className="text-[11px] text-slate-600 italic leading-relaxed">"{task.commercial_agreement}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content Body */}
            <div className="mb-6">
                <h2 className="text-sm uppercase font-black text-brand-700 mb-4 border-b border-slate-200 pb-2">Descrição Técnica</h2>
                <div className="text-sm leading-relaxed text-slate-800">
                    {(() => {
                        const isHtml = (content || "").trim().startsWith('<');

                        if (isHtml) {
                            return (
                                <div 
                                    className="rich-text-content"
                                    dangerouslySetInnerHTML={{ __html: content }} 
                                />
                            );
                        }

                        const lines = (content || "").split('\n');
                        const sections = [];
                        let currentSection = { title: null, lines: [], isRnc3rd: false };
                        let headerCount = 0;

                        lines.forEach((line) => {
                            if (line.trim().startsWith('###')) {
                                if (currentSection.lines.length > 0 || currentSection.title !== null) {
                                    sections.push({ ...currentSection });
                                }
                                headerCount++;
                                currentSection = {
                                    title: line.replace(/###/g, '').trim(),
                                    lines: [],
                                    isRnc3rd: headerCount === 3 && !!task.rnc_id
                                };
                            } else {
                                currentSection.lines.push(line);
                            }
                        });
                        
                        if (currentSection.lines.length > 0 || currentSection.title !== null) {
                            sections.push(currentSection);
                        }

                        const renderLine = (line, i, allLines) => {
                            if (line.includes('**')) {
                                const parts = line.split(/(\*\*.*?\*\*)/g);
                                return (
                                    <p key={i} className="mb-2 min-h-[1em]">
                                        {parts.map((part, j) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                return <strong key={j} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                                            }
                                            return part;
                                        })}
                                    </p>
                                );
                            }

                            if (line.includes('|')) {
                                const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
                                if (cells.length > 0 && !line.includes('---')) {
                                    const prevLine = allLines[i - 1] || '';
                                    const isHeader = prevLine.trim().startsWith('###') || (i > 0 && allLines[i - 1]?.includes('---'));
                                    return (
                                        <div key={i} className="grid border-b border-slate-100 py-1" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
                                            {cells.map((cell, j) => (
                                                <span key={j} className={`px-2 ${isHeader ? 'font-black text-[10px] uppercase text-slate-500' : 'text-xs'}`}>
                                                    {cell}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                }
                                if (line.includes('---')) return null;
                            }

                            return (
                                <p key={i} className={`mb-1 ${line.trim() === '' ? 'h-3' : ''}`}>
                                    {line}
                                </p>
                            );
                        };

                        return sections.map((section, si) => (
                            <div key={si}>
                                {section.isRnc3rd && <div className="page-break" />}
                                {section.title && (
                                    <h3
                                        className="text-sm font-black text-brand-700 mt-6 mb-2 uppercase border-b border-brand-100 pb-1"
                                        style={{ breakAfter: 'avoid', pageBreakAfter: 'avoid', orphans: 3, widows: 3 }}
                                    >
                                        {section.title}
                                    </h3>
                                )}
                                {section.lines.map((line, i) => renderLine(line, i, section.lines))}
                            </div>
                        ));
                    })()}
                </div>
            </div>

            {/* Timeline Histórica */}
            {task.timeline && task.timeline.length > 0 && (
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-sm uppercase font-black text-brand-700 mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">
                        <span>Cronologia do Atendimento (Histórico)</span>
                        <span className="text-[8px] font-bold text-slate-400 italic">Rastreabilidade Completa</span>
                    </h2>
                    <div className="space-y-3">
                        {(task.timeline || []).slice().reverse().map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                                <div className="text-[9px] font-black text-slate-400 w-24 shrink-0 text-right uppercase">
                                    {new Date(item.date).toLocaleDateString('pt-BR')}
                                    <br />
                                    <span className="text-[7px]">{new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-slate-200 mt-1.5 shrink-0 border border-white shadow-sm"></div>
                                <div className="flex-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                    <div className="flex justify-between mb-0.5">
                                        <span className="text-[8px] font-black text-brand-600 uppercase">{item.type || 'INTERAÇÃO'}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{item.user}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-700 leading-tight">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ações Pós-Visita */}
            {((task.manualActions && task.manualActions.length > 0) || (manualActions && manualActions.length > 0)) && (
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-sm font-black text-brand-700 uppercase border-b border-slate-200 pb-2 mb-4">
                        AÇÕES PÓS VISITA
                    </h2>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-[10px] font-black text-slate-400 uppercase py-2 text-left">Atividade / Descrição da Ação</th>
                                <th className="text-[10px] font-black text-slate-400 uppercase py-2 text-left w-1/5">Responsável</th>
                                <th className="text-[10px] font-black text-slate-400 uppercase py-2 text-left w-1/5">Prazo</th>
                                <th className="text-[10px] font-black text-slate-400 uppercase py-2 text-center w-1/6">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(manualActions || task.manualActions || []).map((action, idx) => (
                                <tr key={idx} className="border-b border-slate-50">
                                    <td className="py-3 pr-4">
                                        <div className="flex items-start gap-2">
                                            {action.completed ? (
                                                <svg className="w-4 h-4 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                                </svg>
                                            )}
                                            <span className={`text-[11px] font-black uppercase leading-tight ${action.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                {action.what}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-[10px] font-black text-slate-500 uppercase">{action.who || 'N/A'}</td>
                                    <td className="py-3 text-[10px] font-black text-slate-500 uppercase">{action.when || 'N/A'}</td>
                                    <td className="py-3 text-center">
                                        {action.completed ? (
                                            <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 uppercase">Finalizado</span>
                                        ) : (
                                            <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-100 uppercase">Pendente</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Observações Internas / Confidenciais */}
            {printInternalNotes && internalNotes && (
                <div className="mb-10 page-break-inside-avoid border-2 border-amber-200 bg-amber-50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-amber-200/50 px-6 py-3 border-b border-amber-200 flex justify-between items-center">
                        <h2 className="text-[10px] font-black uppercase text-amber-800 tracking-widest flex items-center gap-2">
                            Observações Internas (Uso Exclusivo Interno)
                        </h2>
                        <span className="text-[9px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-300">
                            CONFIDENCIAL
                        </span>
                    </div>
                    <div className="p-6">
                        <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {internalNotes}
                        </p>
                    </div>
                </div>
            )}

            {/* Seção de Assinaturas */}
            <div className="mt-12 pt-8 border-t-2 border-slate-100 page-break-inside-avoid shadow-none" style={{ breakInside: 'avoid' }}>
                <table className="w-full border-none border-collapse shadow-none">
                    <tbody className="border-none shadow-none">
                        <tr className="border-none shadow-none">
                            <td className="w-1/2 pr-8 border-none p-0 text-center align-bottom shadow-none">
                                <div className="border-b-2 border-slate-300 h-12 mb-2 w-full shadow-none"></div>
                                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1 shadow-none">Representante Técnico</p>
                                <p className="text-[11px] font-black text-brand-700 shadow-none">{authorName !== 'N/A' ? authorName : '____________________'}</p>
                                {signatureDate && <p className="text-[8px] text-slate-400 mt-0.5 shadow-none">{new Date(signatureDate).toLocaleString()}</p>}
                            </td>
                            <td className="w-1/2 pl-8 border-none p-0 text-center align-bottom shadow-none">
                                <div className="border-b-2 border-slate-300 h-12 mb-2 w-full shadow-none"></div>
                                <p className="text-[10px] uppercase font-black text-black tracking-widest mb-1 shadow-none">Assinatura do Cliente</p>
                                <p className="text-[11px] font-bold text-slate-900 shadow-none">Responsável Legal / Recebedor</p>
                                <p className="text-[7px] text-slate-600 font-bold uppercase mt-1 italic shadow-none">Assinatura no local de atendimento</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
 
            {/* Histórico de Revisões (Opcional para Impressão de Auditoria) */}
            {printAuditHistory && editHistory && editHistory.length > 0 && (
                <div className="mt-12 pt-8 border-t-2 border-slate-100 page-break-inside-avoid text-left shadow-none" style={{ breakInside: 'avoid' }}>
                    <h2 className="text-sm font-black text-brand-700 uppercase border-b border-slate-200 pb-2 mb-4">
                        Histórico de Revisões / Auditoria
                    </h2>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-[10px] font-black text-slate-400 uppercase py-2 text-left w-1/4">Data / Hora</th>
                                <th className="text-[10px] font-black text-slate-400 uppercase py-2 text-left w-1/4">Usuário</th>
                                <th className="text-[10px] font-black text-slate-400 uppercase py-2 text-left">Ação / Descrição</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editHistory.map((log, idx) => (
                                <tr key={idx} className="border-b border-slate-50">
                                    <td className="py-2.5 text-[10px] text-slate-600 font-mono">
                                        {new Date(log.edited_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="py-2.5 text-[10px] font-bold text-slate-700 uppercase">
                                        {log.username || 'Sistema'}
                                    </td>
                                    <td className="py-2.5 text-[10px] text-slate-600 font-medium uppercase">
                                        {log.action || 'Reeditado'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <style>{`
                .rich-text-content h1, .rich-text-content h2, .rich-text-content h3 {
                    font-weight: 900;
                    color: #0f172a;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 0.875rem;
                }
                .rich-text-content p {
                    margin-bottom: 0.75rem;
                    line-height: 1.6;
                }
                .rich-text-content ul, .rich-text-content ol {
                    margin-bottom: 1rem !important;
                    padding-left: 1.5rem !important;
                    display: block !important;
                }
                .rich-text-content ul {
                    list-style-type: disc !important;
                }
                .rich-text-content ol {
                    list-style-type: decimal !important;
                }
                .rich-text-content li {
                    margin-bottom: 0.25rem;
                    display: list-item !important;
                }
                .rich-text-content strong {
                    font-weight: 800;
                    color: #0f172a;
                }
                .rich-text-content table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 15px 0 !important;
                    table-layout: auto !important;
                    display: table !important;
                }
                .rich-text-content th, .rich-text-content td {
                    border: 1px solid #cbd5e1 !important;
                    padding: 8px !important;
                    text-align: left !important;
                    font-size: 11px !important;
                    display: table-cell !important;
                }
                .rich-text-content th {
                    background-color: #f8fafc !important;
                    font-weight: bold !important;
                    text-transform: uppercase !important;
                }
                .rich-text-content tr {
                    display: table-row !important;
                }
            `}</style>
        </div>
    );
});

export default PrintableReport;