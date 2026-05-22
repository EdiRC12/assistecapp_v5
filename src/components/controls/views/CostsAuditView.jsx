import React, { useState, useMemo } from 'react';
import {
    TrendingUp, Coins, Package, BarChart3, AlertTriangle,
    Search, FileText, CheckCircle, Car, RefreshCw,
    PieChart, TrendingDown, DollarSign, Target, Clock, Award, Printer
} from 'lucide-react';
import logoPlastimarau from '../../../assets/logo_plastimarau.png';

const CostsAuditView = ({
    inventory,
    tests,
    tasks,
    filteredReportData,
    reportTotals,
    onTestOpenClick,
    setReportContext,
    setShowReportModal,
    setAiAnalysis,
    hasMore,
    onLoadMore,
    loading,
    isMeetingView
}) => {
    const [activeSubTab, setActiveSubTab] = useState('audit');

    // ─── Cálculos compartilhados ─────────────────────────────────────────────
    const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtNum = (v, d = 2) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

    // ─── ZONA 2: cálculos operacionais (todos os testes) ────────────────────
    const investimentoNovo = useMemo(() =>
        tests.filter(t => !t.consumed_stock_id && !['CANCELADO', 'REPROVADO'].includes(t.status) && ((t.op_cost || t.gross_total_cost || 0) > 0 || (t.produced_quantity || 0) > 0))
             .reduce((acc, t) => acc + (t.op_cost || t.gross_total_cost || 0), 0), [tests]);

    const patrimonioEstoque = useMemo(() =>
        inventory.filter(i => { const t = tests.find(t => String(t.id) === String(i.test_id)); return !t || !['CANCELADO', 'REPROVADO'].includes(t.status); })
                 .reduce((acc, i) => acc + (i.production_cost || 0), 0), [inventory, tests]);

    const custoAmortizado = useMemo(() =>
        tests.filter(t => t.consumed_stock_id && !['CANCELADO', 'REPROVADO'].includes(t.status) && ((t.op_cost || t.gross_total_cost || 0) > 0 || (t.produced_quantity || 0) > 0))
             .reduce((acc, t) => acc + (t.op_cost || t.gross_total_cost || 0), 0), [tests]);

    const custoViagens = useMemo(() =>
        tasks.filter(t => t.parent_test_id).reduce((acc, t) => acc + (t.trip_cost || 0) + (t.travels || []).reduce((s, tr) => s + (tr.cost || 0), 0), 0), [tasks]);

    const custoFreteTotal = useMemo(() =>
        tests.reduce((acc, t) => {
            const shipments = t.extra_data?.shipments || [];
            return acc + shipments.reduce((s, sh) => s + parseFloat(sh.freight_cost || 0), 0);
        }, 0), [tests]);

    const totalLogisticaEFrete = useMemo(() => custoViagens + custoFreteTotal, [custoViagens, custoFreteTotal]);

    // Valor não monetizado: saldo físico × custo unitário de cada teste
    const valorNaoMonetizado = useMemo(() => {
        return tests.reduce((total, t) => {
            const produced = parseFloat(t.produced_quantity || 0);
            const billed = parseFloat(t.quantity_billed || 0);
            const discarded = parseFloat(t.quantity_discarded || 0);
            const opCost = parseFloat(t.op_cost || t.gross_total_cost || 0);
            const unitCost = produced > 0 ? opCost / produced : 0;
            const invItem = inventory.find(i => String(i.test_id) === String(t.id));
            const reused = tests.filter(o => String(o.consumed_stock_id) === String(invItem?.id) && !['CANCELADO', 'REPROVADO'].includes(o.status))
                                .reduce((s, o) => s + (parseFloat(o.produced_quantity) || 0), 0);
            const stockBalance = Math.max(0, produced - billed - discarded - reused + (invItem?.inventory_adjustment || 0));
            return total + stockBalance * unitCost;
        }, 0);
    }, [tests, inventory]);

    // Testes aguardando análise financeira (têm produção mas sem sale_price)
    const aguardandoAnalise = useMemo(() =>
        tests.filter(t => {
            const produced = parseFloat(t.produced_quantity || 0);
            if (produced === 0) return false;
            const shipments = t.extra_data?.shipments || [];
            return !shipments.some(s => parseFloat(s.sale_price || 0) > 0);
        }), [tests]);

    // ─── ZONA 1: cálculos financeiros (apenas testes com sale_price) ─────────
    const financialTests = useMemo(() => {
        return tests.map(t => {
            const produced = parseFloat(t.produced_quantity || 0);
            const billed = parseFloat(t.quantity_billed || 0);
            const discarded = parseFloat(t.quantity_discarded || 0);
            const opCost = parseFloat(t.op_cost || t.gross_total_cost || 0);
            const unitCost = produced > 0 ? opCost / produced : 0;
            const shipments = t.extra_data?.shipments || [];
            const hasSalePrice = shipments.some(s => parseFloat(s.sale_price || 0) > 0);
            if (!hasSalePrice) return null;

            const totalRevenue = shipments.reduce((s, sh) => s + parseFloat(sh.qty || 0) * parseFloat(sh.sale_price || 0), 0);
            const manualFreight = shipments.reduce((s, sh) => s + parseFloat(sh.freight_cost || 0), 0);
            const linkedTasksCost = tasks.filter(tk => tk.parent_test_id === t.id)
                .reduce((s, tk) => s + (tk.trip_cost || 0) + (tk.travels || []).reduce((ts, tr) => ts + (tr.cost || 0), 0), 0);
            const totalLogistics = manualFreight + linkedTasksCost;
            const costOfGoodsSold = billed * unitCost;
            const invItem = inventory.find(i => String(i.test_id) === String(t.id));
            const reused = tests.filter(o => String(o.consumed_stock_id) === String(invItem?.id) && !['CANCELADO', 'REPROVADO'].includes(o.status))
                                .reduce((s, o) => s + (parseFloat(o.produced_quantity) || 0), 0);
            const transferCredit = reused * unitCost;
            const netMargin = totalRevenue - costOfGoodsSold - totalLogistics;
            const roi = totalRevenue + transferCredit - opCost - totalLogistics;
            const statusUpper = (t.status || '').toUpperCase();
            const verdict = netMargin > 0.005 ? 'LUCRO' : netMargin < -0.005 ? 'PREJUÍZO' : 'EMPATE';

            return {
                ...t,
                totalRevenue,
                totalLogistics,
                costOfGoodsSold,
                netMargin,
                roi,
                transferCredit,
                verdict,
                statusUpper,
                isApproved: statusUpper.includes('APROVAD'),
                isRejected: statusUpper.includes('REPROVAD') || statusUpper.includes('CANCELAD'),
            };
        }).filter(Boolean);
    }, [tests, tasks, inventory]);

    const totalWithFinancial = financialTests.length;
    const totalTests = tests.filter(t => parseFloat(t.produced_quantity || 0) > 0).length;

    const totalRevenue = useMemo(() => financialTests.reduce((s, t) => s + t.totalRevenue, 0), [financialTests]);
    const totalMargin = useMemo(() => financialTests.reduce((s, t) => s + t.netMargin, 0), [financialTests]);
    const totalInvestmentAnalyzed = useMemo(() => financialTests.reduce((s, t) => s + parseFloat(t.op_cost || t.gross_total_cost || 0), 0), [financialTests]);
    const tri = totalInvestmentAnalyzed > 0 ? Math.min((totalRevenue / totalInvestmentAnalyzed) * 100, 999) : 0;
    const avgRoi = totalWithFinancial > 0 ? financialTests.reduce((s, t) => s + t.roi, 0) / totalWithFinancial : 0;

    const distribution = useMemo(() => ({
        LUCRO:    financialTests.filter(t => t.verdict === 'LUCRO').length,
        PREJUÍZO: financialTests.filter(t => t.verdict === 'PREJUÍZO').length,
        EMPATE:   financialTests.filter(t => t.verdict === 'EMPATE').length,
    }), [financialTests]);

    const crossTable = useMemo(() => {
        const matrix = { APROVADO: {LUCRO:0,PREJUÍZO:0,EMPATE:0}, REPROVADO: {LUCRO:0,PREJUÍZO:0,EMPATE:0}, AGUARDANDO: {LUCRO:0,PREJUÍZO:0,EMPATE:0} };
        financialTests.forEach(t => {
            const row = t.isApproved ? 'APROVADO' : t.isRejected ? 'REPROVADO' : 'AGUARDANDO';
            matrix[row][t.verdict]++;
        });
        return matrix;
    }, [financialTests]);

    const roiByClient = useMemo(() => {
        const map = {};
        financialTests.forEach(t => {
            const c = t.client_name || 'Sem Cliente';
            if (!map[c]) map[c] = { revenue: 0, margin: 0, count: 0 };
            map[c].revenue += t.totalRevenue;
            map[c].margin += t.netMargin;
            map[c].count++;
        });
        return Object.entries(map)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 7);
    }, [financialTests]);

    const maxClientMargin = Math.max(...roiByClient.map(c => Math.abs(c.margin)), 1);

    const monthlyEvolution = useMemo(() => {
        const map = {};
        financialTests.forEach(t => {
            (t.extra_data?.shipments || []).forEach(sh => {
                if (!sh.date) return;
                const d = new Date(sh.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!map[key]) map[key] = { revenue: 0, investment: 0 };
                map[key].revenue += parseFloat(sh.qty || 0) * parseFloat(sh.sale_price || 0);
            });
            const opCost = parseFloat(t.op_cost || t.gross_total_cost || 0);
            const createdAt = t.created_at ? new Date(t.created_at) : null;
            if (createdAt) {
                const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
                if (!map[key]) map[key] = { revenue: 0, investment: 0 };
                map[key].investment += opCost;
            }
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([key, d]) => {
                const [year, month] = key.split('-');
                return { label: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), ...d };
            });
    }, [financialTests]);

    const maxMonthly = Math.max(...monthlyEvolution.flatMap(m => [m.revenue, m.investment]), 1);

    // conic-gradient para donut
    const donutTotal = distribution.LUCRO + distribution.PREJUÍZO + distribution.EMPATE || 1;
    const pLucro = (distribution.LUCRO / donutTotal) * 100;
    const pPrejuizo = (distribution.PREJUÍZO / donutTotal) * 100;
    const pEmpate = (distribution.EMPATE / donutTotal) * 100;
    const conicGradient = `conic-gradient(
        #16a34a 0% ${pLucro}%,
        #dc2626 ${pLucro}% ${pLucro + pPrejuizo}%,
        #d97706 ${pLucro + pPrejuizo}% 100%
    )`;

    // ─── Impressão do Painel Financeiro ────────────────────────────────────
    const handlePrintDashboard = () => {
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) return;

        const f = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const pct = (v, total) => total > 0 ? ((v / total) * 100).toFixed(1) : '0';

        // Conic gradient para donut
        const conic = `conic-gradient(#16a34a 0% ${pLucro}%, #dc2626 ${pLucro}% ${pLucro + pPrejuizo}%, #d97706 ${pLucro + pPrejuizo}% 100%)`;

        // Ranking HTML
        const rankingHtml = roiByClient.map((c, i) => {
            const barPct = Math.abs(c.margin) / maxClientMargin * 100;
            const isPos = c.margin >= 0;
            return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 8px; font-size:10px; font-weight:900; color:#64748b;">${i + 1}°</td>
                <td style="padding:6px 8px; font-size:10px; font-weight:900; color:#1e293b; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${c.name}</td>
                <td style="padding:6px 8px; font-size:9px; color:#94a3b8; text-align:center;">${c.count}</td>
                <td style="padding:6px 8px; font-size:10px; font-weight:900; color:${isPos ? '#16a34a' : '#dc2626'}; text-align:right;">${f(c.margin)}</td>
                <td style="padding:6px 8px; min-width:80px;">
                    <div style="height:6px; background:#f1f5f9; border-radius:4px; overflow:hidden;">
                        <div style="height:100%; width:${barPct}%; background:${isPos ? '#4ade80' : '#f87171'}; border-radius:4px;"></div>
                    </div>
                </td>
            </tr>`;
        }).join('');

        // Evolução mensal HTML
        const monthHtml = monthlyEvolution.map(m => {
            const rPct = Math.max((m.revenue / maxMonthly) * 80, 2);
            const iPct = Math.max((m.investment / maxMonthly) * 80, 2);
            return `
            <td style="text-align:center; vertical-align:bottom; padding:0 4px;">
                <div style="display:flex; align-items:flex-end; gap:2px; justify-content:center; height:80px;">
                    <div title="Receita: ${f(m.revenue)}" style="width:12px; background:#4ade80; border-radius:3px 3px 0 0; height:${rPct}px;"></div>
                    <div title="Investimento: ${f(m.investment)}" style="width:12px; background:#fca5a5; border-radius:3px 3px 0 0; height:${iPct}px;"></div>
                </div>
                <div style="font-size:7px; font-weight:900; color:#94a3b8; text-transform:uppercase; margin-top:4px;">${m.label}</div>
            </td>`;
        }).join('');

        // Lista de espera
        const waitingHtml = aguardandoAnalise.length > 0 ? `
        <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:16px; padding:16px; margin-top:20px;">
            <p style="font-size:9px; font-weight:900; color:#c2410c; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 10px;">⏳ Lista de Espera — ${aguardandoAnalise.length} testes sem análise financeira</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${aguardandoAnalise.map(t => `<span style="background:white; border:1px solid #fed7aa; border-radius:8px; padding:3px 8px; font-size:9px; font-weight:900; color:#c2410c;">#${t.test_number} — ${t.title}</span>`).join('')}
            </div>
        </div>` : '';

        printWindow.document.write(`
        <html>
        <head>
            <title>Painel Financeiro de Testes — Engenharia & Controles</title>
            <style>
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
                body { font-family: 'Inter', Arial, sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 20px; font-size: 11px; }
                @media print {
                    body { padding: 0; background: white; }
                    .no-print { display: none !important; }
                    @page { margin: 12mm 14mm; size: A4 portrait; }
                }
                .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; }
                table { width: 100%; border-collapse: collapse; }
                h2 { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 12px; }
            </style>
        </head>
        <body>
            <!-- Cabeçalho -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:2px solid #0f172a; margin-bottom:20px;">
                <div>
                    <div style="font-size:18px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:-0.02em;">Painel Financeiro de Testes</div>
                    <div style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.08em; margin-top:2px;">Engenharia & Controles — Análise de Viabilidade</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <img src="${logoPlastimarau}" style="height:28px; object-fit:contain;" />
                    <div style="font-size:8px; color:#94a3b8; font-weight:700;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>

            <!-- ZONA 2: Operacional -->
            <div style="background:#f1f5f9; border-radius:12px; padding:10px 14px; margin-bottom:6px;">
                <span style="font-size:8px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8;">Zona 2 — Painel Operacional (Todos os Testes)</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:18px;">
                ${[
                    { label: 'Investimento Novo', value: f(investimentoNovo), sub: 'Capital injetado na Engenharia', color: '#0f172a' },
                    { label: 'Patrimônio em Estoque', value: f(patrimonioEstoque), sub: 'Ativo circulante nos depósitos', color: '#16a34a' },
                    { label: 'Custo Amortizado (Reuso)', value: f(custoAmortizado), sub: 'Economia por reaproveitamento', color: '#d97706' },
                    { label: 'Logística & Frete', value: f(totalLogisticaEFrete), sub: `Viagens: ${f(custoViagens)} | Frete: ${f(custoFreteTotal)}`, color: '#6366f1' },
                    { label: 'Capital Não Monetizado', value: f(valorNaoMonetizado), sub: 'Estoque aguardando venda/destino', color: '#7c3aed' },
                    { label: 'Aguardando Análise', value: aguardandoAnalise.length + ' testes', sub: `de ${totalTests} testes com produção`, color: '#ea580c' },
                ].map(c => `
                    <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:12px 14px;">
                        <div style="font-size:8px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; margin-bottom:4px;">${c.label}</div>
                        <div style="font-size:16px; font-weight:900; color:${c.color};">${c.value}</div>
                        <div style="font-size:8px; color:#94a3b8; font-style:italic; margin-top:2px;">${c.sub}</div>
                    </div>`).join('')}
            </div>

            ${ totalWithFinancial > 0 ? `
            <!-- ZONA 1: Análise Financeira -->
            <div style="background:linear-gradient(90deg,#eef2ff,#e0e7ff); border-radius:12px; padding:10px 14px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:8px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#4338ca;">Zona 1 — Análise Financeira Ativa</span>
                <span style="font-size:8px; font-weight:900; color:#818cf8; background:white; padding:2px 10px; border-radius:999px; border:1px solid #c7d2fe;">${totalWithFinancial} de ${totalTests} testes</span>
            </div>

            <!-- KPIs -->
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px;">
                <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:12px 14px;">
                    <div style="font-size:8px; font-weight:900; text-transform:uppercase; color:#94a3b8; margin-bottom:4px;">Receita Total Gerada</div>
                    <div style="font-size:15px; font-weight:900; color:#16a34a;">${f(totalRevenue)}</div>
                    <div style="font-size:8px; color:#94a3b8; font-style:italic;">Soma das vendas reais (NFs)</div>
                </div>
                <div style="background:${totalMargin >= 0 ? '#f0fdf4' : '#fff1f2'}; border:1px solid ${totalMargin >= 0 ? '#bbf7d0' : '#fecdd3'}; border-radius:14px; padding:12px 14px;">
                    <div style="font-size:8px; font-weight:900; text-transform:uppercase; color:${totalMargin >= 0 ? '#15803d' : '#b91c1c'}; margin-bottom:4px;">Margem Comercial Total</div>
                    <div style="font-size:15px; font-weight:900; color:${totalMargin >= 0 ? '#16a34a' : '#dc2626'};">${f(totalMargin)}</div>
                    <div style="font-size:8px; color:#94a3b8; font-style:italic;">Receita − CMV − Logística</div>
                </div>
                <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:12px 14px;">
                    <div style="font-size:8px; font-weight:900; text-transform:uppercase; color:#94a3b8; margin-bottom:4px;">TRI — Recuperação</div>
                    <div style="font-size:15px; font-weight:900; color:${tri >= 100 ? '#16a34a' : tri >= 60 ? '#d97706' : '#dc2626'};">${tri.toFixed(1)}%</div>
                    <div style="height:5px; background:#f1f5f9; border-radius:3px; overflow:hidden; margin:4px 0;">
                        <div style="height:100%; width:${Math.min(tri, 100)}%; background:${tri >= 100 ? '#4ade80' : tri >= 60 ? '#fbbf24' : '#f87171'}; border-radius:3px;"></div>
                    </div>
                    <div style="font-size:8px; color:#94a3b8; font-style:italic;">Receita / Investimento analisado</div>
                </div>
                <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:12px 14px;">
                    <div style="font-size:8px; font-weight:900; text-transform:uppercase; color:#94a3b8; margin-bottom:4px;">ROI Médio / Teste</div>
                    <div style="font-size:15px; font-weight:900; color:${avgRoi >= 0 ? '#4f46e5' : '#dc2626'};">${f(avgRoi)}</div>
                    <div style="font-size:8px; color:#94a3b8; font-style:italic;">Média entre ${totalWithFinancial} testes</div>
                </div>
            </div>

            <!-- Distribuição + Cruzamento (lado a lado) -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
                <!-- Donut -->
                <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:16px;">
                    <h2>Distribuição de Resultados</h2>
                    <div style="display:flex; align-items:center; gap:20px;">
                        <div style="position:relative; width:90px; height:90px; flex-shrink:0;">
                            <div style="width:90px; height:90px; border-radius:50%; background:${conic};"></div>
                            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:54px; height:54px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                                <span style="font-size:13px; font-weight:900; color:#1e293b; line-height:1;">${totalWithFinancial}</span>
                                <span style="font-size:7px; color:#94a3b8; font-weight:700;">testes</span>
                            </div>
                        </div>
                        <div style="flex:1;">
                            ${[
                                { label: 'Lucro', key: 'LUCRO', color: '#16a34a', bg: '#f0fdf4' },
                                { label: 'Prejuízo', key: 'PREJUÍZO', color: '#dc2626', bg: '#fff1f2' },
                                { label: 'Empate', key: 'EMPATE', color: '#d97706', bg: '#fffbeb' },
                            ].map(item => `
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                                    <div style="width:10px; height:10px; border-radius:50%; background:${item.color}; flex-shrink:0;"></div>
                                    <span style="font-size:10px; font-weight:900; color:#475569; flex:1;">${item.label}</span>
                                    <span style="font-size:11px; font-weight:900; color:${item.color};">${distribution[item.key]}</span>
                                    <span style="font-size:9px; color:#94a3b8;">${pct(distribution[item.key], donutTotal)}%</span>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- Cruzamento Status × Resultado -->
                <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:16px;">
                    <h2>Status de Aprovação × Resultado</h2>
                    <table>
                        <thead>
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <th style="padding:4px 8px; font-size:9px; color:#94a3b8; text-align:left; font-weight:900;"></th>
                                <th style="padding:4px 8px; font-size:9px; color:#16a34a; text-align:center; font-weight:900;">LUCRO</th>
                                <th style="padding:4px 8px; font-size:9px; color:#dc2626; text-align:center; font-weight:900;">PREJUÍZO</th>
                                <th style="padding:4px 8px; font-size:9px; color:#d97706; text-align:center; font-weight:900;">EMPATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${[['APROVADO','✅','#15803d'],['REPROVADO','🔴','#b91c1c'],['AGUARDANDO','⏳','#475569']].map(([row, icon, color]) => `
                            <tr style="border-bottom:1px solid #f8fafc;">
                                <td style="padding:6px 8px; font-size:10px; font-weight:900; color:${color};">${icon} ${row}</td>
                                <td style="padding:6px 8px; text-align:center;">${crossTable[row].LUCRO > 0 ? `<span style="background:#dcfce7; color:#15803d; font-weight:900; padding:2px 8px; border-radius:999px; font-size:10px;">${crossTable[row].LUCRO}</span>` : '<span style="color:#e2e8f0;">—</span>'}</td>
                                <td style="padding:6px 8px; text-align:center;">${crossTable[row].PREJUÍZO > 0 ? `<span style="background:#fee2e2; color:#b91c1c; font-weight:900; padding:2px 8px; border-radius:999px; font-size:10px;">${crossTable[row].PREJUÍZO}</span>` : '<span style="color:#e2e8f0;">—</span>'}</td>
                                <td style="padding:6px 8px; text-align:center;">${crossTable[row].EMPATE > 0 ? `<span style="background:#fef3c7; color:#92400e; font-weight:900; padding:2px 8px; border-radius:999px; font-size:10px;">${crossTable[row].EMPATE}</span>` : '<span style="color:#e2e8f0;">—</span>'}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Ranking por Cliente -->
            <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:16px; margin-bottom:14px;">
                <h2>Ranking — Margem por Cliente (Top ${roiByClient.length})</h2>
                <table>
                    <thead>
                        <tr style="border-bottom:2px solid #f1f5f9;">
                            <th style="padding:4px 8px; font-size:9px; color:#94a3b8; text-align:left; font-weight:900;">#</th>
                            <th style="padding:4px 8px; font-size:9px; color:#94a3b8; text-align:left; font-weight:900;">Cliente</th>
                            <th style="padding:4px 8px; font-size:9px; color:#94a3b8; text-align:center; font-weight:900;">Testes</th>
                            <th style="padding:4px 8px; font-size:9px; color:#94a3b8; text-align:right; font-weight:900;">Margem</th>
                            <th style="padding:4px 8px; font-size:9px; color:#94a3b8;">Proporção</th>
                        </tr>
                    </thead>
                    <tbody>${rankingHtml}</tbody>
                </table>
            </div>

            <!-- Evolução Mensal -->
            ${ monthlyEvolution.length > 0 ? `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:16px; margin-bottom:14px;">
                <h2>Evolução Mensal — Receita vs Investimento (últimos ${monthlyEvolution.length} meses)</h2>
                <table style="width:100%;">
                    <tbody><tr>${monthHtml}</tr></tbody>
                </table>
                <div style="display:flex; gap:16px; justify-content:center; margin-top:10px;">
                    <div style="display:flex; align-items:center; gap:6px;"><div style="width:12px; height:6px; background:#4ade80; border-radius:3px;"></div><span style="font-size:9px; font-weight:700; color:#64748b;">Receita</span></div>
                    <div style="display:flex; align-items:center; gap:6px;"><div style="width:12px; height:6px; background:#fca5a5; border-radius:3px;"></div><span style="font-size:9px; font-weight:700; color:#64748b;">Investimento</span></div>
                </div>
            </div>` : ''}

            ${waitingHtml}
            ` : `
            <div style="background:#f8fafc; border:1px dashed #e2e8f0; border-radius:20px; padding:32px; text-align:center; margin-bottom:20px;">
                <p style="font-size:11px; color:#94a3b8; margin:0;">Análise financeira indisponível: nenhum teste com Preço de Venda informado nas NFs.</p>
            </div>`}

            <!-- Rodapé -->
            <div style="border-top:1px solid #e2e8f0; padding-top:10px; margin-top:24px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:8px; color:#cbd5e1; font-weight:700;">Assistec App V6 — Painel Financeiro de Testes</span>
                <span style="font-size:8px; color:#cbd5e1; font-weight:700;">${new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
        </body>
        </html>
        `);
        printWindow.document.close();
    };

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col gap-0 overflow-hidden">
            {/* Sub-abas */}
            <div className="flex gap-1 px-1 pb-3 print:hidden">
                <button
                    onClick={() => setActiveSubTab('audit')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeSubTab === 'audit'
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                            : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-700'
                    }`}
                >
                    <AlertTriangle size={12} /> Auditoria de Custos
                </button>
                <button
                    onClick={() => setActiveSubTab('dashboard')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeSubTab === 'dashboard'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'bg-white text-slate-400 border border-slate-100 hover:text-indigo-600'
                    }`}
                >
                    <PieChart size={12} /> Painel Financeiro
                    {totalWithFinancial > 0 && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${activeSubTab === 'dashboard' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                            {totalWithFinancial}
                        </span>
                    )}
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                ABA 1: AUDITORIA DE CUSTOS (existente, inalterada)
            ═══════════════════════════════════════════════════════════ */}
            {activeSubTab === 'audit' && (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* Stats Header */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento Novo</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs font-bold text-slate-400">R$</span>
                                <span className="text-2xl font-black text-slate-900">{fmtNum(investimentoNovo)}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 italic">Capital injetado na Engenharia</span>
                        </div>
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrimônio em Estoque</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs font-bold text-slate-400">R$</span>
                                <span className="text-2xl font-black text-emerald-600">{fmtNum(patrimonioEstoque)}</span>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-500 italic">Ativo circulante nos depósitos</span>
                        </div>
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-1 border-l-4 border-l-amber-400">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Custo Amortizado (Reuso)</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs font-bold text-slate-400">R$</span>
                                <span className="text-2xl font-black text-amber-600">{fmtNum(custoAmortizado)}</span>
                            </div>
                            <span className="text-[9px] font-bold text-amber-500 italic">Economia gerada por reaproveitamento</span>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl flex flex-col gap-1 border-l-4 border-l-brand-500">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logística & Frete</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs font-bold text-slate-500">R$</span>
                                <span className="text-2xl font-black text-white">{fmtNum(totalLogisticaEFrete)}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 italic">Viagens: R$ {fmtNum(custoViagens)} | Frete: R$ {fmtNum(custoFreteTotal)}</span>
                        </div>
                    </div>

                    {/* Audit Table */}
                    <div className={`flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0 h-0 ${isMeetingView ? 'max-h-none' : 'max-h-[calc(100vh-320px)]'} printable-area`}>
                        <div className="hidden print:flex flex-col gap-4 p-8 border-b-2 border-slate-900 mb-6 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Auditoria de Estoque</h1>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Integridade de Saldos e Custos - Engenharia & Controles</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-900 uppercase">{new Date().toLocaleDateString('pt-BR')}</div>
                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Gerado por Assistec App V6</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} className="text-rose-500" />
                                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Auditoria de Integridade de Estoque</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => { setReportContext('AUDIT'); setAiAnalysis(''); setShowReportModal(true); }}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 group"
                                >
                                    <BarChart3 size={14} className="group-hover:bounce transition-transform" /> Gerar Relatório de Custos
                                </button>
                                <span className="text-[9px] font-black text-slate-400 uppercase italic">Cálculo: Produzido - (Faturado + Reuso + Perda + Descarte + Saldo)</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar h-full min-h-0">
                            <table className="w-full border-collapse text-left">
                                <thead className="sticky top-0 bg-white z-10">
                                    <tr className="border-b border-slate-100">
                                        {[
                                            ['Item / Teste', 'Nome do teste técnico e identificação do cliente correspondente.', 'left'],
                                            ['OP', 'Número da Ordem de Produção vinculada a este teste.', 'center'],
                                            ['Vol', 'Quantidade de volumes físicos (embalagens/fardos) do lote.', 'center'],
                                            ['Produzido', 'Quantidade física total produzida no teste técnico original.', 'center'],
                                            ['Faturamento', 'Quantidade faturada/vendida e enviada ao cliente final.', 'center'],
                                            ['Reuso', 'Quantidade reutilizada/consumida como matéria-prima por outros testes.', 'center'],
                                            ['Perda', 'Divergência física identificada em inventário e justificada como avaria/perda.', 'center'],
                                            ['Descarte', 'Quantidade excedente descartada por inviabilidade de aproveitamento.', 'center'],
                                            ['Saldo Físico', 'Saldo físico atual disponível em estoque (Patrimônio Líquido).', 'center'],
                                            ['Custo Prod.', 'Custo total amortizado de produção (baseado no saldo e faturamento).', 'center'],
                                            ['Logística / Frete', 'Custos consolidados de viagens de vistorias (aba de Viagens) e fretes de envio (cadastro do teste).', 'center'],
                                            ['Status Auditoria', 'Resultado do cruzamento de dados físicos e financeiros da auditoria.', 'right'],
                                        ].map(([label, tip, align]) => (
                                            <th key={label} className={`p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''} ${label === 'Faturamento' ? 'text-emerald-600' : label === 'Reuso' ? 'text-amber-600' : label === 'Perda' ? 'text-rose-600' : label === 'Descarte' ? 'text-rose-500' : label === 'Saldo Físico' ? 'text-slate-800' : ''}`}>
                                                <div className={`relative inline-block group cursor-help`}>
                                                    <span>{label}</span>
                                                    <div className={`absolute top-full ${align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'} mt-2 hidden group-hover:block w-52 p-2.5 bg-slate-900 text-white text-[9px] font-bold rounded-xl shadow-xl leading-relaxed normal-case tracking-normal z-50 pointer-events-none border border-white/10`}>
                                                        {tip}
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredReportData.map(t => {
                                        const invItem = inventory.find(i => String(i.test_id) === String(t.id)) ||
                                            inventory.find(i => i.name === `ITEM: ${t.title} ` && i.client_name === t.client_name);
                                        const currentStock = invItem?.quantity || 0;
                                        const activeReuses = tests.filter(other => String(other.consumed_stock_id) === String(invItem?.id) && !['CANCELADO', 'REPROVADO'].includes(other.status));
                                        const totalConsumedByOthers = activeReuses.reduce((sum, curr) => sum + (curr.produced_quantity || 0), 0);
                                        const produced = t.produced_quantity || 0;
                                        const billed = t.quantity_billed || 0;
                                        let unitCost = 0;
                                        let isFromReuse = false;
                                        if (t.consumed_stock_id) {
                                            const donorInventory = inventory.find(i => String(i.id) === String(t.consumed_stock_id));
                                            const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                            if (parentTest && parentTest.produced_quantity > 0) { unitCost = (parentTest.op_cost || parentTest.gross_total_cost || 0) / parentTest.produced_quantity; isFromReuse = true; }
                                        } else if (produced > 0) { unitCost = (t.op_cost || t.gross_total_cost || 0) / produced; }
                                        let amortizedProductionCost = 0;
                                        if (t.consumed_stock_id) { amortizedProductionCost = unitCost * produced; }
                                        else if (totalConsumedByOthers > 0) { amortizedProductionCost = unitCost * (currentStock + billed); }
                                        else { amortizedProductionCost = unitCost * produced; }
                                        const loss = invItem?.justification_reason === 'AVARIA/PERDA' ? Math.abs(invItem.inventory_adjustment || 0) : 0;
                                        const discarded = t.quantity_discarded || invItem?.quantity_discarded || 0;
                                        const theoreticalBalance = Math.max(0, produced - (billed + totalConsumedByOthers + loss + discarded));
                                        const diff = currentStock - theoreticalBalance;
                                        const hasCostDiscrepancy = produced === 0 && (t.op_cost || t.gross_total_cost || 0) > 0;
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors break-inside-avoid" onClick={() => onTestOpenClick(t)}>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            {t.test_number && (
                                                                <span className="bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">
                                                                    #{t.test_number}
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                                                ITEM: {t.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                {t.client_name || 'Sem Cliente'}
                                                            </span>
                                                            {(t.op_number || t.extra_data?.OP || t.extra_data?.['OP']) && (
                                                                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                                    OP: {t.op_number || t.extra_data?.OP || t.extra_data?.['OP']}
                                                                </span>
                                                            )}
                                                            {t.extra_data?.['LOTE'] && (
                                                                <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                                    LOTE: {t.extra_data['LOTE']}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {t.product_name && (
                                                            <span className="text-[9px] font-medium text-indigo-600 uppercase tracking-tight">
                                                                PROD: {t.product_name}
                                                            </span>
                                                        )}
                                                        {hasCostDiscrepancy && (
                                                            <span className="text-[7px] text-rose-500 font-black uppercase tracking-tighter mt-0.5">
                                                                ⚠️ Custo sem Produção
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{t.op_number || t.extra_data?.OP || t.extra_data?.['OP'] || '-'}</span></td>
                                                <td className="p-4 text-center"><span className="text-[10px] font-black text-slate-800">{invItem?.volumes || '0'}</span></td>
                                                <td className="p-4 text-center text-xs font-black text-slate-600">{produced.toFixed(2)} <span className="text-[8px] text-slate-400 uppercase">{t.unit}</span></td>
                                                <td className="p-4 text-center text-xs font-black text-emerald-600">{billed.toFixed(2)} <span className="text-[8px] text-emerald-400 uppercase">{t.unit}</span></td>
                                                <td className="p-4 text-center text-xs font-black text-amber-600">{(totalConsumedByOthers || 0).toFixed(2)} <span className="text-[8px] text-amber-400 uppercase">{t.unit}</span></td>
                                                <td className="p-4 text-center text-xs font-black text-rose-600">{loss.toFixed(2)} <span className="text-[8px] text-rose-400 uppercase">{t.unit}</span></td>
                                                <td className="p-4 text-center text-xs font-black text-rose-500">
                                                    {discarded > 0 ? <>{discarded.toFixed(2)} <span className="text-[8px] text-rose-400 uppercase">{t.unit}</span></> : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="p-4 text-center text-xs font-black text-slate-800">{currentStock.toFixed(2)} <span className="text-[8px] text-slate-500 uppercase">{t.unit}</span></td>
                                                <td className="p-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center gap-1 text-slate-700 font-black text-[10px]">
                                                            {isFromReuse && (() => { const di = inventory.find(i => String(i.id) === String(t.consumed_stock_id)); const pt = tests.find(p => String(p.id) === String(di?.test_id)); return <RefreshCw size={10} className="text-indigo-400" title={`Custo Herdado do Teste #${pt?.test_number || '?'} `} />; })()}
                                                            <span>R$ {amortizedProductionCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                        {isFromReuse && (() => { const di = inventory.find(i => String(i.id) === String(t.consumed_stock_id)); const pt = tests.find(p => String(p.id) === String(di?.test_id)); return <span className="text-[7px] text-indigo-500 font-black uppercase tracking-tighter">De: Teste #{pt?.test_number || '?'}</span>; })()}
                                                        {!isFromReuse && totalConsumedByOthers > 0 && (() => { const sorted = activeReuses.sort((a, b) => (a.test_number || 0) - (b.test_number || 0)); return <span className="text-[7px] text-amber-500 font-black uppercase tracking-tighter">Para: #{sorted.map(r => r.test_number).join(', #')}</span>; })()}
                                                        {unitCost > 0 && (<span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">R$ {unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {t.unit}</span>)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col items-center">
                                                        {(() => {
                                                            const linkedTaskCosts = tasks.filter(tk => tk.parent_test_id === t.id).reduce((acc, curr) => acc + (curr.trip_cost || 0) + (curr.travels || []).reduce((tAcc, tCurr) => tAcc + (tCurr.cost || 0), 0), 0);
                                                            const shipments = t.extra_data?.shipments || [];
                                                            const manualFreight = shipments.reduce((s, sh) => s + parseFloat(sh.freight_cost || 0), 0);

                                                            if (linkedTaskCosts === 0 && manualFreight === 0) {
                                                                return <span className="text-slate-300 text-[10px] font-bold">-</span>;
                                                            }

                                                            return (
                                                                <div className="flex flex-col gap-2 w-full items-center">
                                                                    {linkedTaskCosts > 0 && (
                                                                        <div className="flex flex-col items-center">
                                                                            <div className="flex items-center gap-1 text-indigo-600 font-black text-[10px]" title="Custos de viagens/vistorias lançados na aba de Viagens">
                                                                                <Car size={10} />
                                                                                <span>R$ {linkedTaskCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                            </div>
                                                                            <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">Viagens</span>
                                                                        </div>
                                                                    )}
                                                                    {manualFreight > 0 && (
                                                                        <div className="flex flex-col items-center">
                                                                            <div className="flex items-center gap-1 text-teal-600 font-black text-[10px]" title="Custo de frete informado no cadastro do teste">
                                                                                <Package size={10} />
                                                                                <span>R$ {manualFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                            </div>
                                                                            <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">Frete NF</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center">
                                                        {Math.abs(diff) < 0.1 ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter border border-emerald-200 flex items-center gap-1"><CheckCircle size={12} /> Integridade OK</span>
                                                                {loss > 0 && (<span className="text-[7px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-1 rounded flex items-center gap-0.5"><AlertTriangle size={8} /> Justificado como Perda</span>)}
                                                            </div>
                                                        ) : (
                                                            <span className={`px-3 py-1 ${diff < 0 ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-amber-100 text-amber-600 border-amber-200'} rounded-full text-[9px] font-black uppercase tracking-tighter border flex items-center gap-1`}>
                                                                <AlertTriangle size={12} /> {diff < 0 ? `Furo: ${Math.abs(diff).toFixed(2)}` : `Sobra: ${diff.toFixed(2)}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {hasMore && (
                                <div className="p-4 flex justify-center bg-slate-50/50 border-t border-slate-100">
                                    <button onClick={onLoadMore} disabled={loading} className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:shadow-lg hover:shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale">
                                        {loading ? (<><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Carregando...</>) : 'Carregar Mais Auditorias'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                ABA 2: PAINEL FINANCEIRO (novo dashboard híbrido)
            ═══════════════════════════════════════════════════════════ */}
            {activeSubTab === 'dashboard' && (
                <div className={`flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1 ${isMeetingView ? '' : 'max-h-[calc(100vh-200px)]'}`}>

                    {/* ── ZONA 2: Painel Operacional ─────────────────── */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-px flex-1 bg-slate-100" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Zona 2 — Painel Operacional (Todos os Testes)</span>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: 'Investimento Novo', value: fmtBRL(investimentoNovo), sub: 'Capital injetado na Engenharia', color: 'text-slate-900', bg: 'bg-white' },
                                { label: 'Patrimônio em Estoque', value: fmtBRL(patrimonioEstoque), sub: 'Ativo circulante nos depósitos', color: 'text-emerald-600', bg: 'bg-white' },
                                { label: 'Custo Amortizado', value: fmtBRL(custoAmortizado), sub: 'Economia por reaproveitamento', color: 'text-amber-600', bg: 'bg-white border-l-4 border-l-amber-400' },
                                { label: 'Viagens / Logística', value: fmtBRL(custoViagens), sub: 'Custos vinculados a testes', color: 'text-white', bg: 'bg-slate-900' },
                                { label: 'Capital Não Monetizado', value: fmtBRL(valorNaoMonetizado), sub: 'Estoque aguardando venda/destino', color: 'text-violet-600', bg: 'bg-white border-l-4 border-l-violet-400' },
                                { label: 'Aguardando Análise', value: aguardandoAnalise.length, sub: `de ${totalTests} testes com produção`, color: 'text-orange-500', bg: 'bg-white border-l-4 border-l-orange-300', isCount: true },
                            ].map((card, i) => (
                                <div key={i} className={`p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-1 ${card.bg}`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${card.bg === 'bg-slate-900' ? 'text-slate-500' : 'text-slate-400'}`}>{card.label}</span>
                                    <span className={`text-xl font-black ${card.color}`}>{card.isCount ? card.value : card.value}</span>
                                    <span className={`text-[8px] font-bold italic ${card.bg === 'bg-slate-900' ? 'text-slate-500' : 'text-slate-400'}`}>{card.sub}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── ZONA 1: Análise Financeira ─────────────────── */}
                    {totalWithFinancial === 0 ? (
                        <section className="bg-slate-50 border border-dashed border-slate-200 rounded-[32px] p-10 text-center">
                            <PieChart size={32} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-black text-slate-400">Nenhum teste com análise financeira ativa</p>
                            <p className="text-[10px] text-slate-300 mt-1">Informe o <strong>Preço de Venda (R$/KG)</strong> nas NFs de pelo menos um teste para ativar o Painel Financeiro.</p>
                        </section>
                    ) : (
                        <section className="space-y-5">
                            {/* Banner de cobertura + botão imprimir */}
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-px flex-1 bg-indigo-100" />
                                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Zona 1 — Análise Financeira Ativa</span>
                                    <span className="text-[8px] font-black text-indigo-400 bg-white px-2 py-0.5 rounded-full border border-indigo-100">{totalWithFinancial} de {totalTests} testes</span>
                                </div>
                                <div className="h-px flex-1 bg-indigo-100" />
                                <button
                                    onClick={handlePrintDashboard}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 hover:scale-105 transition-all shadow-md shadow-indigo-100 active:scale-95"
                                >
                                    <Printer size={11} /> Imprimir Painel
                                </button>
                            </div>

                            {/* KPIs Financeiros */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receita Total Gerada</span>
                                    <div className="text-xl font-black text-emerald-600 mt-1">{fmtBRL(totalRevenue)}</div>
                                    <span className="text-[8px] text-slate-400 italic">Soma das vendas reais (NFs)</span>
                                </div>
                                <div className={`p-5 rounded-[24px] border shadow-sm ${totalMargin >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${totalMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Margem Comercial Total</span>
                                    <div className={`text-xl font-black mt-1 ${totalMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(totalMargin)}</div>
                                    <span className="text-[8px] text-slate-400 italic">Receita − CMV − Logística</span>
                                </div>
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TRI — Recuperação</span>
                                    <div className={`text-xl font-black mt-1 ${tri >= 100 ? 'text-emerald-600' : tri >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{tri.toFixed(1)}%</div>
                                    <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${tri >= 100 ? 'bg-emerald-500' : tri >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.min(tri, 100)}%` }} />
                                    </div>
                                    <span className="text-[8px] text-slate-400 italic">Receita / Investimento analisado</span>
                                </div>
                                <div className={`p-5 rounded-[24px] border shadow-sm ${avgRoi >= 0 ? 'bg-white border-slate-100' : 'bg-rose-50 border-rose-200'}`}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROI Médio / Teste</span>
                                    <div className={`text-xl font-black mt-1 ${avgRoi >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{fmtBRL(avgRoi)}</div>
                                    <span className="text-[8px] text-slate-400 italic">Média entre {totalWithFinancial} testes analisados</span>
                                </div>
                            </div>

                            {/* Linha 2: Donut + Cruzamento Status×Resultado */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Distribuição LUCRO/PREJUÍZO/EMPATE */}
                                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Distribuição de Resultados</h4>
                                    <div className="flex items-center gap-6">
                                        <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
                                            <div style={{ width: 100, height: 100, borderRadius: '50%', background: conicGradient }} />
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 60, height: 60, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span className="text-[9px] font-black text-slate-500">{totalWithFinancial}<br /><span className="text-[7px]">testes</span></span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 flex-1">
                                            {[
                                                { label: 'Lucro', count: distribution.LUCRO, color: '#16a34a', bg: 'bg-emerald-100' },
                                                { label: 'Prejuízo', count: distribution.PREJUÍZO, color: '#dc2626', bg: 'bg-rose-100' },
                                                { label: 'Empate', count: distribution.EMPATE, color: '#d97706', bg: 'bg-amber-100' },
                                            ].map(item => (
                                                <div key={item.label} className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                                                    <span className="text-[10px] font-black text-slate-600 flex-1">{item.label}</span>
                                                    <span className="text-[10px] font-black" style={{ color: item.color }}>{item.count}</span>
                                                    <span className="text-[9px] text-slate-400">{totalWithFinancial > 0 ? ((item.count / totalWithFinancial) * 100).toFixed(0) : 0}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Cruzamento Status × Resultado */}
                                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Status de Aprovação × Resultado</h4>
                                    <table className="w-full text-[10px] border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="text-left font-black text-slate-400 pb-2 pr-2"></th>
                                                <th className="text-center font-black text-emerald-600 pb-2 px-2">LUCRO</th>
                                                <th className="text-center font-black text-rose-600 pb-2 px-2">PREJUÍZO</th>
                                                <th className="text-center font-black text-amber-600 pb-2 px-2">EMPATE</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {[
                                                { row: 'APROVADO', icon: '✅', color: 'text-emerald-700' },
                                                { row: 'REPROVADO', icon: '🔴', color: 'text-rose-700' },
                                                { row: 'AGUARDANDO', icon: '⏳', color: 'text-slate-600' },
                                            ].map(({ row, icon, color }) => (
                                                <tr key={row}>
                                                    <td className={`py-2 pr-2 font-black ${color} flex items-center gap-1`}><span>{icon}</span>{row}</td>
                                                    <td className="py-2 text-center">
                                                        {crossTable[row].LUCRO > 0
                                                            ? <span className="bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full">{crossTable[row].LUCRO}</span>
                                                            : <span className="text-slate-200">—</span>}
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        {crossTable[row].PREJUÍZO > 0
                                                            ? <span className="bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded-full">{crossTable[row].PREJUÍZO}</span>
                                                            : <span className="text-slate-200">—</span>}
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        {crossTable[row].EMPATE > 0
                                                            ? <span className="bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full">{crossTable[row].EMPATE}</span>
                                                            : <span className="text-slate-200">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Linha 3: Ranking por Cliente + Evolução Mensal */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Ranking Top 7 clientes */}
                                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ranking — Margem por Cliente</h4>
                                    <div className="space-y-3">
                                        {roiByClient.map((client, i) => {
                                            const pct = Math.abs(client.margin) / maxClientMargin * 100;
                                            const isPositive = client.margin >= 0;
                                            return (
                                                <div key={client.name}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] font-black w-4 ${i === 0 ? 'text-amber-500' : 'text-slate-400'}`}>{i + 1}°</span>
                                                            <span className="text-[10px] font-black text-slate-700 truncate max-w-[140px]" title={client.name}>{client.name}</span>
                                                            <span className="text-[8px] text-slate-400">({client.count} teste{client.count > 1 ? 's' : ''})</span>
                                                        </div>
                                                        <span className={`text-[10px] font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(client.margin)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Evolução mensal */}
                                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Evolução Mensal — Receita vs Investimento</h4>
                                    {monthlyEvolution.length === 0 ? (
                                        <div className="flex items-center justify-center h-32 text-slate-300 text-[10px] font-bold">Nenhum dado mensal disponível</div>
                                    ) : (
                                        <div className="flex items-end gap-2 h-36">
                                            {monthlyEvolution.map((m, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                    <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 100 }}>
                                                        <div
                                                            title={`Receita: ${fmtBRL(m.revenue)}`}
                                                            className="w-3 bg-emerald-400 rounded-t transition-all hover:bg-emerald-500 cursor-pointer"
                                                            style={{ height: `${Math.max((m.revenue / maxMonthly) * 100, 2)}%` }}
                                                        />
                                                        <div
                                                            title={`Investimento: ${fmtBRL(m.investment)}`}
                                                            className="w-3 bg-rose-300 rounded-t transition-all hover:bg-rose-400 cursor-pointer"
                                                            style={{ height: `${Math.max((m.investment / maxMonthly) * 100, 2)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[7px] font-black text-slate-400 uppercase">{m.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mt-3 justify-center">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 bg-emerald-400 rounded-full" /><span className="text-[9px] font-bold text-slate-500">Receita</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 bg-rose-300 rounded-full" /><span className="text-[9px] font-bold text-slate-500">Investimento</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de espera */}
                            {aguardandoAnalise.length > 0 && (
                                <div className="bg-orange-50 border border-orange-200 rounded-[24px] p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={14} className="text-orange-500" />
                                        <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Lista de Espera — {aguardandoAnalise.length} testes sem análise financeira</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {aguardandoAnalise.slice(0, 10).map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => onTestOpenClick(t)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-[9px] font-black text-orange-700 hover:border-orange-400 hover:shadow-sm transition-all"
                                            >
                                                <span className="bg-orange-100 px-1 rounded text-[8px]">#{t.test_number}</span>
                                                <span className="truncate max-w-[100px]">{t.title}</span>
                                            </button>
                                        ))}
                                        {aguardandoAnalise.length > 10 && (
                                            <span className="px-3 py-1.5 text-[9px] font-black text-orange-400 italic">+{aguardandoAnalise.length - 10} mais...</span>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-orange-400 italic mt-2">Clique em um teste para adicionar o Preço de Venda nas NFs e ativar a análise financeira.</p>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default CostsAuditView;
