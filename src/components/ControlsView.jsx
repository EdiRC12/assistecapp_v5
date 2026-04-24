import React, { useState, useEffect, useMemo } from 'react';
import {
    FlaskConical, History, Package, Upload, Plus, Trash2,
    ArrowRight, CheckCircle, Search, Info, AlertTriangle,
    FileSpreadsheet, ClipboardList, Database, Briefcase,
    RefreshCw, X, Eye, ChevronDown, Filter, Palette, Edit2, Edit3,
    Layers, Box, ChevronLeft, Coins, TrendingUp, MapPin, ChevronRight, Car,
    CheckSquare, Printer, Calendar, FileText, Brain, Sparkles, BarChart3, PieChart, Target,
    ArrowUpCircle, Tag, ArrowUpRight, DollarSign, ListChecks, Paperclip, CheckCircle2, Users
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import useIsMobile from '../hooks/useIsMobile';

// Sub-components
import ControlsTabs from './controls/ControlsTabs';
import ControlsActionBar from './controls/ControlsActionBar';
import TestsView from './controls/views/TestsView';
import InventoryView from './controls/views/InventoryView';
import InventoryCheckView from './controls/views/InventoryCheckView';
import CostsAuditView from './controls/views/CostsAuditView';
import InventoryLogView from './controls/views/InventoryLogView';
import NewRecordModal from './controls/modals/NewRecordModal';
import InventoryJustificationModal from './controls/modals/InventoryJustificationModal';
import InventoryDetailModal from './controls/modals/InventoryDetailModal';
import ReportModal from './controls/modals/ReportModal';
import TestDetailsModal from './controls/modals/TestDetailsModal';
import AutocompleteInput from './controls/AutocompleteInput';

// Dashboards
import EngineeringDashboard from './controls/dashboards/EngineeringDashboard';
import InventoryDashboard from './controls/dashboards/InventoryDashboard';

// Hooks & Utilities
import { useControlsData } from '../hooks/useControlsData';
import { MONTHS, handlePrintFullReport, handlePrintInventoryList, generateAIInsights } from '../utils/controlsReporting';

const ControlsView = ({
    currentUser,
    techTests,
    techFollowups,
    users,
    allClients,
    tasks = [],
    customCategories = [],
    onNewTask,
    onCreateTask,
    externalTestId,
    onClearExternalId,
    returnToView,
    setViewMode,
    setSuggestions,
    activePoliSection,
    setActivePoliSection,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    theme,
    testFlows,
    testStatusPresets,
    inventoryReasons,
    isMeetingView
}) => {
    const isMobile = useIsMobile();
    const categories = customCategories;
    const [activeTab, setActiveTab] = useState(null); // null = launcher
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [stockStatusFilter, setStockStatusFilter] = useState('ACTIVE');
    const [localViewMode, setLocalViewMode] = useState('LIST'); // 'LIST' or 'DASHBOARD' internal to Controls

    // Custom Hook for Data & Base Functions
    const {
        loading,
        setLoading,
        tests,
        setTests,
        inventory,
        setInventory,
        adjustmentLogs,
        setAdjustmentLogs,
        registeredClients,
        setRegisteredClients,
        hasMore,
        fetchData,
        handleExcelUpload,
        handleDelete
    } = useControlsData(currentUser, activeTab, selectedMonth, selectedYear, stockStatusFilter, tasks, testStatusPresets);

    const [isExternallyTriggered, setIsExternallyTriggered] = useState(false);

    // Migration modal state
    const [migratingItem, setMigratingItem] = useState(null);
    const [migrationCategory, setMigrationCategory] = useState('');
    const [migrationNote, setMigrationNote] = useState('');
    const [migrationSaving, setMigrationSaving] = useState(false);

    // --- Lógica de Abertura Externa ---
    useEffect(() => {
        if (externalTestId) {
            setActiveTab('tests');
        }
    }, [externalTestId]);

    useEffect(() => {
        if (externalTestId && activeTab === 'tests' && tests.length > 0) {
            const testToOpen = tests.find(t => t.id === externalTestId);
            if (testToOpen) {
                setTemporaryTest(testToOpen);
                setSelectedTest(testToOpen);
                setIsExternallyTriggered(true);
                if (onClearExternalId) onClearExternalId();
            }
        }
    }, [externalTestId, activeTab, tests]);

    // Lógica de Filtros por Aba (Padrões)
    useEffect(() => {
        if (!activeTab) return;
        if (activeTab === 'inventory') {
            setStockStatusFilter('ACTIVE');
        }
        if (activeTab === 'inventory') {
            setReportContext('INVENTORY');
        } else if (activeTab === 'inventory_check') {
            setReportContext('AUDIT');
        } else if (activeTab === 'tests') {
            setReportContext('TESTS');
        } else if (activeTab === 'costs') {
            setReportContext('AUDIT');
        } else if (activeTab === 'adjustment_logs') {
            setReportContext('ADJUSTMENTS');
        }
    }, [activeTab]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newItem, setNewItem] = useState({});



    const DEFAULT_TEST_PARAMS = {
        'OP': '',
        'VOLUMES': '',
        'PEDIDO': '',
        'ENTREGA': '',
        'PRODUTO': '',
        'OBJETIVO': ''
    };

    // Unified individual records states
    const [editingId, setEditingId] = useState(null);
    const [activeInventoryBin, setActiveInventoryBin] = useState('ALL');
    const [selectedTest, setSelectedTest] = useState(null);
    const [temporaryTest, setTemporaryTest] = useState(null); // Local editing state
    const [isSaving, setIsSaving] = useState(false);
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [showStockSelector, setShowStockSelector] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
    const [tempInventoryItem, setTempInventoryItem] = useState(null);
    const [inventoryHistory, setInventoryHistory] = useState([]); // Navigation stack for parallel view
    const [isInventorySessionActive, setIsInventorySessionActive] = useState(false);
    const [itemBeingAdjusted, setItemBeingAdjusted] = useState(null);
    const [pendingJustifications, setPendingJustifications] = useState(null); // null or []
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportContext, setReportContext] = useState('TESTS'); // 'TESTS', 'INVENTORY', 'AUDIT'
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Sincronizador de Estado do Modal (Garante que os dados apareçam ao abrir)
    useEffect(() => {
        if (selectedTest) {
            setTemporaryTest({ ...selectedTest });
        } else {
            setTemporaryTest(null);
        }
    }, [selectedTest]);

    // Mudar para LIST sempre que trocar de aba
    useEffect(() => {
        setLocalViewMode('LIST');
    }, [activeTab]);

    const onPrintReport = () => handlePrintFullReport({
        reportContext,
        selectedMonth,
        selectedYear,
        filteredReportData,
        reportTotals,
        aiAnalysis,
        tasks
    });

    const onPrintInventoryList = () => handlePrintInventoryList({
        filteredInventory: filteredReportData,
        reportTotals,
        activeInventoryBin
    });

    const onGenerateAI = async () => {
        setIsAnalyzing(true);
        const insight = await generateAIInsights({
            reportContext,
            filteredReportData,
            tests,
            tasks,
            inventory
        });
        setAiAnalysis(insight);
        setIsAnalyzing(false);
    };


    const filteredReportData = useMemo(() => {
        if (reportContext === 'TESTS') {
            return tests.filter(t => {
                const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
                const matchSearch = !searchTerm || t.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.title?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchStatus && matchSearch;
            });
        } else if (reportContext === 'INVENTORY') {
            return inventory.filter(item => {
                const binTarget = activeInventoryBin?.trim().toUpperCase();
                const itemBinValue = item.stock_bin?.trim().toUpperCase();

                const matchBin = activeInventoryBin === 'ALL' || itemBinValue === binTarget;
                const matchSearch = !searchTerm || item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.op?.toLowerCase().includes(searchTerm.toLowerCase());

                const matchStatus = stockStatusFilter === 'ALL' || item.status === stockStatusFilter;

                return matchBin && matchSearch && matchStatus;
            });
        } else if (reportContext === 'AUDIT') {
            const auditItems = [];
            const testIdsWithAuditItems = new Set();

            // 1. Add all tests that have costs, production OR logistic tasks
            tests.forEach(t => {
                const taskCosts = (tasks || [])
                    .filter(tk => tk.parent_test_id === t.id)
                    .reduce((acc, curr) => {
                        const tc = parseFloat(curr?.trip_cost || 0);
                        const tr = (curr?.travels || []).reduce((tAcc, tCurr) => tAcc + parseFloat(tCurr?.cost || 0), 0);
                        return acc + tc + tr;
                    }, 0);

                const hasCost = (parseFloat(t.op_cost) || 0) > 0 || (parseFloat(t.gross_total_cost) || 0) > 0;
                const hasProd = (parseFloat(t.produced_quantity) || 0) > 0;
                const hasLogistics = taskCosts > 0;

                if (hasCost || hasProd || hasLogistics) {
                    // CÁLCULO DE CUSTO AMORTIZADO (IGUAL AO DASHBOARD)
                    const invItem = inventory.find(i => String(i.test_id) === String(t.id)) ||
                                    inventory.find(i => i.name === `ITEM: ${t.title} ` && i.client_name === t.client_name);
                    const currentStock = invItem?.quantity || 0;
                    const activeReuses = tests.filter(other =>
                        String(other.consumed_stock_id) === String(invItem?.id) &&
                        !['CANCELADO', 'REPROVADO'].includes(other.status)
                    );
                    const totalConsumedByOthers = activeReuses.reduce((sum, curr) => sum + (curr.produced_quantity || 0), 0);
                    const produced = t.produced_quantity || 0;
                    const billed = t.quantity_billed || 0;

                    let unitCost = 0;
                    if (t.consumed_stock_id) {
                        const donorInventory = inventory.find(i => String(i.id) === String(t.consumed_stock_id));
                        const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                        if (parentTest && parentTest.produced_quantity > 0) {
                            unitCost = (parentTest.op_cost || parentTest.gross_total_cost || 0) / parentTest.produced_quantity;
                        }
                    } else if (produced > 0) {
                        unitCost = (t.op_cost || t.gross_total_cost || 0) / produced;
                    }

                    let amortizedCostValue = 0;
                    if (t.consumed_stock_id) {
                        amortizedCostValue = unitCost * produced;
                    } else if (totalConsumedByOthers > 0) {
                        amortizedCostValue = unitCost * (currentStock + billed);
                    } else {
                        amortizedCostValue = unitCost * produced;
                    }

                    auditItems.push({ 
                        ...t, 
                        type: 'TESTE',
                        task_costs: taskCosts,
                        amortized_cost: amortizedCostValue,
                        unit_cost_base: unitCost
                    });
                    testIdsWithAuditItems.add(String(t.id));
                }
            });

            // 2. Add inventory items that don't have a corresponding test (orphans or manual entries)
            inventory.forEach(i => {
                const hasValue = (parseFloat(i.production_cost) || 0) > 0;
                const isOrphan = !i.test_id || !testIdsWithAuditItems.has(String(i.test_id));

                if (hasValue && isOrphan) {
                    auditItems.push({
                        ...i,
                        type: 'ESTOQUE',
                        title: i.name || 'ITEM MANUAL',
                        client_name: i.client_name || 'CLIENTE NÃO IDENTIF.',
                        task_costs: 0,
                        amortized_cost: parseFloat(i.production_cost || 0)
                    });
                }
            });

            return auditItems.filter(item => {
                const nameToMatch = (item.client_name || item.name || '').toLowerCase();
                const titleToMatch = (item.title || '').toLowerCase();
                return !searchTerm || nameToMatch.includes(searchTerm.toLowerCase()) || titleToMatch.includes(searchTerm.toLowerCase());
            });
        } else if (reportContext === 'ADJUSTMENTS') {
            return (adjustmentLogs || []).filter(log => {
                const item = inventory.find(i => i.id === log.inventory_item_id);
                const itemName = item?.name || 'Item Removido';
                const searchStr = `${itemName} ${log.reason} ${log.test_reference || ''} ${log.user_id?.username || ''}`.toLowerCase();
                return !searchTerm || searchStr.includes(searchTerm.toLowerCase());
            });
        }
        return [];
    }, [tests, inventory, tasks, adjustmentLogs, statusFilter, searchTerm, activeInventoryBin, reportContext, stockStatusFilter]);

    // Helper to calculate totals outside useful for snapshots and reactive state
    const calculateSnapshotTotals = (data, context) => {
        if (context === 'INVENTORY') {
            const result = data.reduce((acc, i) => {
                const qty = parseFloat(i.quantity || 0);
                const isKg = (i.unit?.toUpperCase() || 'KG') === 'KG';
                const produced = parseFloat(i.qty_produced || qty || 1);
                const cost = parseFloat(i.production_cost || 0);
                
                acc.investment += cost;
                acc.totalProducedVolume += produced;

                if (i.status === 'ACTIVE' || i.status === 'AVAILABLE') {
                    acc.activeItems++;
                    if (isKg) acc.weightKg += qty;
                    else acc.unitsUn += qty;
                }

                const lossQty = (i.status === 'DISCARDED' && qty === 0 && produced > 0) ? produced - parseFloat(i.qty_billed || 0) : (i.status === 'DISCARDED' ? qty : 0);
                
                if (i.status === 'DISCARDED') {
                    acc.discardedLoss += (produced > 0 ? (lossQty / produced) : 1) * cost;
                    acc.discardedVolume += lossQty;
                }
                
                if (i.stock_bin) {
                    if (!acc.bins[i.stock_bin]) acc.bins[i.stock_bin] = { kg: 0, un: 0, items: 0 };
                    const displayQty = (qty === 0 && i.status === 'DISCARDED') ? lossQty : qty;
                    if (isKg) acc.bins[i.stock_bin].kg += displayQty;
                    else acc.bins[i.stock_bin].un += displayQty;
                    acc.bins[i.stock_bin].items++;
                }

                const statusLabel = i.status === 'ACTIVE' || i.status === 'AVAILABLE' ? 'Disponível' : 
                                   i.status === 'DISCARDED' ? 'Descartado' : 'Reservado';
                acc.statusCounts[statusLabel] = (acc.statusCounts[statusLabel] || 0) + 1;

                return acc;
            }, { 
                weightKg: 0, unitsUn: 0, investment: 0, totalProducedVolume: 0, 
                discardedVolume: 0, discardedLoss: 0, activeItems: 0, bins: {},
                statusCounts: {} 
            });

            result.efficiencyRate = Math.max(0, Math.min(100, ((result.totalProducedVolume - result.discardedVolume) / (result.totalProducedVolume || 1)) * 100));
            const totalStatus = Object.values(result.statusCounts).reduce((a, b) => a + b, 0);
            result.statusPercentages = Object.entries(result.statusCounts).map(([label, count]) => ({
                label,
                percentage: (count / (totalStatus || 1)) * 100
            }));

            return result;
        }

        if (context === 'ADJUSTMENTS') {
            const result = data.reduce((acc, log) => {
                const diff = parseFloat(log.difference || 0);
                if (diff < 0) acc.losses += Math.abs(diff);
                else acc.gains += diff;
                
                acc.totalAdjustments++;
                if (log.reason) {
                    acc.reasons[log.reason] = (acc.reasons[log.reason] || 0) + 1;
                }
                return acc;
            }, { losses: 0, gains: 0, totalAdjustments: 0, reasons: {}, investment: 0 }); // investment:0 for compatibility

            // Top Reason
            const topReason = Object.entries(result.reasons).sort((a,b) => b[1] - a[1])[0];
            result.mainReason = topReason ? topReason[0] : 'N/A';
            
            return result;
        }

        // --- OUTROS CONTEXTOS (TESTS/AUDIT) ---
        return data.reduce((acc, t) => {
            const isTest = t.type !== 'ESTOQUE';
            const taskCosts = isTest ? (tasks || [])
                .filter(tk => String(tk?.parent_test_id || '') === String(t.id))
                .reduce((tAcc, curr) => tAcc + parseFloat(curr?.trip_cost || 0) + (curr?.travels || []).reduce((trAcc, trCurr) => trAcc + parseFloat(trCurr?.cost || 0), 0), 0) : 0;

            const costValue = context === 'AUDIT' && t.amortized_cost !== undefined 
                ? t.amortized_cost 
                : (isTest ? (t.op_cost || t.gross_total_cost || 0) : (t.production_cost || 0));
            
            const prodQty = isTest ? (t.produced_quantity || 0) : (t.qty_produced || t.quantity || 0);
            const isKg = (t.unit?.toUpperCase() || 'KG') === 'KG';

            acc.investment += costValue + taskCosts;
            acc.logistics += taskCosts;
            acc.production += costValue;

            if (isKg) acc.weightKg += prodQty;
            else acc.unitsUn += prodQty;

            if (context === 'AUDIT' && t.consumed_stock_id) acc.reuseSavings += costValue;

            return acc;
        }, { investment: 0, weightKg: 0, unitsUn: 0, logistics: 0, production: 0, reuseSavings: 0, losses: 0 });
    };

    const reportTotals = useMemo(() => {
        if (reportContext === 'INVENTORY') {
            return calculateSnapshotTotals(inventory, 'INVENTORY');
        }

        const totals = calculateSnapshotTotals(filteredReportData, reportContext);

        if (reportContext === 'AUDIT') {
            totals.losses = inventory
                .filter(i => i.status === 'DISCARDED' || i.justification_reason === 'AVARIA/PERDA')
                .reduce((acc, i) => acc + (i.production_cost || 0), 0);

            totals.logistics = (tasks || [])
                .filter(tk => tk?.parent_test_id)
                .reduce((acc, curr) => {
                    const manualCost = parseFloat(curr?.trip_cost || 0);
                    const travelsArrayCost = (curr?.travels || []).reduce((trAcc, trCurr) => trAcc + parseFloat(trCurr?.cost || 0), 0);
                    return acc + manualCost + travelsArrayCost;
                }, 0);
        }

        return totals;
    }, [filteredReportData, tasks, reportContext, inventory]);


    const executeSaveSnapshot = async (forceContext = null, forceData = null, forceTotals = null) => {
        const context = forceContext || reportContext;
        const data = forceData || filteredReportData;
        const totals = forceTotals || reportTotals || calculateSnapshotTotals(data, context);

        if (!data || data.length === 0) {
            console.warn('[executeSaveSnapshot] Sem dados para arquivar em:', context);
            return;
        }

        setIsAnalyzing(true);
        try {
            const reportTitle = context === 'INVENTORY' ? 'Relatório de Ativos e Giro' :
                context === 'AUDIT' ? 'Relatório de Auditoria e Custos' :
                    'Relatório de Engenharia';

            const reportMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || 'Todos os Meses';
            const period = `${reportMonthLabel} ${selectedYear !== 'ALL' ? selectedYear : ''}`;

            const snapshotPayload = {
                type: context,
                title: reportTitle,
                period: period,
                totals: totals,
                ai_analysis: aiAnalysis || 'Snapshot automático gerado após finalização de inventário.',
                raw_data: data,
                user_id: currentUser.id,
                raw_data_count: data.length
            };

            const { error, data: insertedData } = await supabase.from('saved_reports').insert(snapshotPayload).select();

            if (error) {
                console.error('[executeSaveSnapshot] Supabase INSERT error:', error);
                throw error;
            }
            
            console.log('[executeSaveSnapshot] Sucesso!', insertedData);
            notifySuccess("Relatório Arquivado", "Conferência salva na Central de Relatórios.");
        } catch (error) {
            console.error("Erro ao salvar snapshot:", error);
            notifyError("Erro ao arquivar", error.message || "Falha ao gravar snapshot.");
            // Alerta crítico para o usuário ver na tela
            alert("Atenção: O inventário foi processado mas o Snapshot falhou: " + (error.message || "Erro desconhecido"));
        } finally {
            setIsAnalyzing(false);
        }
    };


    const handleSaveSnapshot = async () => {
        if (!window.confirm("Deseja arquivar este relatório no histórico? Ele poderá ser consultado posteriormente na aba Relatórios > Controles.")) return;
        await executeSaveSnapshot();
    };

    const handleSaveInventory = async (item, newVal) => {
        // Agora o salvamento direto na lista de conferência atualiza apenas o SALDO FÍSICO e marca como conferido.
        // O ajuste teórico (inventory_adjustment) será calculado e salvo APENAS no modal de Finalização.
        const updatePayload = {
            quantity: newVal,
            last_inventory_at: new Date().toISOString(),
            is_checked: true // MARCA COMO CONFERIDO AUTOMATICAMENTE AO AJUSTAR
        };

        const { error } = await supabase.from('ee_inventory').update(updatePayload).eq('id', item.id);

        if (!error) {
            setInventory(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                quantity: newVal, 
                last_inventory_at: new Date().toISOString(),
                is_checked: true
            } : i));

            // LOG DE AJUSTE MANUAL
            const difference = newVal - (item.quantity || 0);
            if (Math.abs(difference) > 0.001) {
                await supabase.from('inventory_adjustments_log').insert([{
                    inventory_item_id: item.id,
                    prev_qty: item.quantity,
                    new_qty: newVal,
                    difference: difference,
                    reason: 'Ajuste Manual (Conferência)',
                    user_id: currentUser?.id,
                    created_at: new Date().toISOString()
                }]);
            }

            notifySuccess("Contagem Registrada", `Item ${item.name} atualizado para ${newVal} ${item.unit || 'KG'}`);
        } else {
            console.error('[handleSaveInventory]', error);
            notifyError("Erro ao salvar contagem", error.message);
        }
    };

    const handleJustifyInventory = async (justifications) => {
        setLoading(true);
        try {
            const logs = [];
            const timestamp = new Date().toISOString();

            // Processar cada justificativa de forma rastreável
            if (justifications && Object.keys(justifications).length > 0) {
                for (const itemId in justifications) {
                    const { reason, difference, prevQty, newQty, related_test_id, test_reference } = justifications[itemId];
                    const item = inventory.find(i => i.id === itemId);
                    
                    if (!item) continue;

                    // CÁLCULO DE RASTREABILIDADE TOTAL
                    const currentCumulativeAdj = parseFloat(item.inventory_adjustment || 0);
                    const finalCumulativeAdj = parseFloat((currentCumulativeAdj + difference).toFixed(2));

                    console.log(`[InventoryUpdate] Item: ${item.name}, PrevAdj: ${currentCumulativeAdj}, Diff: ${difference}, FinalAdj: ${finalCumulativeAdj}`);

                    // ATUALIZAÇÃO INDIVIDUAL PARA FILTRAR ERROS
                    const { error: updateError } = await supabase.from('ee_inventory').update({
                        quantity: newQty,
                        last_inventory_at: timestamp,
                        inventory_adjustment: finalCumulativeAdj,
                        justification_reason: reason,
                        is_checked: true,
                        justified_at: timestamp
                    }).eq('id', itemId);

                    if (updateError) {
                        console.error(`[handleJustifyInventory] Erro ao atualizar item ${item.name}:`, updateError);
                        notifyError("Erro no Banco de Dados", `Não foi possível atualizar o item "${item.name}": ${updateError.message}. Verifique se a coluna 'inventory_adjustment' foi criada.`);
                        setLoading(false);
                        return; // INTERROMPE para evitar snapshots inconsistentes
                    }

                    logs.push({
                        inventory_item_id: itemId,
                        prev_qty: prevQty,
                        new_qty: newQty,
                        difference: difference,
                        reason: reason,
                        user_id: currentUser?.id,
                        created_at: timestamp,
                        related_test_id,
                        test_reference
                    });
                }

                // Salvar logs se as atualizações de itens deram certo
                if (logs.length > 0) {
                    const { error: logError } = await supabase.from('inventory_adjustments_log').insert(logs);
                    if (logError) {
                        console.error('[handleJustifyInventory] Error saving logs:', logError);
                        notifyError("Erro ao Salvar Logs", logError.message);
                    }
                }
            }
            
            // --- GERAÇÃO DO SNAPSHOT (CONFORMIDADE OU AJUSTE) ---
            const finalInventorySnapshot = inventory.map(item => {
                const just = (justifications && justifications[item.id]) ? justifications[item.id] : null;
                if (just) {
                    const currentCumulativeAdj = parseFloat(item.inventory_adjustment || 0);
                    return { 
                        ...item, 
                        quantity: just.newQty, 
                        inventory_adjustment: parseFloat((currentCumulativeAdj + just.difference).toFixed(2)),
                        justification_reason: just.reason,
                        is_checked: true,
                        justified_at: timestamp
                    };
                }
                return { ...item, is_checked: true };
            });

            const finalTotals = calculateSnapshotTotals(finalInventorySnapshot, 'INVENTORY');
            
            // Salvar snapshot oficial
            await executeSaveSnapshot('INVENTORY', finalInventorySnapshot, finalTotals);
            
            setPendingJustifications(null);
            setIsInventorySessionActive(false);
            
            // Recarregar dados para garantir que a memória foi sincronizada
            await fetchData();
            
            notifySuccess("Inventário Finalizado", (justifications && Object.keys(justifications).length > 0)
                ? "Divergências registradas com sucesso."
                : "Conferência finalizada em total conformidade.");
        } catch (error) {
            console.error('[handleJustifyInventory] Critical Error:', error);
            notifyError("Erro Crítico", "Ocorreu uma falha inesperada ao processar o inventário.");
        } finally {
            setLoading(false);
        }
    };


    const handleCloseModal = () => {
        setSelectedTest(null);
        setTemporaryTest(null);
        if (isExternallyTriggered) {
            if (onTestOpenStatusChange) onTestOpenStatusChange(false);
            setIsExternallyTriggered(false);
        }
    };

    const clientSuggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        return allClients
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(c => c.name);
    }, [searchTerm, allClients]);

    const isClientRegistered = (name) => {
        return allClients.some(c => c.name.toLowerCase() === name?.toLowerCase());
    };

    const handleRegisterClient = async (name) => {
        if (!name) return;
        setLoading(true);
        try {
            // Tentativa 1: Cadastro com Vínculo de Usuário (Padrão V6)
            let { error } = await supabase.from('clients').insert([{
                name,
                user_id: currentUser?.id
            }]);

            // Tratamento Resiliente: Se falhar por coluna inexistente (ex: status), tenta apenas o nome
            if (error && (error.code === '42703' || error.status === 400)) {
                console.warn('[handleRegisterClient] Falha no insert estendido, tentando apenas nome...');
                const { error: retryError } = await supabase.from('clients').insert([{ name }]);
                error = retryError;
            }

            if (error) throw error;

            // setRegisteredClients(prev => [...prev, { name }]);
            notifySuccess('Sucesso!', 'Cliente registrado com sucesso!');
        } catch (error) {
            console.error('Error registering client:', error);
            notifyError('Erro ao registrar', error.message || 'Falha ao oficializar cliente');
        } finally {
            setLoading(false);
        }
    };

    const convertRowToTask = async (row, itemInfo, type = 'TEST') => {
        const title = row.Titulo || row.title || row.Assunto || itemInfo.title;
        const client = row.Cliente || row.client || itemInfo.client_name;

        // Injetar custo de produção na descrição de forma destacada (se for teste)
        const productionCost = itemInfo?.production_cost || 0;
        let costHeader = '';
        if (type === 'TEST' && productionCost > 0) {
            costHeader = `\n\n-- - INVESTIMENTO DO TESTE-- -\n💰 CUSTO DE PRODUÇÃO: R$ ${productionCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} \n-----------------------------\n\n`;
        }

        const desc = costHeader + Object.entries(row)
            .filter(([k]) => k !== 'title' && k !== 'client_name' && k !== 'id' && k !== 'created_at' && k !== 'user_id')
            .map(([k, v]) => `${k.toUpperCase()}: ${v} `)
            .join('\n');

        if (onNewTask) {
            const taskPayload = {
                client,
                title,
                description: desc,
                status: 'TO_START',
                category: 'DEVELOPMENT',
                production_cost: productionCost,
            };

            if (type === 'TEST') {
                taskPayload.parent_test_id = itemInfo.id;
            }

            onNewTask(client, taskPayload);
            notifySuccess('Processo Iniciado', `Tarefa de teste criada para ${client}!`);
        }
    };


    const handleSaveNewRecord = async (e) => {
        if (e) e.preventDefault();
        console.log('[handleSaveNewRecord] iniciado, activeTab:', activeTab, 'newItem:', newItem);
        if (!currentUser?.id) {
            console.error('[handleSaveNewRecord] currentUser.id indefinido');
            alert('Erro de Sessão: Usuário não identificado. Por favor, faça login novamente.');
            setIsSaving(false);
            return;
        }

        try {
            const table = activeTab === 'tests' ? 'tech_tests' : 'ee_inventory';

            // Limpeza extensiva do payload: remove TODOS os campos que não pertencem à tabela alvo do Supabase
            // Campos como 'rnc_records', 'total_value', 'created_at', etc., causam erro de "column does not exist"
            const {
                id: idToRemove,
                created_at,
                updated_at,
                rnc_records,
                total_value,
                test_number,
                customer_name, // Às vezes presente no join mas não na tabela
                ...cleanPayload
            } = newItem;

            const payload = { ...cleanPayload, user_id: currentUser.id };

            if (activeTab === 'tests') {
                payload.status = payload.status || 'AGUARDANDO';
                payload.status_color = payload.status_color || '#94a3b8';
            }

            let result;
            const recordId = newItem.id;
            
            if (recordId) {
                console.log('[handleSaveNewRecord] Tentando UPDATE em', table, 'ID:', recordId);
                result = await supabase.from(table).update(payload).eq('id', recordId);
            } else {
                console.log('[handleSaveNewRecord] Tentando INSERT em', table);
                
                // Geração automática de número para novos testes
                if (table === 'tech_tests') {
                    const nextNum = (tests.length + 1).toString().padStart(3, '0');
                    payload.test_number = `T-${nextNum}`;
                    console.log('[handleSaveNewRecord] Gerado número de teste:', payload.test_number);
                }
                
                result = await supabase.from(table).insert(payload).select();
            }

            if (result.error) {
                console.error(`Erro Supabase (${table}):`, result.error);
                alert(`Erro Banco de Dados (${table}): ` + result.error.message);
                throw result.error;
            }

            console.log('[handleSaveNewRecord] Sucesso no banco!');
            setShowAddForm(false);
            setNewItem({});
            fetchData();

            // Sincronismo Automático se for um Teste com Quantidade
            if (table === 'tech_tests' && (payload.produced_quantity > 0)) {
                // Para INSERT, o ID está em result.data[0].id
                const recordIdToSync = recordId || result.data?.[0]?.id;
                console.log('[AutoSync] Disparando sincronismo para ID:', recordIdToSync);
                if (recordIdToSync) {
                    await syncTestToInventory({ id: recordIdToSync });
                }
            }
            // Sincronismo de Estoque p/ Reaproveitamento (Dedução no Doador)
            if (table === 'tech_tests' && payload.consumed_stock_id) {
                const { data: donor } = await supabase.from('ee_inventory').select('quantity').eq('id', payload.consumed_stock_id).maybeSingle();
                if (donor) {
                    const newQty = Math.max(0, parseFloat((donor.quantity - (payload.produced_quantity || 0)).toFixed(2)));
                    await supabase.from('ee_inventory').update({ quantity: newQty }).eq('id', payload.consumed_stock_id);
                    console.log('[AutoSync] Estoque doador deduzido:', payload.consumed_stock_id, 'Nova Qtd:', newQty);
                }
            }

            if (notifySuccess) notifySuccess('Sucesso!', 'Registro salvo com sucesso!');
            else alert('Sucesso! Registro salvo.');
        } catch (error) {
            console.error('[handleSaveNewRecord] CATCH:', error);
            const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
            alert('Falha crítica ao salvar: ' + errorMsg);
            if (notifyError) notifyError('Erro ao salvar', errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateStatus = async (id, field, value, extraFields = {}) => {
        // Whitelist para tech_tests
        const techTestsColumns = [
            'user_id', 'client_name', 'title', 'description', 'status', 'status_color',
            'extra_data', 'metadata', 'converted_task_id', 'produced_quantity',
            'quantity_billed', 'op_cost', 'unit_cost', 'gross_total_cost', 'unit',
            'consumed_stock_id', 'test_order', 'op_number', 'product_name',
            'nf_number', 'delivery_date', 'situation', 'flow_stage', 'stock_destination',
            'volumes'
        ];

        const updatePayload = {};
        const rawPayload = { [field]: value, ...extraFields };

        techTestsColumns.forEach(col => {
            if (rawPayload[col] !== undefined) {
                updatePayload[col] = rawPayload[col];
            }
        });
        updatePayload.updated_at = new Date().toISOString();

        // Optimistic update
        if (activeTab === 'tests') {
            setTests(prev => prev.map(t => t.id === id ? { ...t, ...rawPayload } : t));
        }

        // Se for o selectedTest, atualizar também
        if (selectedTest?.id === id) {
            setSelectedTest(prev => ({ ...prev, ...rawPayload }));
            setTemporaryTest(prev => ({ ...prev, ...rawPayload }));
        }

        let { error } = await supabase.from('tech_tests').update(updatePayload).eq('id', id);

        // Fallback Resiliente para tech_tests (Status/Update rápido)
        if (error && (error.code === '42703' || error.status === 400)) {
            const basicColumns = ['user_id', 'client_name', 'title', 'description', 'status', 'status_color'];
            const basicPayload = {};
            basicColumns.forEach(c => { if (updatePayload[c] !== undefined) basicPayload[c] = updatePayload[c]; });
            const { error: retryError } = await supabase.from('tech_tests').update(basicPayload).eq('id', id);
            error = retryError;
        }

        if (error) {
            notifyError('Erro na atualização', error.message);
        } else {
            // Sincronismo Automático de Estoque em mudanças de status/quantidade
            if (rawPayload.produced_quantity !== undefined || field === 'status') {
                const updatedTest = { id, ...rawPayload };
                await syncTestToInventory(updatedTest);
            }
        }
    };

    // --- SINCRONIZADOR CENTRAL DE ESTOQUE ---
    const syncTestToInventory = async (testData) => {
        if (!testData || !testData.id) return;

        try {
            // Busca dados completos do teste para garantir integridade
            const { data: fullTest } = await supabase.from('tech_tests').select('*').eq('id', testData.id).maybeSingle();
            if (!fullTest) return;

            const qtyProduced = fullTest.produced_quantity || 0;
            const qtyBilled = fullTest.quantity_billed || 0;

            if (qtyProduced <= 0) {
                // Se não tem produção, garante que não tem estoque (limpeza)
                await supabase.from('ee_inventory').delete().eq('test_id', fullTest.id);
                return;
            }

            // Busca estoque atual
            const { data: existingStock } = await supabase.from('ee_inventory').select('*').eq('test_id', fullTest.id).maybeSingle();

            // Cálculo de Saldo (Considerando uso por terceiros)
            const totalConsumedByOthers = tests
                .filter(t => String(t.consumed_stock_id) === String(existingStock?.id))
                .reduce((sum, t) => sum + (t.produced_quantity || 0), 0);

            const calcBalance = (qtyProduced - qtyBilled) - totalConsumedByOthers;
            const adjustment = existingStock?.inventory_adjustment || 0;
            const finalBalance = parseFloat((calcBalance + adjustment).toFixed(2));

            // Determinação do Depósito
            const targetBin = fullTest.stock_destination || 'ESTOQUE 0';

            if (finalBalance > 0 || (existingStock && existingStock.status === 'DISCARDED')) {
                const unitCost = qtyProduced > 0 ? (fullTest.op_cost || 0) / qtyProduced : 0;
                const assetValue = parseFloat((unitCost * finalBalance).toFixed(2));

                const stockPayload = {
                    user_id: currentUser.id,
                    name: `ITEM: ${fullTest.title} `,
                    description: `Saldo gerado via teste de engenharia.`,
                    quantity: fullTest.stock_destination === 'DISCARDED' ? 0 : finalBalance,
                    unit: fullTest.unit || 'KG',
                    location: 'Depósito Engenharia',
                    test_id: fullTest.id,
                    stock_bin: targetBin,
                    client_name: fullTest.client_name,
                    op: fullTest.extra_data?.OP || '',
                    pedido: fullTest.extra_data?.PEDIDO || '',
                    qty_produced: qtyProduced,
                    qty_billed: qtyBilled,
                    volumes: fullTest.volumes || 0,
                    production_cost: assetValue,
                    status: (fullTest.stock_destination === 'DISCARDED' || (existingStock?.status === 'DISCARDED' && finalBalance <= 0)) ? 'DISCARDED' : 'ACTIVE',
                    updated_at: new Date().toISOString()
                };

                // Whitelist e Fallback Resiliente
                const coreColumns = ['user_id', 'name', 'description', 'quantity', 'unit', 'location', 'stock_bin', 'test_id', 'client_name'];
                const corePayload = {};
                coreColumns.forEach(c => { if (stockPayload[c] !== undefined) corePayload[c] = stockPayload[c]; });

                if (existingStock) {
                    let { error: upsertError } = await supabase.from('ee_inventory').update(stockPayload).eq('id', existingStock.id);
                    if (upsertError && (upsertError.code === '42703' || upsertError.status === 400)) {
                        await supabase.from('ee_inventory').update(corePayload).eq('id', existingStock.id);
                    }
                } else {
                    let { error: upsertError } = await supabase.from('ee_inventory').insert(stockPayload);
                    if (upsertError && (upsertError.code === '42703' || upsertError.status === 400)) {
                        await supabase.from('ee_inventory').insert(corePayload);
                    }
                }
            } else {
                await supabase.from('ee_inventory').delete().eq('test_id', fullTest.id);
            }

            // Recarrega dados após sincronismo silencioso
            fetchData();
        } catch (err) {
            console.error('[syncTestToInventory] Erro no sincronismo automático:', err);
        }
    };

    const handleSaveDetails = async () => {
        if (!selectedTest) return;
        setIsSaving(true);

        try {
            // --- VALIDAÇÃO DE INTEGRIDADE ---
            if (temporaryTest.quantity_billed > temporaryTest.produced_quantity) {
                notifyError('Erro de Integridade', `A Quantidade Faturada(${temporaryTest.quantity_billed}) não pode ser maior que a Produzida(${temporaryTest.produced_quantity}).`);
                setIsSaving(false);
                return;
            }

            const { id, ...rawPayload } = temporaryTest;

            // --- SANITIZAÇÃO ESTRITA (Whitelist de colunas do banco) ---
            const techTestsColumns = [
                'user_id', 'client_name', 'title', 'description', 'status', 'status_color',
                'extra_data', 'metadata', 'converted_task_id', 'produced_quantity',
                'quantity_billed', 'op_cost', 'unit_cost', 'gross_total_cost', 'unit',
                'consumed_stock_id', 'test_order', 'op_number', 'product_name',
                'nf_number', 'delivery_date', 'situation', 'flow_stage', 'stock_destination',
                'volumes'
            ];

            const updatePayload = {};
            techTestsColumns.forEach(col => {
                if (rawPayload[col] !== undefined) {
                    updatePayload[col] = rawPayload[col];
                }
            });
            updatePayload.updated_at = new Date().toISOString();

            let { error: updateError } = await supabase.from('tech_tests').update(updatePayload).eq('id', id);

            // Tratamento resiliente: se der erro 400 (provavelmente coluna quantity_billed inexistente)
            // Fallback Resiliente para tech_tests (Salvar Detalhes)
            if (updateError && (updateError.code === '42703' || updateError.status === 400)) {
                console.warn('[handleSaveDetails] Colunas de integração faltantes no tech_tests. Tentando salvar o básico...');
                const basicColumns = ['user_id', 'client_name', 'title', 'description', 'status', 'status_color'];
                const basicPayload = {};
                basicColumns.forEach(c => { if (updatePayload[c] !== undefined) basicPayload[c] = updatePayload[c]; });

                const { error: retryError } = await supabase.from('tech_tests').update(basicPayload).eq('id', id);
                updateError = retryError;

                if (!updateError) {
                    notifyWarning('Aviso: Migração Pendente', 'Os dados básicos foram salvos, mas os campos novos exigem a execução do script SQL MIGRATION_TECH_TESTS_COLUMNS.sql.');
                }
            }

            if (updateError) throw updateError;

            // --- Lógica de Reaproveitamento de Estoque (Transição entre Doadores) ---
            const oldDonorId = selectedTest.consumed_stock_id;
            const newDonorId = updatePayload.consumed_stock_id;

            if (oldDonorId !== newDonorId) {
                if (oldDonorId) {
                    const { data: oldDonor } = await supabase.from('ee_inventory').select('quantity').eq('id', oldDonorId).maybeSingle();
                    if (oldDonor) {
                        const restoredQty = parseFloat((oldDonor.quantity + (selectedTest.produced_quantity || 0)).toFixed(2));
                        await supabase.from('ee_inventory').update({ quantity: restoredQty }).eq('id', oldDonorId);
                    }
                }
                if (newDonorId) {
                    const { data: newDonor } = await supabase.from('ee_inventory').select('quantity').eq('id', newDonorId).maybeSingle();
                    if (newDonor) {
                        const deductedQty = Math.max(0, parseFloat((newDonor.quantity - (updatePayload.produced_quantity || 0)).toFixed(2)));
                        await supabase.from('ee_inventory').update({ quantity: deductedQty }).eq('id', newDonorId);
                    }
                }
            } else if (newDonorId) {
                const diff = (updatePayload.produced_quantity || 0) - (selectedTest.produced_quantity || 0);
                if (diff !== 0) {
                    const { data: currentDonor } = await supabase.from('ee_inventory').select('quantity').eq('id', newDonorId).maybeSingle();
                    if (currentDonor) {
                        const newQty = Math.max(0, parseFloat((currentDonor.quantity - diff).toFixed(2)));
                        await supabase.from('ee_inventory').update({ quantity: newQty }).eq('id', newDonorId);
                    }
                }
            }

            // --- Lógica de Sincronização de Estoque Inteligente ---
            await syncTestToInventory({ id, ...updatePayload });

            setTests(prev => prev.map(t => t.id === id ? { ...t, ...updatePayload } : t));
            setSelectedTest(temporaryTest);
            notifySuccess('Sucesso!', 'Alterações salvas e estoque atualizado!');
            fetchData();
        } catch (error) {
            console.error('Erro ao salvar detalhes:', error);
            notifyError('Erro ao salvar', error.message || error);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="bg-[#f8fafc] h-full flex flex-col overflow-hidden relative">
            {/* Main Header */}
            <header className={`bg-white border-b border-slate-200 ${isMobile ? 'px-3 py-2' : 'px-6 py-4'} flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-2 md:gap-4">
                    <div className={`bg-indigo-600 ${isMobile ? 'p-1.5' : 'p-2.5'} rounded-xl shadow-lg shadow-indigo-100`}>
                        <FlaskConical className={`text-white ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
                    </div>
                    <div>
                        <h1 className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-slate-900 tracking-tight`}>Controles Técnicos</h1>
                        {!isMobile && <p className="text-sm text-slate-500 font-medium">Gestão de Testes, Ativos e Visitação</p>}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    {activeTab && (
                        <button
                            onClick={() => setActiveTab(null)}
                            className={`${isMobile ? 'px-2 py-1.5' : 'px-4 py-2'} bg-white text-slate-600 text-[9px] md:text-[10px] font-black rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 md:gap-2 uppercase tracking-widest shadow-sm active:scale-95`}
                        >
                            <ChevronLeft size={isMobile ? 12 : 14} /> {isMobile ? "Voltar" : "Voltar ao Menu"}
                        </button>
                    )}
                    <button
                        onClick={() => fetchData()}
                        disabled={loading}
                        className={`${isMobile ? 'p-1.5' : 'p-2.5'} text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200`}
                        title="Atualizar dados"
                    >
                        <RefreshCw className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onNewTask ? () => onNewTask('Geral', { title: 'Nova Tarefa' }) : undefined}
                        className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm font-semibold text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Acesso Rápido Kanban
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className={`flex-1 flex flex-col ${!activeTab ? 'overflow-auto' : 'overflow-hidden'} transition-all duration-300 ${!activeTab ? 'bg-slate-50/50' : (isMeetingView ? 'p-1' : 'bg-white')}`}>
                {!activeTab ? (
                    /* --- LAUNCHER --- */
                    <div className="max-w-7xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-12">
                            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Painel de Comandos</h2>
                            <p className="text-slate-500 font-medium">Selecione um módulo operacional para iniciar</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { id: 'tests', label: 'Testes Técnicos', desc: 'Sincronização de testes campo e laboratório.', icon: FlaskConical, color: 'from-rose-500 to-rose-600' },
                                { id: 'inventory', label: 'Gestão de Ativos', desc: 'Controle de sobras e patrimônio gerido.', icon: Box, color: 'from-emerald-500 to-emerald-600' },
                                { id: 'inventory_check', label: 'Inventário Físico', desc: 'Conferência de depósitos e auditoria física.', icon: CheckSquare, color: 'from-cyan-500 to-cyan-600' },
                                { id: 'costs', label: 'Audit. de Custos', desc: 'Análise de ROI e investimento circular.', icon: TrendingUp, color: 'from-slate-700 to-slate-900' }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setActiveTab(m.id)}
                                    className="group bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 hover:border-indigo-200 hover:shadow-indigo-100 hover:-translate-y-1 transition-all text-left flex flex-col gap-6 relative overflow-hidden"
                                >
                                    <div className={`w-16 h-16 bg-gradient-to-br ${m.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                        <m.icon size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">{m.label}</h3>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{m.desc}</p>
                                    </div>
                                    <div className="mt-4 flex items-center text-indigo-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                        Explorar módulo <ArrowRight className="ml-2 w-4 h-4" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden print:overflow-visible">
                        <ControlsTabs
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                        />

                        <ControlsActionBar
                            activeTab={activeTab}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            selectedMonth={selectedMonth}
                            setSelectedMonth={setSelectedMonth}
                            selectedYear={selectedYear}
                            setSelectedYear={setSelectedYear}
                            stockStatusFilter={stockStatusFilter}
                            setStockStatusFilter={setStockStatusFilter}
                            testStatusPresets={testStatusPresets}
                            handleExcelUpload={async (e) => {
                                try {
                                    const count = await handleExcelUpload(e);
                                    notifySuccess('Sucesso!', `${count} registros importados!`);
                                } catch (err) {
                                    notifyError('Erro ao importar', err.message);
                                }
                            }}
                            setShowAddForm={setShowAddForm}
                            setShowReportModal={setShowReportModal}
                            setNewItem={setNewItem}
                            setReportContext={setReportContext}
                            setAiAnalysis={setAiAnalysis}
                            MONTHS={MONTHS}
                            DEFAULT_TEST_PARAMS={DEFAULT_TEST_PARAMS}
                            reportTotals={reportTotals}
                            activeInventoryBin={activeInventoryBin}
                            setActiveInventoryBin={setActiveInventoryBin}
                            isInventorySessionActive={isInventorySessionActive}
                            setIsInventorySessionActive={setIsInventorySessionActive}
                            setPendingJustifications={setPendingJustifications}
                            filteredReportData={filteredReportData}
                            inventory={inventory}
                            viewMode={localViewMode}
                            setViewMode={setLocalViewMode}
                            setActiveSection={setActivePoliSection}
                        />

                        <div className="flex-1 overflow-hidden print:overflow-visible flex flex-col px-6 py-6 bg-slate-50/30 min-h-0">
                            {activeTab === 'tests' && (
                                localViewMode === 'LIST' ? (
                                    <TestsView
                                        tests={tests}
                                        tasks={tasks}
                                        searchTerm={searchTerm}
                                        statusFilter={statusFilter}
                                        onEditTest={(test) => { setTemporaryTest({ ...test }); setSelectedTest(test); }}
                                        onUpdateStatus={handleUpdateStatus}
                                        onDeleteTest={(id) => handleDelete('tech_tests', id)}
                                        onConvertToTask={(row, info) => {
                                            const clientExists = allClients.some(c => 
                                                c.name?.trim().toLowerCase() === row.client_name?.trim().toLowerCase()
                                            );
                                            if (!clientExists) {
                                                const proceed = window.confirm(`⚠️ ATENÇÃO: O cliente "${row.client_name}" não foi encontrado no seu cadastro oficial.\n\nA tarefa será criada, mas você precisará selecionar um cliente válido ou cadastrá-lo depois.\n\nDeseja prosseguir assim mesmo?`);
                                                if (!proceed) return;
                                            }
                                            const testNum = row.test_number || 'T-NOVO';
                                            const sanitizedTaskData = {
                                                category: 'DEVELOPMENT',
                                                title: `[${testNum}] ${row.client_name || 'CLIENTE EXCLUÍDO'}`,
                                                description: `Tarefa gerada a partir da migração do Teste de Engenharia ${testNum}.\n\n` + (row.description || ''),
                                                client: row.client_name,
                                                status: 'TO_START',
                                                priority: 'MEDIUM',
                                                op: row.op_number || '',
                                                pedido: row.test_order || '', 
                                                item: row.product_name || '',
                                                parent_test_id: row.id,
                                                parent_test_number: row.test_number
                                            };
                                            onNewTask(row.client_name, sanitizedTaskData);
                                        }}
                                        testStatusPresets={testStatusPresets}
                                        testFlows={testFlows}
                                        hasMore={hasMore}
                                        onLoadMore={() => fetchData(true)}
                                    />
                                ) : (
                                    <EngineeringDashboard
                                        tests={tests}
                                        tasks={tasks}
                                        setSuggestions={setSuggestions}
                                        setViewMode={setLocalViewMode}
                                        setActiveSection={setActivePoliSection}
                                    />
                                )
                            )}

                            {activeTab === 'inventory' && (
                                localViewMode === 'LIST' ? (
                                    <InventoryView
                                        inventory={inventory}
                                        searchTerm={searchTerm}
                                        activeInventoryBin={activeInventoryBin}
                                        setActiveInventoryBin={setActiveInventoryBin}
                                        stockStatusFilter={stockStatusFilter}
                                        setStockStatusFilter={setStockStatusFilter}
                                        handleDelete={handleDelete}
                                        setSelectedInventoryItem={setSelectedInventoryItem}
                                        setTempInventoryItem={setTempInventoryItem}
                                        setReportContext={setReportContext}
                                        setShowReportModal={setShowReportModal}
                                        setAiAnalysis={setAiAnalysis}
                                        onPrint={onPrintInventoryList}
                                        hasMore={hasMore}
                                        onLoadMore={() => fetchData(true)}
                                    />
                                ) : (
                                    <InventoryDashboard
                                        inventory={inventory}
                                        setSuggestions={setSuggestions}
                                        setViewMode={setLocalViewMode}
                                        setActiveSection={setActivePoliSection}
                                    />
                                )
                            )}

                            {activeTab === 'costs' && (
                                <CostsAuditView
                                    tests={tests}
                                    tasks={tasks}
                                    inventory={inventory}
                                    handleDelete={handleDelete}
                                    filteredReportData={filteredReportData}
                                    reportTotals={reportTotals}
                                    onTestOpenClick={setSelectedTest}
                                    setReportContext={setReportContext}
                                    setShowReportModal={setShowReportModal}
                                    setAiAnalysis={setAiAnalysis}
                                    hasMore={hasMore}
                                    onLoadMore={() => fetchData(true)}
                                    isMeetingView={isMeetingView}
                                />
                            )}

                            {activeTab === 'inventory_check' && (
                                <InventoryCheckView
                                    inventory={inventory}
                                    setInventory={setInventory}
                                    tests={tests}
                                    setLoading={setLoading}
                                    loading={loading}
                                    isInventorySessionActive={isInventorySessionActive}
                                    setIsInventorySessionActive={setIsInventorySessionActive}
                                    setPendingJustifications={setPendingJustifications}
                                    itemBeingAdjusted={itemBeingAdjusted}
                                    setItemBeingAdjusted={setItemBeingAdjusted}
                                    handleSaveInventory={handleSaveInventory}
                                    notifyError={notifyError}
                                    hasMore={hasMore}
                                    onLoadMore={() => fetchData(true)}
                                />
                            )}

                            {activeTab === 'adjustment_logs' && (
                                <InventoryLogView
                                    adjustmentLogs={filteredReportData}
                                    inventory={inventory}
                                    setReportContext={setReportContext}
                                    setShowReportModal={setShowReportModal}
                                    setAiAnalysis={setAiAnalysis}
                                    hasMore={hasMore}
                                    onLoadMore={() => fetchData(true)}
                                    onShowTestDetails={(id) => {
                                        const test = (tests || []).find(t => t.id === id);
                                        if (test) {
                                            setSelectedTest(test);
                                            setTemporaryTest(test);
                                        } else {
                                            notifyWarning('Teste não encontrado', 'O registro original pode ter sido removido.');
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <NewRecordModal
                isOpen={showAddForm}
                onClose={() => { setShowAddForm(false); setNewItem({}); }}
                activeTab={activeTab}
                newItem={newItem}
                setNewItem={setNewItem}
                onSave={handleSaveNewRecord}
                isSaving={isSaving}
                allClients={allClients}
                users={users}

                onRegisterClient={handleRegisterClient}
                testFlows={testFlows}
                testStatusPresets={testStatusPresets}
                inventory={inventory}
                tests={tests}
                isMeetingView={isMeetingView}
            />

            {pendingJustifications && (
                <InventoryJustificationModal
                    pendingJustifications={pendingJustifications}
                    handleJustifyInventory={handleJustifyInventory}
                    setPendingJustifications={setPendingJustifications}
                    setIsInventorySessionActive={setIsInventorySessionActive}
                    inventoryReasons={inventoryReasons || []}
                    techTests={tests || []}
                />
            )}

            <InventoryDetailModal
                selectedInventoryItem={selectedInventoryItem}
                setSelectedInventoryItem={setSelectedInventoryItem}
                inventoryHistory={inventoryHistory}
                setInventoryHistory={setInventoryHistory}
                tests={tests}
                inventory={inventory}
                setInventory={setInventory}
                supabase={supabase}
                setShowTestDetails={setSelectedTest}
                notifySuccess={notifySuccess}
                notifyError={notifyError}
                notifyWarning={notifyWarning}
            />

            <TestDetailsModal
                isOpen={!!selectedTest}
                onClose={handleCloseModal}
                test={temporaryTest}
                setTest={setTemporaryTest}
                onSave={handleSaveDetails}
                isSaving={isSaving}
                tasks={tasks}
                inventory={inventory}
                tests={tests}
                onConvertToTask={(row, info) => convertRowToTask(row, info, 'TEST')}
                testFlows={testFlows}
                testStatusPresets={testStatusPresets}
                notifySuccess={notifySuccess}
                notifyError={notifyError}
                allClients={allClients}

                isClientRegistered={isClientRegistered}
                handleRegisterClient={handleRegisterClient}
                isMeetingView={isMeetingView}
            />

            <ReportModal
                showReportModal={showReportModal}
                setShowReportModal={setShowReportModal}
                reportContext={reportContext}
                setReportContext={setReportContext}
                reportTotals={reportTotals}
                filteredReportData={filteredReportData}
                aiAnalysis={aiAnalysis}
                isAnalyzing={isAnalyzing}
                handleGenerateAIInsights={onGenerateAI}
                handlePrintFullReport={onPrintReport}
                handleSaveSnapshot={handleSaveSnapshot}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                MONTHS={MONTHS}
                tasks={tasks}
                inventory={inventory}
                tests={tests}
            />
        </div>
    );
};

export default ControlsView;
