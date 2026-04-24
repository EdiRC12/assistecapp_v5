import React from 'react';
import ReactDOM from 'react-dom';
import {
    X, FileText, Brain, RefreshCw, History, Printer,
    BarChart3, PieChart, TrendingUp, Target, Sparkles, Info
} from 'lucide-react';

const InfoTooltip = ({ text }) => (
    <div className="group relative ml-1 inline-block">
        <Info size={12} className="text-slate-300 cursor-help hover:text-indigo-500 transition-colors" />
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none text-center normal-case font-medium">
            <div className="relative">
                {text}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
            </div>
        </div>
    </div>
);

const ReportModal = ({
    showReportModal,
    setShowReportModal,
    reportContext,
    selectedYear,
    selectedMonth,
    MONTHS,
    handleGenerateAIInsights,
    isAnalyzing,
    handleSaveSnapshot,
    handlePrintFullReport,
    reportTotals,
    aiAnalysis,
    filteredReportData,
    inventory,
    tasks,
    tests,
    period
}) => {
    if (!showReportModal) return null;

    return ReactDOM.createPortal(
        <div id="print-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm no-print" onClick={() => setShowReportModal(false)}></div>
            <div id="print-main-modal" className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[40px] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between bg-white sticky top-0 z-10 no-print gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <FileText size={20} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                {reportContext === 'ADJUSTMENTS' ? 'Relatório de Gestão de Furos' : 
                                    reportContext === 'INVENTORY' ? 'Relatório de Ativos e Giro' :
                                    reportContext === 'AUDIT' ? 'Relatório de Auditoria e Custos' :
                                    reportContext?.startsWith('MGMT_') ? 'Relatório Geral de Gestão' :
                                        'Relatório de Desempenho Operacional'}
                            </h2>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">
                            Documento Técnico | {period ? period : (
                                <>
                                    {selectedYear !== 'ALL' ? `Ano: ${selectedYear} ` : 'Todos os Anos'} |
                                    {selectedMonth !== 'ALL' ? ` Mês: ${MONTHS.find(m => m.value === selectedMonth)?.label} ` : ' Todos os Meses'}
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 no-print w-full md:w-auto justify-end">
                        {handleGenerateAIInsights && (
                            <button
                                onClick={handleGenerateAIInsights}
                                disabled={isAnalyzing}
                                className="px-6 py-3 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-2xl border border-indigo-100 uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 group"
                            >
                                {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <Brain size={16} className="group-hover:scale-110 transition-transform" />}
                                Analise Estratégica
                            </button>
                        )}
                        {handleSaveSnapshot && (
                            <button
                                onClick={handleSaveSnapshot}
                                disabled={isAnalyzing}
                                className="px-6 py-3 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-2xl border border-emerald-100 uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2 group active:scale-95"
                            >
                                <History size={16} className="group-hover:rotate-[-10deg] transition-transform" />
                                Arquivar no Histórico
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95"
                        >
                            <Printer size={16} /> Imprimir PDF
                        </button>
                        <button onClick={() => setShowReportModal(false)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div id="report-content" className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-white">
                    <style>{`
                        @media print {
                            @page { size: auto; margin: 10mm; }

                            body * { visibility: hidden !important; }

                            body > #print-overlay {
                                visibility: visible !important;
                                position: absolute !important;
                                top: 0 !important; left: 0 !important;
                                width: 100% !important;
                                height: auto !important;
                                display: block !important;
                                background: transparent !important;
                                padding: 0 !important;
                            }

                            body > #print-overlay > div:first-child { display: none !important; }

                            #print-main-modal {
                                visibility: visible !important;
                                position: absolute !important;
                                top: 0 !important; left: 0 !important;
                                width: 100% !important;
                                height: auto !important;
                                max-height: none !important;
                                overflow: visible !important;
                                display: block !important;
                                border: none !important;
                                border-radius: 0 !important;
                                box-shadow: none !important;
                                margin: 0 !important;
                                padding: 8mm !important;
                                transform: none !important;
                            }

                            #print-main-modal * { visibility: visible !important; overflow: visible !important; }

                            #report-content {
                                display: block !important;
                                flex: none !important;
                                height: auto !important;
                                padding: 0 !important;
                            }

                            .no-print, button, nav { display: none !important; }
                            .print-only-header { display: block !important; }

                            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }

                            #report-cards-grid {
                                display: grid !important;
                                grid-template-columns: repeat(4, 1fr) !important;
                                gap: 10px !important;
                                margin-bottom: 12px !important;
                            }

                            #report-charts-grid {
                                display: grid !important;
                                grid-template-columns: repeat(2, 1fr) !important;
                                gap: 12px !important;
                                margin-bottom: 12px !important;
                            }

                            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                            table { width: 100% !important; }
                            th, td { padding: 3px 5px !important; font-size: 7pt !important; word-break: break-word !important; white-space: normal !important; }

                            .print-card { padding: 8px !important; }
                            .print-card .text-2xl { font-size: 12pt !important; }
                            .print-card .text-xl { font-size: 11pt !important; }
                        }
                    `}</style>

                    {/* Header for Print Only */}
                    <div className="print-only-header hidden mb-6 pb-4 border-b-2 border-slate-900">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                                    {reportContext === 'INVENTORY' ? 'RELATÓRIO DE ATIVOS' :
                                        reportContext === 'AUDIT' ? 'RELATÓRIO DE AUDITORIA' :
                                            reportContext === 'ADJUSTMENTS' ? 'GESTÃO DE FUROS (HISTÓRICO)' :
                                            reportContext?.startsWith('MGMT_') ? 'RELATÓRIO GERAL DE GESTÃO' :
                                                'RELATÓRIO DE ENGENHARIA'}
                                </h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Status de Testes e Custos Integrados</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Gerado em:</p>
                                <p className="text-xs font-black text-slate-800">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>

                    <div id="report-cards-grid" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {reportContext === 'INVENTORY' ? (
                            <>
                                <div className="bg-slate-50/50 p-6 rounded-[28px] border border-slate-100/50">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ativos em Estoque</p>
                                        <InfoTooltip text="Quantidade de itens físicos atualmente em estoque (Ativos)." />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 flex items-baseline gap-2">
                                        {reportTotals.activeItems || 0}
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">itens</span>
                                    </h4>
                                </div>

                                <div className="bg-indigo-50/30 p-6 rounded-[28px] border border-indigo-100/50">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Investimento Total</p>
                                        <InfoTooltip text="Valor financeiro total baseado no custo de produção dos itens ativos." />
                                    </div>
                                    <h4 className="text-2xl font-black text-indigo-600">
                                        R$ {(reportTotals.investment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </h4>
                                    <p className="text-[7px] font-black text-indigo-300 uppercase tracking-widest mt-1">Custo acumulado de produção</p>
                                </div>

                                <div className="bg-rose-50/30 p-6 rounded-[28px] border border-rose-100/50">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-rose-400">Prejuízo Real</p>
                                        <InfoTooltip text="Custo do material descartado por falta de faturamento ou perda técnica." />
                                    </div>
                                    <h4 className="text-2xl font-black text-rose-600">
                                        R$ {(reportTotals.discardedLoss || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </h4>
                                    <p className="text-[7px] font-black text-rose-300 uppercase tracking-widest mt-1">Perda proporcional por descarte</p>
                                </div>

                                <div className="bg-cyan-50/30 p-6 rounded-[28px] border border-cyan-100/50">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-cyan-400">Eficiência de Produção</p>
                                        <InfoTooltip text="Taxa de assertividade industrial baseada no volume faturado vs descartado." />
                                    </div>
                                    <h4 className="text-2xl font-black text-cyan-600">
                                        {(reportTotals.efficiencyRate || 0).toFixed(1)}%
                                    </h4>
                                    <p className="text-[7px] font-black text-cyan-300 uppercase tracking-widest mt-1">Taxa de acerto industrial</p>
                                </div>
                            </>
                        ) : reportContext === 'AUDIT' ? (
                            <>
                                <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 print-card">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Economia Circular</span>
                                    <span className="text-2xl font-black text-emerald-600">R$ {(reportTotals.reuseSavings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="p-6 bg-rose-50 rounded-[32px] border border-rose-100 print-card">
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block mb-1">Perdas & descartes</span>
                                    <span className="text-2xl font-black text-rose-600">R$ {(reportTotals.losses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="p-6 bg-indigo-50 rounded-[32px] border border-indigo-100 print-card">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Custos Logísticos</span>
                                    <span className="text-2xl font-black text-indigo-600">R$ {(reportTotals.logistics || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 print-card">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Testes Auditados</span>
                                    <span className="text-2xl font-black text-slate-800">{filteredReportData.length}</span>
                                </div>
                            </>
                        ) : reportContext?.startsWith('MGMT_') ? (
                            <>
                                <div className="p-6 bg-brand-50 rounded-[32px] border border-brand-100 print-card">
                                    <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest block mb-1">Total de Registros</span>
                                    <span className="text-2xl font-black text-brand-600">{reportTotals.count || filteredReportData.length}</span>
                                    <p className="text-[7px] font-bold text-brand-300 uppercase mt-1">Volume consolidado no período</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 print-card col-span-3 flex items-center justify-center border-dashed">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Resumo de Gestão {reportContext.replace('MGMT_', '')}</p>
                                </div>
                            </>
                        ) : reportContext === 'ADJUSTMENTS' ? (
                            <>
                                <div className="p-6 bg-rose-50 rounded-[32px] border border-rose-100 print-card">
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block mb-1">Perdas (Furos Negativos)</span>
                                    <span className="text-2xl font-black text-rose-600">-{reportTotals.losses?.toFixed(1)} <span className="text-xs font-bold text-rose-300">KG</span></span>
                                </div>
                                <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 print-card">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Ganhos (Ajustes Positivos)</span>
                                    <span className="text-2xl font-black text-emerald-600">+{reportTotals.gains?.toFixed(1)} <span className="text-xs font-bold text-emerald-300">KG</span></span>
                                </div>
                                <div className="p-6 bg-indigo-50 rounded-[32px] border border-indigo-100 print-card">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Motivo Principal</span>
                                    <span className="text-xl font-black text-indigo-600 truncate block">{reportTotals.mainReason}</span>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 print-card">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total de Ocorrências</span>
                                    <span className="text-2xl font-black text-slate-800">{reportTotals.totalAdjustments}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 print-card">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Volume de Testes</span>
                                    <span className="text-2xl font-black text-slate-800">{filteredReportData.length} <span className="text-xs text-slate-400 font-medium">itens</span></span>
                                </div>
                                <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 print-card">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Aprovações Técnicas</span>
                                    <span className="text-2xl font-black text-emerald-600">
                                        {filteredReportData.filter(t => t.status === 'APROVADO').length}
                                    </span>
                                </div>
                                <div className="p-6 bg-indigo-50 rounded-[32px] border border-indigo-100 print-card">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Custo Consolidado</span>
                                    <span className="text-2xl font-black text-indigo-600 tracking-tighter">R$ {(reportTotals.investment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <p className="text-[7px] font-bold text-indigo-300 uppercase mt-1 tracking-wider italic">Investimento de produção + custos logísticos</p>
                                </div>
                                <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100 print-card">
                                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block mb-1">Matéria Prima Produzida</span>
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-amber-600">{(reportTotals.weightKg || 0).toFixed(1)}</span>
                                            <span className="text-[10px] font-bold text-amber-400 uppercase">KG</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 -mt-1">
                                            <span className="text-lg font-black text-amber-500">{reportTotals.unitsUn || 0}</span>
                                            <span className="text-[8px] font-bold text-amber-300 uppercase">UN</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Dynamic Charts Section */}
                    {(!reportContext?.startsWith('MGMT_')) && (
                    <div id="report-charts-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {reportContext === 'INVENTORY' ? (
                            <>
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center print-card">
                                    <div className="flex items-center gap-2 mb-8 self-start">
                                        <BarChart3 size={16} className="text-indigo-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Ocupação por Depósito (KG)</h3>
                                    </div>
                                    <div className="w-full flex items-end justify-between h-48 gap-4 px-4 border-b border-slate-100 pb-2 overflow-hidden">
                                        {Object.entries(reportTotals.bins || {}).sort((a,b) => (b[1].kg + b[1].un) - (a[1].kg + a[1].un)).slice(0, 5).map(([bin, data], index) => {
                                            const hasKg = data.kg > 0;
                                            const binVolume = hasKg ? data.kg : data.un;
                                            const unitLabel = hasKg ? 'kg' : 'un';
                                            
                                            // Escala baseada no tipo dominante do bin para a barra visual
                                            const totalScale = hasKg ? (reportTotals.weightKg || 1) : (reportTotals.unitsUn || 1);
                                            const percentage = (binVolume / totalScale) * 100;
                                            
                                            const isDiscardBin = bin.toUpperCase().includes('DISCARD') || bin.toUpperCase().includes('DESCARTE');
                                            
                                            // Paleta de cores para os depósitos
                                            const colors = ['bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400', 'bg-cyan-400'];
                                            const barColor = isDiscardBin ? 'bg-rose-400' : colors[index % colors.length];

                                            return (
                                                <div key={bin} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                    <div className="mb-2 text-[8px] font-black text-slate-400 leading-tight text-center">
                                                        {binVolume.toFixed(0)} {unitLabel} <br/>
                                                        <span className="text-[7px] text-brand-300">({data.items})</span>
                                                    </div>
                                                    <div
                                                        style={{ height: `${Math.max(10, percentage)}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                                        className={`w-full max-w-[40px] rounded-t-xl shadow-sm transition-all duration-500 ${barColor}`}
                                                    ></div>
                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-4 text-center leading-tight h-6 overflow-hidden">
                                                        {bin}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col print-card">
                                    <div className="flex items-center gap-2 mb-8">
                                        <PieChart size={16} className="text-emerald-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Estado Físico dos Ativos</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center gap-6">
                                        {['ACTIVE', 'DISCARDED', 'RESERVED'].map(st => {
                                            const systemData = inventory || [];
                                            const count = systemData.filter(i => (st === 'ACTIVE' ? (i.status === 'ACTIVE' || i.status === 'AVAILABLE') : i.status === st)).length;
                                            const percentage = systemData.length > 0 ? (count / systemData.length) * 100 : 0;
                                            return (
                                                <div key={st} className="space-y-1">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase">{st === 'ACTIVE' ? 'Ativos/Disponíveis' : st === 'DISCARDED' ? 'Descartado' : 'Reservado'}</span>
                                                        <span className="text-[11px] font-black text-slate-900">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${percentage}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                                            className={`h-full rounded-full ${st === 'ACTIVE' ? 'bg-emerald-500' : st === 'DISCARDED' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : reportContext === 'AUDIT' ? (
                            <>
                                {/* Audit: Reuse vs Loss Bar Chart */}
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center print-card">
                                    <div className="flex items-center gap-2 mb-8 self-start">
                                        <TrendingUp size={16} className="text-indigo-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Eficiência de Reuso vs. Perdas (R$)</h3>
                                    </div>
                                    <div className="w-full flex items-end justify-around h-48 gap-8 px-12 border-b border-slate-100 pb-2">
                                        {[
                                            { label: 'ECONOMIA REUSO', value: reportTotals.reuseSavings, color: 'bg-emerald-400' },
                                            { label: 'PERDAS REGISTRADAS', value: reportTotals.losses, color: 'bg-rose-400' }
                                        ].map(item => {
                                            const maxVal = Math.max(reportTotals.reuseSavings, reportTotals.losses) || 1;
                                            const percentage = (item.value / maxVal) * 100;
                                            return (
                                                <div key={item.label} className="flex-1 flex flex-col items-center group relative h-full justify-end max-w-[80px]">
                                                    <div className="mb-2 text-[9px] font-black text-slate-400">
                                                        R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                                    </div>
                                                    <div
                                                        style={{ height: `${Math.max(8, percentage)}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                                        className={`w-full rounded-t-xl shadow-sm ${item.color}`}
                                                    ></div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-4 text-center leading-tight">{item.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col print-card">
                                    <div className="flex items-center gap-2 mb-8">
                                        <Target size={16} className="text-indigo-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Impacto Financeiro Auditado (%)</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center gap-6">
                                        {[
                                            { label: 'PRODUÇÃO', value: reportTotals.production, color: 'bg-slate-400' },
                                            { label: 'LOGÍSTICA', value: reportTotals.logistics, color: 'bg-indigo-400' },
                                            { label: 'ECONOMIA (ROI)', value: reportTotals.reuseSavings, color: 'bg-emerald-500' }
                                        ].map(item => {
                                            const total = reportTotals.production + reportTotals.logistics + reportTotals.reuseSavings || 1;
                                            const percentage = (item.value / total) * 100;
                                            return (
                                                <div key={item.label} className="space-y-1">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase">{item.label}</span>
                                                        <span className="text-[11px] font-black text-slate-900">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${percentage}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                                            className={`h-full rounded-full ${item.color}`}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Bar Chart: Costs by Status */}
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center print-card">
                                    <div className="flex items-center gap-2 mb-8 self-start">
                                        <BarChart3 size={16} className="text-indigo-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Investimento por Situação (R$)</h3>
                                    </div>
                                    <div className="w-full flex items-end justify-between h-48 gap-4 px-4 border-b border-slate-100 pb-2">
                                        {['APROVADO', 'REPROVADO', 'PENDENTE'].map(status => {
                                            const statusTests = filteredReportData.filter(t => {
                                                if (status === 'PENDENTE') return !['APROVADO', 'REPROVADO'].includes(t.status);
                                                return t.status === status;
                                            });

                                            const statusCost = statusTests.reduce((acc, t) => {
                                                const taskCosts = tasks
                                                    .filter(tk => String(tk.parent_test_id) === String(t.id))
                                                    .reduce((tAcc, tk) => tAcc + (tk.trip_cost || 0) + (tk.travels || []).reduce((trAcc, tr) => trAcc + (tr.cost || 0), 0), 0);
                                                return acc + (t.op_cost || t.gross_total_cost || t.production_cost || 0) + taskCosts;
                                            }, 0);

                                            const percentage = reportTotals.investment > 0 ? (statusCost / reportTotals.investment) * 100 : 0;

                                            return (
                                                <div key={status} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                    <div className="mb-2 text-[9px] font-black text-slate-400">
                                                        R$ {statusCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                                    </div>
                                                    <div
                                                        style={{
                                                            height: `${Math.max(8, percentage)}%`,
                                                            WebkitPrintColorAdjust: 'exact',
                                                            printColorAdjust: 'exact'
                                                        }}
                                                        className={`w-full max-w-[40px] rounded-t-xl print-chart-bar shadow-sm ${status === 'APROVADO' ? 'bg-emerald-400' :
                                                            status === 'REPROVADO' ? 'bg-rose-400' : 'bg-slate-300'
                                                            }`}
                                                    ></div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-4 text-center">{status}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Status Distribution (Visual) */}
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col print-card">
                                    <div className="flex items-center gap-2 mb-8">
                                        <PieChart size={16} className="text-emerald-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Distribuição de Eficiência Técnica</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center gap-6">
                                        {['APROVADO', 'REPROVADO', 'OUTROS'].map(status => {
                                            const count = status === 'OUTROS'
                                                ? filteredReportData.filter(t => !['APROVADO', 'REPROVADO'].includes(t.status)).length
                                                : filteredReportData.filter(t => t.status === status).length;
                                            const percentage = filteredReportData.length > 0 ? (count / filteredReportData.length) * 100 : 0;

                                            return (
                                                <div key={status} className="space-y-1">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase">{status}</span>
                                                        <span className="text-[11px] font-black text-slate-900">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                        <div
                                                            style={{
                                                                width: `${percentage}%`,
                                                                WebkitPrintColorAdjust: 'exact',
                                                                printColorAdjust: 'exact'
                                                            }}
                                                            className={`h-full rounded-full print-chart-pie-segment ${status === 'APROVADO' ? 'bg-emerald-500' :
                                                                status === 'REPROVADO' ? 'bg-rose-500' : 'bg-slate-300'
                                                                }`}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    )}

                    {/* AI Insights Section */}
                    {aiAnalysis && (
                        <div className="mb-8 p-8 bg-slate-900 rounded-[40px] text-white shadow-xl shadow-slate-200 relative overflow-hidden animate-in slide-in-from-top-4 duration-500 print-card">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Brain size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles size={20} className="text-indigo-400" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Análise Estratégica AI Brain</h3>
                                </div>
                                <p className="text-sm font-medium leading-relaxed whitespace-pre-line text-slate-200">
                                    {aiAnalysis}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Detailed Table */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        {(() => {
                            const chunkArray = (arr, size) => {
                                if (!arr) return [];
                                const res = [];
                                for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
                                return res;
                            };

                            const isAudit = reportContext === 'AUDIT';
                            const dataPages = isAudit ? chunkArray(filteredReportData, 8) : [filteredReportData];

                            return dataPages.map((pageData, pageIdx) => (
                                <div key={pageIdx} className={`${pageIdx > 0 ? 'page-break mt-12' : ''} ${isAudit ? 'manual-paging' : ''}`}>
                                    <div style={{overflow: 'visible'}}>
                                        <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                {reportContext === 'INVENTORY' ? (
                                                    <>
                                                        <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Cadastro</th>
                                                        <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item / Cliente</th>
                                                        <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Depósito</th>
                                                        <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo (KG)</th>
                                                        <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                                    </>
                                    ) : reportContext === 'AUDIT' ? (
                                        <>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente / Teste</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">OP</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Qtd</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Custo Prod.</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Custo Logist.</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Inv.</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        </>
                                    ) : reportContext === 'ADJUSTMENTS' ? (
                                        <>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item / Bin</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Variação</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Diferença</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Motivo / Teste</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                                        </>
                                    ) : reportContext?.startsWith('MGMT_') && filteredReportData.length > 0 ? (
                                        Object.keys(filteredReportData[0]).map((key, i) => (
                                            <th key={i} className={`p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest ${i === 0 ? '' : 'text-center'}`}>{key}</th>
                                        ))
                                    ) : (
                                        <>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item / Cliente</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">OP</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Qtd Prod.</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Faturamento</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status Técnico</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-900">
                                {reportContext === 'INVENTORY' ? (
                                    pageData.map(item => (
                                        <tr key={item.id} className="text-[10px]">
                                            <td className="p-4 font-bold text-slate-400 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4 font-black text-slate-700 uppercase leading-tight">{item.name} <br /><span className="text-[8px] text-slate-400">{item.client_name}</span></td>
                                            <td className="p-4 font-black text-slate-500 uppercase text-center">{item.stock_bin}</td>
                                            <td className="p-4 text-right font-black text-slate-900">{(item.quantity || 0).toFixed(1)} KG</td>
                                            <td className="p-4">
                                                <div className="flex justify-center">
                                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : reportContext === 'ADJUSTMENTS' ? (
                                    pageData.map(log => {
                                        const item = inventory.find(i => i.id === log.inventory_item_id);
                                        const isLoss = parseFloat(log.difference || 0) < 0;
                                        return (
                                            <tr key={log.id} className={`text-[10px] ${isLoss ? 'bg-rose-50/30' : 'bg-emerald-50/30'}`}>
                                                <td className="p-4 font-bold text-slate-400 whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-4 font-black text-slate-700 uppercase leading-tight">
                                                    {item?.name || 'Item Removido'}<br />
                                                    <span className="text-[8px] text-slate-400">BIN: {item?.stock_bin || '---'}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-slate-500">
                                                        <span>{log.prev_qty}</span>
                                                        <span>→</span>
                                                        <span className="text-slate-800">{log.new_qty}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-black">
                                                    <span className={isLoss ? 'text-rose-600' : 'text-emerald-600'}>
                                                        {parseFloat(log.difference || 0) > 0 ? '+' : ''}{log.difference} {item?.unit || 'KG'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-600 uppercase text-[9px]">{log.reason}</span>
                                                        {log.test_reference && <span className="text-[8px] text-indigo-500 font-black">REF: {log.test_reference}</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{log.user_id?.username || 'Sistema'}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : reportContext?.startsWith('MGMT_') ? (
                                    pageData.map((row, rowIdx) => (
                                        <tr key={rowIdx} className="text-[10px] border-b border-slate-50 last:border-0">
                                            {Object.entries(row).map(([key, val], colIdx) => (
                                                <td key={colIdx} className={`p-4 ${colIdx === 0 ? 'font-black text-slate-700 uppercase' : 'text-center font-bold text-slate-500'}`}>
                                                    {val}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    pageData.map(t => {
                                        const taskCosts = t.task_costs !== undefined ? t.task_costs : (tasks || [])
                                            .filter(tk => tk.parent_test_id === t.id)
                                            .reduce((acc, curr) => {
                                                const tc = parseFloat(curr?.trip_cost || 0);
                                                const tr = (curr?.travels || []).reduce((tAcc, tCurr) => tAcc + parseFloat(tCurr?.cost || 0), 0);
                                                return acc + tc + tr;
                                            }, 0);
                                        const isReuse = (reportContext === 'AUDIT' || reportContext === 'ENGINEERING') && t.consumed_stock_id;

                                        if (reportContext === 'AUDIT') {
                                            const isDiscarded = t.status === 'DISCARDED' || t.justification_reason === 'AVARIA/PERDA';
                                            const produced = t.produced_quantity || t.quantity || t.qty_produced || 0;
                                            const unit = t.unit || 'KG';
                                            const costToDisplay = t.amortized_cost !== undefined ? t.amortized_cost : (t.op_cost || t.gross_total_cost || t.production_cost || 0);

                                            return (
                                                <tr key={t.id} className={`text-[10px] transition-colors break-inside-avoid page-break-inside-avoid ${isReuse ? 'bg-emerald-50/40 print:bg-emerald-50/40' : ''} ${isDiscarded ? 'bg-rose-50/40 print:bg-rose-50/40' : ''}`}>
                                                    <td className="p-4 font-bold text-slate-400 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                                                    <td className="p-4 font-black text-slate-700 uppercase leading-tight">
                                                        <div className="flex items-center gap-2">
                                                            {isReuse && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200 no-print" title="Reuso de Material" />}
                                                            {isDiscarded && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200 no-print" title="Descarte/Perda" />}
                                                            <span>{t.client_name || t.title || 'Estoque Geral'}</span>
                                                        </div>
                                                        {isReuse && (
                                                            (() => {
                                                                const donorInventory = inventory?.find(i => String(i.id) === String(t.consumed_stock_id));
                                                                const parentTest = tests?.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                                                return (
                                                                    <span className="text-[7px] text-emerald-600 font-extrabold italic block mt-0.5">
                                                                        Economia Circular (Reuso) {parentTest ? `| De: #${parentTest.test_number}` : ''}
                                                                    </span>
                                                                );
                                                            })()
                                                        )}
                                                        {isDiscarded && <span className="text-[7px] text-rose-600 font-extrabold italic block mt-0.5 no-print">Perda Registrada (Descarte)</span>}
                                                    </td>
                                                    <td className="p-4 font-black text-slate-500 uppercase text-center">{t.op_number || t.extra_data?.OP || '-'}</td>
                                                    <td className="p-4 text-right font-black text-slate-900">{produced.toFixed(1)} <span className="text-[8px] text-slate-400">{unit}</span></td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-bold text-slate-600">R$ {costToDisplay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            {t.unit_cost_base > 0 && (
                                                                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">
                                                                    R$ {t.unit_cost_base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {unit}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-indigo-600">R$ {taskCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                    <td className="p-4 text-right font-black text-slate-900 bg-slate-50/30">R$ {(costToDisplay + taskCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                    <td className="p-4">
                                                        <div className="flex justify-center">
                                                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                                t.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' :
                                                                t.status === 'REPROVADO' ? 'bg-rose-100 text-rose-700' : 
                                                                isDiscarded ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {isDiscarded ? 'DESCARTE' : t.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // Default context: ENGINEERING / TESTS
                                        return (
                                            <tr key={t.id} className="text-[10px] transition-colors border-b border-slate-50 last:border-0">
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 uppercase tracking-tight">
                                                            {t.name || t.product_name || t.title || 'Item de Engenharia'}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                            {t.client_name || 'Estoque Geral'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-slate-600 uppercase text-center">
                                                    {t.op_number || t.op || '-'}
                                                </td>
                                                <td className="p-4 text-right font-black text-slate-900">
                                                    {t.produced_quantity || t.quantity || 0} <span className="text-[8px] text-slate-400 uppercase">{t.unit || 'KG'}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {t.nf_number ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase">FATURADO</span>
                                                            <span className="text-[7px] text-slate-400 mt-0.5 font-bold">NF: {t.nf_number}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded uppercase">PENDENTE</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center">
                                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${t.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' :
                                                            t.status === 'REPROVADO' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {t.status}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ));
            })()}
        </div>

                    {/* Footer Printing Only */}
                    <div className="hidden print:flex justify-between items-center mt-12 pt-8 border-t border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Documento gerado em {new Date().toLocaleString('pt-BR')}</span>
                        <div className="flex gap-4">
                            <span className="text-[10px] text-slate-400 font-black uppercase italic">Brain Intelligence System</span>
                        </div>
                    </div>
                </div>

                {/* Footer no-print */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center no-print sticky bottom-0 z-10">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Relatório Técnico Consolidado</span>
                    <div className="flex gap-4">
                        <span className="text-[10px] text-slate-400 font-black uppercase italic">Brain Intelligence System</span>
                    </div>
                </div>
            </div>
        </div>
    , document.body);
};

export default ReportModal;
