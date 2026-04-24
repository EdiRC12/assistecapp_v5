import React, { forwardRef } from 'react';
import logo from '../assets/logo_plastimarau.png';

const PrintableReport = forwardRef(({ task, content, currentUser, taskTypes, signatureDate, status, media = [] }, ref) => {
    const isFinalized = status === 'FINALIZADO';
    // Helper para formatar categoria
    const getCategoryName = (catId) => {
        if (!catId) return 'N/A';
        if (catId === 'SERVICE_JOURNEY') {
            if (task.followup_id) return 'Dossiê (Acompanhamento)';
            if (task.rnc_id) return 'RNC (Não Conformidade)';
            if (task.sac_id) return 'SAC (Atendimento)';
            return 'Jornada de Atendimento';
        }
        const type = taskTypes?.find(t => t.id === catId || t.name === catId);
        return type ? type.name : catId;
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
                            {isFinalized ? 'Relatório Técnico Final' : 'Relatório Técnico Parcial'}
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

                    <div className="grid grid-cols-2 gap-y-2 gap-x-8">

                    <div className="flex items-baseline gap-2 pb-1 border-b border-slate-100">
                        <span className="text-[9px] uppercase font-black text-slate-400 min-w-[80px]">Tarefa:</span>
                        <span className="text-sm font-bold text-slate-800">{getCategoryName(task.category)}</span>
                    </div>

                    <div className="flex items-baseline gap-2 pb-1 border-b border-slate-100">
                        <span className="text-[9px] uppercase font-black text-slate-400 min-w-[80px]">Responsáveis:</span>
                        <span className="text-sm font-bold text-slate-800">{task.responsible_names || currentUser?.username || 'N/A'}</span>
                    </div>

                    {(task.op || task.item || task.item_number) && (
                        <div className="flex items-baseline gap-2 pb-1 border-b border-slate-100">
                            <span className="text-[9px] uppercase font-black text-slate-400 min-w-[80px]">OP / Item:</span>
                            <span className="text-xs font-bold text-slate-800">
                                {task.op && `OP: ${task.op}`}
                                {(task.op && (task.item || task.item_number)) ? ' | ' : ''}
                                {(task.item || task.item_number) && `Item: ${task.item || task.item_number}`}
                            </span>
                        </div>
                    )}

                    {(task.pedido || task.purchase_order) && (
                        <div className="flex items-baseline gap-2 pb-1 border-b border-slate-100">
                            <span className="text-[9px] uppercase font-black text-slate-400 min-w-[80px]">Pedido:</span>
                            <span className="text-sm font-bold text-slate-800">{task.pedido || task.purchase_order}</span>
                        </div>
                    )}

                    {task.solicitante && (
                        <div className="flex items-baseline gap-2 pb-1 border-b border-slate-100">
                            <span className="text-[9px] uppercase font-black text-brand-600 min-w-[80px]">Solicitante:</span>
                            <span className="text-sm font-bold text-slate-800">{task.solicitante}</span>
                        </div>
                    )}

                    {task.contato && (
                        <div className="flex items-baseline gap-2 pb-1 border-b border-slate-100">
                            <span className="text-[9px] uppercase font-black text-brand-600 min-w-[80px]">Contato:</span>
                            <span className="text-sm font-bold text-slate-800">{task.contato}</span>
                        </div>
                    )}

                    <div className="flex items-baseline gap-2 pb-1 border-b border-slate-100">
                        <span className="text-[9px] uppercase font-black text-slate-400 min-w-[80px]">Status Emissão:</span>
                        <span className="text-[10px] font-black text-brand-600 uppercase">{isFinalized ? 'FINALIZADO' : 'PARCIAL'}</span>
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
                <h2 className="text-xs uppercase font-black text-black mb-2 border-b border-slate-200 pb-1">Descrição Técnica</h2>
                <div className="text-sm leading-relaxed text-slate-800">
                    {(() => {
                        // Agrupa o conteúdo em seções delimitadas por títulos ###
                        // Isso garante que título e conteúdo nunca sejam separados em páginas diferentes
                        const lines = (content || "").split('\n');
                        const sections = [];
                        let currentSection = { title: null, lines: [], isRnc3rd: false };
                        let headerCount = 0;

                        lines.forEach((line) => {
                            if (line.trim().startsWith('###')) {
                                // Finaliza a seção anterior
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
                        // Empurra a última seção
                        if (currentSection.lines.length > 0 || currentSection.title !== null) {
                            sections.push(currentSection);
                        }

                        const renderLine = (line, i, allLines) => {
                            // Negritos **texto**
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

                            // Tabelas Markdown
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

                            // Linha comum
                            return (
                                <p key={i} className={`mb-1 ${line.trim() === '' ? 'h-3' : ''}`}>
                                    {line}
                                </p>
                            );
                        };

                        return sections.map((section, si) => (
                            <div
                                key={si}
                                style={{
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                    orphans: 4,
                                    widows: 4
                                }}
                            >
                                {/* Quebra de página forçada antes da 3ª seção apenas para RNC */}
                                {section.isRnc3rd && <div className="page-break" />}

                                {section.title && (
                                    <h3
                                        className="text-sm font-black text-brand-700 mt-6 mb-2 uppercase border-b border-brand-100 pb-1"
                                        style={{ breakAfter: 'avoid', pageBreakAfter: 'avoid' }}
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

            {/* Timeline Histórica - NEW SECTION */}
            {task.timeline && task.timeline.length > 0 && (
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-xs uppercase font-black text-black mb-4 border-b border-slate-200 pb-1 flex justify-between items-center">
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

            {/* Seção de Assinaturas Robusta (Table) */}
            <div className="mt-12 pt-8 border-t-2 border-slate-100 page-break-inside-avoid shadow-none" style={{ breakInside: 'avoid' }}>
                <table className="w-full border-none border-collapse shadow-none">
                    <tbody className="border-none shadow-none">
                        <tr className="border-none shadow-none">
                            <td className="w-1/2 pr-8 border-none p-0 text-center align-bottom shadow-none">
                                <div className="border-b-2 border-slate-300 h-12 mb-2 w-full shadow-none"></div>
                                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1 shadow-none">Representante Técnico</p>
                                <p className="text-[11px] font-black text-brand-700 shadow-none">{currentUser?.username || '____________________'}</p>
                                {signatureDate && <p className="text-[8px] text-slate-400 mt-0.5 shadow-none">{new Date(signatureDate).toLocaleString()}</p>}
                            </td>
                            <td className="w-1/2 pl-8 border-none p-0 text-center align-bottom shadow-none">
                                <div className="border-b-2 border-slate-300 h-12 mb-2 w-full shadow-none"></div>
                                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1 shadow-none">Assinatura do Cliente</p>
                                <p className="text-[11px] font-bold text-slate-400 shadow-none">Responsável Legal / Recebedor</p>
                                <p className="text-[7px] text-slate-300 font-bold uppercase mt-1 italic shadow-none">Assinatura no local de atendimento</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default PrintableReport;
