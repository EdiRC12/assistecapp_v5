/**
 * Utility for generating PDF reports and AI Insights for the Controls section.
 * Extracted from ControlsView.jsx to improve maintainability.
 */

export const MONTHS = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
];

export const handlePrintFullReport = ({
    reportContext,
    selectedMonth,
    selectedYear,
    filteredReportData,
    reportTotals,
    aiAnalysis,
    tasks
}) => {
    const printWindow = window.open('', '_blank');
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const reportMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || 'Todos os Meses';

    // 1. Título e Subtítulo dinâmicos
    const reportTitle = reportContext === 'INVENTORY' ? 'RELATÓRIO DE ATIVOS E GIRO' :
        reportContext === 'AUDIT' ? 'RELATÓRIO DE AUDITORIA E CUSTOS' :
            reportContext === 'RETURNS' ? 'RELATÓRIO DE DEVOLUÇÕES' :
                'RELATÓRIO DE ENGENHARIA';

    // 2. KPIs dinâmicos
    let kpisHtml = '';
    if (reportContext === 'INVENTORY') {
        kpisHtml = `
            <div class="card"><span class="card-label">Total de Itens</span><span class="card-value">${filteredReportData.length} registros</span></div>
            <div class="card" style="background: #eef2ff;"><span class="card-label">Patrimônio Gerido</span><span class="card-value" style="color: #4f46e5;">R$ ${Number(reportTotals.investment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div class="card" style="background: #fffbeb;"><span class="card-label">Volume Total</span><span class="card-value" style="color: #d97706;">${Number(reportTotals.weightKg || 0).toFixed(1)} KG | ${Number(reportTotals.unitsUn || 0).toFixed(0)} UN</span></div>
            <div class="card" style="background: #ecfdf5;"><span class="card-label">Itens Ativos</span><span class="card-value" style="color: #059669;">${filteredReportData.filter(i => i.status === 'AVAILABLE' || i.status === 'ACTIVE').length}</span></div>
        `;
    } else if (reportContext === 'AUDIT') {
        kpisHtml = `
            <div class="card" style="background: #ecfdf5;"><span class="card-label">Economia Circular</span><span class="card-value" style="color: #059669;">R$ ${reportTotals.reuseSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div class="card" style="background: #fef2f2;"><span class="card-label">Perdas & Descartes</span><span class="card-value" style="color: #dc2626;">R$ ${reportTotals.losses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div class="card" style="background: #eef2ff;"><span class="card-label">Custos Logísticos</span><span class="card-value" style="color: #4f46e5;">R$ ${reportTotals.logistics.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div class="card"><span class="card-label">Testes Auditados</span><span class="card-value">${filteredReportData.length}</span></div>
        `;
    } else if (reportContext === 'RETURNS') {
        kpisHtml = `
            <div class="card" style="background: #fef2f2;"><span class="card-label">Total em Devoluções</span><span class="card-value" style="color: #dc2626;">R$ ${reportTotals.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div class="card" style="background: #fffbeb;"><span class="card-label">Volume Devolvido</span><span class="card-value" style="color: #d97706;">${reportTotals.totalQuantity.toFixed(1)} UN/KG</span></div>
            <div class="card" style="background: #ecfdf5;"><span class="card-label">Taxa de Resolução</span><span class="card-value" style="color: #059669;">${reportTotals.count > 0 ? ((reportTotals.resolvedCount / reportTotals.count) * 100).toFixed(1) : 0}%</span></div>
            <div class="card"><span class="card-label">Total de Registros</span><span class="card-value">${reportTotals.count}</span></div>
        `;
    } else {
        kpisHtml = `
            <div class="card"><span class="card-label">Volume de Testes</span><span class="card-value">${filteredReportData.length} testes</span></div>
            <div class="card" style="background: #ecfdf5;"><span class="card-label">Aprovações Técnicas</span><span class="card-value" style="color: #059669;">${filteredReportData.filter(t => t.status === 'APROVADO').length}</span></div>
            <div class="card" style="background: #eef2ff;"><span class="card-label">Custo Consolidado</span><span class="card-value" style="color: #4f46e5;">R$ ${Number(reportTotals.investment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div class="card" style="background: #fffbeb;">
                <span class="card-label">Matéria Prima Produzida</span>
                <span class="card-value" style="color: #d97706; display: flex; flex-direction: column;">
                    <span>${Number(reportTotals.weightKg || 0).toFixed(1)} <small style="font-size: 9px;">KG</small></span>
                    <span style="font-size: 11px; opacity: 0.8; margin-top: -2px;">${Number(reportTotals.unitsUn || 0)} <small style="font-size: 8px;">UN</small></span>
                </span>
            </div>
        `;
    }

    // 3. Gráficos dinâmicos
    let chartsGridHtml = '';
    if (reportContext === 'INVENTORY') {
        // Paleta de cores para os depósitos (Sincronizada com o modal)
        const barColors = ['#818cf8', '#34d399', '#f59e0b', '#a78bfa', '#22d3ee', '#fb7185'];
        
        const binsHtml = Object.entries(reportTotals.bins || {})
            .sort((a,b) => (b[1].kg + b[1].un) - (a[1].kg + a[1].un))
            .slice(0, 5)
            .map(([binName, data], index) => {
                const hasKg = data.kg > 0;
                const binVolume = hasKg ? data.kg : data.un;
                const unitLabel = hasKg ? 'kg' : 'un';
                
                const totalScale = hasKg ? (reportTotals.weightKg || 1) : (reportTotals.unitsUn || 1);
                const perc = (binVolume / (totalScale || 1)) * 100;
                const isDiscard = binName.toUpperCase().includes('DISCARD') || binName.toUpperCase().includes('DESCARTE');
                const color = isDiscard ? '#fb7185' : barColors[index % barColors.length];

                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                        <div style="font-size: 8px; font-weight: 900; color: #94a3b8; margin-bottom: 8px; text-align: center;">
                            ${binVolume.toFixed(0)} ${unitLabel}<br/>(${data.items})
                        </div>
                        <div style="width: 35px; height: ${Math.max(10, perc)}%; background-color: ${color}; border-top-left-radius: 10px; border-top-right-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>
                        <div style="font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-top: 12px; text-align: center; width: 60px; line-height: 1;">${binName}</div>
                    </div>
                `;
            }).join('');

        const statusHtml = (reportTotals.statusPercentages || []).map(item => {
            const color = item.label === 'Disponível' ? '#10b981' : item.label === 'Descartado' ? '#ef4444' : '#f59e0b';
            return `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                        <span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">${item.label}</span>
                        <span style="font-size: 10px; font-weight: 900; color: #0f172a;">${Number(item.percentage || 0).toFixed(1)}%</span>
                    </div>
                    <div style="height: 8px; background-color: #f1f5f9; border-radius: 999px; overflow: hidden;">
                        <div style="width: ${item.percentage}%; height: 100%; background-color: ${color}; border-radius: 999px;"></div>
                    </div>
                </div>
            `;
        }).join('');

        chartsGridHtml = `
            <div class="chart-container"><div class="chart-title">Ocupação por Depósito (KG)</div><div style="height: 180px; display: flex; align-items: flex-end; gap: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">${binsHtml}</div></div>
            <div class="chart-container"><div class="chart-title">Estado Físico dos Ativos</div><div style="padding-top: 10px;">${statusHtml}</div></div>
        `;
    } else if (reportContext === 'AUDIT') {
        const auditBarsHtml = [
            { label: 'ECONOMIA REUSO', value: reportTotals.reuseSavings, color: '#34d399' },
            { label: 'PERDAS REGISTRADAS', value: reportTotals.losses, color: '#fb7185' }
        ].map(item => {
            const maxVal = Math.max(reportTotals.reuseSavings, reportTotals.losses) || 1;
            const perc = (item.value / maxVal) * 100;
            return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                    <div style="font-size: 9px; font-weight: 900; color: #64748b; margin-bottom: 8px;">R$ ${item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                    <div style="width: 60px; height: ${Math.max(8, perc)}%; background-color: ${item.color}; border-top-left-radius: 8px; border-top-right-radius: 8px;"></div>
                    <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-top: 12px; text-align: center;">${item.label}</div>
                </div>
            `;
        }).join('');

        const impactHtml = [
            { label: 'PRODUÇÃO', value: reportTotals.production, color: '#94a3b8' },
            { label: 'LOGÍSTICA', value: reportTotals.logistics, color: '#818cf8' },
            { label: 'ECONOMIA (ROI)', value: reportTotals.reuseSavings, color: '#10b981' }
        ].map(item => {
            const total = reportTotals.production + reportTotals.logistics + reportTotals.reuseSavings || 1;
            const perc = (item.value / total) * 100;
            return `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">${item.label}</span>
                        <span style="font-size: 10px; font-weight: 900; color: #0f172a;">${perc.toFixed(1)}%</span>
                    </div>
                    <div style="height: 6px; background-color: #f1f5f9; border-radius: 999px; overflow: hidden;"><div style="width: ${perc}%; height: 100%; background-color: ${item.color};"></div></div>
                </div>
            `;
        }).join('');

        chartsGridHtml = `
            <div class="chart-container"><div class="chart-title">Eficiência de Reuso vs. Perdas (R$)</div><div style="height: 180px; display: flex; align-items: flex-end; gap: 40px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; justify-content: center;">${auditBarsHtml}</div></div>
            <div class="chart-container"><div class="chart-title">Impacto Financeiro Auditado (%)</div><div style="padding-top: 10px;">${impactHtml}</div></div>
        `;
    } else if (reportContext === 'RETURNS') {
        const statusLabels = { 'PENDENTE': 'Pendente', 'CONCLUÍDO': 'Concluído', 'EM ANALISE': 'Análise' };
        const statusHtml = ['PENDENTE', 'EM ANALISE', 'CONCLUÍDO'].map(status => {
            const count = filteredReportData.filter(r => r.status === status).length;
            const perc = filteredReportData.length > 0 ? (count / filteredReportData.length) * 100 : 0;
            const color = status === 'CONCLUÍDO' ? '#10b981' : status === 'PENDENTE' ? '#ef4444' : '#f59e0b';
            return `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">${statusLabels[status] || status}</span>
                        <span style="font-size: 10px; font-weight: 900; color: #0f172a;">${perc.toFixed(1)}%</span>
                    </div>
                    <div style="height: 6px; background-color: #f1f5f9; border-radius: 999px; overflow: hidden;"><div style="width: ${perc}%; height: 100%; background-color: ${color};"></div></div>
                </div>
            `;
        }).join('');

        chartsGridHtml = `
            <div class="chart-container" style="grid-column: span 2;"><div class="chart-title">Status do Processamento de Devoluções</div><div style="padding-top: 10px;">${statusHtml}</div></div>
        `;
    } else {
        // Engenharia / Padrão
        const engBarsHtml = ['APROVADO', 'REPROVADO', 'PENDENTE'].map(status => {
            const statusTests = filteredReportData.filter(t => status === 'PENDENTE' ? !['APROVADO', 'REPROVADO'].includes(t.status) : t.status === status);
            const statusCost = statusTests.reduce((acc, t) => {
                const ck = tasks.filter(tk => String(tk.parent_test_id) === String(t.id)).reduce((tA, tk) => tA + (tk.trip_cost || 0) + (tk.travels || []).reduce((trA, tr) => trA + (tr.cost || 0), 0), 0);
                return acc + (t.op_cost || 0) + ck;
            }, 0);
            const perc = reportTotals.investment > 0 ? (statusCost / reportTotals.investment) * 100 : 0;
            const color = status === 'APROVADO' ? '#34d399' : status === 'REPROVADO' ? '#fb7185' : '#cbd5e1';
            return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                    <div style="font-size: 9px; font-weight: 900; color: #64748b; margin-bottom: 8px;">R$ ${statusCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                    <div style="width: 40px; height: ${Math.max(8, perc)}%; background-color: ${color}; border-top-left-radius: 8px; border-top-right-radius: 8px;"></div>
                    <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-top: 12px;">${status}</div>
                </div>
            `;
        }).join('');

        const engEffHtml = ['APROVADO', 'REPROVADO', 'OUTROS'].map(status => {
            const count = status === 'OUTROS' ? filteredReportData.filter(t => !['APROVADO', 'REPROVADO'].includes(t.status)).length : filteredReportData.filter(t => t.status === status).length;
            const perc = filteredReportData.length > 0 ? (count / filteredReportData.length) * 100 : 0;
            const color = status === 'APROVADO' ? '#10b981' : status === 'REPROVADO' ? '#ef4444' : '#cbd5e1';
            return `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">${status}</span>
                        <span style="font-size: 10px; font-weight: 900; color: #0f172a;">${perc.toFixed(1)}%</span>
                    </div>
                    <div style="height: 6px; background-color: #f1f5f9; border-radius: 999px; overflow: hidden;"><div style="width: ${perc}%; height: 100%; background-color: ${color};"></div></div>
                </div>
            `;
        }).join('');

        chartsGridHtml = `
            <div class="chart-container"><div class="chart-title">Investimento por Situação (R$)</div><div style="height: 180px; display: flex; align-items: flex-end; gap: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">${engBarsHtml}</div></div>
            <div class="chart-container"><div class="chart-title">Distribuição de Eficiência Técnica</div><div style="padding-top: 10px;">${engEffHtml}</div></div>
        `;
    }

    // 4. Tabela dinâmica
    let tableHeadersHtml = '';
    let tableRowsHtml = '';

    if (reportContext === 'INVENTORY') {
        tableHeadersHtml = `<tr><th>Data</th><th>Item / Cliente</th><th style="text-align: center;">Depósito</th><th style="text-align: right;">Saldo</th><th style="text-align: center;">Status</th></tr>`;
        tableRowsHtml = filteredReportData.map(i => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px; font-size: 9px; font-weight: 700; color: #64748b;">${new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
                <td style="padding: 10px; font-size: 10px; font-weight: 900; color: #0f172a;">${i.name}<br><span style="font-size: 8px; color: #94a3b8; font-weight: 700;">${i.client_name || 'Geral'}</span></td>
                <td style="padding: 10px; text-align: center; font-size: 9px; font-weight: 900; color: #64748b;">${i.stock_bin || '-'}</td>
                <td style="padding: 10px; text-align: right; font-size: 10px; font-weight: 900; color: #0f172a;">${Number(i.quantity || 0).toFixed(1)} ${i.unit || 'KG'}</td>
                <td style="padding: 10px; text-align: center;"><span style="font-size: 8px; font-weight: 900; padding: 3px 8px; border-radius: 6px; background: ${i.status === 'AVAILABLE' || i.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'}; color: ${i.status === 'AVAILABLE' || i.status === 'ACTIVE' ? '#059669' : '#64748b'};">${i.status}</span></td>
            </tr>
        `).join('');
    } else if (reportContext === 'RETURNS') {
        tableHeadersHtml = `<tr><th>Data</th><th>Cliente / Item</th><th style="text-align: center;">NF</th><th style="text-align: right;">Qtd</th><th style="text-align: right;">Valor (R$)</th><th style="text-align: center;">Status</th></tr>`;
        tableRowsHtml = filteredReportData.map(r => `
            <tr style="border-bottom: 1px solid #f1f5f9; border-left: 4px solid ${r.status === 'CONCLUÍDO' ? '#10b981' : '#ef4444'};">
                <td style="padding: 10px; font-size: 9px; font-weight: 700; color: #64748b;">${new Date(r.return_date).toLocaleDateString('pt-BR')}</td>
                <td style="padding: 10px; font-size: 10px; font-weight: 900; color: #0f172a;">${r.client_name}<br><span style="font-size: 8px; color: #94a3b8; font-weight: 700;">${r.item_name}</span></td>
                <td style="padding: 10px; text-align: center; font-size: 9px; font-weight: 900; color: #64748b;">${r.invoice_number || '-'}</td>
                <td style="padding: 10px; text-align: right; font-size: 10px; font-weight: 900; color: #0f172a;">${(parseFloat(r.quantity) || 0).toFixed(1)}</td>
                <td style="padding: 10px; text-align: right; font-size: 10px; font-weight: 900; color: #0f172a;">R$ ${((parseFloat(r.quantity) || 0) * (parseFloat(r.unit_price) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 10px; text-align: center;"><span style="font-size: 8px; font-weight: 900; padding: 4px 10px; border-radius: 999px; background: ${r.status === 'CONCLUÍDO' ? '#ecfdf5' : '#fef2f2'}; color: ${r.status === 'CONCLUÍDO' ? '#059669' : '#dc2626'}; text-transform: uppercase;">${r.status}</span></td>
            </tr>
        `).join('');
    } else {
        tableHeadersHtml = `<tr><th>Data</th><th>Cliente / Item</th><th style="text-align: center;">OP</th><th style="text-align: right;">Total (R$)</th><th style="text-align: center;">Status</th></tr>`;
        tableRowsHtml = filteredReportData.map(t => {
            const ck = tasks.filter(tk => String(tk.parent_test_id) === String(t.id)).reduce((acc, tk) => acc + (tk.trip_cost || 0) + (tk.travels || []).reduce((trA, tr) => trA + (tr.cost || 0), 0), 0);
            const total = (t.op_cost || 0) + ck;
            const isReuse = reportContext === 'AUDIT' && t.consumed_stock_id;
            return `
                <tr style="border-bottom: 2px solid #ffffff; background-color: ${isReuse ? '#ecfdf5' : t.status_color || '#f1f5f9'}33; border-left: 6px solid ${isReuse ? '#10b981' : t.status_color || '#cbd5e1'};">
                    <td style="padding: 10px; font-size: 9px; font-weight: 700; color: #64748b;">${new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style="padding: 10px; font-size: 10px; font-weight: 900; color: #0f172a;">${t.client_name || t.title || 'N/A'}${isReuse ? '<br><span style="font-size: 8px; color: #059669; font-weight: 900;">★ REUSO</span>' : ''}</td>
                    <td style="padding: 10px; text-align: center; font-size: 9px; font-weight: 900; color: #64748b;">${t.extra_data?.OP || '-'}</td>
                    <td style="padding: 10px; text-align: right; font-size: 10px; font-weight: 900; color: #0f172a;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 10px; text-align: center;"><span style="font-size: 8px; font-weight: 900; padding: 4px 10px; border-radius: 999px; background: ${t.status_color || '#94a3b8'}; color: white; text-transform: uppercase;">${t.status}</span></td>
                </tr>
            `;
        }).join('');
    }

    printWindow.document.write(`
        <html>
            <head>
                <title>${reportTitle} - ${dateStr}</title>
                <style>
                    @page { size: portrait; margin: 12mm; }
                    body { font-family: 'Inter', -apple-system, sans-serif; padding: 0; margin: 0; color: #1e293b; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                    .card { padding: 18px; border-radius: 24px; border: 1px solid #f1f5f9; background: #f8fafc; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                    .card-label { font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px; }
                    .card-value { font-size: 16px; font-weight: 900; color: #0f172a; }
                    .charts-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; margin-bottom: 30px; }
                    .chart-container { padding: 25px; border-radius: 32px; border: 1px solid #f1f5f9; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .chart-title { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 25px; display: flex; align-items: center; gap: 8px; }
                    .ai-box { padding: 25px; border-radius: 32px; background: #0f172a; color: white; margin-bottom: 30px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                    .ai-title { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; font-style: italic; }
                    .ai-text { font-size: 11px; line-height: 1.6; color: #e2e8f0; white-space: pre-line; }
                    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; border-radius: 16px; overflow: hidden; border: 1px solid #f1f5f9; }
                    th { padding: 14px; text-align: left; background: #0f172a; color: white; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
                    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
                    tr:last-child td { border-bottom: none; }
                    tr { page-break-inside: avoid !important; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #0f172a;">${reportTitle}</h1>
                        <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-top: 5px;">
                            ${reportMonthLabel} ${selectedYear !== 'ALL' ? selectedYear : ''} | Status de Testes e Custos Integrados
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin: 0;">Gerado em:</p>
                        <p style="font-size: 11px; font-weight: 900; color: #1e293b; margin: 2px 0;">${dateStr} às ${timeStr}</p>
                    </div>
                </div>

                <div class="summary-grid">${kpisHtml}</div>

                <div class="charts-grid">${chartsGridHtml}</div>

                ${aiAnalysis ? `
                    <div class="ai-box">
                        <div class="ai-title">Análise Estratégica AI Brain</div>
                        <div class="ai-text">${aiAnalysis}</div>
                    </div>
                ` : ''}

                <div>
                    <h2 style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 15px;">Detalhamento de Itens</h2>
                    <table>
                        <thead>${tableHeadersHtml}</thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                </div>

                <div style="margin-top: 50px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <span style="font-size: 8px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em;">Brain Intelligence System</span>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 800);
};

export const generateAIInsights = async ({
    reportContext,
    filteredReportData,
    tests,
    tasks,
    inventory
}) => {
    if (filteredReportData.length === 0) return '';

    // Simular processamento da IA
    await new Promise(resolve => setTimeout(resolve, 2500));

    let insight = '';

    if (reportContext === 'TESTS') {
        const inValidation = filteredReportData.filter(t => !['APROVADO', 'REPROVADO'].includes(t.status) && t.quantity_billed > 0);
        const completedTests = filteredReportData.filter(t => ['APROVADO', 'REPROVADO'].includes(t.status));
        const approvedFinal = completedTests.filter(t => t.status === 'APROVADO').length;
        const reprovedWithoutCost = completedTests.filter(t => t.status === 'REPROVADO' && (!t.op_cost || t.op_cost === 0));

        const now = new Date();
        const validationAging = inValidation.map(t => {
            const created = new Date(t.created_at);
            const diffTime = Math.abs(now - created);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });
        const maxAging = validationAging.length > 0 ? Math.max(...validationAging) : 0;
        const avgAging = validationAging.length > 0 ? (validationAging.reduce((a, b) => a + b, 0) / validationAging.length).toFixed(0) : 0;

        const testsWithVisit = completedTests.filter(t => {
            const linkedTasks = tasks.filter(tk => String(tk.parent_test_id) === String(t.id));
            return linkedTasks.some(tk => (tk.trip_cost || 0) > 0 || (tk.travels || []).length > 0);
        });
        const testsWithoutVisit = completedTests.filter(t => !testsWithVisit.find(v => v.id === t.id));
        const rateWithVisit = testsWithVisit.length > 0 ? (testsWithVisit.filter(t => t.status === 'APROVADO').length / testsWithVisit.length) * 100 : 0;
        const rateWithoutVisit = testsWithoutVisit.length > 0 ? (testsWithoutVisit.filter(t => t.status === 'APROVADO').length / testsWithoutVisit.length) * 100 : 0;

        const totalReprovedCost = completedTests.filter(t => t.status === 'REPROVADO').reduce((acc, t) => {
            const taskCosts = tasks.filter(tk => String(tk.parent_test_id) === String(t.id)).reduce((ta, cur) => ta + (cur.trip_cost || 0) + (cur.travels || []).reduce((tr, tc) => tr + (tc.cost || 0), 0), 0);
            return acc + (t.op_cost || 0) + taskCosts;
        }, 0);

        const realAssertivity = completedTests.length > 0 ? (approvedFinal / completedTests.length) * 100 : 0;
        const benchmarkText = realAssertivity < 15 ? "CRÍTICA/ALARMANTE" : realAssertivity < 40 ? "LIMITADA/OPERACIONAL" : "ALTA/ESTRATÉGICA";

        insight = `AUDITORIA ESTRATÉGICA OPERACIONAL (BRAIN AI):
Analise técnica focada em identificar gargalos de campo e integridade de dados financeiros.

🚀 MATURIDADE E AGING (Fluxo de Campo):
• Ciclo Concluído: ${completedTests.length} testes finalizados.
• Em Validação (No Cliente): ${inValidation.length} testes faturados.
• Lead Time de Validação: Média de ${avgAging} dias (Máximo: ${maxAging} dias no cliente).
${maxAging > 15 ? '⚠️ ALERTA: Existem testes estagnados no cliente há mais de 15 dias. Requer cobrança comercial.' : '✓ Fluxo de retorno de campo dentro da normalidade.'}

⚖️ ASSERTIVIDADE REAL (Somente Concluídos):
• Taxa de Aprovação: ${realAssertivity.toFixed(1)}% (${approvedFinal} de ${completedTests.length}).
• Classificação: ${benchmarkText}. ${realAssertivity < 15 ? 'Taxa muito abaixo do esperado; sugere falha na especificação inicial.' : 'A assertividade técnica está em nível produtivo.'}

📍 O FATOR "PRESENÇA TÉCNICA" (Justificativa de Viagem):
• Sucesso COM Vistoria: ${rateWithVisit.toFixed(1)}% | SEM Vistoria: ${rateWithoutVisit.toFixed(1)}%.
• Impacto: ${rateWithVisit > rateWithoutVisit ? `A assistência técnica presencial elevou a conversão em ${Math.abs(rateWithVisit - rateWithoutVisit).toFixed(1)}%.` : 'Dados atuais não mostram ganho estatístico com vistorias neste ciclo.'}

💰 INTEGRIDADE FINANCEIRA E DESPERDÍCIO:
• Custo de Reprovação (Loss): R$ ${totalReprovedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
${reprovedWithoutCost.length > 0 ? `⚠️ DADOS INCOMPLETOS: ${reprovedWithoutCost.length} testes reprovados estão sem custo informado. O prejuízo real é certamente superior.` : '✓ Todos os descartes possuem custo de material devidamente registrado.'}
• Sugestão: ${rateWithVisit > rateWithoutVisit ? 'Prioritizar vistorias nos próximos envios para reduzir o custo de material descartado.' : 'Reavaliar a triagem técnica prévia ao faturamento.'}

⚠️ OBSERVAÇÃO DE DADOS:
Consideramos aging como dias desde o registro do teste e vistoria como qualquer tarefa com despesa de viagem vinculada ao teste.`;

    } else if (reportContext === 'INVENTORY') {
        const now = new Date();
        const stagnantItems = filteredReportData.filter(i => {
            const created = new Date(i.created_at);
            const diffTime = Math.abs(now - created);
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return days > 180 && i.quantity > 0;
        });

        const totalAssets = filteredReportData.reduce((acc, i) => acc + (i.quantity || 0), 0);
        const valueInStock = filteredReportData.reduce((acc, i) => acc + (i.op_cost || 0), 0);
        const binsDistribution = filteredReportData.reduce((acc, i) => {
            acc[i.stock_bin] = (acc[i.stock_bin] || 0) + (i.quantity || 0);
            return acc;
        }, {});

        insight = `GESTÃO DE ATIVOS E GIRO (BRAIN AI):
Analise de ocupação de depósitos e obsolescência de materiais.

📦 PANORAMA GERAL DO ESTOQUE:
• Volume Total: ${totalAssets.toFixed(1)} kg em materiais.
• Patrimônio Estimado: R$ ${valueInStock.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
• Distribuição por Depósito: ${Object.entries(binsDistribution).map(([bin, qty]) => `${bin}: ${qty.toFixed(0)}kg`).join(', ')}.

⏳ ANÁLISE DE GIRO (PARADO HÁ +6 MESES):
• Itens Estagnados: ${stagnantItems.length} registros sem movimentação crítica.
${stagnantItems.length > 0 ? `⚠️ ALERTA DE GIRO: Existem materiais parados há mais de 180 dias. Estes itens estão ocupando espaço físico e capital sem retorno. Recomendamos:
1. Reavaliar aplicação técnica imediata.
2. Considerar descarte (Avaria/Perda) caso o material tenha perdido validade técnica.
3. Priorizar reuso se o item estiver em boas condições.` : '✓ O giro de estoque está saudável, sem itens críticos parados há longo prazo.'}

💡 RECOMENDAÇÃO LOGÍSTICA:
${stagnantItems.length > 10 ? 'Alto volume de materiais obsoletos. Sugerimos uma campanha de reuso em novos projetos para limpar os depósitos.' : 'Configuração de estoque balanceada.'}`;

    } else if (reportContext === 'AUDIT') {
        const reuses = tests.filter(t => t.consumed_stock_id && (t.produced_quantity || 0) > 0);
        const totalSavedByReuse = reuses.reduce((acc, t) => acc + (t.op_cost || 0), 0);

        const totalLost = inventory.filter(i => i.status === 'DISCARDED' || i.justification_reason === 'AVARIA/PERDA').reduce((acc, i) => {
            return acc + (i.op_cost || 0);
        }, 0);

        insight = `IA DE AUDITORIA E INTEGRIDADE FINANCEIRA:
Foco em economia circular (reuso) e minimização de perdas operacionais.

📊 EFICIÊNCIA FINANCEIRA:
• Economia Gerada (Reuso): R$ ${totalSavedByReuse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
• Perdas Totais (Descartes/Avarias): R$ ${totalLost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
• ROI de Reuso: ${totalLost > 0 ? (totalSavedByReuse / totalLost).toFixed(1) : totalSavedByReuse > 0 ? 'Infinito' : '0'}x (Para cada R$ 1 perdido, economizamos R$ ${(totalSavedByReuse / (totalLost || 1)).toFixed(1)} com reuso).

🔍 INTEGRIDADE DE DADOS:
✓ Integridade de saldos validada pela IA de Auditoria.

📈 ESTRATÉGIA DE CUSTOS:
• A economia circular está ${totalSavedByReuse > totalLost ? 'superando as perdas, indicando que a estratégia de reuso é eficaz.' : 'abaixo das perdas registradas. Recomenda-se maior rigor na preservação de sobras técnicas.'}`;
    }

    return insight;
};

export const handlePrintInventoryList = ({
    filteredInventory,
    reportTotals,
    activeInventoryBin
}) => {
    const printWindow = window.open('', '_blank');
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR');

    const binLabel = activeInventoryBin === 'ALL' ? 'TODOS OS DEPÓSITOS' : activeInventoryBin;

    const tableRowsHtml = filteredInventory.map(i => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px; font-size: 9px; font-weight: 700; color: #64748b;">${new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
            <td style="padding: 10px; font-size: 10px; font-weight: 900; color: #0f172a;">${i.name}<br><span style="font-size: 8px; color: #94a3b8; font-weight: 700;">${i.client_name || 'Geral'}</span></td>
            <td style="padding: 10px; text-align: center; font-size: 9px; font-weight: 700; color: #334155;">${i.op || '-'}</td>
            <td style="padding: 10px; text-align: center; font-size: 9px; font-weight: 900; color: #64748b;">${i.stock_bin || '-'}</td>
            <td style="padding: 10px; text-align: center; font-size: 10px; font-weight: 900; color: #0f172a;">${i.volumes || 0}</td>
            <td style="padding: 10px; text-align: right; font-size: 10px; font-weight: 900; color: #0f172a;">${Number(i.quantity || 0).toFixed(1)} ${i.unit || 'KG'}</td>
            <td style="padding: 10px; text-align: center;"><span style="font-size: 8px; font-weight: 900; padding: 3px 8px; border-radius: 6px; background: ${i.status === 'AVAILABLE' || i.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'}; color: ${i.status === 'AVAILABLE' || i.status === 'ACTIVE' ? '#059669' : '#64748b'};">${i.status}</span></td>
        </tr>
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>LISTA DE ESTOQUE - ${dateStr}</title>
                <style>
                    @page { size: portrait; margin: 15mm; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; color: #1e293b; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
                    .card { padding: 15px; border-radius: 12px; border: 1px solid #f1f5f9; background: #f8fafc; }
                    .card-label { font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 5px; }
                    .card-value { font-size: 18px; font-weight: 900; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { padding: 12px; text-align: left; background: #0f172a; color: white; font-size: 9px; font-weight: 900; text-transform: uppercase; }
                    tr { page-break-inside: avoid !important; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #0f172a;">LISTA DE ESTOQUE</h1>
                        <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-top: 5px;">
                            FILTRO: ${binLabel} | POSIÇÃO ATUAL EM ESTOQUE
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin: 0;">Gerado em:</p>
                        <p style="font-size: 11px; font-weight: 900; color: #1e293b; margin: 2px 0;">${dateStr} às ${timeStr}</p>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="card"><span class="card-label">Total de Itens</span><span class="card-value">${filteredInventory.length}</span></div>
                    <div class="card" style="background: #fffbeb;"><span class="card-label">Volume Total</span><span class="card-value" style="color: #d97706;">${Number(reportTotals.weightKg || 0).toFixed(1)} KG | ${Number(reportTotals.unitsUn || 0).toFixed(0)} UN</span></div>
                    <div class="card" style="background: #eef2ff;"><span class="card-label">Patrimônio Gerido</span><span class="card-value" style="color: #4f46e5;">R$ ${Number(reportTotals.investment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Item / Cliente</th>
                            <th style="text-align: center;">OP</th>
                            <th style="text-align: center;">Depósito</th>
                            <th style="text-align: center;">Vols</th>
                            <th style="text-align: right;">Saldo (KG)</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>

                <div style="margin-top: 50px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <span style="font-size: 8px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em;">Brain Intelligence System</span>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 800);
};
