import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, FileSpreadsheet, RefreshCw, CheckCircle, Info, Database,
    Plus, Coins, AlertTriangle, Search, FileText, Printer
} from 'lucide-react';
import ProductAutocomplete from '../ProductAutocomplete';
import logoPlastimarau from '../../../assets/logo_plastimarau.png';

const TestDetailsModal = ({
    isOpen,
    onClose,
    test: temporaryTest,
    setTest: setTemporaryTest,
    onSave: handleSaveDetails,
    isSaving,
    tasks = [],
    onConvertToTask,
    testFlows = [],
    testStatusPresets = [],
    notifySuccess,
    notifyError,
    inventory = [],
    tests = [],
    getNormalizedParams = (data) => data,
    handleRegisterClient,
    isClientRegistered,
    registeredClients = [],
    allClients = [],
    isMeetingView
}) => {
    // Estado local para controle do seletor (Garante reatividade sem dependência de props lentas)
    const [localShowStock, setLocalShowStock] = useState(false);
    const [localStockSearch, setLocalStockSearch] = useState('');

    // Auto-migração silenciosa de NF legada para a nova estrutura estruturada de remessas (shipments)
    useEffect(() => {
        if (isOpen && temporaryTest) {
            const shipments = temporaryTest.extra_data?.shipments || [];
            const hasNF = temporaryTest.nf_number || temporaryTest.extra_data?.nf_nota;
            
            if (shipments.length === 0 && hasNF) {
                console.log('[TestDetailsModal] Auto-migrando NF legada para a lista de remessas:', hasNF);
                const qtyProduced = parseFloat(temporaryTest.produced_quantity) || 0;
                const qtyBilled = parseFloat(temporaryTest.quantity_billed) || qtyProduced || 0;
                const volumes = parseInt(temporaryTest.volumes) || parseInt(temporaryTest.extra_data?.volumes_faturados) || 0;
                
                const migratedShipment = {
                    id: Date.now(),
                    nf: String(hasNF).toUpperCase().trim(),
                    qty: qtyBilled,
                    volumes: volumes,
                    date: temporaryTest.delivery_date ? temporaryTest.delivery_date.split('T')[0] : new Date().toISOString().split('T')[0]
                };

                setTemporaryTest({
                    ...temporaryTest,
                    quantity_billed: qtyBilled,
                    extra_data: {
                        ...temporaryTest.extra_data,
                        shipments: [migratedShipment],
                        nf_nota: String(hasNF).toUpperCase().trim(),
                        material_enviado: 'SIM'
                    }
                });
            }
        }
    }, [isOpen, temporaryTest?.id]);

    // Sincronização automática dos campos importados com os controles visuais
    useEffect(() => {
        if (!temporaryTest) return;

        let needsSync = false;
        let syncedTest = { ...temporaryTest };

        // Sincronização de Situação com Status Visual (se bater com algum preset)
        if (syncedTest.situation) {
            const situationUpper = syncedTest.situation.toUpperCase().trim();
            let targetLabel = situationUpper;

            if (situationUpper === 'CONCLUÍDO' || situationUpper === 'CONCLUIDO') {
                targetLabel = 'APROVADO';
            } else if (situationUpper === 'AGUARDANDO') {
                targetLabel = 'AGUARDANDO RETORNO DO CLIENTE';
            }

            const matchedPreset = testStatusPresets.find(p => p.label.toUpperCase() === targetLabel);
            if (matchedPreset && syncedTest.status !== matchedPreset.label) {
                syncedTest.status = matchedPreset.label;
                syncedTest.status_color = matchedPreset.color;
                needsSync = true;
            }
        }

        if (needsSync) {
            setTemporaryTest(syncedTest);
        }
    }, [
        temporaryTest?.situation,
        temporaryTest?.nf_number,
        temporaryTest?.extra_data?.nf_nota,
        temporaryTest?.extra_data?.material_enviado
    ]);

    // Helpers para Gestão de Múltiplas NFs / Remessas
    const handleAddShipment = () => {
        const shipments = temporaryTest?.extra_data?.shipments || [];
        // Se já existia uma NF única antiga, migra ela para o primeiro item se a lista estiver vazia
        if (shipments.length === 0 && temporaryTest.nf_number) {
            shipments.push({
                id: Date.now(),
                nf: temporaryTest.nf_number,
                qty: temporaryTest.quantity_billed || 0,
                volumes: temporaryTest.extra_data?.volumes_faturados || 0,
                date: new Date().toISOString().split('T')[0]
            });
        }

        const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
        const consumedByOthers = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
        const currentBilled = shipments.reduce((sum, s) => sum + (parseFloat(s.qty) || 0), 0);
        const available = Math.max(0, (temporaryTest.produced_quantity || 0) + (invItem?.inventory_adjustment || 0) - consumedByOthers - currentBilled);

        const newShipments = [
            ...shipments,
            { id: Date.now() + 1, nf: '', qty: available, volumes: 0, date: new Date().toISOString().split('T')[0] }
        ];
        syncShipments(newShipments);
    };

    const syncShipments = (newShipments) => {
        const totalQty = newShipments.reduce((sum, s) => sum + (parseFloat(s.qty) || 0), 0);
        const nfList = newShipments.map(s => s.nf).filter(Boolean).join(', ');
        
        setTemporaryTest({
            ...temporaryTest,
            quantity_billed: totalQty,
            nf_number: nfList,
            extra_data: {
                ...temporaryTest.extra_data,
                shipments: newShipments,
                nf_nota: nfList,
                material_enviado: newShipments.length > 0 ? 'SIM' : temporaryTest.extra_data?.material_enviado
            }
        });
    };

    const updateShipmentField = (id, field, value) => {
        const shipments = [...(temporaryTest?.extra_data?.shipments || [])];
        const idx = shipments.findIndex(s => s.id === id);
        if (idx === -1) return;

        let val = value;
        if (field === 'qty' || field === 'volumes') {
            val = value === '' ? '' : parseFloat(value);
        }

        shipments[idx] = { ...shipments[idx], [field]: val };
        syncShipments(shipments);
    };

    const removeShipment = (id) => {
        const newShipments = (temporaryTest?.extra_data?.shipments || []).filter(s => s.id !== id);
        syncShipments(newShipments);
    };

    const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
    const isDonor = !!(invItem && tests.some(t => t.consumed_stock_id === invItem.id));

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita pop-ups para imprimir o relatório.');
            return;
        }

        const name = temporaryTest.product_name || 'PRODUTO NÃO INFORMADO';
        const produced = temporaryTest.produced_quantity || 0;
        const unit = temporaryTest.unit || 'KG';
        const status = temporaryTest.status || 'NÃO DEFINIDO';
        const stage = temporaryTest.flow_stage || 'FASE NÃO DEFINIDA';
        const description = temporaryTest.description || '';
        
        // Faturamento
        const billed = temporaryTest.quantity_billed || 0;
        const nfs = temporaryTest.nf_number || 'Sem NFs';
        
        // Descarte
        const discarded = temporaryTest.quantity_discarded || 0;
        
        // Estoque / Saldo
        const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
        const currentBalance = (produced - billed - discarded) - totalConsumed + (invItem?.inventory_adjustment || 0);

        // Custos e Amortização
        const opCost = temporaryTest.op_cost || 0;
        const unitCost = produced > 0 ? opCost / produced : 0;

        // DRE - Logística automática a partir de tarefas vinculadas ao teste
        const linkedTasks = tasks?.filter(t => t.parent_test_id === temporaryTest.id) || [];
        const autoLogisticsCost = linkedTasks.reduce((sum, t) => {
            const manual = parseFloat(t.trip_cost || 0);
            const travels = (t.travels || []).reduce((ts, tr) => ts + parseFloat(tr.cost || 0), 0);
            return sum + manual + travels;
        }, 0);

        // DRE - Logística manual por NF + receita de venda real
        const shipments = temporaryTest.extra_data?.shipments || [];
        const manualFreight = shipments.reduce((sum, s) => sum + parseFloat(s.freight_cost || 0), 0);
        const totalSaleRevenue = shipments.reduce((sum, s) => {
            const qty = parseFloat(s.qty || 0);
            const price = parseFloat(s.sale_price || 0);
            return sum + (qty * price);
        }, 0);
        const hasSalePrice = shipments.some(s => parseFloat(s.sale_price || 0) > 0);
        const totalLogistics = autoLogisticsCost + manualFreight;
        const costOfGoodsSold = billed * unitCost;
        // Crédito por material transferido para outro teste
        const transferCredit = totalConsumed * unitCost;
        const netMargin = hasSalePrice ? totalSaleRevenue - costOfGoodsSold - totalLogistics : null;
        const roi = hasSalePrice ? totalSaleRevenue + transferCredit - opCost - totalLogistics : null;

        // Resultado financeiro
        const dreVerdict = netMargin === null ? null
            : netMargin > 0 ? 'LUCRO'
            : netMargin < 0 ? 'PREJUÍZO'
            : 'EMPATE';
        const dreColor = dreVerdict === 'LUCRO' ? '#16a34a'
            : dreVerdict === 'PREJUÍZO' ? '#dc2626'
            : '#d97706';

        // Executive Summary Text
        let summaryParagraphs = [];
        summaryParagraphs.push(`Este teste está na fase <strong>"${stage}"</strong> com o status de homologação marcado como <strong>"${status}"</strong>.`);
        summaryParagraphs.push(`Foram produzidos <strong>${produced.toLocaleString('pt-BR')} ${unit}</strong> do item <strong>"${name}"</strong>.`);
        if (billed > 0) {
            summaryParagraphs.push(`Dessa produção, <strong>${billed.toLocaleString('pt-BR')} ${unit}</strong> já foram faturados sob a(s) NF(s) ${nfs}.`);
        } else {
            summaryParagraphs.push(`Não há registros de faturamento faturado até o momento.`);
        }
        if (currentBalance > 0) {
            summaryParagraphs.push(`Atualmente, restam <strong>${currentBalance.toLocaleString('pt-BR')} ${unit}</strong> disponíveis em estoque (${temporaryTest.stock_destination || 'A RESERVAR'}).`);
        } else if (currentBalance === 0) {
            summaryParagraphs.push(`O estoque desse produto foi totalmente consumido ou zerado.`);
        } else {
            summaryParagraphs.push(`Atenção: Há uma inconsistência de estoque, com saldo negativo de <strong>${currentBalance.toLocaleString('pt-BR')} ${unit}</strong>.`);
        }
        if (dreVerdict) {
            summaryParagraphs.push(`<strong style="color:${dreColor}">Resultado financeiro: ${dreVerdict} de R$ ${Math.abs(netMargin).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</strong>`);
        }

        const dateStr = temporaryTest.created_at ? new Date(temporaryTest.created_at).toLocaleDateString('pt-BR') : 'Pendente';
        const deliveryStr = temporaryTest.delivery_date ? new Date(temporaryTest.delivery_date).toLocaleDateString('pt-BR') : 'Não informada';

        const shipmentsHtml = shipments.length > 0
            ? shipments.map(s => {
                const qty = parseFloat(s.qty || 0);
                const salePrice = parseFloat(s.sale_price || 0);
                const freight = parseFloat(s.freight_cost || 0);
                const receita = qty * salePrice;
                return `
                <tr class="border-b border-slate-100">
                    <td class="py-2.5 font-black text-slate-800">NF ${s.nf || 'S/N'}</td>
                    <td class="py-2.5 text-right font-bold text-slate-700">${qty.toLocaleString('pt-BR')} ${unit}</td>
                    <td class="py-2.5 text-right font-bold text-slate-700">R$ ${(qty * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td class="py-2.5 text-right font-bold ${salePrice > 0 ? 'text-emerald-700' : 'text-slate-300 italic'}">${salePrice > 0 ? 'R$ ' + receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td class="py-2.5 text-right text-slate-500">${freight > 0 ? 'R$ ' + freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td class="py-2.5 text-right text-slate-500">${s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '-'}</td>
                </tr>
            `}).join('')
            : `
                <tr>
                    <td colspan="6" class="py-4 text-center text-slate-400 italic">Sem registros de faturamento.</td>
                </tr>
            `;

        // Saldo em estoque para impressão
        const testStatusPrint = (temporaryTest.status || '').toUpperCase();
        const isApprovedPrint = testStatusPrint.includes('APROVAD');
        const isRejectedPrint = testStatusPrint.includes('REPROVAD') || testStatusPrint.includes('CANCELAD') || testStatusPrint.includes('DESCONTINUAD');
        const currentStockBalancePrint = Math.max(0, (produced - billed - discarded) - totalConsumed + (invItem?.inventory_adjustment || 0));
        const stockValueAtCostPrint = currentStockBalancePrint * unitCost;
        const fmtPrint = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        // Insights contextuais para impressão
        const printInsights = [];
        if (hasSalePrice && currentStockBalancePrint > 0.01) {
            printInsights.push({ color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: '📦',
                text: `Ainda há <strong>${currentStockBalancePrint.toLocaleString('pt-BR')} ${unit}</strong> em estoque (custo de ${fmtPrint(stockValueAtCostPrint)}). A <strong>Margem Comercial</strong> reflete apenas os ${billed.toLocaleString('pt-BR')} ${unit} já vendidos. O <strong>ROI Consolidado</strong> considera TODO o investimento da OP — por isso é maior em valor absoluto. Quando o saldo em estoque for vendido, reutilizado ou descartado, o ROI será recalculado automaticamente.` });
        }
        if (isRejectedPrint && dreVerdict === 'LUCRO') {
            printInsights.push({ color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: '⚠️',
                text: `Embora a margem registre <strong>lucro de ${fmtPrint(netMargin)}</strong>, este teste foi marcado como <strong>${testStatusPrint}</strong>. O objetivo técnico não foi atingido. O ganho financeiro deve ser interpretado com cautela — parte do custo de P&D não se converteu em resultado estratégico.` });
        }
        if (isRejectedPrint && dreVerdict === 'PREJUÍZO') {
            printInsights.push({ color: '#991b1b', bg: '#fff1f2', border: '#fecdd3', icon: '🔴',
                text: `Este teste foi <strong>${testStatusPrint}</strong> e registrou <strong>prejuízo de ${fmtPrint(Math.abs(netMargin))}</strong>. Trata-se de uma dupla perda: objetivo técnico não atingido e investimento financeiro não recuperado. Avaliar aprendizados para evitar repetição.` });
        }
        if (isApprovedPrint && dreVerdict === 'PREJUÍZO') {
            printInsights.push({ color: '#14532d', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅',
                text: `O teste foi <strong>APROVADO</strong> — objetivo técnico conquistado. O prejuízo de <strong>${fmtPrint(Math.abs(netMargin))}</strong> pode ser interpretado como <strong>custo de desenvolvimento de produto/cliente (P&D)</strong>, comum em homologações. Verifique se o volume futuro de pedidos regulares compensa o investimento inicial.` });
        }
        if (hasSalePrice && totalLogistics === 0 && linkedTasks.length === 0) {
            printInsights.push({ color: '#374151', bg: '#f9fafb', border: '#e5e7eb', icon: '🚚',
                text: `Nenhum custo de logística foi informado. A margem pode estar superestimada. Para análise mais precisa, insira o custo de frete nas NFs ou vincule uma tarefa de viagem a este teste.` });
        }
        if (!isApprovedPrint && !isRejectedPrint && dreVerdict === 'LUCRO') {
            printInsights.push({ color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', icon: '⏳',
                text: `Resultado financeiro indica <strong>lucro de ${fmtPrint(netMargin)}</strong>, porém o teste ainda aguarda decisão de homologação (<strong>${testStatusPrint || 'STATUS NÃO DEFINIDO'}</strong>). Resultado provisório — aprovação ou reprovação pode impactar pedidos futuros.` });
        }

        const printInsightsHtml = printInsights.length > 0 ? `
            <div style="margin-top:14px; padding-top:12px; border-top:1px solid #e5e7eb;">
                <p style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; margin:0 0 8px 0;">Análise Contextual</p>
                ${printInsights.map(ins => `
                    <div style="background:${ins.bg}; border:1px solid ${ins.border}; border-radius:12px; padding:10px 12px; margin-bottom:8px; font-size:10px; line-height:1.6; color:${ins.color};">
                        <span style="margin-right:4px;">${ins.icon}</span>${ins.text}
                    </div>
                `).join('')}
            </div>
        ` : '';

        // DRE HTML para impressão
        const dreHtml = dreVerdict ? `
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1.5px solid #86efac; border-radius: 20px; padding: 20px; margin-bottom: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid #bbf7d0;">
                    <h4 style="font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#14532d; margin:0;">Análise de Viabilidade Financeira (DRE)</h4>
                    <span style="font-size:11px; font-weight:900; text-transform:uppercase; padding:4px 12px; border-radius:999px; color:white; background-color:${dreColor};">${dreVerdict}</span>
                </div>
                <table style="width:100%; font-size:11px; border-collapse:collapse;">
                    <tr style="border-bottom:1px solid #d1fae5;">
                        <td style="padding:7px 0 3px;">
                            <div style="font-weight:bold; color:#374151;">Receita Bruta de Venda</div>
                            <div style="font-size:9px; color:#9ca3af; font-style:italic;">Valor total recebido pelas NFs faturadas (${billed.toLocaleString('pt-BR')} ${unit} × preço de venda)</div>
                        </td>
                        <td style="padding:7px 0 3px; text-align:right; font-weight:900; color:#15803d; vertical-align:top;">${fmtPrint(totalSaleRevenue)}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #d1fae5;">
                        <td style="padding:7px 0 3px;">
                            <div style="font-weight:bold; color:#374151;">(-) Custo de Fabricação (OP — qtd faturada)</div>
                            <div style="font-size:9px; color:#9ca3af; font-style:italic;">${billed.toLocaleString('pt-BR')} ${unit} × ${fmtPrint(unitCost)}/${unit} (custo unitário da OP)</div>
                            ${currentStockBalancePrint > 0.01 ? `<div style="font-size:9px; color:#d97706; font-weight:bold; font-style:italic; margin-top:2px;">⚠️ Custo proporcional somente ao que foi vendido — outros ${currentStockBalancePrint.toLocaleString('pt-BR')} ${unit} em estoque não entram aqui</div>` : ''}
                        </td>
                        <td style="padding:7px 0 3px; text-align:right; font-weight:900; color:#dc2626; vertical-align:top;">${fmtPrint(costOfGoodsSold)}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #d1fae5;">
                        <td style="padding:7px 0 3px;">
                            <div style="font-weight:bold; color:#374151;">(-) Custo de Logística (Frete / Viagem)</div>
                            ${autoLogisticsCost > 0 ? `<div style="font-size:9px; color:#6366f1; font-weight:bold;">• Automático: ${linkedTasks.length} tarefa(s) vinculada(s) = ${fmtPrint(autoLogisticsCost)}</div>` : ''}
                            ${manualFreight > 0 ? `<div style="font-size:9px; color:#9ca3af; font-weight:bold;">• Manual nas NFs = ${fmtPrint(manualFreight)}</div>` : ''}
                            ${totalLogistics === 0 ? `<div style="font-size:9px; color:#d1d5db; font-style:italic;">Não informado — insira o frete nas NFs ou vincule uma tarefa de viagem</div>` : ''}
                        </td>
                        <td style="padding:7px 0 3px; text-align:right; font-weight:900; color:${totalLogistics > 0 ? '#dc2626' : '#d1d5db'}; vertical-align:top;">${fmtPrint(totalLogistics)}</td>
                    </tr>
                    <tr style="border-top:2px solid #16a34a; background:rgba(240,253,244,0.6);">
                        <td style="padding:10px 0 4px;">
                            <div style="font-weight:900; color:#14532d; font-size:12px;">(=) Margem Comercial Líquida</div>
                            <div style="font-size:9px; color:#6b7280; font-style:italic;">Resultado da parte <strong>já vendida</strong>: Receita − Custo de Fabricação (faturado) − Logística</div>
                        </td>
                        <td style="padding:10px 0 4px; text-align:right; font-weight:900; font-size:14px; color:${dreColor}; vertical-align:top;">${fmtPrint(netMargin)}</td>
                    </tr>
                    ${transferCredit > 0 ? `
                    <tr style="border-top:1px dashed #fcd34d;">
                        <td style="padding:6px 0 3px;">
                            <div style="font-size:10px; font-weight:bold; color:#92400e;">(+) Crédito — Material Reutilizado em Outro Teste</div>
                            <div style="font-size:9px; color:#d97706; font-style:italic;">${totalConsumed.toLocaleString('pt-BR')} ${unit} transferidos × ${fmtPrint(unitCost)}/${unit} — custo absorvido pelo teste receptor</div>
                        </td>
                        <td style="padding:6px 0 3px; text-align:right; font-weight:900; font-size:10px; color:#d97706; vertical-align:top;">+ ${fmtPrint(transferCredit)}</td>
                    </tr>` : ''}
                    ${roi !== null ? `
                    <tr style="border-top:1px solid #d1fae5;">
                        <td style="padding:6px 0 3px;">
                            <div style="font-size:10px; font-weight:bold; color:#374151;">ROI Consolidado do Teste (Investimento Total da OP)</div>
                            <div style="font-size:9px; color:#9ca3af; font-style:italic;">Receita de venda − TOTAL investido na OP (100%) − Logística. Inclui material ainda em estoque não vendido.</div>
                            ${currentStockBalancePrint > 0.01 ? `<div style="font-size:9px; color:#d97706; font-weight:bold; font-style:italic; margin-top:2px;">📦 ${currentStockBalancePrint.toLocaleString('pt-BR')} ${unit} em estoque (${fmtPrint(stockValueAtCostPrint)} em custo) ainda não geraram receita — ROI melhora quando esse saldo for vendido</div>` : ''}
                        </td>
                        <td style="padding:6px 0 3px; text-align:right; font-weight:900; font-size:11px; color:${roi >= 0 ? '#16a34a' : '#dc2626'}; vertical-align:top;">${fmtPrint(roi)}</td>
                    </tr>` : ''}
                </table>
                ${printInsightsHtml}
            </div>
        ` : `
            <div style="background:#f8fafc; border:1px dashed #e2e8f0; border-radius:20px; padding:16px; margin-bottom:24px; text-align:center;">
                <p style="font-size:10px; color:#94a3b8; margin:0;">Análise financeira indisponível: informe o Preço de Venda (R$/${unit}) em pelo menos uma NF para ativar a DRE.</p>
            </div>
        `;


        const descriptionHtml = description
            ? `
                <div class="mt-4 pt-4 border-t border-indigo-200/50 text-sm text-indigo-900/80 italic">
                    <strong>Nota Técnica / Descrição:</strong> "${description}"
                </div>
            `
            : '';

        const statusColor = temporaryTest.status_color || '#4f46e5';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Teste #${temporaryTest.test_number || 'Sem N°'}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        body { font-family: 'Inter', sans-serif; color: #1e293b; background-color: #f8fafc; }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        @media print {
                            .no-print { display: none !important; }
                            body { background-color: #ffffff !important; padding: 0; }
                        }
                        .gradient-summary {
                            background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%) !important;
                            border: 1px solid #c7d2fe !important;
                        }
                        .card-glow {
                            background-color: #ffffff !important;
                            border: 1px solid #e2e8f0 !important;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
                        }
                    </style>
                </head>
                <body class="p-8 max-w-4xl mx-auto">
                    <!-- Ações no topo para visualização antes de imprimir -->
                    <div class="no-print flex justify-between items-center mb-8 bg-slate-100 p-4 rounded-2xl border border-slate-200">
                        <span class="text-xs font-bold text-slate-500 uppercase">Visualização de Impressão</span>
                        <div class="flex gap-2">
                            <button onclick="window.close()" class="px-4 py-2 bg-white text-slate-600 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-50">Fechar Aba</button>
                            <button onclick="window.print()" class="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-700">Imprimir Relatório</button>
                        </div>
                    </div>

                    <!-- Cabeçalho Oficial -->
                    <div class="flex justify-between items-start border-b-2 border-indigo-500 pb-6 mb-6">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                                    TESTE #${temporaryTest.test_number || 'S/N'}
                                </span>
                                <h1 class="text-2xl font-black uppercase tracking-tight text-indigo-900">${temporaryTest.title}</h1>
                            </div>
                            <p class="text-sm font-bold text-indigo-650 uppercase tracking-wider">${temporaryTest.client_name}</p>
                            <p class="text-xs text-slate-400 mt-1">Lançado em ${dateStr} • Entrega prevista: ${deliveryStr}</p>
                        </div>
                        <div class="text-right">
                            <h2 class="text-lg font-black text-indigo-600">Assistec</h2>
                            <p class="text-xs text-slate-400">Relatório de Homologação</p>
                            <img src="${logoPlastimarau}" class="h-8 mt-2.5 object-contain" alt="Logo Plastimarau" />
                        </div>
                    </div>

                    <!-- Resumo Executivo -->
                    <div class="gradient-summary rounded-3xl p-6 mb-6">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-indigo-200">
                            <h3 class="text-xs font-black text-indigo-900 uppercase tracking-widest">Resumo Executivo da Situação</h3>
                            <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full text-white shadow-sm" style="background-color: ${statusColor};">
                                ${status}
                            </span>
                        </div>
                        <p class="text-sm leading-relaxed text-indigo-950 font-medium">${summaryParagraphs.join(' ')}</p>
                        ${descriptionHtml}
                    </div>

                    <!-- Dados Gerais do Teste -->
                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="card-glow rounded-3xl p-5 border-l-4 border-indigo-500">
                            <h4 class="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">Identificação</h4>
                            <table class="w-full text-xs">
                                <tr class="border-b border-slate-100"><td class="py-2.5 font-bold text-slate-400">PEDIDO:</td><td class="py-2.5 text-right font-black text-slate-800">${temporaryTest.test_order || 'N/A'}</td></tr>
                                <tr class="border-b border-slate-100"><td class="py-2.5 font-bold text-slate-400">OP N°:</td><td class="py-2.5 text-right font-black text-slate-800">${temporaryTest.op_number || 'N/A'}</td></tr>
                                <tr class="border-b border-slate-100"><td class="py-2.5 font-bold text-slate-400">STATUS:</td><td class="py-2.5 text-right font-black uppercase" style="color: ${statusColor}">${status}</td></tr>
                                <tr><td class="py-2.5 font-bold text-slate-400">FLUXO INTERNO:</td><td class="py-2.5 text-right font-black text-slate-800 uppercase">${stage}</td></tr>
                            </table>
                        </div>
                        <div class="card-glow rounded-3xl p-5 border-l-4 border-blue-500">
                            <h4 class="text-xs font-black text-blue-900 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">Produção & Financeiro</h4>
                            <table class="w-full text-xs">
                                <tr class="border-b border-slate-100"><td class="py-2.5 font-bold text-slate-400">QUANTIDADE:</td><td class="py-2.5 text-right font-black text-slate-800">${produced.toLocaleString('pt-BR')} ${unit}</td></tr>
                                <tr class="border-b border-slate-100"><td class="py-2.5 font-bold text-slate-400">VOLUMES:</td><td class="py-2.5 text-right font-black text-slate-800">${temporaryTest.volumes || 0}</td></tr>
                                <tr class="border-b border-slate-100"><td class="py-2.5 font-bold text-slate-400">INVESTIMENTO:</td><td class="py-2.5 text-right font-black text-indigo-700">R$ ${opCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
                                <tr><td class="py-2.5 font-bold text-slate-400">CUSTO UNITÁRIO:</td><td class="py-2.5 text-right font-black text-indigo-700">R$ ${unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ${unit}</td></tr>
                            </table>
                        </div>
                    </div>

                    <!-- Faturamento & Logística -->
                    <div class="card-glow rounded-3xl p-5 mb-6 border-t-4 border-emerald-500">
                        <h4 class="text-xs font-black text-emerald-900 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">Faturamento & Logística</h4>
                        <table class="w-full text-xs text-slate-700">
                            <thead>
                                <tr class="border-b border-slate-200 text-left font-bold text-slate-400">
                                    <th class="pb-2">NF / REMESSA</th>
                                    <th class="pb-2 text-right">QUANTIDADE</th>
                                    <th class="pb-2 text-right">CUSTO PROD.</th>
                                    <th class="pb-2 text-right">RECEITA VENDA</th>
                                    <th class="pb-2 text-right">FRETE</th>
                                    <th class="pb-2 text-right">DATA</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${shipmentsHtml}
                            </tbody>
                        </table>
                        ${totalLogistics > 0 ? `<div style="text-align:right; margin-top:8px; font-size:10px; font-weight:700; color:#6b7280;">Custo Total de Logística (incl. viagens): <strong style="color:#dc2626;">R$ ${totalLogistics.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>` : ''}
                    </div>

                    <!-- DRE - Análise de Viabilidade Financeira -->
                    ${dreHtml}

                    <!-- Detalhamento de Estoque & Descartes -->
                    <div class="grid grid-cols-3 gap-4 mb-12">
                        <div class="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 text-center">
                            <span class="text-[9px] font-black text-indigo-650 uppercase tracking-wider">Total Produzido</span>
                            <p class="text-xl font-black text-indigo-900 mt-1">${produced.toLocaleString('pt-BR')} ${unit}</p>
                        </div>
                        <div class="bg-red-50 border border-red-200 rounded-3xl p-4 text-center">
                            <span class="text-[9px] font-black text-red-600 uppercase tracking-wider">Quantidade Descartada</span>
                            <p class="text-xl font-black text-red-900 mt-1">${discarded.toLocaleString('pt-BR')} ${unit}</p>
                        </div>
                        <div class="bg-green-50 border border-green-200 rounded-3xl p-4 text-center">
                            <span class="text-[9px] font-black text-green-650 tracking-wider uppercase">Saldo Disponível</span>
                            <p class="text-xl font-black text-green-900 mt-1">${Math.max(0, currentBalance).toLocaleString('pt-BR')} ${unit}</p>
                        </div>
                    </div>

                    <!-- Assinaturas / Controle -->
                    <div class="mt-20 grid grid-cols-2 gap-12 text-center pt-8 border-t border-slate-200">
                        <div>
                            <div class="border-b border-slate-400 h-10 w-4/5 mx-auto"></div>
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-2">Responsável Plastimarau</span>
                        </div>
                        <div>
                            <div class="border-b border-slate-400 h-10 w-4/5 mx-auto"></div>
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-2">Validação Cliente</span>
                        </div>
                    </div>

                    <!-- Script para disparar a impressão automaticamente -->
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const renderExecutiveSummary = () => {
        if (!temporaryTest) return null;

        const name = temporaryTest.product_name || 'PRODUTO NÃO INFORMADO';
        const produced = temporaryTest.produced_quantity || 0;
        const unit = temporaryTest.unit || 'KG';
        const status = temporaryTest.status || 'NÃO DEFINIDO';
        const stage = temporaryTest.flow_stage || 'FASE NÃO DEFINIDA';
        const description = temporaryTest.description || '';
        
        // Faturamento
        const billed = temporaryTest.quantity_billed || 0;
        const nfs = temporaryTest.nf_number || '';
        
        // Descarte
        const discarded = temporaryTest.quantity_discarded || 0;
        
        // Estoque / Saldo
        const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
        const currentBalance = (produced - billed - discarded) - totalConsumed + (invItem?.inventory_adjustment || 0);

        return (
            <div className="p-6 bg-gradient-to-r from-brand-50 to-indigo-50/30 border border-brand-100 rounded-[32px] space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-brand-200/40 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-brand-600 text-white rounded-lg">
                            <FileText size={16} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-brand-900">Resumo Executivo da Situação</h3>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-brand-100 text-brand-700">
                        {status}
                    </span>
                </div>
                
                <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed font-medium">
                    <p>
                        Este teste está na fase <span className="font-black text-slate-900 uppercase">"{stage}"</span> com homologação marcada como <span className="font-black text-brand-700 uppercase">"{status}"</span>.
                        Foi registrada uma produção total de <span className="font-black text-slate-900">{produced.toLocaleString('pt-BR')} {unit}</span> do item <span className="font-black text-slate-900 uppercase">"{name}"</span>.
                    </p>
                    
                    <p>
                        {billed > 0 ? (
                            <span>
                                Desse lote, <span className="font-black text-emerald-600">{billed.toLocaleString('pt-BR')} {unit}</span> já foram faturados{nfs ? ` sob a(s) NF(s) ${nfs}` : ''}.
                            </span>
                        ) : (
                            <span className="text-slate-500 italic">
                                Não há faturamento registrado para esta produção até o momento.
                            </span>
                        )}
                        {' '}
                        {currentBalance > 0 ? (
                            <span>
                                Atualmente, restam <span className="font-black text-brand-600">{currentBalance.toLocaleString('pt-BR')} {unit}</span> disponíveis em estoque (<span className="font-black uppercase text-slate-600">{temporaryTest.stock_destination || 'A RESERVAR'}</span>).
                            </span>
                        ) : currentBalance === 0 ? (
                            <span className="text-slate-500 font-bold">
                                O estoque desse produto foi totalmente consumido ou zerado.
                            </span>
                        ) : (
                            <span className="text-rose-600 font-bold">
                                Atenção: Há uma inconsistência de estoque, com saldo negativo de {currentBalance.toLocaleString('pt-BR')} {unit}.
                            </span>
                        )}
                    </p>

                    {(totalConsumed > 0 || discarded > 0 || description.trim()) && (
                        <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2">
                            {totalConsumed > 0 && (
                                <div className="text-[11px] text-slate-600">
                                    • <span className="font-bold text-amber-600">{totalConsumed.toLocaleString('pt-BR')} {unit}</span> foram reaproveitados como insumo em outros testes.
                                </div>
                            )}
                            {discarded > 0 && (
                                <div className="text-[11px] text-slate-600">
                                    • <span className="font-bold text-rose-600">{discarded.toLocaleString('pt-BR')} {unit}</span> foram descartados/dados como perda.
                                </div>
                            )}
                            {description.trim() && (
                                <div className="text-[11px] bg-white/60 p-3 rounded-xl border border-slate-100 text-slate-600 italic">
                                    "{description.trim()}"
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Metrics Badge row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-brand-200/20">
                    <div className="bg-white/70 p-2 rounded-xl flex flex-col justify-center border border-white">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Produção</span>
                        <span className="text-xs font-black text-slate-800 mt-1">{(produced).toLocaleString('pt-BR')} {unit}</span>
                    </div>
                    <div className="bg-white/70 p-2 rounded-xl flex flex-col justify-center border border-white">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">Faturado</span>
                        <span className="text-xs font-black text-emerald-600 mt-1">{(billed).toLocaleString('pt-BR')} {unit}</span>
                    </div>
                    <div className="bg-white/70 p-2 rounded-xl flex flex-col justify-center border border-white">
                        <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest leading-none">Em Estoque</span>
                        <span className="text-xs font-black text-brand-600 mt-1">{Math.max(0, currentBalance).toLocaleString('pt-BR')} {unit}</span>
                    </div>
                    <div className="bg-white/70 p-2 rounded-xl flex flex-col justify-center border border-white">
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest leading-none">Descarte</span>
                        <span className="text-xs font-black text-rose-600 mt-1">{(discarded).toLocaleString('pt-BR')} {unit}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderFinancialAnalysis = () => {
        if (!temporaryTest) return null;

        const produced = parseFloat(temporaryTest.produced_quantity || 0);
        const billed = parseFloat(temporaryTest.quantity_billed || 0);
        const discarded = parseFloat(temporaryTest.quantity_discarded || 0);
        const unit = temporaryTest.unit || 'KG';
        const opCost = parseFloat(temporaryTest.op_cost || 0);
        const unitCost = produced > 0 ? opCost / produced : 0;
        const costOfGoodsSold = billed * unitCost;
        const testStatus = (temporaryTest.status || '').toUpperCase();
        const isApproved = testStatus.includes('APROVAD');
        const isRejected = testStatus.includes('REPROVAD') || testStatus.includes('CANCELAD') || testStatus.includes('DESCONTINUAD');

        // Logística automática (tarefas vinculadas)
        const linkedTasks = tasks?.filter(t => t.parent_test_id === temporaryTest.id) || [];
        const autoLogisticsCost = linkedTasks.reduce((sum, t) => {
            const manual = parseFloat(t.trip_cost || 0);
            const travels = (t.travels || []).reduce((ts, tr) => ts + parseFloat(tr.cost || 0), 0);
            return sum + manual + travels;
        }, 0);

        // Logística manual + receita de venda por NF
        const shipments = temporaryTest.extra_data?.shipments || [];
        const manualFreight = shipments.reduce((sum, s) => sum + parseFloat(s.freight_cost || 0), 0);
        const totalSaleRevenue = shipments.reduce((sum, s) => {
            const qty = parseFloat(s.qty || 0);
            const price = parseFloat(s.sale_price || 0);
            return sum + (qty * price);
        }, 0);
        const hasSalePrice = shipments.some(s => parseFloat(s.sale_price || 0) > 0);
        const totalLogistics = autoLogisticsCost + manualFreight;
        const hasLogistics = totalLogistics > 0;

        // Crédito de transferência (material reusado em outro teste)
        const invItemLocal = inventory.find(i => i.test_id === temporaryTest?.id);
        const totalConsumedLocal = tests?.filter(t => t.consumed_stock_id === invItemLocal?.id)?.reduce((sum, t) => sum + (parseFloat(t.produced_quantity) || 0), 0) || 0;
        const transferCredit = totalConsumedLocal * unitCost;

        // Saldo em estoque (afeta o ROI)
        const currentStockBalance = Math.max(0, (produced - billed - discarded) - totalConsumedLocal + (invItemLocal?.inventory_adjustment || 0));
        const stockValueAtCost = currentStockBalance * unitCost;

        const netMargin = hasSalePrice ? totalSaleRevenue - costOfGoodsSold - totalLogistics : null;
        const roi = hasSalePrice ? totalSaleRevenue + transferCredit - opCost - totalLogistics : null;

        const dreVerdict = netMargin === null ? null
            : netMargin > 0.005 ? 'LUCRO'
            : netMargin < -0.005 ? 'PREJUÍZO'
            : 'EMPATE';

        const verdictStyles = {
            LUCRO:    { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'text-emerald-800', badge: 'bg-emerald-600 text-white', val: 'text-emerald-700', row: 'from-emerald-50' },
            PREJUÍZO: { bg: 'bg-rose-50',    border: 'border-rose-200',    header: 'text-rose-800',    badge: 'bg-rose-600 text-white',    val: 'text-rose-700',    row: 'from-rose-50'    },
            EMPATE:   { bg: 'bg-amber-50',   border: 'border-amber-200',   header: 'text-amber-800',   badge: 'bg-amber-500 text-white',   val: 'text-amber-700',   row: 'from-amber-50'  },
        };
        const s = dreVerdict ? verdictStyles[dreVerdict] : null;
        const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Geração de insights contextuais
        const insights = [];

        // 1. Insight sobre a diferença Margem x ROI quando há estoque
        if (hasSalePrice && currentStockBalance > 0.01) {
            insights.push({
                type: 'info',
                icon: '📦',
                text: `Ainda há <strong>${currentStockBalance.toLocaleString('pt-BR')} ${unit}</strong> em estoque (custo de ${fmtBRL(stockValueAtCost)}). A <strong>Margem Comercial</strong> reflete apenas os ${billed.toLocaleString('pt-BR')} ${unit} já vendidos. O <strong>ROI Consolidado</strong> considera TODO o investimento da OP — por isso é maior em valor absoluto. Quando o saldo em estoque for vendido, reutilizado ou descartado, o ROI será recalculado automaticamente.`,
            });
        }

        // 2. Insight: teste REPROVADO com lucro (ganho financeiro mas objetivo técnico perdido)
        if (isRejected && dreVerdict === 'LUCRO') {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                text: `Embora a margem comercial registre <strong>lucro de ${fmtBRL(netMargin)}</strong>, este teste foi marcado como <strong>${testStatus}</strong> pelo cliente, indicando que o objetivo técnico não foi atingido. O ganho financeiro deve ser interpretado com cautela — parte do custo de desenvolvimento (P&D) não se converteu em resultado estratégico.`,
            });
        }

        // 3. Insight: teste REPROVADO com prejuízo (dupla perda)
        if (isRejected && dreVerdict === 'PREJUÍZO') {
            insights.push({
                type: 'danger',
                icon: '🔴',
                text: `Este teste foi <strong>${testStatus}</strong> e registrou <strong>prejuízo de ${fmtBRL(Math.abs(netMargin))}</strong>. Trata-se de uma dupla perda: o objetivo técnico não foi atingido e o investimento financeiro não se recuperou. Avaliar se há aprendizados para evitar a repetição.`,
            });
        }

        // 4. Insight: teste APROVADO com prejuízo (investimento P&D válido)
        if (isApproved && dreVerdict === 'PREJUÍZO') {
            insights.push({
                type: 'success',
                icon: '✅',
                text: `O teste foi <strong>APROVADO</strong> — o objetivo técnico foi conquistado. O prejuízo de <strong>${fmtBRL(Math.abs(netMargin))}</strong> registrado nesta fase pode ser interpretado como <strong>custo de desenvolvimento de produto/cliente (P&D)</strong>, comum e esperado em homologações. Verifique se o volume futuro de pedidos regulares compensa o investimento inicial.`,
            });
        }

        // 5. Insight: logística não informada (dados incompletos)
        if (hasSalePrice && !hasLogistics && linkedTasks.length === 0) {
            insights.push({
                type: 'info',
                icon: '🚚',
                text: `Nenhum custo de logística foi informado (nenhum frete nas NFs e nenhuma tarefa/viagem vinculada ao teste). A margem pode estar superestimada. Para uma análise mais precisa, insira o custo de frete manual nas NFs ou gere uma tarefa de viagem a partir deste teste.`,
            });
        }

        // 6. Insight: teste aguardando aprovação com lucro (resultado provisório)
        if (!isApproved && !isRejected && dreVerdict === 'LUCRO') {
            insights.push({
                type: 'info',
                icon: '⏳',
                text: `O resultado financeiro indica <strong>lucro de ${fmtBRL(netMargin)}</strong>, porém o teste ainda aguarda a decisão de homologação do cliente (<strong>${testStatus || 'STATUS NÃO DEFINIDO'}</strong>). Este resultado é provisório — a aprovação ou reprovação pode impactar a viabilidade comercial dos pedidos futuros.`,
            });
        }

        const insightColors = {
            info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800'   },
            warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800'  },
            danger:  { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-800'   },
            success: { bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-800'},
        };

        return (
            <div className={`p-6 rounded-[32px] border shadow-sm space-y-4 ${
                s ? `${s.bg} ${s.border}` : 'bg-slate-50 border-dashed border-slate-200'
            }`}>
                {/* Cabeçalho */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${s ? s.bg : 'bg-slate-100'}`}>
                            <Coins size={16} className={s ? s.header : 'text-slate-500'} />
                        </div>
                        <h3 className={`text-xs font-black uppercase tracking-widest ${s ? s.header : 'text-slate-500'}`}>
                            Análise de Viabilidade Financeira (DRE)
                        </h3>
                    </div>
                    {dreVerdict ? (
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-sm ${s.badge}`}>
                            {dreVerdict}
                        </span>
                    ) : (
                        <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-slate-200 text-slate-500">
                            Aguardando dados
                        </span>
                    )}
                </div>

                {!hasSalePrice ? (
                    <div className="text-center py-4">
                        <p className="text-[11px] text-slate-400 italic leading-relaxed">
                            Para ativar a análise financeira, informe o <span className="font-black text-slate-600">Preço de Venda (R$/{unit})</span> em pelo menos uma remessa / NF (seção Faturamento & Logística acima).
                        </p>
                        <p className="text-[10px] text-slate-300 mt-1">Os custos de logística são calculados automaticamente pelas tarefas/viagens vinculadas a este teste.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* Receita */}
                        <div className="flex items-start justify-between py-2 border-b border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-600">Receita Bruta de Venda</span>
                                <span className="text-[9px] text-slate-400 italic">Valor total recebido pelas NFs faturadas ({billed.toLocaleString('pt-BR')} {unit} × preço de venda)</span>
                            </div>
                            <span className="text-sm font-black text-emerald-600 shrink-0 ml-4">{fmtBRL(totalSaleRevenue)}</span>
                        </div>
                        {/* CMV */}
                        <div className="flex items-start justify-between py-2 border-b border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-600">(-) Custo de Fabricação (OP — qtd faturada)</span>
                                <span className="text-[9px] text-slate-400 italic">{billed.toLocaleString('pt-BR')} {unit} × {fmtBRL(unitCost)}/{unit} (custo unitário da OP)</span>
                                {currentStockBalance > 0.01 && (
                                    <span className="text-[9px] text-amber-500 font-bold italic mt-0.5">⚠️ Custo proporcional somente ao que foi vendido — outros {currentStockBalance.toLocaleString('pt-BR')} {unit} em estoque não entram aqui</span>
                                )}
                            </div>
                            <span className="text-sm font-black text-rose-500 shrink-0 ml-4">{fmtBRL(costOfGoodsSold)}</span>
                        </div>
                        {/* Logística */}
                        <div className="flex items-start justify-between py-2 border-b border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-600">(-) Custo de Logística (Frete / Viagem)</span>
                                {autoLogisticsCost > 0 && (
                                    <span className="text-[9px] text-brand-500 font-bold">• Automático: {linkedTasks.length} tarefa(s) vinculada(s) = {fmtBRL(autoLogisticsCost)}</span>
                                )}
                                {manualFreight > 0 && (
                                    <span className="text-[9px] text-slate-400 font-bold">• Manual nas NFs = {fmtBRL(manualFreight)}</span>
                                )}
                                {!hasLogistics && (
                                    <span className="text-[9px] text-slate-300 italic">Não informado — insira o frete nas NFs ou vincule uma tarefa de viagem</span>
                                )}
                            </div>
                            <span className={`text-sm font-black shrink-0 ml-4 ${hasLogistics ? 'text-rose-500' : 'text-slate-300'}`}>{fmtBRL(totalLogistics)}</span>
                        </div>
                        {/* Margem Comercial */}
                        <div className={`flex items-start justify-between py-3 rounded-xl px-3 mt-1 bg-gradient-to-r ${s?.row || 'from-slate-50'} to-transparent`}>
                            <div className="flex flex-col">
                                <span className={`text-xs font-black uppercase tracking-wide ${s?.header || 'text-slate-700'}`}>(=) Margem Comercial Líquida</span>
                                <span className="text-[9px] text-slate-500 italic mt-0.5">Resultado da parte <strong>já vendida</strong>: Receita − Custo de Fabricação (faturado) − Logística</span>
                            </div>
                            <span className={`text-base font-black shrink-0 ml-4 ${s?.val || 'text-slate-800'}`}>{fmtBRL(netMargin)}</span>
                        </div>
                        {/* Crédito de transferência */}
                        {transferCredit > 0 && (
                            <div className="flex items-start justify-between py-2 border-t border-dashed border-slate-200 mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-amber-600">(+) Crédito — Material Reutilizado em Outro Teste</span>
                                    <span className="text-[9px] text-amber-500 italic">{totalConsumedLocal.toLocaleString('pt-BR')} {unit} transferidos × {fmtBRL(unitCost)}/{unit} — o custo foi absorvido pelo teste receptor</span>
                                </div>
                                <span className="text-sm font-black text-amber-600 shrink-0 ml-4">{fmtBRL(transferCredit)}</span>
                            </div>
                        )}
                        {/* ROI Consolidado */}
                        {roi !== null && (
                            <div className="flex items-start justify-between py-2 border-t border-slate-200 mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-600">ROI Consolidado do Teste (Investimento Total da OP)</span>
                                    <span className="text-[9px] text-slate-400 italic">Receita de venda − TOTAL investido na OP (100%) − Logística. Inclui material ainda em estoque não vendido.</span>
                                    {currentStockBalance > 0.01 && (
                                        <span className="text-[9px] text-amber-500 font-bold italic mt-0.5">📦 {currentStockBalance.toLocaleString('pt-BR')} {unit} em estoque ({fmtBRL(stockValueAtCost)} em custo) ainda não geraram receita — o ROI melhora quando esse saldo for vendido</span>
                                    )}
                                </div>
                                <span className={`text-sm font-black shrink-0 ml-4 ${roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(roi)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Bloco de Insights Contextuais */}
                {insights.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-200/60">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Análise Contextual</span>
                        {insights.map((insight, idx) => {
                            const ic = insightColors[insight.type];
                            return (
                                <div key={idx} className={`p-3 rounded-2xl border text-[10px] leading-relaxed font-medium ${ic.bg} ${ic.border} ${ic.text}`}>
                                    <span className="mr-1">{insight.icon}</span>
                                    <span dangerouslySetInnerHTML={{ __html: insight.text }} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100005] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[95vw] h-[94vh] max-h-[94vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-8 py-8 border-b border-slate-100 bg-slate-50/30 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-brand-50 text-brand-600 rounded-3xl shadow-sm"><FileSpreadsheet size={28} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {temporaryTest?.test_number && (
                                    <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm shrink-0">
                                        #{temporaryTest.test_number}
                                    </span>
                                )}
                                <input
                                    value={temporaryTest?.title || ''}
                                    onChange={(e) => setTemporaryTest({ ...temporaryTest, title: e.target.value })}
                                    className="w-full text-xl font-black text-slate-800 uppercase tracking-tighter bg-transparent border-none outline-none focus:ring-2 focus:ring-brand-500 rounded-xl px-1"
                                    placeholder="Nome do Experimento / Teste"
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2 w-full">
                                    <input
                                        list="client-list"
                                        value={temporaryTest?.client_name || ''}
                                        onChange={(e) => setTemporaryTest({ ...temporaryTest, client_name: e.target.value })}
                                        className="w-full min-w-0 text-sm text-brand-600 font-bold uppercase tracking-widest bg-transparent border-none outline-none focus:ring-2 focus:ring-brand-500 rounded-xl px-2 -ml-2"
                                    />
                                    {temporaryTest?.client_name && !isClientRegistered(temporaryTest.client_name) && (
                                        <button
                                            onClick={() => handleRegisterClient(temporaryTest.client_name)}
                                            className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse hover:bg-amber-100 shrink-0"
                                            title="Adicionar à base oficial de clientes"
                                        >
                                            OFICIALIZAR +
                                        </button>
                                    )}
                                </div>
                                <datalist id="client-list">
                                    {registeredClients?.map((c, i) => (
                                        <option key={i} value={c.name} />
                                    ))}
                                </datalist>
                                <div className="flex items-center gap-1.5 ml-0.5">
                                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Lançado em</span>
                                    <span className="text-[9px] text-slate-600 font-black uppercase">
                                        {temporaryTest?.created_at ? new Date(temporaryTest.created_at).toLocaleDateString('pt-BR') : 'Pendente'}
                                    </span>
                                    {temporaryTest?.consumed_stock_id && (
                                        <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-brand-50 border border-brand-100 rounded-md animate-pulse">
                                            <RefreshCw size={8} className="text-brand-600" />
                                            <span className="text-[7px] text-brand-700 font-black uppercase tracking-tighter">Material Reutilizado</span>
                                        </div>
                                    )}
                                    {temporaryTest?.client_name && !isClientRegistered(temporaryTest.client_name) && (
                                        <span className="text-[8px] text-amber-500 font-bold italic ml-2">⚠️ Não cadastrado</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 text-slate-450 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-all"
                            title="Imprimir Relatório do Teste"
                        >
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-800 transition-colors"><X size={28} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    
                    {/* GRID DE 3 COLUNAS - SEÇÕES PRINCIPAIS */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                        
                        {/* COLUNA 1: IDENTIFICAÇÃO E SITUAÇÃO */}
                        <div className="space-y-6">
                            {/* CARD 1: IDENTIFICAÇÃO E SITUAÇÃO */}
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6 shadow-sm">
                                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                                    <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg"><FileText size={16} /></div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Identificação & Situação</h3>
                                </div>
                                
                                <div className="space-y-6">
                                    {/* Status do Experimento */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Status do Experimento</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {testStatusPresets.map(p => (
                                                <button
                                                    key={p.label}
                                                    type="button"
                                                    onClick={() => setTemporaryTest({ ...temporaryTest, status: p.label, status_color: p.color })}
                                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black transition-all border ${temporaryTest?.status === p.label ? 'shadow-sm scale-105' : 'border-slate-200 bg-white text-slate-400 opacity-60'}`}
                                                    style={{
                                                        backgroundColor: temporaryTest?.status === p.label ? p.color : 'transparent',
                                                        color: temporaryTest?.status === p.label ? 'white' : '#94a3b8',
                                                        borderColor: temporaryTest?.status === p.label ? 'transparent' : '#e2e8f0'
                                                    }}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Fluxo Interno */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">FLUXO INTERNO (FASE ATUAL PLASTIMARAU)</label>
                                        <select
                                            value={temporaryTest?.flow_stage || ''}
                                            onChange={(e) => setTemporaryTest({ ...temporaryTest, flow_stage: e.target.value })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-sm uppercase tracking-wide"
                                        >
                                            <option value="">FASE NÃO DEFINIDA</option>
                                            {testFlows?.map((f, i) => (
                                                <option key={i} value={typeof f === 'string' ? f : f.label}>
                                                    {typeof f === 'string' ? f : f.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Inputs de Identificação */}
                                <div className="grid grid-cols-1 gap-4 border-t border-slate-200/60 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nº do Pedido</label>
                                        <input
                                            type="text"
                                            value={temporaryTest?.test_order || ''}
                                            onChange={(e) => setTemporaryTest({ ...temporaryTest, test_order: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nº da OP</label>
                                        <input
                                            type="text"
                                            value={temporaryTest?.op_number || ''}
                                            onChange={(e) => setTemporaryTest({ ...temporaryTest, op_number: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data de Entrega</label>
                                        <input
                                            type="date"
                                            value={temporaryTest?.delivery_date ? temporaryTest.delivery_date.split('T')[0] : ''}
                                            onChange={(e) => setTemporaryTest({ ...temporaryTest, delivery_date: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Produto</label>
                                        <ProductAutocomplete
                                            clientName={temporaryTest?.client_name}
                                            value={temporaryTest?.product_name || ''}
                                            onChange={(val) => setTemporaryTest({ ...temporaryTest, product_name: val })}
                                            label={null}
                                            icon={null}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                                            containerClassName="relative"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Situação de Validação</label>
                                        <input
                                            type="text"
                                            placeholder="Situação (Ex: AGUARDANDO...)"
                                            value={temporaryTest?.situation || ''}
                                            onChange={(e) => setTemporaryTest({ ...temporaryTest, situation: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUNA 2: DADOS DE PRODUÇÃO, CUSTOS E ESTOQUE */}
                        <div className="space-y-6">
                            {/* CARD 2: DADOS DE PRODUÇÃO E CUSTOS */}
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Coins size={16} /></div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Dados de Produção & Custos</h3>
                                    </div>
                                    {isDonor && (
                                        <div className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-full flex items-center gap-1.5 animate-pulse shrink-0">
                                            <AlertTriangle size={10} className="text-rose-500" />
                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Saldo em Uso</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Qtd Produzida</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                readOnly={!!temporaryTest?.consumed_stock_id || isDonor}
                                                value={temporaryTest?.produced_quantity || ''}
                                                onChange={(e) => {
                                                    if (temporaryTest?.consumed_stock_id) return;
                                                    setTemporaryTest({ ...temporaryTest, produced_quantity: parseFloat(e.target.value) || 0 });
                                                }}
                                                className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 ${
                                                    (temporaryTest?.consumed_stock_id || isDonor) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                                                }`}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">{temporaryTest?.unit || 'KG'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Volumes</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={temporaryTest?.volumes || ''}
                                                onChange={(e) => setTemporaryTest({ ...temporaryTest, volumes: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">Vols</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidade de Medida</label>
                                        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-200 h-[46px] items-center">
                                            {['KG', 'SACOS'].map(u => (
                                                <button
                                                    key={u}
                                                    type="button"
                                                    onClick={() => setTemporaryTest({ ...temporaryTest, unit: u })}
                                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${temporaryTest?.unit === u || (!temporaryTest?.unit && u === 'KG') ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {u}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Custo Total (R$)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                readOnly={!!temporaryTest?.consumed_stock_id || isDonor}
                                                value={temporaryTest?.op_cost || ''}
                                                onChange={(e) => {
                                                    if (temporaryTest?.consumed_stock_id) return;
                                                    setTemporaryTest({ ...temporaryTest, op_cost: parseFloat(e.target.value) || 0 });
                                                }}
                                                className={`w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 ${
                                                    (temporaryTest?.consumed_stock_id || isDonor) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-white border border-slate-150 rounded-2xl flex flex-col gap-1 w-full">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                                        {temporaryTest?.consumed_stock_id ? 'Custo Amortizado p/ ' + (temporaryTest?.unit || 'KG') : 'Custo por ' + (temporaryTest?.unit || 'KG')}
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[10px] text-slate-400 font-bold">R$</span>
                                        <span className={`text-lg font-black ${temporaryTest?.consumed_stock_id ? 'text-brand-600' : 'text-slate-800'}`}>
                                            {temporaryTest?.produced_quantity > 0
                                                ? (temporaryTest.op_cost / temporaryTest.produced_quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                : '0,00'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 4: DESTINO E CONCILIÇÃO DE ESTOQUE */}
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg"><RefreshCw size={16} /></div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Destino & Estoque</h3>
                                    </div>
                                </div>

                                {/* Reaproveitamento de Saldo */}
                                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw size={14} className="text-brand-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Reaproveitamento (Origem)</span>
                                        </div>
                                        {temporaryTest?.consumed_stock_id ? (
                                            <button
                                                onClick={() => setTemporaryTest({ ...temporaryTest, consumed_stock_id: null })}
                                                className="text-[8px] font-bold text-rose-500 hover:text-rose-600 uppercase underline"
                                            >
                                                Remover
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setLocalShowStock(!localShowStock)}
                                                className="text-[8px] font-black bg-brand-500 text-white px-3 py-1.5 rounded-lg uppercase hover:bg-brand-600 transition-all shadow-sm"
                                            >
                                                {localShowStock ? 'Cancelar' : 'Vincular'}
                                            </button>
                                        )}
                                    </div>

                                    {temporaryTest?.consumed_stock_id && (
                                        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-black text-brand-600 uppercase">
                                                    {inventory.find(i => i.id === temporaryTest.consumed_stock_id)?.name || 'Item Vinculado'}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-500 uppercase">
                                                    Disponível: {inventory.find(i => i.id === temporaryTest.consumed_stock_id)?.quantity} {inventory.find(i => i.id === temporaryTest.consumed_stock_id)?.unit}
                                                </span>
                                            </div>
                                            <CheckCircle size={16} className="text-brand-500" />
                                        </div>
                                    )}

                                    {localShowStock && !temporaryTest?.consumed_stock_id && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Pesquisar..."
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                                                    value={localStockSearch}
                                                    onChange={e => setLocalStockSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1 bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                                                {inventory
                                                    .filter(i => i.quantity > 0 && (!localStockSearch || i.name.toLowerCase().includes(localStockSearch.toLowerCase()) || i.client_name?.toLowerCase().includes(localStockSearch.toLowerCase())))
                                                    .map(item => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const sourceTest = tests.find(t => t.id === item.test_id);
                                                                const originalQty = item.qty_produced || (sourceTest?.produced_quantity || 0);
                                                                const originalCost = sourceTest?.op_cost || 0;

                                                                const unitPrice = originalQty > 0 ? originalCost / originalQty : 0;
                                                                const inheritedCost = item.production_cost || (unitPrice * item.quantity);

                                                                setTemporaryTest({
                                                                    ...temporaryTest,
                                                                    consumed_stock_id: item.id,
                                                                    produced_quantity: item.quantity,
                                                                    op_cost: parseFloat(inheritedCost.toFixed(2)),
                                                                    unit: item.unit
                                                                });
                                                                setLocalShowStock(false);
                                                            }}
                                                            className="w-full p-2 hover:bg-slate-100 rounded-lg text-left flex justify-between items-center transition-colors group"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-slate-700 group-hover:text-brand-600">{item.name}</span>
                                                                <span className="text-[7px] font-bold text-slate-400 uppercase">{item.client_name || 'Sem Cliente'} • {item.stock_bin}</span>
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-600">{item.quantity} {item.unit}</span>
                                                        </button>
                                                    ))
                                                }
                                                {inventory.filter(i => i.quantity > 0 && (!localStockSearch || i.name.toLowerCase().includes(localStockSearch.toLowerCase()) || i.client_name?.toLowerCase().includes(localStockSearch.toLowerCase()))).length === 0 && (
                                                    <div className="text-center py-4 text-[9px] font-bold text-slate-400 uppercase italic">Nenhum saldo compatível</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Destino e Descarte */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Destino de Saldo</label>
                                        <select
                                            value={temporaryTest?.stock_destination || 'ESTOQUE 0'}
                                            onChange={(e) => setTemporaryTest({ ...temporaryTest, stock_destination: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all appearance-none cursor-pointer uppercase h-[46px]"
                                        >
                                            <option value="ESTOQUE 0" className="text-amber-600 font-bold italic">ESTOQUE 0 (A RESERVAR)</option>
                                            <option value="ESTOQUE 01" className="text-brand-600">ESTOQUE 01 (ACABADO)</option>
                                            <option value="ESTOQUE 65" className="text-slate-700">ESTOQUE 65 (BOA)</option>
                                            <option value="ESTOQUE 14" className="text-slate-700">ESTOQUE 14 (QUARENTENA)</option>
                                            <option value="DISCARDED" className="text-rose-600">DESCARTE DIRETO</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Qtd Descartada ({temporaryTest?.unit || 'KG'})</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={temporaryTest?.quantity_discarded ?? ''}
                                                onChange={(e) => {
                                                    if (!temporaryTest) return;
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const consumedByOthers = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                    
                                                    const maxAvailable = (temporaryTest.produced_quantity || 0) - (temporaryTest.quantity_billed || 0) - consumedByOthers + (invItem?.inventory_adjustment || 0);
                                                    
                                                    if (val > maxAvailable) {
                                                        setTemporaryTest({ ...temporaryTest, quantity_discarded: Math.max(0, maxAvailable) });
                                                    } else {
                                                        setTemporaryTest({ ...temporaryTest, quantity_discarded: val });
                                                    }
                                                }}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                                placeholder="0.0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">{temporaryTest?.unit || 'KG'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col gap-0.5 justify-center h-[66px]">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">
                                            Saldo p/ {temporaryTest?.stock_destination || 'ESTOQUE'}
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-lg font-black ${(temporaryTest?.quantity_billed || 0) > (temporaryTest?.produced_quantity || 0) ? 'text-rose-600' : 'text-brand-600'}`}>
                                                {(() => {
                                                    if (!temporaryTest) return '0.0';
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                    const currentBalance = ((temporaryTest?.produced_quantity || 0) - (temporaryTest?.quantity_billed || 0) - (temporaryTest?.quantity_discarded || 0)) - totalConsumed + (invItem?.inventory_adjustment || 0);
                                                    return currentBalance.toFixed(2);
                                                })()}
                                            </span>
                                            <span className="text-[9px] font-black uppercase text-slate-400">{temporaryTest?.unit || 'KG'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUNA 3: FATURAMENTO E LOGÍSTICA DE ENVIO */}
                        <div className="space-y-6 xl:sticky xl:top-0">
                            {/* CARD 3: FATURAMENTO E LOGÍSTICA DE ENVIO */}
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6 shadow-sm">
                                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={16} /></div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Faturamento & Logística de Envio</h3>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-1 gap-6">
                                    <div className="space-y-4 lg:col-span-1 xl:col-span-1">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Logística de Envio</label>
                                            <div className="p-1 bg-slate-200/50 rounded-xl flex border border-slate-200 shadow-inner h-[46px] items-center">
                                                {['NÃO', 'SIM'].map(option => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            const newExtra = { ...temporaryTest.extra_data, material_enviado: option };
                                                            let updatedTest = { ...temporaryTest };
                                                            if (option === 'NÃO') {
                                                                delete newExtra.nf_nota;
                                                                newExtra.shipments = [];
                                                                updatedTest.nf_number = '';
                                                                updatedTest.quantity_billed = 0;
                                                            } else if (option === 'SIM' && (!newExtra.shipments || newExtra.shipments.length === 0)) {
                                                                newExtra.shipments = [{
                                                                    id: Date.now(),
                                                                    nf: temporaryTest?.nf_number || temporaryTest?.extra_data?.nf_nota || '',
                                                                    qty: temporaryTest?.quantity_billed || 0,
                                                                    volumes: temporaryTest?.volumes || 0,
                                                                    date: temporaryTest?.delivery_date ? temporaryTest.delivery_date.split('T')[0] : new Date().toISOString().split('T')[0]
                                                                }];
                                                            }
                                                            updatedTest.extra_data = newExtra;
                                                            setTemporaryTest(updatedTest);
                                                        }}
                                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                                            (temporaryTest?.extra_data?.material_enviado === option || (!temporaryTest?.extra_data?.material_enviado && option === 'NÃO'))
                                                                ? 'bg-slate-900 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                Qtd Faturada Total ({temporaryTest?.unit || 'KG'}) 
                                                {(temporaryTest?.extra_data?.shipments?.length > 0) && <span className="text-emerald-600 italic ml-1"> (Vinc. Logística)</span>}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    readOnly={isDonor || (temporaryTest?.extra_data?.shipments?.length > 0)}
                                                    value={temporaryTest?.quantity_billed ?? ''}
                                                    onChange={(e) => {
                                                        if (!temporaryTest) return;
                                                        const hasShipments = (temporaryTest?.extra_data?.shipments?.length > 0);
                                                        if (isDonor || hasShipments) return;
                                                        
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const maxAvailable = (temporaryTest.produced_quantity || 0) + (invItem?.inventory_adjustment || 0);

                                                        if (val > (maxAvailable)) {
                                                            setTemporaryTest({ ...temporaryTest, quantity_billed: maxAvailable });
                                                        } else {
                                                            setTemporaryTest({ ...temporaryTest, quantity_billed: val });
                                                        }
                                                    }}
                                                    className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 ${
                                                        (isDonor || (temporaryTest?.extra_data?.shipments?.length > 0)) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                                                    }`}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">{temporaryTest?.unit || 'KG'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalhes da Logística */}
                                    <div className="p-4 bg-white border border-slate-200 rounded-[24px] space-y-4 lg:col-span-2 xl:col-span-1">
                                        {temporaryTest?.extra_data?.material_enviado === 'SIM' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">NFs / Remessas Cadastradas</span>
                                                    <span className="text-[8px] font-bold text-slate-400">Total: {(temporaryTest?.extra_data?.shipments || []).length} NF(s)</span>
                                                </div>

                                                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                                    {(temporaryTest?.extra_data?.shipments || []).map((s) => (
                                                        <div key={s.id} className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 relative group hover:border-slate-300 transition-all">
                                                            <button 
                                                                onClick={() => removeShipment(s.id)}
                                                                className="absolute top-3 right-3 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                                                                title="Remover Faturamento"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                            
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-3 pr-6">
                                                                <div className="space-y-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Nº da NF</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="000.000"
                                                                        value={s.nf || ''}
                                                                        onChange={(e) => updateShipmentField(s.id, 'nf', e.target.value.toUpperCase())}
                                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Qtd ({temporaryTest?.unit || 'KG'})</label>
                                                                    <input
                                                                        type="number"
                                                                        value={s.qty || ''}
                                                                        onChange={(e) => updateShipmentField(s.id, 'qty', e.target.value)}
                                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Volumes</label>
                                                                    <input
                                                                        type="number"
                                                                        value={s.volumes || ''}
                                                                        onChange={(e) => updateShipmentField(s.id, 'volumes', e.target.value)}
                                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Preço Venda (R$/{temporaryTest?.unit || 'KG'})</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        placeholder="Opcional"
                                                                        value={s.sale_price || ''}
                                                                        onChange={(e) => updateShipmentField(s.id, 'sale_price', e.target.value)}
                                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Custo Frete (R$)</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        placeholder="Opcional"
                                                                        value={s.freight_cost || ''}
                                                                        onChange={(e) => updateShipmentField(s.id, 'freight_cost', e.target.value)}
                                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Data</label>
                                                                    <input
                                                                        type="date"
                                                                        value={s.date || ''}
                                                                        onChange={(e) => updateShipmentField(s.id, 'date', e.target.value)}
                                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {(!temporaryTest?.extra_data?.shipments || temporaryTest?.extra_data?.shipments?.length === 0) && (
                                                        <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-bold text-slate-400 uppercase">
                                                            Nenhum faturamento registrado.
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <button 
                                                    onClick={handleAddShipment}
                                                    className="w-full py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                                                >
                                                    <Plus size={12} /> Adicionar Faturamento
                                                </button>
                                            </div>
                                        )}
                                        {temporaryTest?.extra_data?.material_enviado !== 'SIM' && (
                                            <div className="text-[9px] font-bold text-slate-400 italic text-center py-6">Aguardando envio de material</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* SEÇÕES DE LARGURA COMPLETA (Abaixo do Grid de 3 Colunas) */}

                    {/* CARD 5: FLUXO DE RASTREABILIDADE DE AUDITORIA */}
                    {temporaryTest && (() => {
                        const produced = temporaryTest?.produced_quantity || 0;
                        let unitCost = 0;
                        if (temporaryTest?.consumed_stock_id) {
                            const donorInventory = inventory.find(i => String(i.id) === String(temporaryTest.consumed_stock_id));
                            const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                            if (parentTest && parentTest.produced_quantity > 0) {
                                unitCost = (parentTest.op_cost || parentTest.gross_total_cost || 0) / parentTest.produced_quantity;
                            }
                        } else if (produced > 0) {
                            unitCost = (temporaryTest.op_cost || 0) / produced;
                        }

                        return (
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-4 shadow-sm">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"><Database size={16} /></div>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-800">Fluxo de Rastreabilidade (Auditoria de Estoque)</span>
                                    </div>
                                    {unitCost > 0 && (
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                                            Valor Unitário: R$ {unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {temporaryTest.unit || 'KG'}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                                    {/* 1. Produção Original */}
                                    <div className="flex flex-col gap-1 px-3 py-2 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-colors justify-between">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">
                                                {temporaryTest?.consumed_stock_id ? '(+) Reaproveitamento' : '(+) Produção Original'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end mt-2">
                                            <span className="text-xs font-black text-slate-800">{(temporaryTest?.produced_quantity || 0).toFixed(2)} {temporaryTest?.unit || 'KG'}</span>
                                            <span className="text-[9px] font-black text-slate-400">R$ {((temporaryTest?.produced_quantity || 0) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {(() => {
                                            const sourceInvItem = inventory?.find(i => i.id === temporaryTest?.consumed_stock_id);
                                            const sourceTest = tests?.find(t => t.id === sourceInvItem?.test_id);
                                            return sourceTest && (
                                                <span className="text-[8px] font-black text-brand-650 uppercase tracking-tighter italic mt-1 bg-brand-50/50 p-1 rounded border border-brand-100/50 w-full text-center">
                                                    ORIGEM: #{sourceTest.test_number || 'S/N'}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* 2. Saídas Faturadas */}
                                    <div className="flex flex-col gap-1 px-3 py-2 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-colors justify-between">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">(-) Saídas Faturadas (NFs)</span>
                                        </div>
                                        <div className="flex flex-col items-end mt-2">
                                            <span className="text-xs font-black text-rose-600">{(temporaryTest?.quantity_billed || 0).toFixed(2)} {temporaryTest?.unit || 'KG'}</span>
                                            <span className="text-[9px] font-black text-rose-500/80">R$ -{((temporaryTest?.quantity_billed || 0) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {(temporaryTest?.extra_data?.shipments || []).length > 0 ? (
                                            <div className="flex flex-col gap-1 mt-1 border-t border-slate-100 pt-1 w-full text-center">
                                                <span className="text-[7px] text-slate-400 font-bold uppercase truncate">NFs: {(temporaryTest.extra_data.shipments.map(s => s.nf).filter(Boolean).join(', '))}</span>
                                            </div>
                                        ) : (temporaryTest?.nf_number || temporaryTest?.extra_data?.nf_nota) && (
                                            <div className="mt-1 border-t border-slate-100 pt-1 w-full text-center">
                                                <span className="text-[8px] font-bold text-amber-600 uppercase italic">
                                                    NF: {temporaryTest.nf_number || temporaryTest.extra_data.nf_nota}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Consumo em outros testes */}
                                    <div className="flex flex-col gap-1 px-3 py-2 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-colors justify-between">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">(-) Consumo Outros Testes</span>
                                        </div>
                                        <div className="flex flex-col items-end mt-2">
                                            <span className="text-xs font-black text-amber-600">
                                                {(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const qty = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                    return qty.toFixed(2);
                                                })()} {temporaryTest?.unit || 'KG'}
                                            </span>
                                            <span className="text-[9px] font-black text-amber-600/80">
                                                R$ -{((() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    return tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                })() * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        {(() => {
                                            const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                            const consumers = tests?.filter(t => t.consumed_stock_id === invItem?.id);
                                            return consumers?.length > 0 && (
                                                <div className="flex flex-col gap-1 mt-1 border-t border-slate-100 pt-1 w-full text-center">
                                                    <span className="text-[7px] text-slate-450 font-bold uppercase truncate">
                                                        Destinos: {consumers.map(c => `#${c.test_number}`).join(', ')}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* 4. Descartes */}
                                    <div className="flex flex-col gap-1 px-3 py-2 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-colors justify-between">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">(-) Descartes de Saldo</span>
                                        </div>
                                        <div className="flex flex-col items-end mt-2">
                                            <span className="text-xs font-black text-rose-600">{(temporaryTest?.quantity_discarded || 0).toFixed(2)} {temporaryTest?.unit || 'KG'}</span>
                                            <span className="text-[9px] font-black text-rose-500/80">R$ -{((temporaryTest?.quantity_discarded || 0) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>

                                    {/* 5. Ajustes de Inventário */}
                                    <div className="flex flex-col gap-1 px-3 py-2 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-colors justify-between">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">
                                                {(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const adj = invItem?.inventory_adjustment || 0;
                                                    return adj >= 0 ? '(+) Ajuste Inventário' : '(-) Ajuste Inventário';
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end mt-2">
                                            <span className={`text-xs font-black ${(() => {
                                                const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                const adj = invItem?.inventory_adjustment || 0;
                                                return adj >= 0 ? (adj === 0 ? 'text-slate-400' : 'text-emerald-600') : 'text-rose-600';
                                            })()}`}>
                                                {(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    return (invItem?.inventory_adjustment || 0).toFixed(2);
                                                })()} {temporaryTest?.unit || 'KG'}
                                            </span>
                                            <span className={`text-[9px] font-black ${(() => {
                                                const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                const adj = invItem?.inventory_adjustment || 0;
                                                return adj >= 0 ? (adj === 0 ? 'text-slate-400' : 'text-emerald-600/80') : 'text-rose-500/80';
                                            })()}`}>
                                                R$ {(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const adj = invItem?.inventory_adjustment || 0;
                                                    return (adj * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Saldo Final Disponível */}
                                <div className="flex justify-between items-center px-6 py-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl mt-4">
                                    <span className="text-xs font-black text-brand-600 uppercase tracking-widest">(=) Saldo Final Disponível em Estoque</span>
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-black text-slate-800">
                                            {(() => {
                                                const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                const currentBalance = ((temporaryTest?.produced_quantity || 0) - (temporaryTest?.quantity_billed || 0) - (temporaryTest?.quantity_discarded || 0)) - totalConsumed + (invItem?.inventory_adjustment || 0);
                                                return currentBalance.toFixed(2);
                                            })()} {temporaryTest?.unit || 'KG'}
                                        </span>
                                        <span className="text-[10px] font-black text-emerald-600">
                                            R$ {(() => {
                                                const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                const currentBalance = ((temporaryTest?.produced_quantity || 0) - (temporaryTest?.quantity_billed || 0) - (temporaryTest?.quantity_discarded || 0)) - totalConsumed + (invItem?.inventory_adjustment || 0);
                                                return (Math.max(0, currentBalance) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* CARD 6: INFORMAÇÕES ADICIONAIS */}
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6 shadow-sm">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 ml-1 text-[10px] font-black text-slate-500 uppercase tracking-widest"><Info size={14} className="text-brand-500" /> Descrição Técnica</div>
                            <textarea
                                value={temporaryTest?.description || ''}
                                onChange={(e) => setTemporaryTest({ ...temporaryTest, description: e.target.value })}
                                className="w-full p-5 bg-white rounded-[24px] border border-slate-200 text-sm text-slate-700 leading-relaxed font-medium outline-none focus:ring-2 focus:ring-brand-500 min-h-[120px] resize-none shadow-inner"
                                placeholder="Descreva aqui os detalhes do teste..."
                            />
                        </div>
                    </div>

                    {/* RESUMO FINANCEIRO CONSOLIDADO */}
                    {(() => {
                        if (!temporaryTest) return null;
                        const linkedTaskCosts = tasks
                            .filter(t => t.parent_test_id === temporaryTest.id)
                            .reduce((acc, curr) => acc + (curr.trip_cost || 0) + (curr.travels || []).reduce((tAcc, tCurr) => tAcc + (tCurr.cost || 0), 0), 0);

                        if (linkedTaskCosts > 0 || (temporaryTest?.op_cost || 0) > 0) {
                            return (
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 block mb-4">Resumo Financeiro Consolidado</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 flex flex-col justify-between">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Investimento Produção</span>
                                                <span className="text-lg font-black text-slate-800">R$ {(temporaryTest?.op_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            
                                            {(() => {
                                                const produced = temporaryTest?.produced_quantity || 0;
                                                let uCost = 0;
                                                if (temporaryTest?.consumed_stock_id) {
                                                    const donorInventory = inventory.find(i => String(i.id) === String(temporaryTest.consumed_stock_id));
                                                    const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                                    if (parentTest && parentTest.produced_quantity > 0) {
                                                        uCost = (parentTest.op_cost || parentTest.gross_total_cost || 0) / parentTest.produced_quantity;
                                                    }
                                                } else if (produced > 0) {
                                                    uCost = (temporaryTest.op_cost || 0) / produced;
                                                }

                                                const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                const billed = temporaryTest?.quantity_billed || 0;
                                                const consumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                const adj = invItem?.inventory_adjustment || 0;
                                                const discarded = temporaryTest?.quantity_discarded || 0;
                                                const currentBal = produced - billed - consumed + adj - discarded;

                                                const hasMovements = billed > 0 || consumed > 0 || adj !== 0 || discarded > 0;

                                                if (hasMovements && uCost > 0) {
                                                    return (
                                                        <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
                                                            <div className="flex justify-between items-center text-[9px] font-bold">
                                                                <span className="text-slate-400 uppercase">Faturado:</span>
                                                                <span className="text-slate-600">R$ {(billed * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                                <span className="text-slate-400 uppercase">Reuso/Doação:</span>
                                                                <span className="text-amber-600">R$ {(consumed * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            {discarded > 0 && (
                                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                                    <span className="text-slate-400 uppercase">Descartado:</span>
                                                                    <span className="text-rose-600">R$ {(discarded * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                            )}
                                                            {adj !== 0 && (
                                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                                    <span className="text-slate-400 uppercase">Ajustes Invent.:</span>
                                                                    <span className={adj < 0 ? "text-rose-500" : "text-emerald-500"}>
                                                                        R$ {(adj * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center text-[10px] font-black pt-1">
                                                                <span className="text-brand-600 uppercase">Ativo em Estoque:</span>
                                                                <span className="text-brand-600 underline">R$ {(Math.max(0, currentBal) * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return <div className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Investimento Integral em Estoque</div>;
                                            })()}
                                        </div>
                                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Vistorias/Viagens</span>
                                            <span className="text-sm font-black text-indigo-600">R$ {linkedTaskCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="p-4 bg-slate-900 rounded-2xl shadow-lg border border-slate-800">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Investimento Total</span>
                                            <span className="text-sm font-black text-white">R$ {((temporaryTest?.op_cost || 0) + linkedTaskCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* RESUMOS E ANÁLISES NO FINAL DA PÁGINA (RODAPÉ) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {renderExecutiveSummary()}
                        {renderFinancialAnalysis()}
                    </div>
                </div>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4 shrink-0">
                    <button onClick={onClose} className="flex-1 py-4 bg-white text-slate-450 text-xs font-black rounded-2xl border border-slate-200 uppercase tracking-widest hover:bg-slate-50 transition-all">Sair</button>
                    <button
                        onClick={handleSaveDetails}
                        disabled={isSaving}
                        className="flex-[2] py-4 bg-slate-900 text-white text-xs font-black rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TestDetailsModal;

