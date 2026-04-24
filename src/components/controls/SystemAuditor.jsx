import React, { useState } from 'react';
import { 
    Activity, CheckCircle, AlertTriangle, RefreshCw, 
    Database, Box, ClipboardList, ShieldCheck, Search,
    ArrowRight, Info, AlertCircle, LayoutDashboard, CheckCircle2
} from 'lucide-react';

import { supabase } from '../../supabaseClient';

const SystemAuditor = ({ currentUser, tasks, techTests }) => {
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResults, setAuditResults] = useState(null);
    const [lastAuditDate, setLastAuditDate] = useState(null);

    const runAudit = async () => {
        setIsAuditing(true);
        const results = {
            counts: { ok: 0, warning: 0, error: 0 },
            issues: []
        };

        try {
            // 0. Fetch Inventory (to ensure latest data)
            const { data: inventory, error: invError } = await supabase.from('ee_inventory').select('*');
            if (invError) throw invError;

            // Fetch Latest Tech Tests to be absolutely sure
            const { data: latestTests, error: testsError } = await supabase.from('tech_tests').select('*');
            if (testsError) throw testsError;

            await new Promise(resolve => setTimeout(resolve, 800));

            // 1. Check for Critical Operating Issues (Missing Costs, Malformed Data)
            latestTests.forEach(test => {
                const isFinalized = ['FATURADO', 'APROVADO', 'FINALIZADO'].includes(test.status);
                
                // CRITICAL: Missing Gross Cost on Finalized Tests
                if (isFinalized && (parseFloat(test.gross_total_cost) === 0 || !test.gross_total_cost)) {
                    results.counts.error++;
                    results.issues.push({
                        id: `cost-${test.id}`,
                        type: 'CRITICAL',
                        title: 'TESTE FINALIZADO COM CUSTO ZERO',
                        detail: `O teste de "${test.client}" (${test.id.slice(0,8)}) está finalizado mas o custo total está R$ 0,00.`,
                        impact: 'Impacto financeiro e erro de margem.'
                    });
                }

                // CRITICAL: Report Data Missing on Billed Tests
                if (test.status === 'FATURADO' && (!test.report_data || Object.keys(test.report_data).length < 2)) {
                    results.counts.error++;
                    results.issues.push({
                        id: `report-${test.id}`,
                        type: 'CRITICAL',
                        title: 'RELATÓRIO TÉCNICO INCONSISTENTE',
                        detail: `O teste "${test.id.slice(0,8)}" está faturado mas não possui dados de relatório salvos.`,
                        impact: 'Pode causar tela em branco ao tentar abrir ou imprimir.'
                    });
                }

                // MATH: Discrepancy between Op Cost + Trips vs Gross Total
                const calcTotal = (parseFloat(test.op_cost) || 0) + (parseFloat(test.trip_cost) || 0);
                const recordedTotal = parseFloat(test.gross_total_cost) || 0;
                if (isFinalized && Math.abs(calcTotal - recordedTotal) > 0.05) {
                    results.counts.warning++;
                    results.issues.push({
                        id: `math-${test.id}`,
                        type: 'WARNING',
                        title: 'DIVERGÊNCIA NO CÁLCULO DE CUSTO',
                        detail: `A soma de custos parciais (R$ ${calcTotal.toFixed(2)}) não bate com o Total Gravado (R$ ${recordedTotal.toFixed(2)}).`,
                        impact: 'O Financeiro pode estar divergente.'
                    });
                }
            });

            // 2. Check for Data Integrity (Null fields causing blank screens)
            tasks.forEach(task => {
                if (!task.category || task.category === 'null' || task.category === 'undefined') {
                    results.counts.error++;
                    results.issues.push({
                        id: `task-cat-${task.id}`,
                        type: 'CRITICAL',
                        title: 'TAREFA SEM CATEGORIA (TELA BRANCA)',
                        detail: `A tarefa "${task.title}" não possui categoria definida.`,
                        impact: 'Isso causa erros de renderização no Kanban e Calendário.'
                    });
                }
            });

            // 3. Check for Inventory / Test link (Keep as warning)
            latestTests.forEach(test => {
                if (test.status === 'APROVADO') {
                    const hasInventory = inventory.some(item => item.parent_test_id === test.id);
                    if (!hasInventory) {
                        results.counts.warning++;
                        results.issues.push({
                            id: `inv-sync-${test.id}`,
                            type: 'WARNING',
                            title: 'TESTE SEM REGISTRO EM ESTOQUE',
                            detail: `O teste "${test.client}" foi APROVADO mas não gerou entrada automática no inventário.`,
                            impact: 'O estoque reportado estará menor que o real.'
                        });
                    }
                }
            });

            // 4. Low Priority: Sync Issues (Info)
            latestTests.forEach(test => {
                const hasTask = tasks.some(t => t.parent_test_id === test.id || t.id === test.converted_task_id);
                if (!hasTask && test.status !== 'CANCELED') {
                    results.issues.push({
                        id: `sync-${test.id}`,
                        type: 'INFO',
                        title: 'Teste sem tarefa no Dashboard',
                        detail: `O teste "${test.id.slice(0,8)}" não tem acompanhamento no Painel Global.`,
                        impact: 'Informativo apenas.'
                    });
                }
            });

            if (results.issues.length === 0) results.counts.ok = 10; 

        } catch (err) {
            console.error("Audit failed:", err);
        }

        setAuditResults(results);
        setLastAuditDate(new Date());
        setIsAuditing(false);
    };

    const renderIssue = (issue) => {
        const isCritical = issue.type === 'CRITICAL';
        const isWarning = issue.type === 'WARNING';
        
        return (
            <div key={issue.id} className={`p-4 rounded-xl border-2 mb-3 bg-white ${
                isCritical ? 'border-red-100 shadow-red-50' : 
                isWarning ? 'border-amber-100 shadow-amber-50' : 
                'border-slate-100'
            }`}>
                <div className="flex items-start gap-3">
                    <div className={`mt-1 ${
                        isCritical ? 'text-red-500' : 
                        isWarning ? 'text-amber-500' : 
                        'text-slate-400'
                    }`}>
                        {isCritical ? <AlertCircle size={20} /> : isWarning ? <AlertCircle size={20} /> : <Info size={20} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-xs font-black uppercase tracking-widest ${
                                isCritical ? 'text-red-700' : 
                                isWarning ? 'text-amber-700' : 
                                'text-slate-600'
                            }`}>{issue.title}</h4>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                isCritical ? 'bg-red-600 text-white' : 
                                isWarning ? 'bg-amber-500 text-white' : 
                                'bg-slate-200 text-slate-500'
                            }`}>
                                {issue.type}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mb-1 leading-relaxed">{issue.detail}</p>
                        <p className="text-[10px] text-slate-400 italic">Impacto: {issue.impact}</p>
                    </div>
                    <div className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400">
                        <ArrowRight size={14} />
                    </div>
                </div>
            </div>
        );
    };

    if (currentUser?.email?.toLowerCase() !== 'engenharia1@plastimarau.com.br' &&
        !currentUser?.username?.toLowerCase().includes('evandro') &&
        currentUser?.role !== 'ADMIN') {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 opacity-50">
                <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
                <h3 className="text-slate-400 font-bold uppercase tracking-widest">Acesso Restrito ao Gestor</h3>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className={`relative p-8 rounded-3xl bg-slate-900 overflow-hidden ${isAuditing ? 'animate-pulse' : ''}`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-500/20 rounded-xl text-brand-400 border border-brand-500/30">
                                <LayoutDashboard size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                Painel de Integridade
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                            Analisando amarrações: Testes ↔ Estoque ↔ Dashboard
                        </p>
                    </div>
                    <button 
                        onClick={runAudit}
                        disabled={isAuditing}
                        className={`
                            px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-widest rounded-2xl 
                            flex items-center gap-3 transition-all shadow-xl shadow-brand-600/20 active:scale-95 disabled:opacity-50
                        `}
                    >
                        {isAuditing ? 'Analisando...' : <><Activity size={20} /> Executar Diagnóstico</>}
                    </button>
                </div>
            </div>

            {auditResults && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-500">
                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Geral</span>
                        <h4 className="text-3xl font-black text-slate-800">
                            {auditResults.counts.error === 0 ? '100%' : Math.max(0, 100 - (auditResults.counts.error * 10)) + '%'}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Integridade Operacional</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-3">
                            <AlertTriangle size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Atenção</span>
                        <h4 className="text-3xl font-black text-slate-800">{auditResults.counts.warning}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Inconsistências Leves</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-3">
                            <AlertCircle size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Crítico</span>
                        <h4 className="text-3xl font-black text-slate-800">{auditResults.counts.error}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Falhas Operacionais</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[32px] border-2 border-slate-100 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <div className="flex items-center gap-2">
                        <Search size={14} className="text-brand-600" />
                        <span>Relatório Detalhado</span>
                    </div>
                    {lastAuditDate && <span>Refresh: {lastAuditDate.toLocaleTimeString()}</span>}
                </div>
                <div className="p-6">
                    {!auditResults ? (
                        <div className="text-center py-12 opacity-50">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aguardando Execução do Diagnóstico</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1">
                            {auditResults.issues.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center">
                                     <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Sincronismo Perfeito</h3>
                                    <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto mt-2">Nenhuma falha crítica detectada na saúde estrutural do sistema hoje.</p>
                                </div>
                            ) : (
                                auditResults.issues
                                    .sort((a, b) => {
                                        const order = { 'CRITICAL': 0, 'WARNING': 1, 'INFO': 2 };
                                        return (order[a.type] || 3) - (order[b.type] || 3);
                                    })
                                    .map(issue => renderIssue(issue))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemAuditor;
