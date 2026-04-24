import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Printer, TrendingUp, Users, CheckCircle2,
    DollarSign, BarChart3, ArrowUpRight, ArrowDownRight,
    ClipboardList, Zap, ChevronLeft, ShieldAlert, MessageSquare,
    Clock, Target, Award, AlertTriangle, Package, Layers,
    RotateCcw, RefreshCw, Trash2, Activity, PieChart
} from 'lucide-react';

const CommercialDashboard = ({ clients, tasks, timeRange, onClose, currentUser }) => {
    const [sacData, setSacData] = useState([]);
    const [rncData, setRncData] = useState([]);
    const [returnsData, setReturnsData] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadingExtra, setLoadingExtra] = useState(true);
    const [selectedRange, setSelectedRange] = useState(timeRange || '30');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoadingExtra(true);
            try {
                const now = new Date();
                const targetDate = new Date(now.getTime() - (parseInt(selectedRange) * 24 * 60 * 60 * 1000));
                const isoTarget = targetDate.toISOString();
                const isoDateTarget = targetDate.toISOString().split('T')[0];

                const [sacRes, rncRes, usersRes, returnsRes] = await Promise.all([
                    supabase
                        .from('sac_tickets')
                        .select('id, client_name, status, created_at, updated_at, unit_price, quantity, total_value, has_return, returned_quantity, return_destination, final_quantity, new_unit_price, rework_qty, loss_qty, discard_qty, item_name, sac_sectors(name), sac_problem_types(name)')
                        .gte('created_at', isoTarget)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('rnc_records')
                        .select('id, status, created_at, updated_at, client_name, root_cause_ishikawa, quantity, unit_price, returned_quantity, new_unit_price, final_quantity, has_return, return_destination, rework_qty, loss_qty, discard_qty, item_name')
                        .gte('created_at', isoTarget)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('users')
                        .select('id, username, color'),
                    supabase
                        .from('product_returns')
                        .select('id, client_name, item_name, quantity, unit_price, total_value, status, return_date, return_destination, rework_qty, loss_qty, discard_qty, final_quantity, sac_id, rnc_id')
                        .gte('return_date', isoDateTarget)
                        .order('return_date', { ascending: false }),
                ]);

                setSacData(sacRes.data || []);
                setRncData(rncRes.data || []);
                setUsers(usersRes.data || []);
                setReturnsData(returnsRes.data || []);
            } catch (err) {
                console.error('CommercialDashboard fetch error:', err);
            } finally {
                setLoadingExtra(false);
            }
        };
        fetchDashboardData();
    }, [selectedRange]);

    const analysis = useMemo(() => {
        const now = new Date();
        const days = parseInt(selectedRange);
        const targetDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        const periodTasks = tasks.filter(t => new Date(t.created_at) >= targetDate);

        // --- FINANCEIRO (tasks) ---
        const totalRevenue = periodTasks.reduce((acc, t) => acc + (Number(t.production_cost) || 0), 0);
        const totalTripCost = periodTasks.reduce((acc, t) => acc + (Number(t.trip_cost) || 0), 0);
        const netMargin = totalRevenue - totalTripCost;

        // --- VOLUME POR TÉCNICO ---
        const userActivity = {};
        periodTasks.forEach(t => {
            const assignees = t.assigned_users || (t.assigned_to ? [t.assigned_to] : []);
            const userList = Array.isArray(assignees) ? assignees : [assignees];
            userList.forEach(uid => {
                if (!uid) return;
                if (!userActivity[uid]) userActivity[uid] = { tasks: 0, concluded: 0 };
                userActivity[uid].tasks += 1;
                if (t.status === 'CONCLUÍDO' || t.status === 'CONCLUIDO') userActivity[uid].concluded += 1;
            });
        });
        const topUsers = Object.entries(userActivity)
            .map(([uid, stats]) => {
                const user = users.find(u => u.id === uid) || { username: 'N/A', color: '#94a3b8' };
                return { ...user, ...stats };
            })
            .sort((a, b) => b.tasks - a.tasks)
            .slice(0, 6);

        // --- SAC: 3 estados separados ---
        const sacOpen = sacData.filter(s => s.status === 'ABERTO').length;
        const sacAnalysis = sacData.filter(s => s.status === 'EM_ANALISE').length;
        const sacResolved = sacData.filter(s => s.status === 'RESOLVIDO').length;
        const sacMigrated = sacData.filter(s => s.status === 'MIGRADO_RNC').length;
        const sacWithReturn = sacData.filter(s => s.has_return).length;

        // --- RNC por status ---
        const rncOpen = rncData.filter(r => r.status === 'ABERTO').length;
        const rncInProgress = rncData.filter(r => r.status === 'EM_EXECUCAO').length;
        const rncClosed = rncData.filter(r => r.status === 'FECHADO').length;

        // --- Tempo médio de resolução SAC (apenas tickets realmente resolvidos) ---
        const resolvedSacs = sacData.filter(s => s.status === 'RESOLVIDO' || s.status === 'MIGRADO_RNC');
        let avgResolutionHours = 0;
        if (resolvedSacs.length > 0) {
            const totalHours = resolvedSacs.reduce((acc, s) => {
                const diff = new Date(s.updated_at) - new Date(s.created_at);
                return acc + (diff > 0 ? diff / (1000 * 60 * 60) : 0);
            }, 0);
            avgResolutionHours = Math.round(totalHours / resolvedSacs.length);
        }

        // --- Taxa de conversão SAC -> RNC (migrados) ---
        const conversionRate = sacData.length > 0 ? Math.round((sacMigrated / sacData.length) * 100) : 0;

        // --- Taxa de eficiência SAC ---
        const efficiencyRate = sacData.length > 0
            ? Math.round(((sacResolved + sacMigrated) / sacData.length) * 100)
            : 0;

        // --- BUG 1 CORRIGIDO: Perda Bruta = product_returns (fonte única de verdade) ---
        // Usamos a tabela product_returns que já consolida devoluções de SAC e RNC
        const grossLoss = returnsData.reduce((acc, r) => {
            return acc + (Number(r.total_value) || ((Number(r.quantity) || 0) * (Number(r.unit_price) || 0)));
        }, 0);

        // --- BUG 2 CORRIGIDO: Perda Real = o que não foi recuperado ---
        const netLoss = returnsData.reduce((acc, r) => {
            const originalValue = Number(r.total_value) || ((Number(r.quantity) || 0) * (Number(r.unit_price) || 0));
            if (r.return_destination === 'REWORK') {
                const recoveredValue = (Number(r.final_quantity) || 0) * (Number(r.unit_price) || 0);
                return acc + Math.max(0, originalValue - recoveredValue);
            }
            return acc + originalValue; // Descarte = perda total
        }, 0);

        // Valor recuperado
        const recoveredValue = grossLoss - netLoss;

        // Valor em risco (SACs abertos com valor)
        const valueAtRisk = sacData
            .filter(s => s.status === 'ABERTO' || s.status === 'EM_ANALISE')
            .reduce((acc, s) => acc + (Number(s.total_value) || (Number(s.quantity) || 0) * (Number(s.unit_price) || 0)), 0);

        // --- DEVOLUÇÕES: métricas da tabela product_returns ---
        const returnsTotal = returnsData.length;
        const returnsPending = returnsData.filter(r => r.status === 'PENDENTE' || r.status === 'EM ANALISE').length;
        const returnsConcluded = returnsData.filter(r => r.status === 'CONCLUÍDO' || r.status === 'RECEBIDO').length;
        const totalReturnedQty = returnsData.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
        const totalReworkQty = returnsData.reduce((acc, r) => acc + (Number(r.rework_qty) || 0), 0);
        const totalDiscardQty = returnsData.reduce((acc, r) => acc + (Number(r.discard_qty) || 0), 0);
        const reworkRate = totalReturnedQty > 0 ? ((totalReworkQty / totalReturnedQty) * 100).toFixed(1) : '0.0';
        const discardRate = totalReturnedQty > 0 ? ((totalDiscardQty / totalReturnedQty) * 100).toFixed(1) : '0.0';

        // Top itens mais devolvidos
        const itemsMap = {};
        returnsData.forEach(r => {
            const name = r.item_name || 'Não informado';
            if (!itemsMap[name]) itemsMap[name] = { qty: 0, count: 0, value: 0 };
            itemsMap[name].qty += (Number(r.quantity) || 0);
            itemsMap[name].count += 1;
            itemsMap[name].value += (Number(r.total_value) || 0);
        });
        const topReturnedItems = Object.entries(itemsMap)
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // --- BUG 3 CORRIGIDO: Ranking de clientes por fonte correta ---
        const clientIssues = {};
        sacData.forEach(r => {
            const name = r.client_name || 'Não informado';
            if (!clientIssues[name]) clientIssues[name] = { sacs: 0, rncs: 0 };
            clientIssues[name].sacs += 1;
        });
        rncData.forEach(r => {
            const name = r.client_name || 'Não informado';
            if (!clientIssues[name]) clientIssues[name] = { sacs: 0, rncs: 0 };
            clientIssues[name].rncs += 1;
        });
        const topClientsByIssues = Object.entries(clientIssues)
            .map(([name, v]) => ({ name, ...v, total: v.sacs + v.rncs }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // --- QUALIDADE: Top Motivos de Falha ---
        const reasonsMap = {};
        rncData.forEach(r => {
            const raw = (r.root_cause_ishikawa || '').trim();
            if (!raw) return;
            const key = raw.length > 60 ? raw.substring(0, 60) + '...' : raw;
            reasonsMap[key] = (reasonsMap[key] || 0) + 1;
        });
        const topReasons = Object.entries(reasonsMap)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        // Top setores de origem
        const sectorsMap = {};
        sacData.forEach(s => {
            const name = s.sac_sectors?.name || 'Sem Setor';
            sectorsMap[name] = (sectorsMap[name] || 0) + 1;
        });
        const topSectors = Object.entries(sectorsMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Ranking dos tipos de problema
        const problemsMap = {};
        sacData.forEach(s => {
            const name = s.sac_problem_types?.name || null;
            if (!name) return;
            problemsMap[name] = (problemsMap[name] || 0) + 1;
        });
        const topProblems = Object.entries(problemsMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            days,
            totalTasks: periodTasks.length,
            totalRevenue, totalTripCost, netMargin,
            topUsers,
            // SAC
            sacOpen, sacAnalysis, sacResolved, sacMigrated, sacWithReturn,
            totalSacs: sacData.length,
            // RNC
            rncOpen, rncInProgress, rncClosed,
            totalRncs: rncData.length,
            // Métricas
            conversionRate, avgResolutionHours, efficiencyRate,
            // Financeiro
            grossLoss, netLoss, recoveredValue, valueAtRisk,
            rncWithReturnCount: rncData.filter(r => r.has_return).length,
            // Devoluções
            returnsTotal, returnsPending, returnsConcluded,
            totalReturnedQty, reworkRate, discardRate,
            topReturnedItems,
            // Qualidade
            topClientsByIssues, topReasons, topSectors, topProblems,
        };
    }, [tasks, sacData, rncData, returnsData, users, selectedRange]);

    const handlePrint = () => window.print();
    const formatCurrency = (val) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const maxReasonCount = analysis.topReasons[0]?.count || 1;
    const maxSectorCount = analysis.topSectors[0]?.count || 1;
    const maxItemQty = analysis.topReturnedItems[0]?.qty || 1;

    const RANGE_OPTIONS = [
        { label: '7 dias', value: '7' },
        { label: '15 dias', value: '15' },
        { label: '30 dias', value: '30' },
        { label: '60 dias', value: '60' },
        { label: '90 dias', value: '90' },
    ];

    return (
        <div className="printable-area flex flex-col h-full bg-slate-100 overflow-hidden w-full">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-20 shadow-sm print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors" title="Voltar">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 text-white rounded-lg"><BarChart3 size={20} /></div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Dashboard de Desempenho</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Volume • Custo • Qualidade • Devoluções</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {RANGE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setSelectedRange(opt.value)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedRange === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg text-sm">
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">

                {/* ===== SEÇÃO: KPIs PRINCIPAIS ===== */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* SAC com 3 estados */}
                    <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <MessageSquare size={18} className="text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SACs no Período</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{analysis.totalSacs}</p>
                        <div className="flex flex-col gap-0.5 mt-2">
                            <span className="text-[9px] font-bold text-rose-500">{analysis.sacOpen} abertos</span>
                            <span className="text-[9px] font-bold text-amber-500">{analysis.sacAnalysis} em análise</span>
                            <span className="text-[9px] font-bold text-emerald-500">{analysis.sacResolved + analysis.sacMigrated} finalizados</span>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <ShieldAlert size={18} className="text-rose-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RNCs no Período</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{analysis.totalRncs}</p>
                        <div className="flex flex-col gap-0.5 mt-2">
                            <span className="text-[9px] font-bold text-rose-500">{analysis.rncOpen} abertas</span>
                            <span className="text-[9px] font-bold text-amber-500">{analysis.rncInProgress} em execução</span>
                            <span className="text-[9px] font-bold text-emerald-500">{analysis.rncClosed} fechadas</span>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <Activity size={18} className="text-emerald-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Eficiência SAC</span>
                        </div>
                        <p className={`text-3xl font-black ${analysis.efficiencyRate >= 70 ? 'text-emerald-600' : analysis.efficiencyRate >= 40 ? 'text-amber-500' : 'text-rose-600'}`}>
                            {analysis.efficiencyRate}%
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-2">SACs resolvidos / total</p>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${analysis.efficiencyRate >= 70 ? 'bg-emerald-400' : analysis.efficiencyRate >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${analysis.efficiencyRate}%` }} />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <Clock size={18} className="text-amber-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">T.M. Resolução</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{analysis.avgResolutionHours}h</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-2">tempo médio por SAC</p>
                        <p className="text-[9px] font-bold text-indigo-400 mt-0.5">{analysis.conversionRate}% viraram RNC</p>
                    </div>
                </div>

                {/* ===== SEÇÃO: CUSTO / IMPACTO FINANCEIRO ===== */}
                <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <DollarSign size={14} className="text-rose-500" /> Impacto Financeiro de Não-Qualidade
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-rose-50 border border-rose-100 p-5 rounded-[24px]">
                            <div className="w-9 h-9 bg-rose-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-rose-200">
                                <AlertTriangle size={18} />
                            </div>
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Valor em Risco</p>
                            <p className="text-xl font-black text-slate-900">{formatCurrency(analysis.valueAtRisk)}</p>
                            <p className="text-[9px] text-rose-500 font-bold mt-1">SACs abertos/em análise</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-5 rounded-[24px]">
                            <div className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-orange-200">
                                <Package size={18} />
                            </div>
                            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Perda Bruta (Devoluções)</p>
                            <p className="text-xl font-black text-slate-900">{formatCurrency(analysis.grossLoss)}</p>
                            <p className="text-[9px] text-orange-500 font-bold mt-1">{analysis.returnsTotal} devoluções no período</p>
                        </div>
                        <div className="bg-slate-900 p-5 rounded-[24px] text-white">
                            <div className="w-9 h-9 bg-white/10 border border-white/20 text-white rounded-xl flex items-center justify-center mb-3">
                                <Zap size={18} />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Perda Real (após retrab.)</p>
                            <p className="text-xl font-black">{formatCurrency(analysis.netLoss)}</p>
                            <p className="text-[9px] text-slate-500 font-bold mt-1">valor não recuperado</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-[24px]">
                            <div className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-emerald-200">
                                <RefreshCw size={18} />
                            </div>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Valor Recuperado</p>
                            <p className="text-xl font-black text-slate-900">{formatCurrency(analysis.recoveredValue)}</p>
                            <p className="text-[9px] text-emerald-500 font-bold mt-1">via retrabalho</p>
                        </div>
                    </div>
                </div>

                {/* ===== SEÇÃO: PAINEL DE DEVOLUÇÕES ===== */}
                <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <RotateCcw size={14} className="text-rose-500" /> Painel de Devoluções — Últimos {analysis.days} dias
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* KPIs de Devolução */}
                        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                                <PieChart size={13} className="text-rose-400" /> Indicadores de Retorno
                            </h4>
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                                    <p className="text-2xl font-black text-slate-900">{analysis.returnsTotal}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Total</p>
                                </div>
                                <div className="bg-amber-50 rounded-2xl p-3 text-center border border-amber-100">
                                    <p className="text-2xl font-black text-amber-600">{analysis.returnsPending}</p>
                                    <p className="text-[8px] font-black text-amber-500 uppercase mt-0.5">Pendentes</p>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-3 text-center border border-emerald-100">
                                    <p className="text-2xl font-black text-emerald-600">{analysis.returnsConcluded}</p>
                                    <p className="text-[8px] font-black text-emerald-500 uppercase mt-0.5">Concluídas</p>
                                </div>
                            </div>
                            <div className="space-y-3 pt-3 border-t border-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw size={12} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-600">Taxa de Retrabalho</span>
                                    </div>
                                    <span className="text-sm font-black text-emerald-600">{analysis.reworkRate}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${analysis.reworkRate}%` }} />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <Trash2 size={12} className="text-slate-500" />
                                        <span className="text-[10px] font-black text-slate-600">Taxa de Descarte</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-700">{analysis.discardRate}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${analysis.discardRate}%` }} />
                                </div>
                                <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Volume devolvido</span>
                                    <span className="text-sm font-black text-slate-900">{analysis.totalReturnedQty.toFixed(1)} un</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Itens Mais Devolvidos */}
                        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                                <Package size={13} className="text-orange-400" /> Top Itens Mais Devolvidos
                            </h4>
                            {loadingExtra ? (
                                <div className="flex items-center justify-center py-8"><div className="w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" /></div>
                            ) : analysis.topReturnedItems.length > 0 ? (
                                <div className="space-y-3">
                                    {analysis.topReturnedItems.map((item, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="text-[8px] font-black text-slate-400 w-4 shrink-0">#{i + 1}</span>
                                                    <span className="text-[10px] font-black text-slate-700 truncate" title={item.name}>{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <span className="text-[9px] font-bold text-orange-600">{item.qty.toFixed(1)} un</span>
                                                    <span className="text-[8px] font-bold text-slate-300">•</span>
                                                    <span className="text-[9px] font-bold text-slate-400">{item.count}×</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(item.qty / maxItemQty) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-xs italic">Nenhuma devolução no período.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== GRID: VOLUME + QUALIDADE ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* SEÇÃO: VOLUME POR TÉCNICO */}
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Users size={14} className="text-brand-500" /> Volume por Técnico
                        </h3>
                        {loadingExtra ? (
                            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
                        ) : analysis.topUsers.length > 0 ? (
                            <div className="space-y-3">
                                {analysis.topUsers.map((u, i) => (
                                    <div key={u.id || i} className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm" style={{ backgroundColor: u.color || '#64748b' }}>
                                            {(u.username || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-black text-slate-700 truncate max-w-[120px]">{u.username || 'N/A'}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{u.tasks} atividades</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${(u.tasks / (analysis.topUsers[0]?.tasks || 1)) * 100}%`, backgroundColor: u.color || '#6366f1' }} />
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">{u.concluded} ✓</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400 text-xs italic">Sem tarefas com responsáveis no período.</div>
                        )}
                    </div>

                    {/* SEÇÃO: TOP CLIENTES */}
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Award size={14} className="text-amber-500" /> Top Clientes com Ocorrências
                        </h3>
                        {loadingExtra ? (
                            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" /></div>
                        ) : analysis.topClientsByIssues.length > 0 ? (
                            <div className="space-y-3">
                                {analysis.topClientsByIssues.map((c, i) => (
                                    <div key={c.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                        <div className="w-7 h-7 bg-white rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm border border-slate-100">
                                            #{i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{c.name}</p>
                                            <div className="flex gap-2 mt-0.5">
                                                {c.sacs > 0 && <span className="text-[8px] font-black text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{c.sacs} SAC</span>}
                                                {c.rncs > 0 && <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{c.rncs} RNC</span>}
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${c.total >= 3 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {c.total} ocorr.
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400 text-xs italic">Nenhuma ocorrência no período.</div>
                        )}
                    </div>

                    {/* SEÇÃO: STATUS GERAL */}
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <ClipboardList size={14} className="text-sky-500" /> Status Geral de Atendimentos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Chamados SAC</p>
                                <div className="flex items-center justify-between p-2 bg-rose-50 rounded-xl border border-rose-100">
                                    <span className="text-[9px] font-black text-rose-600 uppercase">Abertos</span>
                                    <span className="text-sm font-black text-rose-700">{analysis.sacOpen}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-xl border border-amber-100">
                                    <span className="text-[9px] font-black text-amber-600 uppercase">Em Análise</span>
                                    <span className="text-sm font-black text-amber-700">{analysis.sacAnalysis}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase">Finalizados</span>
                                    <span className="text-sm font-black text-emerald-700">{analysis.sacResolved + analysis.sacMigrated}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Registros RNC</p>
                                <div className="flex items-center justify-between p-2 bg-rose-50 rounded-xl border border-rose-100">
                                    <span className="text-[9px] font-black text-rose-600 uppercase">Abertas</span>
                                    <span className="text-sm font-black text-rose-700">{analysis.rncOpen}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-xl border border-amber-100">
                                    <span className="text-[9px] font-black text-amber-600 uppercase">Em Execução</span>
                                    <span className="text-sm font-black text-amber-700">{analysis.rncInProgress}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-slate-900 rounded-xl">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Fechadas</span>
                                    <span className="text-sm font-black text-white">{analysis.rncClosed}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO: TOP TIPOS DE PROBLEMA */}
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <ShieldAlert size={14} className="text-amber-500" /> Principais Tipos de Problema (SAC)
                        </h3>
                        {loadingExtra ? (
                            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" /></div>
                        ) : analysis.topProblems.length > 0 ? (
                            <div className="space-y-3">
                                {analysis.topProblems.map((p, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[200px]" title={p.name}>{p.name}</span>
                                            <span className="text-[10px] font-bold text-amber-600 shrink-0 ml-2">{p.count}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${(p.count / (analysis.topProblems[0]?.count || 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400 text-xs italic">Nenhum tipo de problema detalhado no período.</div>
                        )}
                    </div>

                    {/* SEÇÃO: TOP MOTIVOS DE FALHA (RNC) */}
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Target size={14} className="text-rose-500" /> Principais Motivos de Falha (RNC)
                        </h3>
                        {loadingExtra ? (
                            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" /></div>
                        ) : analysis.topReasons.length > 0 ? (
                            <div className="space-y-4">
                                {analysis.topReasons.map((r, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-[10px] font-bold text-slate-700 leading-relaxed break-words flex-1"
                                                style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                                title={r.reason}>
                                                {r.reason}
                                            </span>
                                            <span className="text-[10px] font-black text-rose-600 shrink-0 whitespace-nowrap bg-rose-50 px-2 py-0.5 rounded-lg">{r.count}x</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-rose-400" style={{ width: `${(r.count / maxReasonCount) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400 text-xs italic">Nenhuma causa raiz registrada nas RNCs do período.</div>
                        )}
                    </div>

                    {/* SEÇÃO: TOP SETORES */}
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Layers size={14} className="text-indigo-500" /> Setores com Mais Chamados (SAC)
                        </h3>
                        {loadingExtra ? (
                            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
                        ) : analysis.topSectors.length > 0 ? (
                            <div className="space-y-3">
                                {analysis.topSectors.map((s, i) => (
                                    <div key={s.name} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[200px]" title={s.name}>{s.name}</span>
                                            <span className="text-[10px] font-bold text-indigo-600 ml-2">{s.count}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-indigo-400" style={{ width: `${(s.count / maxSectorCount) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400 text-xs italic">Nenhum setor cadastrado nos SACs do período.</div>
                        )}
                    </div>
                </div>

                {/* ===== SEÇÃO: FINANCEIRO CONSULTOR ===== */}
                {(analysis.totalRevenue > 0 || analysis.totalTripCost > 0) && (
                    <div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" /> Indicadores Comerciais (Visitas)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px]">
                                <DollarSign size={18} className="text-emerald-600 mb-3" />
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                                <p className="text-2xl font-black text-slate-900">{formatCurrency(analysis.totalRevenue)}</p>
                            </div>
                            <div className="bg-red-50 border border-red-100 p-6 rounded-[24px]">
                                <ArrowDownRight size={18} className="text-red-500 mb-3" />
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Custos Logísticos</p>
                                <p className="text-2xl font-black text-slate-900">{formatCurrency(analysis.totalTripCost)}</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-[24px] text-white">
                                <Zap size={18} className="text-slate-400 mb-3" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margem Líquida</p>
                                <p className="text-2xl font-black">{formatCurrency(analysis.netMargin)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== FOOTER ===== */}
                <div className="bg-white rounded-[24px] border border-slate-200 p-6 flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Relatório gerado por</p>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                                {currentUser?.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-slate-900">{currentUser?.username}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Confidencial · AssisTecApp</p>
                        <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                        <p className="text-[10px] font-bold text-indigo-500 mt-1">Período: últimos {analysis.days} dias</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CommercialDashboard;
