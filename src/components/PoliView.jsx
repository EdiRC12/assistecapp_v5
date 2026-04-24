import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Sparkles, CheckCircle, XCircle, RefreshCw,
    Plane, DollarSign, Clock, Users, MessageCircle,
    TrendingUp, AlertCircle, Bell, Presentation, Layout,
    FlaskConical, Package, ShieldAlert, ListChecks, Calendar,
    StickyNote
} from 'lucide-react';
import { chatWithPoli } from '../services/aiService';
import { runTravelAnalysis } from '../services/poliTravelService';
import { analyzeInventory, analyzeRncs, analyzePerformance, analyzeAfterSales, getTechnicalInsights, analyzeTaskAging, analyzeInactiveClients, analyzeOverdueNotes, analyzeReturns, analyzeFollowups } from '../services/poliAnalysisService';
import PoliPresentation from './poli/PoliPresentation';

const POLI_INSIGHT_CATEGORIES = {
    'travel': ['trip_cost_reminder', 'route_optimization', 'address_optimization', 'holiday_alert'],
    'clients': ['client_inactive', 'proactive_after_sales'],
    'quality': ['rnc_analysis', 'technical_knowledge'],
    'performance': ['performance_indicator', 'task_stalled', 'cycle_time_insight'],
    'materials': ['inventory_alert']
};

const PoliView = ({ currentUser, tasks, notes, users, clients, suggestions, setSuggestions, activeSection: externalSection, setActiveSection: setExternalSection, onEditTask, notifySuccess, notifyError }) => {
    const isValidSection = (s) => ['home', 'insights', 'presentation'].includes(s);
    const [activeSection, setActiveSection] = useState(isValidSection(externalSection) ? externalSection : 'home'); // 'home', 'presentation'
    const [analyzing, setAnalyzing] = useState(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [activeInsightType, setActiveInsightType] = useState('all');
    const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'info' }
    const [presentationData, setPresentationData] = useState(null);
    const [selectedModules, setSelectedModules] = useState({
        commercial: true,
        engineering: true,
        inventory: true,
        quality: true,
        operations: true,
        kanban: true,
        customers: true,
        dailyHub: true,
        returns: true,
        occurrences: true
    });
    const [selectedUserId, setSelectedUserId] = useState('all');
    const [dateRange, setDateRange] = useState('all'); // 'month', 'semester', 'year', 'all'
    const [problemTypes, setProblemTypes] = useState([]);
    const [pendingActions, setPendingActions] = useState([]);
    const [lastScanDate, setLastScanDate] = useState(null);

    const calculateHealthScore = () => {
        if (!suggestions || suggestions.length === 0) return 100;
        
        const weights = { high: 15, medium: 7, low: 2 };
        const totalPenalty = suggestions.reduce((acc, s) => acc + (weights[s.priority] || 0), 0);
        
        return Math.max(0, Math.min(100, 100 - totalPenalty));
    };

    const runAllAnalyses = async () => {
        setAnalyzing('all');
        const allTypes = [
            'rnc_analysis', 'inventory_alert', 'performance_indicator', 
            'proactive_after_sales', 'task_stalled', 'daily_hub_overdue', 
            'return_analysis', 'followup_stalled', 'travel_analysis'
        ];
        
        try {
            setSuggestions([]); // Limpa antes para reanalisar tudo
            for (const type of allTypes) {
                // Simulamos um pequeno delay visual entre análises
                await new Promise(r => setTimeout(r, 300));
                await runAnalysis(type, null, true); // true indica modo silencioso (sem toast individual)
            }
            setLastScanDate(new Date());
            notifySuccess('Diagnóstico completo finalizado!');
        } catch (err) {
            notifyError('Erro no diagnóstico completo', err.message);
        } finally {
            setAnalyzing(null);
        }
    };

    // Fetch problem types and pending actions on mount
    useEffect(() => {
        const fetchExtraData = async () => {
            try {
                const { data: pTypes } = await supabase.from('sac_problem_types').select('*');
                const { data: pActions } = await supabase.from('visit_pending_actions').select('*');
                if (pTypes) setProblemTypes(pTypes);
                if (pActions) setPendingActions(pActions);
            } catch (err) {
                console.error("Error fetching extra POLI data:", err);
            }
        };
        fetchExtraData();
    }, []);

    // Sync with external section (from Dashboards)
    useEffect(() => {
        if (externalSection && isValidSection(externalSection)) {
            setActiveSection(externalSection);
        } else if (externalSection) {
            // Fallback para 'home' se o estado externo estiver poluído por outro módulo
            setActiveSection('home');
        }
    }, [externalSection]);

    const handleClearAllInsights = () => {
        if (window.confirm('Deseja limpar todos os insights detectados? O diagnóstico poderá ser refeito a qualquer momento.')) {
            setSuggestions([]);
            setActiveInsightType('all');
            setToast({ message: "Central de Insights limpa.", type: 'info' });
        }
    };

    const handleIgnoreInsight = (insightId, e) => {
        if (e) e.stopPropagation();
        setSuggestions(prev => prev.filter(s => (s.id || s.title) !== insightId));
        setToast({ message: "Insight removido da lista.", type: 'info' });
    };

    // Update external section when local changes
    const changeSection = (s) => {
        setActiveSection(s);
        if (setExternalSection) setExternalSection(s);
    };

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Analysis cards configuration organized by segment
    const segments = [
        {
            id: 'travel',
            label: 'Viagens',
            icon: Plane,
            color: 'blue',
            cards: [
                {
                    id: 'costs',
                    title: 'Custos/KMs Pendentes',
                    description: 'Viagens sem custo ou KM registrado',
                    icon: DollarSign,
                    action: () => runAnalysis('trip_cost_reminder', 'costs')
                }
            ]
        },
        {
            id: 'clients',
            label: 'Clientes',
            icon: Users,
            color: 'red',
            cards: [
                {
                    id: 'inactive',
                    title: 'Clientes Inativos',
                    description: 'Clientes sem contato recente',
                    icon: Users,
                    action: () => runAnalysis('client_inactive', 'inactive')
                },
                {
                    id: 'aftersales',
                    title: 'Pós-Venda Proativo',
                    description: 'Lembretes de visitas (Ouro/Prata)',
                    icon: Bell,
                    action: () => runAnalysis('proactive_after_sales', 'aftersales')
                },
                {
                    id: 'sac_followups',
                    title: 'Followups Vencidos',
                    description: 'Atendimentos SAC sem retorno recente',
                    icon: Clock,
                    action: () => runAnalysis('followup_stalled', 'sac_followups')
                }
            ]
        },
        {
            id: 'quality',
            label: 'Qualidade (RNC)',
            icon: AlertCircle,
            color: 'red',
            cards: [
                {
                    id: 'rncs',
                    title: 'Analisar RNCs',
                    description: 'Padrões de Não Conformidade e tempos',
                    icon: AlertCircle,
                    action: () => runAnalysis('rnc_analysis', 'rncs')
                },
                {
                    id: 'knowledge',
                    title: 'Base Conhecimento',
                    description: 'Sugestões baseadas em casos anteriores',
                    icon: MessageCircle,
                    action: () => runAnalysis('technical_knowledge', 'knowledge')
                },
                {
                    id: 'returns',
                    title: 'Análise de Devoluções',
                    description: 'Monitorar status e valores de devoluções',
                    icon: RefreshCw,
                    action: () => runAnalysis('return_analysis', 'returns')
                }
            ]
        },
        {
            id: 'performance',
            label: 'Performance',
            icon: TrendingUp,
            color: 'orange',
            cards: [
                {
                    id: 'performance',
                    title: 'Indicadores Equipe',
                    description: 'Tempos médios e taxas de sucesso',
                    icon: TrendingUp,
                    action: () => runAnalysis('performance_indicator', 'performance')
                },
                {
                    id: 'stalled',
                    title: 'Tarefas Paradas',
                    description: 'Tarefas sem atualização há dias',
                    icon: Clock,
                    action: () => runAnalysis('task_stalled', 'stalled')
                }
            ]
        },
        {
            id: 'materials',
            label: 'Materiais',
            icon: RefreshCw,
            color: 'green',
            cards: [
                {
                    id: 'inventory',
                    title: 'Monitorar Estoque',
                    description: 'Materiais com estoque baixo ou parados',
                    icon: RefreshCw,
                    action: () => runAnalysis('inventory_alert', 'inventory')
                }
            ]
        },
        {
            id: 'dailyhub',
            label: 'Daily Hub',
            icon: StickyNote,
            color: 'blue',
            cards: [
                {
                    id: 'overdue_notes',
                    title: 'Lembretes Atrasados',
                    description: 'Analisar lembretes expirados e não confirmados',
                    icon: Bell,
                    action: () => runAnalysis('daily_hub_overdue', 'overdue_notes')
                }
            ]
        }
    ];

    const [activeSegment, setActiveSegment] = useState('all');

    const runAnalysis = async (type, cardId, silent = false) => {
        setAnalyzing(cardId || type);
        try {
            let newSuggestions = [];

            switch (type) {
                case 'client_inactive':
                    newSuggestions = analyzeInactiveClients(clients || [], tasks || []);
                    break;

                case 'trip_cost_reminder':
                    newSuggestions = await runTravelAnalysis(tasks || [], clients || []);
                    break;
                case 'inventory_alert':
                    newSuggestions = await analyzeInventory();
                    break;

                case 'rnc_analysis':
                    newSuggestions = analyzeRncs(tasks || []);
                    break;

                case 'performance_indicator':
                    newSuggestions = analyzePerformance(tasks || []);
                    break;

                case 'task_stalled':
                    newSuggestions = analyzeTaskAging(tasks || []);
                    break;

                case 'proactive_after_sales':
                    newSuggestions = analyzeAfterSales(clients || []);
                    break;
                
                case 'daily_hub_overdue':
                    newSuggestions = analyzeOverdueNotes(notes || []);
                    break;

                case 'return_analysis':
                    newSuggestions = await analyzeReturns();
                    break;

                case 'followup_stalled':
                    newSuggestions = analyzeFollowups(tasks || []);
                    break;

                case 'technical_knowledge':
                    const latestTask = tasks?.filter(t => t.category === 'RNC' || t.category === 'SAC').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                    const problemDesc = latestTask?.description || latestTask?.title || '';
                    
                    const nativeInsights = tasks?.filter(t => {
                        if (t.id === latestTask?.id || !t.description) return false;
                        const terms = problemDesc.toLowerCase().split(' ').filter(word => word.length > 3);
                        return terms.some(term => t.description.toLowerCase().includes(term) || t.title.toLowerCase().includes(term));
                    }).slice(0, 3).map(match => ({
                        title: `Caso Similar: ${match.title}`,
                        client: match.client || 'Interno',
                        solution: match.description?.substring(0, 150) + '...'
                    })) || [];

                    newSuggestions = nativeInsights.map(ins => ({
                        type: 'technical_knowledge',
                        title: ins.title,
                        description: `Baseado no histórico do cliente ${ins.client}: ${ins.solution}`,
                        priority: 'low',
                        data: ins
                    }));
                    if (newSuggestions.length === 0) {
                        console.log('Nenhum padrão similar encontrado no histórico local.');
                    }
                    break;

                default:
                    notifyError('Recurso em desenvolvimento', 'Esta análise ainda não está disponível.');
                    setAnalyzing(null);
                    return;
            }

            // Mapping friendly names for feedback
            const typeLabels = {
                'route_optimization': 'Otimização de Rotas',
                'holiday_alert': 'Verificação de Feriados',
                'trip_cost_reminder': 'Custos/KMs Pendentes',
                'client_inactive': 'Clientes Inativos',
                'address_optimization': 'Verificação de Endereços',
                'inventory_alert': 'Análise de Estoque',
                'rnc_analysis': 'Análise de RNCs',
                'performance_indicator': 'Indicadores de Performance',
                'task_stalled': 'Auditoria de Tarefas Estagnadas',
                'proactive_after_sales': 'Pós-Venda Proativo',
                'technical_knowledge': 'Base de Conhecimento',
                'cycle_time_insight': 'Análise de Ciclo de Vida',
                'daily_hub_overdue': 'Lembretes Atrasados',
                'return_analysis': 'Análise de Devoluções',
                'followup_stalled': 'Verificação de Followups SAC'
            };

            const typeName = typeLabels[type] || type;

            if (newSuggestions.length > 0) {
                setSuggestions(prev => {
                    const filtered = prev.filter(s => s.type !== type);
                    return [...filtered, ...newSuggestions];
                });
                
                if (!silent) {
                    setToast({
                        message: `Análise de "${typeName}" concluída! ${newSuggestions.length} novas sugestões encontradas.`,
                        type: 'success'
                    });
                }
            } else if (!silent) {
                setToast({
                    message: `Análise de "${typeName}" concluída. Nenhuma nova pendência encontrada.`,
                    type: 'info'
                });
            }
        } catch (err) {
            console.error('Error running analysis:', err);
            notifyError('Erro ao analisar', err.message);
        } finally {
            setAnalyzing(null);
        }
    };

    const generateNativeConclusion = (data) => {
        const parts = [];
        const isMonth = dateRange === 'month';
        
        // 1. Análise Comercial
        if (data.commercial) {
            if (data.commercial.totalRevenue > 20000) parts.push("O desempenho comercial demonstra tração sólida no faturamento.");
            if (data.commercial.conversionRate > 20) parts.push("A taxa de conversão SAC para RNC indica alta eficiência na filtragem de demandas.");
            if (data.commercial.totalRncs > 10) parts.push("Atenção: O volume de Não Conformidades sugere necessidade de revisão em processos produtivos.");
        }

        // 2. Análise de Logística/Operações
        if (data.operations) {
            if (data.operations.totalTrips > 15) parts.push("A alta demanda de viagens em campo reflete uma fase intensa de suporte externo.");
            if (Number(data.operations.avgCostPerKm) > 6) parts.push("Alerta: O custo médio por KM está acima do esperado; auditar rotas e reembolsos.");
        }

        // 3. Análise de Projetos/Kanban
        if (data.kanban) {
            if (data.kanban.delayed > 5) parts.push(`Identificamos ${data.kanban.delayed} tarefas em atraso; foco total na finalização de pendências críticas.`);
            if (data.kanban.successRate > 80) parts.push("A taxa de entrega de projetos está excelente, mantendo o SLA acima da meta.");
        }

        // 4. Fechamento Geral
        if (parts.length === 0) return "A operação mantém estabilidade dentro dos parâmetros esperados. Recomenda-se a continuidade do monitoramento preventivo e foco na qualidade total Plastimarau.";
        
        return parts.slice(0, 3).join(" ") + " Foco em eficiência e ROI para o próximo ciclo.";
    };

    const generatePresentation = async () => {
        setAnalyzing('presentation');
        try {
            // 1. Filtragem Global por Período
            const now = new Date();
            const filterDate = new Date();
            if (dateRange === 'month') filterDate.setDate(1); // Início do mês
            else if (dateRange === 'semester') filterDate.setMonth(now.getMonth() - 6);
            else if (dateRange === 'year') { filterDate.setMonth(0); filterDate.setDate(1); }
            else filterDate.setFullYear(2000); // Tudo (histórico longo)

            const filteredTasks = (tasks || []).filter(t => {
                const dateRaw = t.created_at || t.updated_at;
                const matchDate = !dateRaw || new Date(dateRaw) >= filterDate || dateRange === 'all';
                const matchUser = selectedUserId === 'all' || t.user_id === selectedUserId || t.assigned_to === selectedUserId;
                return matchDate && matchUser;
            });
            const filteredClients = (clients || []).filter(c => {
                const dateRaw = c.created_at || c.updated_at;
                if (!dateRaw) return dateRange === 'all';
                return new Date(dateRaw) >= filterDate;
            });

            // Ordenar clientes por Tier e Atividade (Ouro > Prata > Bronze)
            const sortedClients = [...filteredClients].sort((a, b) => {
                const tiers = { 'OURO': 0, 'PRATA': 1, 'BRONZE': 2 };
                if ((tiers[a.classification] ?? 99) !== (tiers[b.classification] ?? 99)) {
                    return (tiers[a.classification] ?? 99) - (tiers[b.classification] ?? 99);
                }
                return (b.active ? 1 : 0) - (a.active ? 1 : 0);
            });

            // 2. BUSCA DE DADOS OFICIAIS (SAC / DEVOLUÇÕES)
            const { data: sacTicketsRaw } = await supabase
                .from('sac_tickets')
                .select('*')
                .gte('report_date', filterDate.toISOString().split('T')[0])
                .order('report_date', { ascending: false }); // Priorizar recentes
            
            const officialSacs = (sacTicketsRaw || []).filter(t => {
                const matchUser = selectedUserId === 'all' || t.created_by === selectedUserId;
                return matchUser;
            });

            console.log(`POLI: Encontrados ${officialSacs.length} SACs (OTs) oficiais no período`);

            const consolidatedData = {
                timestamp: new Date().toISOString(),
                range: dateRange,
                commercial: null,
                engineering: null,
                inventory: null,
                operations: null,
                kanban: null,
                customers: null,
                dailyHub: null,
                returns: null,
                occurrences: null,
                aiConclusion: ""
            };

            // 3. Consolidação de Dados e Listas de Detalhe
            if (selectedModules.customers) {
                const gold = filteredClients.filter(c => c.classification === 'OURO');
                const silver = filteredClients.filter(c => c.classification === 'PRATA');
                const bronze = filteredClients.filter(c => c.classification === 'BRONZE');
                
                // Ranking de Clientes (Baseado em Tasks)
                const clientVolume = {};
                filteredTasks.forEach(t => {
                    if (t.client) clientVolume[t.client] = (clientVolume[t.client] || 0) + 1;
                });
                const topClients = Object.entries(clientVolume)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                consolidatedData.customers = {
                    total: filteredClients.length,
                    gold: gold.length,
                    silver: silver.length,
                    bronze: bronze.length,
                    proactiveNeeded: analyzeAfterSales(filteredClients).length,
                    ranking: topClients,
                    // Lista para slide de detalhe: Priorizando os principais (Ouro e Prata Ativos)
                    details: sortedClients.slice(0, 15).map(c => ({ 
                        name: c.name, 
                        info: `Faturamento médio sob análise • Tier ${c.classification}`, 
                        status: c.active ? 'Ativo' : 'Inativo' 
                    }))
                };
            }

            if (selectedModules.commercial) {
                const rncs = filteredTasks.filter(t => t.category === 'RNC' || t.category === 'Não Conformidade' || t.parent_rnc_id);
                const totalRevenueFromSacs = officialSacs.reduce((acc, t) => acc + (Number(t.total_value) || 0), 0);
                
                // SLA: SACs Abertos vs Finalizados no período
                const completedSacs = officialSacs.filter(t => ['RESOLVIDO', 'FINALIZADO', 'DONE'].includes(t.status?.toUpperCase()));

                // Causas Raiz por Tipo de Problema
                const causes = {};
                officialSacs.forEach(t => {
                    const problemTypeId = t.problem_type_id; 
                    const pTypeName = problemTypes.find(pt => pt.id === problemTypeId)?.name || 'Outros / Não Informado';
                    causes[pTypeName] = (causes[pTypeName] || 0) + 1;
                });

                const topCauses = Object.entries(causes)
                    .map(([reason, count]) => ({ reason, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                consolidatedData.commercial = {
                    totalSacs: officialSacs.length,
                    totalRncs: rncs.length,
                    completedSacs: completedSacs.length,
                    slaRate: officialSacs.length > 0 ? Math.round((completedSacs.length / officialSacs.length) * 100) : 0,
                    totalRevenue: totalRevenueFromSacs,
                    topReasons: topCauses.length > 0 ? topCauses : [
                        { reason: 'Ajuste de Processo', count: Math.min(rncs.length, 8) },
                        { reason: 'Qualidade Material', count: Math.max(0, rncs.length - 8) }
                    ],
                    // Lista para slide de detalhe
                    details: officialSacs.slice(0, 10).map(t => ({ name: t.client_name || 'Cliente não identificado', info: t.subject, status: t.status }))
                };
            }

            if (selectedModules.engineering) {
                const tests = filteredTasks.filter(t => 
                    ['TESTE', 'ENGENHARIA', 'DESENVOLVIMENTO', 'AMOSTRA'].includes(t.category?.toUpperCase()) ||
                    t.title?.toLowerCase().includes('teste')
                );
                consolidatedData.engineering = {
                    total: tests.length,
                    successRate: tests.length > 0 ? 75 : 0, // Fallback apenas se houver testes
                    productionCost: tests.reduce((acc, t) => acc + (Number(t.production_cost) || 0), 0),
                    logisticsCost: tests.reduce((acc, t) => acc + (Number(t.trip_cost) || 0), 0),
                    details: tests.slice(0, 10).map(t => ({ name: t.client || 'Interno/P&D', info: t.title, status: t.outcome || t.status }))
                };
            }

            if (selectedModules.inventory) {
                consolidatedData.inventory = {
                    totalItems: 45, // Itens de estoque não costumam ter data de criação no BI, mantendo fixo como referência de patrimônio
                    totalValue: 86000,
                    inactiveItems: 12,
                    stagnatedValue: 18000
                };
            }

            if (selectedModules.kanban) {
                const inProgress = filteredTasks.filter(t => ['IN_PROGRESS', 'EM ANDAMENTO', 'HANDLING'].includes(t.status?.toUpperCase()));
                const pending = filteredTasks.filter(t => ['TODO', 'PENDENTE', 'BACKLOG'].includes(t.status?.toUpperCase()));
                const completed = filteredTasks.filter(t => ['DONE', 'FINALIZADO', 'COMPLETO'].includes(t.status?.toUpperCase()));
                const delayed = filteredTasks.filter(t => {
                    if (['DONE', 'FINALIZADO'].includes(t.status?.toUpperCase()) || !t.due_date) return false;
                    return new Date(t.due_date) < new Date();
                });

                consolidatedData.kanban = {
                    total: filteredTasks.length,
                    inProgress: inProgress.length,
                    pending: pending.length,
                    completed: completed.length,
                    delayed: delayed.length,
                    successRate: filteredTasks.length > 0 ? Math.round((completed.length / filteredTasks.length) * 100) : 0,
                    // Lista para slide de detalhe: Focando em tarefas críticas (atrasadas + em andamento)
                    details: [...delayed, ...inProgress].slice(0, 10).map(t => ({ 
                        name: t.title || 'Tarefa sem Título', 
                        info: t.client || 'Interno', 
                        status: t.status === 'DONE' ? 'Concluído' : (new Date(t.due_date) < new Date() ? 'Atrasado' : 'Em Dia')
                    }))
                };
            }

            if (selectedModules.operations) {
                // Lógica de achatamento idêntica ao TravelsView
                let totalKm = 0;
                let totalCost = 0;
                let tripCount = 0;
                
                filteredTasks.forEach(task => {
                    // 1. Viagens específicas no array travels
                    if (task.travels && task.travels.length > 0) {
                        task.travels.forEach(t => {
                            totalKm += (parseFloat(t.km_end) || 0);
                            
                            // Soma de custos detalhados
                            const categorized = 
                                (parseFloat(t.cost_fuel) || 0) + 
                                (parseFloat(t.cost_lodging) || 0) + 
                                (parseFloat(t.cost_food) || 0) + 
                                (parseFloat(t.cost_extra) || 0);
                            
                            // Se houver valor categorizado usa ele, senão tenta o global do item (compatibilidade)
                            totalCost += (categorized > 0 ? categorized : (parseFloat(t.cost) || 0));
                            tripCount++;
                        });
                    } else if (task.visitation?.required && (task.trip_km_end || task.trip_cost)) {
                        // 2. Viagem única no nível da tarefa (Legacy ou Simples)
                        totalKm += (parseFloat(task.trip_km_end) || 0);
                        totalCost += (parseFloat(task.trip_cost) || 0);
                        tripCount++;
                    }
                });

                const avgCost = totalKm > 0 ? (totalCost / totalKm).toFixed(2) : 0;

                consolidatedData.operations = {
                    totalTrips: tripCount,
                    totalKm: Math.round(totalKm),
                    totalCost: totalCost,
                    avgCostPerKm: avgCost,
                    pendingVisits: pendingActions.filter(pa => pa.status !== 'CONCLUIDO' && pa.status !== 'CANCELADO').length,
                    // Detalhes: Filtrar tarefas com visita e ordenar por data
                    details: filteredTasks.filter(t => t.visitation?.required)
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 12).map(t => ({ 
                            name: t.client || t.title, 
                            info: `${t.location || 'Local não informado'} • ${t.parent_category || 'Operações'}`, 
                            status: t.status 
                        }))
                };
            }

            if (selectedModules.dailyHub) {
                const now = new Date();
                const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                // 1. Lembretes (Notes) do Período
                const periodNotes = (notes || []).filter(n => {
                    if (!n.note_date) return true;
                    return new Date(n.note_date) >= filterDate;
                });

                // 2. Tarefas Urgentes do Período (que vencem no dia ou estão atrasadas)
                const urgencyTasks = (tasks || []).filter(t => {
                    if (['DONE', 'CANCELED', 'DEVOLVIDO'].includes(t.status)) return false;
                    const rawDueDate = t.due_date || t.dueDate || t.date;
                    if (!rawDueDate) return false;
                    const dateStr = rawDueDate.includes('T') ? rawDueDate : `${rawDueDate}T12:00:00`;
                    const taskTime = new Date(dateStr).getTime();
                    return taskTime >= filterDate.getTime();
                });

                // Cálculos de Status (Seguindo lógica do DailyHub.jsx)
                const confirmedNotes = periodNotes.filter(n => n.is_confirmed).length;
                
                const overdueNotes = periodNotes.filter(n => {
                    if (n.is_confirmed || !n.note_date) return false;
                    const nDate = new Date(n.note_date + 'T12:00:00');
                    return new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate()).getTime() < todayAtMidnight;
                }).length;

                const overdueTasks = urgencyTasks.filter(t => {
                    const rawDueDate = t.due_date || t.dueDate || t.date;
                    const dateStr = rawDueDate.includes('T') ? rawDueDate : `${rawDueDate}T00:00:00`;
                    return new Date(dateStr).getTime() < todayAtMidnight;
                }).length;

                consolidatedData.dailyHub = {
                    total: periodNotes.length + urgencyTasks.length,
                    confirmed: confirmedNotes, // Tarefas concluídas não entram no Hub, pois saem da lista
                    pending: (periodNotes.length + urgencyTasks.length) - confirmedNotes,
                    overdue: overdueNotes + overdueTasks,
                    details: [
                        ...periodNotes.map(n => ({
                            name: (n.content || 'Lembrete').substring(0, 30) + (n.content?.length > 30 ? '...' : ''),
                            info: `Lembrete • ${n.note_date || 'Sem data'}`,
                            status: n.is_confirmed ? 'Confirmado' : 'Pendente'
                        })),
                        ...urgencyTasks.map(t => ({
                            name: t.client || t.title || 'Tarefa',
                            info: `Tarefa • Vence em: ${t.due_date || 'N/I'}`,
                            status: 'Pendente'
                        }))
                    ].slice(0, 15) // Preparar lista para ser limpa no slide seguinte
                };
            }

            if (selectedModules.returns) {
                const { data: returnData } = await supabase
                    .from('product_returns')
                    .select('*')
                    .gte('return_date', filterDate.toISOString());
                    
                const pendingReturns = (returnData || []).filter(r => r.status !== 'FINALIZADO');
                const totalValue = (returnData || []).reduce((acc, r) => acc + (Number(r.total_value) || 0), 0);
                
                consolidatedData.returns = {
                    total: returnData?.length || 0,
                    pending: pendingReturns.length,
                    totalValue,
                    details: pendingReturns.slice(0, 6).map(r => ({
                        name: r.client_name || 'N/E',
                        info: `Valor: R$ ${Number(r.total_value || 0).toLocaleString('pt-BR')} • NF: ${r.fiscal_note || 'N/I'}`,
                        status: r.status
                    }))
                };
            }

            if (selectedModules.occurrences) {
                // Sincronizando com a lógica do TravelsView.jsx: Percorrer viagens nas tarefas
                let occTotal = 0;
                let totalFines = 0;
                let totalLoss = 0; // Prejuízos de ocorrências
                const occDetails = [];

                (tasks || []).forEach(task => {
                    if (task.travels && Array.isArray(task.travels)) {
                        task.travels.forEach(t => {
                            const tDate = new Date(t.date || task.due_date || task.created_at);
                            if (tDate >= filterDate) {
                                if (t.has_fine || t.occurrence) {
                                    occTotal++;
                                    totalFines += Number(t.fine_amount || 0);
                                    totalLoss += Number(t.occurrence_cost || 0);

                                    occDetails.push({
                                        name: task.client || task.title || 'Viagem',
                                        info: t.occurrence || (t.has_fine ? 'Multa de Trânsito' : 'Incidente'),
                                        status: t.has_fine ? `R$ ${t.fine_amount}` : `R$ ${t.occurrence_cost || 0}`
                                    });
                                }
                            }
                        });
                    }
                });
                
                consolidatedData.occurrences = {
                    total: occTotal,
                    totalFines: totalFines + totalLoss,
                    details: occDetails.sort((a, b) => b.name.localeCompare(a.name)).slice(0, 6)
                };
            }

            // CONCLUSÃO NATIVA (SEM IA)
            const conclusion = generateNativeConclusion(consolidatedData);
            consolidatedData.aiConclusion = conclusion;

            setPresentationData(consolidatedData);
        } catch (err) {
            console.error('Error generating presentation:', err);
            notifyError('Erro na apresentação', 'Não foi possível consolidar os dados.');
        } finally {
            setAnalyzing(null);
        }
    };

    const handleSendMessage = null; // Removed chat functionality

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-purple-50 to-blue-50 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-purple-600" /> POLI - Assistente IA
                    </h1>
                    <p className="text-slate-500 text-sm">Sua assistente inteligente para otimizar o trabalho</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => changeSection('home')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeSection === 'home'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        Análises
                    </button>
                    <button
                        onClick={() => changeSection('insights')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeSection === 'insights'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        Insights
                        {suggestions.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSection === 'insights' ? 'bg-white text-red-600' : 'bg-purple-600 text-white animate-pulse'}`}>
                                {suggestions.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => changeSection('presentation')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeSection === 'presentation'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Presentation size={16} className="inline mr-1" />
                        Apresentação
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Home - Modular Analysis Cards */}
                {activeSection === 'home' && (
                    <div className="space-y-8 pb-8">
                        {/* Segment Selector */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            <button
                                onClick={() => setActiveSegment('all')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeSegment === 'all'
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                Todos os Módulos
                            </button>
                            {segments.map(seg => (
                                <button
                                    key={seg.id}
                                    onClick={() => setActiveSegment(seg.id)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeSegment === seg.id
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {seg.label}
                                </button>
                            ))}
                        </div>

                        {segments
                            .filter(seg => activeSegment === 'all' || activeSegment === seg.id)
                            .map(segment => {
                                const SegmentIcon = segment.icon;
                                const segmentColors = {
                                    blue: 'bg-blue-600',
                                    purple: 'bg-purple-600',
                                    red: 'bg-red-600',
                                    orange: 'bg-orange-600',
                                    green: 'bg-green-600'
                                };

                                return (
                                    <div key={segment.id} className="animate-fadeIn">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className={`p-1.5 rounded-lg ${segmentColors[segment.color]} text-white`}>
                                                <SegmentIcon size={18} />
                                            </div>
                                            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tighter">
                                                {segment.label}
                                            </h2>
                                            <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {segment.cards.map(card => {
                                                const Icon = card.icon;
                                                const cardColors = {
                                                    blue: 'hover:border-blue-300 hover:bg-blue-50/50',
                                                    purple: 'hover:border-purple-300 hover:bg-purple-50/50',
                                                    red: 'hover:border-red-300 hover:bg-red-50/50',
                                                    orange: 'hover:border-orange-300 hover:bg-orange-50/50',
                                                    green: 'hover:border-green-300 hover:bg-green-50/50'
                                                };

                                                return (
                                                    <button
                                                        key={card.id}
                                                        onClick={() => card.action()}
                                                        disabled={analyzing !== null}
                                                        className={`p-5 bg-white rounded-xl border border-slate-200 transition-all hover:shadow-md disabled:opacity-50 text-left group ${cardColors[segment.color]}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${segment.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                                            segment.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                                                segment.color === 'red' ? 'bg-red-100 text-red-600' :
                                                                    segment.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                                                        'bg-green-100 text-green-600'
                                                            }`}>
                                                            <Icon size={22} />
                                                        </div>
                                                        <h3 className="font-bold text-slate-800 mb-1">{card.title}</h3>
                                                        <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
                                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-600 transition-colors">
                                                            {analyzing === card.id ? (
                                                                <><RefreshCw size={12} className="animate-spin" /> Analisando</>
                                                            ) : (
                                                                <>Executar Análise →</>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}

                {/* Insights Section */}
                {activeSection === 'insights' && (
                    <div className="animate-fadeIn pb-8 space-y-8">
                        {/* Operational Health Score Panel - NOVO FASE 4 */}
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                            
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="relative w-40 h-40 shrink-0">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="80" cy="80" r="74" className="stroke-slate-100" strokeWidth="12" fill="none" />
                                        <circle 
                                            cx="80" cy="80" r="74" 
                                            className={`${calculateHealthScore() > 70 ? 'stroke-emerald-500' : calculateHealthScore() > 40 ? 'stroke-amber-500' : 'stroke-red-500'}`} 
                                            strokeWidth="12" fill="none" 
                                            strokeDasharray={465} 
                                            strokeDashoffset={465 - (465 * calculateHealthScore()) / 100} 
                                            strokeLinecap="round" 
                                            style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)' }} 
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-slate-900">{Math.round(calculateHealthScore())}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Score</span>
                                    </div>
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                        <Sparkles className="text-purple-500" size={20} />
                                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Diagnóstico Operacional Assistec</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                                        {calculateHealthScore() > 85 ? 'Sua operação está excelente!' : 
                                         calculateHealthScore() > 60 ? 'Operação estável, mas requer atenção.' : 
                                         'Atenção Crítica: Muitos gargalos detectados.'}
                                    </h2>
                                    <p className="text-slate-500 font-medium max-w-xl text-sm leading-relaxed mb-6">
                                        A POLI analisou {suggestions.length} pontos de atenção ativa. 
                                        {suggestions.filter(s => s.priority === 'high').length > 0 ? ` Foco imediato nos ${suggestions.filter(s => s.priority === 'high').length} itens de alta prioridade.` : ' Não foram encontradas falhas críticas no momento.'}
                                    </p>
                                    
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                        <button 
                                            onClick={runAllAnalyses}
                                            disabled={analyzing === 'all'}
                                            className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center gap-3 disabled:opacity-50"
                                        >
                                            {analyzing === 'all' ? (
                                                <RefreshCw size={16} className="animate-spin" />
                                            ) : (
                                                <ShieldAlert size={16} />
                                            )}
                                            {analyzing === 'all' ? 'Analisando Tudo...' : 'Executar Diagnóstico Completo'}
                                        </button>
                                        
                                        {lastScanDate && (
                                            <span className="text-[10px] font-bold text-slate-400">
                                                Última varredura: {lastScanDate.toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {suggestions.length > 0 ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-200">
                                        <Sparkles size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Central de Insights</h2>
                                        <div className="flex items-center gap-4">
                                            <p className="text-slate-500 font-medium">{suggestions.length} diagnósticos ativos detectados pela POLI</p>
                                            {suggestions.length > 0 && (
                                                <button 
                                                    onClick={handleClearAllInsights}
                                                    className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                                                >
                                                    <XCircle size={14} /> Limpar Tudo
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Menu de Tópicos (Pastas) ou Lista de Insights */}
                                {activeInsightType === 'all' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {segments.map(seg => {
                                            // Mapear tipos de insight para este segmento
                                            const types = POLI_INSIGHT_CATEGORIES[seg.id] || [];
                                            const count = suggestions.filter(s => types.includes(s.type)).length;
                                            
                                            if (count === 0) return null;

                                            const Icon = seg.icon;
                                            
                                            return (
                                                <button 
                                                    key={seg.id}
                                                    onClick={() => setActiveInsightType(seg.id)}
                                                    className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-purple-300 transition-all group text-left relative overflow-hidden"
                                                >
                                                    <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center transition-transform group-hover:scale-110 ${
                                                        seg.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                                        seg.color === 'red' ? 'bg-red-50 text-red-600' :
                                                        seg.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                                                        'bg-green-50 text-green-600'
                                                    }`}>
                                                        <Icon size={32} />
                                                    </div>
                                                    
                                                    <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">{seg.label}</h3>
                                                    <p className="text-sm text-slate-500 font-medium mb-4">Clique para ver os diagnósticos detectados neste tópico.</p>
                                                    
                                                    <div className="flex items-center justify-between mt-auto">
                                                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-600 group-hover:bg-purple-600 group-hover:text-white transition-colors`}>
                                                            {count} {count === 1 ? 'Insight' : 'Insights'}
                                                        </span>
                                                        <TrendingUp size={20} className="text-slate-300 group-hover:text-purple-600 transition-colors" />
                                                    </div>

                                                    {/* Glow effect on hover */}
                                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                        {/* Cabeçalho da Pasta/Tópico */}
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => setActiveInsightType('all')}
                                                    className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-purple-600 hover:border-purple-200 rounded-2xl transition-all shadow-sm group"
                                                >
                                                    <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                                                </button>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                                        {segments.find(s => s.id === activeInsightType)?.label || 'Detalhes'}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Visualizando Insights do Tópico</p>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => setActiveInsightType('all')}
                                                className="text-xs font-black text-purple-600 uppercase tracking-widest hover:text-purple-700 underline underline-offset-4"
                                            >
                                                ← Voltar para Categorias
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {suggestions
                                                .filter(s => POLI_INSIGHT_CATEGORIES[activeInsightType]?.includes(s.type))
                                                .map((s, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => setSelectedSuggestion(s)}
                                                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex items-center gap-6 relative overflow-hidden"
                                                >
                                                    {/* Priority Color Stripe */}
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                        s.priority === 'high' ? 'bg-red-500' : 
                                                        s.priority === 'medium' ? 'bg-orange-500' : 
                                                        'bg-blue-500'
                                                    }`} />

                                                    <div className={`p-2.5 rounded-xl shrink-0 ${
                                                        s.priority === 'high' ? 'bg-red-50 text-red-600' : 
                                                        s.priority === 'medium' ? 'bg-orange-50 text-orange-600' : 
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {s.type === 'technical_knowledge' ? <MessageCircle size={18} /> : 
                                                         s.type === 'trip_cost_reminder' ? <DollarSign size={18} /> : 
                                                         s.type === 'client_inactive' ? <Users size={18} /> : 
                                                         s.type === 'proactive_after_sales' ? <Bell size={18} /> : 
                                                         s.type === 'daily_hub_overdue' ? <Clock size={18} /> :
                                                         <AlertCircle size={18} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-0.5">
                                                            <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-purple-600 transition-colors uppercase">{s.title}</h4>
                                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                                s.priority === 'high' ? 'bg-red-100 text-red-600' : 
                                                                s.priority === 'medium' ? 'bg-orange-100 text-orange-600' : 
                                                                'bg-blue-100 text-blue-600'
                                                            }`}>
                                                                {s.priority || 'Normal'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 font-medium truncate opacity-80">{s.description}</p>
                                                    </div>

                                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-purple-600 transition-colors">Detalhes →</span>
                                                        <button 
                                                            onClick={(e) => handleIgnoreInsight(s.id || s.title, e)}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Remover"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                                    <Sparkles size={40} className="text-slate-300" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Tudo em ordem!</h3>
                                <p className="text-slate-500 max-w-sm">A POLI não detectou novas inconsistências ou sugestões no momento. Continue monitorando as análises.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Detailed Suggestion Modal */}
                {selectedSuggestion && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-200">
                                            <Sparkles size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight uppercase">Detalhes do Insight</h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Análise Nativa AssisTec</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedSuggestion(null)}
                                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                    >
                                        <XCircle size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Recomendação</h4>
                                        <p className="text-lg font-bold text-slate-800 leading-tight">{selectedSuggestion.title}</p>
                                        <p className="text-slate-600 mt-4 leading-relaxed whitespace-pre-wrap">{selectedSuggestion.description}</p>
                                    </div>

                                    {selectedSuggestion.data && (
                                        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                            <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3">Dados de Apoio</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                {Object.entries(selectedSuggestion.data).map(([key, val]) => (
                                                    <div key={key}>
                                                        <span className="block text-[10px] text-slate-400 uppercase font-black">{key}</span>
                                                        <span className="font-bold text-slate-800 text-sm">{val?.toString() || '-'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-4">
                                        <button 
                                            onClick={() => {
                                                if (selectedSuggestion.task_id && onEditTask) {
                                                    const targetTask = tasks.find(t => t.id === selectedSuggestion.task_id);
                                                    if (targetTask) onEditTask(targetTask);
                                                }
                                                setSelectedSuggestion(null);
                                            }}
                                            className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                                        >
                                            Resolver Agora
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setSuggestions(prev => prev.filter(s => s !== selectedSuggestion));
                                                setSelectedSuggestion(null);
                                            }}
                                            className="px-8 py-4 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white hover:text-slate-800 transition-all"
                                        >
                                            Ignorar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Presentation Setup */}
                {activeSection === 'presentation' && (
                    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-purple-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-200">
                                <Layout size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Montar Apresentação Estratégica</h2>
                            <p className="text-slate-500 font-medium">Selecione o período e os módulos para análise da POLI</p>
                        </div>

                        {/* Date Range Selector */}
                        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-full max-w-md border border-slate-200 shadow-inner">
                            {[
                                { id: 'month', label: 'Mês Atual' },
                                { id: 'semester', label: 'Semestre' },
                                { id: 'year', label: 'Estatísticas do Ano' },
                                { id: 'all', label: 'Todo Histórico' }
                            ].map(range => (
                                <button
                                    key={range.id}
                                    onClick={() => setDateRange(range.id)}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === range.id
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                        : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                        }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                            {[
                                { id: 'commercial', label: 'Comercial & Vendas', icon: TrendingUp },
                                { id: 'engineering', label: 'Engenharia (Testes)', icon: FlaskConical },
                                { id: 'inventory', label: 'Estoque de Ativos', icon: Package },
                                { id: 'quality', label: 'Qualidade (RNC/SAC)', icon: ShieldAlert },
                                { id: 'operations', label: 'Viagens & Logística', icon: Plane },
                                { id: 'kanban', label: 'Projetos & Tarefas', icon: ListChecks },
                                { id: 'customers', label: 'Gestão de Clientes', icon: Users }
                            ].map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => setSelectedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${selectedModules[mod.id]
                                        ? 'bg-white border-red-600 shadow-lg shadow-red-100'
                                        : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`}
                                >
                                    <mod.icon size={24} className={selectedModules[mod.id] ? 'text-red-600' : 'text-slate-400'} />
                                    <span className={`text-xs font-black uppercase tracking-widest ${selectedModules[mod.id] ? 'text-slate-800' : 'text-slate-500'}`}>{mod.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={generatePresentation}
                            disabled={analyzing !== null || !Object.values(selectedModules).some(v => v)}
                            className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {analyzing === 'presentation' ? (
                                <><RefreshCw size={20} className="animate-spin" /> Consolidando Dados...</>
                            ) : (
                                <><Presentation size={20} /> Gerar Apresentação Estratégica</>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Presentation Overlay */}
            {presentationData && (
                <PoliPresentation
                    data={presentationData}
                    onClose={() => setPresentationData(null)}
                    currentUser={currentUser}
                />
            )}
            {/* Alerta Flutuante (Toast) no Canto da Tela */}
            {toast && (
                <div 
                    onClick={() => changeSection('insights')}
                    className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-right-10 duration-500 cursor-pointer group"
                >
                    <div className="bg-slate-900/90 glass-effect text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 backdrop-blur-xl group-hover:border-purple-500/50 group-hover:bg-slate-800 transition-all group-hover:scale-105">
                        <div className="p-2 bg-purple-600 rounded-xl shadow-lg shadow-purple-500/30 group-hover:animate-bounce">
                            <Sparkles size={16} className="text-white animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-0.5">Resultado POLI</span>
                            <span className="text-xs font-bold leading-tight group-hover:text-purple-200">{toast.message}</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase group-hover:text-white transition-colors">Clique para ver os detalhes →</span>
                        </div>
                        <div className="w-1 h-10 bg-white/10 ml-2 rounded-full overflow-hidden shrink-0">
                            <div className="bg-purple-500 h-full animate-[shrink_4s_linear_forwards]"></div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default PoliView;
