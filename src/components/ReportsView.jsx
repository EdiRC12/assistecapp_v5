import React, { useState, useEffect } from 'react';
import {
    FileText, Search, Filter, Trash2, ArrowRight, Clock, User, Calendar,
    Eye, Edit, Printer, X, ChevronDown, Image as ImageIcon, Paperclip,
    ChevronLeft, ArrowUpRight, Coins, TrendingUp, BarChart3, PieChart, Target, History, Package,
    ClipboardList, Brain, Sparkles, Info, FileSpreadsheet, MessageSquare, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { CategoryLabels } from '../constants/taskConstants';
import TechnicalReportModal from './TechnicalReportModal';
import CommercialDashboard from './CommercialDashboard';
import useIsMobile from '../hooks/useIsMobile';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo_plastimarau.png';
import * as XLSX from 'xlsx';
import ReportModal from './controls/modals/ReportModal';
import { MONTHS } from '../utils/controlsReporting';

const ReportsView = ({ onEditTask, currentUser, categories = [], users = [], tasks: allTasks = [], clients = [], notifySuccess, notifyError, notifyInfo }) => {
    const isMobile = useIsMobile();
    const [reports, setReports] = useState([]);
    const [mainCategory, setMainCategory] = useState(null); // 'TASKS', 'CONTROLS' or 'SERVICE'
    const [subCategory, setSubCategory] = useState(null); // 'DRAFT', 'FINALIZADO' | 'INVENTORY', 'AUDIT', 'TESTS' | 'JOURNEY', 'SUMMARY'
    const [loading, setLoading] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [showSnapshotModal, setShowSnapshotModal] = useState(false);

    // Filters
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [clientFilter, setClientFilter] = useState('');
    const [taskTypeFilter, setTaskTypeFilter] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [selectedJourney, setSelectedJourney] = useState(null);
    const [journeyData, setJourneyData] = useState(null);
    const [biTimeRange, setBiTimeRange] = useState('30');

    // Helper to get friendly category label
    const getCategoryLabel = (catValue) => {
        if (!catValue) return 'N/A';
        if (CategoryLabels[catValue]) return CategoryLabels[catValue];
        const customCat = categories.find(c => c.label === catValue || c.id === catValue);
        return customCat ? customCat.label : catValue;
    };

    // Helper to get user info locally since snapshots don't have FK joins anymore
    const getUserInfo = (userId, reportUser) => {
        if (reportUser) return reportUser; // In TASKS we still have the join
        const localUser = users.find(u => u.id === userId);
        return localUser || { username: 'Sistema', color: '#94a3b8' };
    };

    const fetchReports = async (category, type) => {
        if (!category || !type) return;
        setLoading(true);

        const isAll = type.endsWith('_ALL');
        const isPartial = type.endsWith('_PARTIAL');
        const isFinal = type.endsWith('_FINAL');

        setReports([]); // Clear previous results
        try {
            if (category === 'TASKS') {
                const { data, error } = await supabase
                    .from('task_reports')
                    .select(`
                        *,
                        tasks:task_id (id, title, client, category, trip_cost, trip_cost_currency),
                        users:user_id (username)
                    `)
                    .eq('status', type)
                    .not('report_type', 'eq', 'SERVICE_JOURNEY');

                if (error) throw error;
                const sorted = (data || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                setReports(sorted);
            } else if (category === 'CONTROLS') {
                const { data, error } = await supabase
                    .from('saved_reports')
                    .select('*')
                    .eq('type', type);

                if (error) throw error;
                const sorted = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setReports(sorted);
            } else if (category === 'SERVICE') {
                if (type === 'SUMMARY') {
                    const { data, error } = await supabase
                        .from('sac_tickets')
                        .select('id, created_at, status, rnc_id');

                    if (error) throw error;
                    const sorted = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setReports(sorted);
                } else if (type === 'SAVED_JOURNEYS') {
                    const { data, error } = await supabase
                        .from('task_reports')
                        .select('*, users:user_id (username, color)')
                        .eq('report_type', 'SERVICE_JOURNEY');

                    if (error) throw error;
                    const sorted = (data || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                    setReports(sorted);
                } else {
                    if (isAll) {
                        // Relatório Geral agora busca SNAPSHOTS consolidados na tabela saved_reports
                        const mgmtType = type.startsWith('SERVICE_SAC') ? 'MGMT_OT' :
                                       type.startsWith('SERVICE_RNC') ? 'MGMT_RNC' :
                                       type.startsWith('SERVICE_FOLLOWUP') ? 'MGMT_FOLLOWUP' :
                                       type.startsWith('SERVICE_RI') ? 'MGMT_RI' :
                                       type.startsWith('SERVICE_RETURNS') ? 'MGMT_RETURNS' : 'MGMT_GENERAL';

                        const { data, error } = await supabase
                            .from('saved_reports')
                            .select('*')
                            .eq('type', mgmtType);
                        
                        if (error) throw error;
                        setReports((data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
                        setLoading(false);
                        return;
                    }

                    // Caso contrário (Parciais/Finais), busca registros individuais em task_reports
                    let query = supabase.from('task_reports').select(`*, tasks:task_id (id, title, client, category), users:user_id (username)`);

                    if (isPartial) query = query.neq('status', 'FINALIZADO');
                    else if (isFinal) query = query.eq('status', 'FINALIZADO');
                    else if (type.startsWith('SERVICE_')) query = query.eq('status', 'FINALIZADO'); // Fallback

                    if (type.startsWith('SERVICE_SAC')) {
                        const { data: simpleIds } = await supabase.from('simple_tickets').select('id');
                        const riIds = (simpleIds || []).map(s => s.id);
                        query = query.eq('report_type', 'SERVICE_JOURNEY').not('sac_id', 'is', null).is('rnc_id', null).is('followup_id', null);
                        if (riIds.length > 0) query = query.not('sac_id', 'in', `(${riIds.join(',')})`);
                    } else if (type.startsWith('SERVICE_RNC')) {
                        query = query.eq('report_type', 'SERVICE_JOURNEY').not('rnc_id', 'is', null);
                    } else if (type.startsWith('SERVICE_FOLLOWUP')) {
                        query = query.eq('report_type', 'SERVICE_JOURNEY').not('followup_id', 'is', null);
                    } else if (type.startsWith('SERVICE_RI')) {
                        const { data: simpleData } = await supabase.from('simple_tickets').select('id');
                        const simpleIds = (simpleData || []).map(s => s.id);
                        query = query.eq('report_type', 'SERVICE_JOURNEY');
                        if (simpleIds.length > 0) query = query.in('sac_id', simpleIds);
                        else query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                    } else if (type.startsWith('SERVICE_RETURNS')) {
                        query = query.eq('report_type', 'SERVICE_RETURN');
                    } else {
                        query = query.eq('report_type', 'SERVICE_JOURNEY');
                    }

                    const { data, error } = await query;
                    if (error) throw error;

                    const mapped = (data || [])
                        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                        .map(r => ({
                            ...r,
                            id: r.id,
                            title: r.title || r.tasks?.title || `Relatório #${r.id.substring(0, 5)}`,
                            client_name: r.client_name || r.tasks?.client || 'Cliente não informado',
                            updated_at: r.updated_at,
                            created_at: r.created_at,
                            status: r.status,
                            sac_id: r.sac_id,
                            task_id: r.task_id,
                            is_journey: false
                        }));
                    setReports(mapped);
                }
            }
        } catch (error) {
            console.error("Erro ao buscar relatórios:", error);
            notifyError("Erro de Carregamento", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mainCategory && subCategory) {
            fetchReports(mainCategory, subCategory);
        }
    }, [mainCategory, subCategory]);

    useEffect(() => {
        const fetchJourneyDetails = async () => {
            if (!selectedJourney) {
                setJourneyData(null);
                return;
            }
            setLoading(true);
            try {
                let sac = null;
                let rnc = null;

                // 1. Tentar buscar Vinculo Base (SAC ou RI)
                if (selectedJourney.sac_id) {
                    // Tenta no SAC Tickets (OTs, FollowUps, Devoluções)
                    const { data: sacData } = await supabase
                        .from('sac_tickets')
                        .select('*, rnc_records!rnc_id(rnc_number, status, root_cause_ishikawa)')
                        .eq('id', selectedJourney.sac_id)
                        .maybeSingle();
                    
                    if (sacData) {
                        sac = sacData;
                    } else {
                        // Tenta no Simple Tickets (RI) - Usando maybeSingle para evitar erro se não existir
                        const { data: riData } = await supabase
                            .from('simple_tickets')
                            .select('*')
                            .eq('id', selectedJourney.sac_id)
                            .maybeSingle();
                        if (riData) {
                            sac = { ...riData, is_ri: true };
                        }
                    }
                }

                // 2. RNC Vinculada (Direta ou através do SAC)
                const finalRncId = selectedJourney.rnc_id || sac?.rnc_id;
                if (finalRncId) {
                    const { data: rncData } = await supabase
                        .from('rnc_records')
                        .select('*')
                        .eq('id', finalRncId)
                        .maybeSingle();
                    rnc = rncData;
                }

                // 3. Tarefas Vinculadas (Mantenha a lógica de OR para abranger ambos)
                const sacIdForQuery = sac?.id || selectedJourney.sac_id || '00000000-0000-0000-0000-000000000000';
                const rncIdForQuery = rnc?.id || selectedJourney.rnc_id || '00000000-0000-0000-0000-000000000000';

                const { data: tasksData } = await supabase
                    .from('tasks')
                    .select('*')
                    .or(`parent_sac_id.eq.${sacIdForQuery},parent_rnc_id.eq.${rncIdForQuery}`)
                    .order('created_at', { ascending: true });

                setJourneyData({ 
                    sac: sac || { id: selectedJourney.sac_id, client_name: selectedJourney.client_name }, 
                    rnc, 
                    tasks: tasksData || [] 
                });
            } catch (error) {
                console.error("Erro ao carregar jornada:", error);
                notifyError("Erro de Detalhamento", error.message);
            } finally {
                setLoading(true); // Manter carregando até o modal abrir
                setTimeout(() => setLoading(false), 500);
            }
        };

        fetchJourneyDetails();
    }, [selectedJourney]);

    const handleDelete = async (reportId) => {
        const report = reports.find(r => r.id === reportId);
        if (!report) return;

        const isServiceReport = mainCategory === 'SERVICE' && subCategory !== 'SAVED_JOURNEYS';
        const confirmMsg = isServiceReport
            ? `Excluir este relatório permanentemente?\n\nSe o registro de atendimento vinculado ainda estiver ativo, ele será reaberto automaticamente para que um novo relatório possa ser emitido.`
            : 'Excluir este registro permanentemente?';

        if (!window.confirm(confirmMsg)) return;

        try {
            // Determinar a tabela correta
            let table = 'saved_reports';
            if (mainCategory === 'TASKS') table = 'task_reports';
            if (mainCategory === 'SERVICE') table = 'task_reports'; // Todos os cards de SERVICE usam task_reports

            // Salvar o sac_id e rnc_id antes de deletar para reabrir o registro vinculado
            const sacId = report.sac_id;
            const rncId = report.rnc_id;
            const followupId = report.followup_id;

            const { error } = await supabase.from(table).delete().eq('id', reportId);
            if (error) throw error;

            // --- Lógica de Reabertura do Registro Vinculado ---
            if (isServiceReport) {
                // RI: sac_id aponta para simple_tickets
                if (subCategory === 'SERVICE_RI' && sacId) {
                    await supabase
                        .from('simple_tickets')
                        .update({ status: 'ABERTO', updated_at: new Date().toISOString() })
                        .eq('id', sacId);
                    notifySuccess('Relatório excluído', 'O Registro de Interação foi reaberto para novas emissões.');
                }
                // OT / SAC
                else if (subCategory === 'SERVICE_SAC' && sacId) {
                    await supabase
                        .from('sac_tickets')
                        .update({ status: 'EM_ANALISE', updated_at: new Date().toISOString() })
                        .eq('id', sacId);
                    notifySuccess('Relatório excluído', 'O atendimento OT foi reaberto para novas emissões.');
                }
                // RNC
                else if (subCategory === 'SERVICE_RNC' && rncId) {
                    await supabase
                        .from('rnc_records')
                        .update({ status: 'EM_EXECUCAO', updated_at: new Date().toISOString() })
                        .eq('id', rncId);
                    notifySuccess('Relatório excluído', 'A RNC foi reaberta para novas emissões.');
                }
                // Follow-up
                else if (subCategory === 'SERVICE_FOLLOWUP' && followupId) {
                    await supabase
                        .from('tech_followups')
                        .update({ stability_status: 'EM_MONITORAMENTO', updated_at: new Date().toISOString() })
                        .eq('id', followupId);
                    notifySuccess('Relatório excluído', 'O acompanhamento foi reaberto para novas emissões.');
                } else {
                    notifySuccess('Excluído!', 'Relatório removido com sucesso.');
                }
            } else {
                notifySuccess('Excluído!', 'Registro removido com sucesso.');
            }

            fetchReports(mainCategory, subCategory);
        } catch (error) {
            console.error('Erro ao excluir:', error);
            notifyError('Erro ao excluir', error.message);
        }
    };

    // handlePrint legado removido em favor da lógica interna do TechnicalReportModal

    const handleFileView = (url, filename = 'arquivo') => {
        if (!url || !url.startsWith('data:')) {
            window.open(url, '_blank');
            return;
        }
        try {
            const parts = url.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            if (contentType.startsWith('image/') || contentType === 'application/pdf') {
                const newWindow = window.open();
                if (newWindow) newWindow.location.href = blobUrl;
                else {
                    const link = document.createElement('a');
                    link.href = blobUrl; link.download = filename; link.click();
                }
            } else {
                const link = document.createElement('a');
                link.href = blobUrl; link.download = filename; link.click();
            }
        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            notifyError("Arquivo não suportado", "Não foi possível abrir este arquivo.");
        }
    };

    const handleExportSnapshot = (snapshot) => {
        if (!snapshot || !snapshot.raw_data) return;

        try {
            // Preparar dados para o Excel (achatar objetos se necessário)
            const exportData = (snapshot.raw_data || []).map(item => ({
                'Item/Cliente': item.client_name || item.title || 'N/A',
                'Status': item.status || 'N/A',
                'Quantidade': item.quantity || 0,
                'Unidade': item.unit || 'KG',
                'Depósito': item.stock_bin || '-',
                'Local': item.location || '-',
                'OP': item.op || '-',
                'Referência': item.justification_reason || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventário");

            // Gerar nome do arquivo
            const fileName = `Relatorio_${snapshot.type}_${snapshot.period.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
            XLSX.writeFile(wb, fileName);
            notifySuccess("Sucesso!", "O arquivo Excel foi gerado e o download deve iniciar em instantes.");
        } catch (error) {
            console.error("Erro ao exportar Excel:", error);
            notifyError("Erro na exportação", "Não foi possível gerar o arquivo Excel.");
        }
    };

    const handlePrintSummary = () => {
        if (filteredReports.length === 0) {
            notifyInfo?.('Aviso', 'Não há registros para imprimir com os filtros atuais.');
            return;
        }

        const printWindow = window.open('', '_blank');
        const titleLabel = subCategory.includes('SERVICE_SAC') ? 'OCORRÊNCIA TÉCNICA (OT)' :
                      subCategory.includes('SERVICE_RNC') ? 'NÃO CONFORMIDADE (RNC)' :
                      subCategory.includes('SERVICE_FOLLOWUP') ? 'FOLLOW-UP' :
                      subCategory.includes('SERVICE_RI') ? 'REGISTRO DE INTERAÇÃO (RI)' :
                      subCategory.includes('SERVICE_RETURNS') ? 'DEVOLUÇÕES' : 'RELATÓRIO';

        const monthName = monthFilter ? MONTHS.find(m => m.id === monthFilter)?.name : 'TODOS OS MESES';
        
        let html = `
            <html>
            <head>
                <title>Relatório de Gestão - ${titleLabel}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: white; }
                    table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 11px; }
                    th { background-color: #f8fafc; font-weight: 800; text-transform: uppercase; color: #475569; }
                    .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                    .footer { margin-top: 40px; font-size: 9px; color: #94a3b8; text-align: right; border-top: 1px solid #f1f5f9; padding-top: 10px; }
                    .summary-box { margin-top: 30px; font-weight: 800; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; display: inline-block; font-size: 14px; color: #0f172a; }
                    h1 { margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
                    .badge { padding: 4px 8px; rounded: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase; }
                    .status-final { color: #059669; }
                    .status-draft { color: #d97706; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>RESUMO DE GESTÃO: ${titleLabel}</h1>
                        <p style="margin:8px 0 0 0; font-size: 12px; font-weight: bold; color: #64748b;">FILTRO: ${monthName} / ${yearFilter}</p>
                    </div>
                    <div style="text-align: right;">
                        <img src="${logo}" style="height: 45px; filter: grayscale(100%);" />
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">Data Atualização</th>
                            <th style="width: 65%;">Cliente / Identificação do Registro</th>
                            <th style="width: 20%;">Status do Relatório</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredReports.map(r => `
                            <tr>
                                <td style="font-family: monospace;">${new Date(r.updated_at || r.created_at).toLocaleDateString()}</td>
                                <td style="font-weight: 600;">${(r.client_name || r.tasks?.client || r.title || 'N/A').toUpperCase()}</td>
                                <td class="${r.status === 'FINALIZADO' ? 'status-final' : 'status-draft'} font-black">
                                    ${r.status === 'FINALIZADO' ? '● FINALIZADO' : '○ RASCUNHO'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary-box">
                    QUANT TOTAL DE REGISTROS NO PERÍODO: ${filteredReports.length}
                </div>

                <div class="footer">
                    DOCUMENTO OFICIAL ASSISTEC • GERADO EM ${new Date().toLocaleString('pt-BR')}
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const filteredReports = reports.filter(r => {
        const matchesClient = !clientFilter || (
            (r.tasks?.client?.toLowerCase() || '').includes(clientFilter.toLowerCase()) ||
            (r.client_name?.toLowerCase() || '').includes(clientFilter.toLowerCase()) ||
            (r.title?.toLowerCase() || '').includes(clientFilter.toLowerCase())
        );

        // Somente aplica filtro de categoria para TASKS nativas ou Snapshots que tenham tasks
        const matchesTaskType = mainCategory === 'CONTROLS' || mainCategory === 'SERVICE' ? true : 
            (!taskTypeFilter || (r.tasks?.category?.toLowerCase() || '').includes(taskTypeFilter.toLowerCase()));

        const reportDate = new Date(r.updated_at || r.created_at);
        const matchesYear = !yearFilter || reportDate.getFullYear().toString() === yearFilter;
        const matchesMonth = !monthFilter || (reportDate.getMonth() + 1).toString() === monthFilter;

        return matchesClient && matchesTaskType && matchesYear && matchesMonth;
    });

    // 1. Splash Screen (Main Category Selection)
    if (!mainCategory) {
        return (
            <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-4 md:p-6 overflow-hidden">
                <div className="mb-4 md:mb-8">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-brand-600" size={isMobile ? 20 : 24} /> Central de Relatórios
                    </h1>
                    <p className="text-slate-500 text-[10px] md:text-sm">Selecione o tipo de relatório que deseja acessar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl">
                    <button
                        onClick={() => setMainCategory('TASKS')}
                        className="group bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-row md:flex-col items-center text-center md:text-center gap-4 md:gap-0"
                    >
                        <div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 md:mb-6 group-hover:scale-110 transition-transform shrink-0">
                            <ClipboardList size={isMobile ? 24 : 40} />
                        </div>
                        <div className="text-left md:text-center">
                            <h2 className="text-base md:text-xl font-bold text-slate-800 md:mb-2">Relatórios Técnicos</h2>
                            <p className="text-slate-500 text-[10px] md:text-sm md:mb-6">Visitas e tarefas específicas.</p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-full group-hover:bg-indigo-100 transition-colors ml-auto md:ml-0">
                            Acessar <ArrowRight size={16} />
                        </div>
                    </button>

                    <button
                        onClick={() => setMainCategory('SERVICE')}
                        className="group bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all duration-300 flex flex-row md:flex-col items-center text-center md:text-center gap-4 md:gap-0"
                    >
                        <div className="w-12 h-12 md:w-20 md:h-20 bg-brand-50 rounded-xl md:rounded-2xl flex items-center justify-center text-brand-600 md:mb-6 group-hover:scale-110 transition-transform shrink-0">
                            <History size={isMobile ? 24 : 40} />
                        </div>
                        <div className="text-left md:text-center">
                            <h2 className="text-base md:text-xl font-bold text-slate-800 md:mb-2">Atendimento</h2>
                            <p className="text-slate-500 text-[10px] md:text-sm md:mb-6">SACs, RNCs e Jornadas.</p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-brand-600 font-bold text-sm bg-brand-50 px-4 py-2 rounded-full group-hover:bg-brand-100 transition-colors ml-auto md:ml-0">
                            Ver Jornadas <ArrowUpRight size={16} />
                        </div>
                    </button>

                    <button
                        onClick={() => setMainCategory('CONTROLS')}
                        className="group bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-row md:flex-col items-center text-center md:text-center gap-4 md:gap-0"
                    >
                        <div className="w-12 h-12 md:w-20 md:h-20 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 md:mb-6 group-hover:scale-110 transition-transform shrink-0">
                            <BarChart3 size={isMobile ? 24 : 40} />
                        </div>
                        <div className="text-left md:text-center">
                            <h2 className="text-base md:text-xl font-bold text-slate-800 md:mb-2">Controles</h2>
                            <p className="text-slate-500 text-[10px] md:text-sm md:mb-6">Estoque e Inteligência.</p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-full group-hover:bg-emerald-100 transition-colors ml-auto md:ml-0">
                            Acessar <ArrowUpRight size={16} />
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // 2. Sub-Category Selection (Options based on Main Category)
    if (!subCategory) {
        return (
            <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-4 md:p-6 overflow-hidden">
                <div className={`flex items-center gap-2 md:gap-4 ${isMobile ? 'mb-4' : 'mb-8'}`}>
                    <button onClick={() => setMainCategory(null)} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"><ChevronLeft size={isMobile ? 20 : 24} /></button>
                    <div>
                        <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight`}>
                            {mainCategory === 'TASKS' ? <><ClipboardList className="text-indigo-600" size={isMobile ? 20 : 24} /> Técnicos</> :
                                mainCategory === 'SERVICE' ? <><History className="text-brand-600" size={isMobile ? 20 : 24} /> Atendimento</> :
                                    <><BarChart3 className="text-emerald-600" size={isMobile ? 20 : 24} /> Controles</>}
                        </h1>
                        <p className={`${isMobile ? 'text-[9px]' : 'text-sm'} text-slate-500 font-bold uppercase tracking-widest mt-0.5`}>Selecione uma categoria específica</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 max-w-5xl">
                    {mainCategory === 'TASKS' ? (
                        <>
                            <button onClick={() => setSubCategory('EM_ABERTO')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-amber-50 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><Clock size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">Parciais</h3>
                            </button>
                            <button onClick={() => setSubCategory('FINALIZADO')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><FileText size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">Finais</h3>
                            </button>
                        </>
                    ) : mainCategory === 'SERVICE' ? (
                        <>
                            <button onClick={() => setSubCategory('SERVICE_SAC')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-brand-50 rounded-xl md:rounded-2xl flex items-center justify-center text-brand-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><MessageSquare size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">OT — Ocorrência Técnica</h3>
                            </button>
                            <button onClick={() => setSubCategory('SERVICE_RNC')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-rose-50 rounded-xl md:rounded-2xl flex items-center justify-center text-rose-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><AlertTriangle size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">RNC — Não Conformidade</h3>
                            </button>
                            <button onClick={() => setSubCategory('SERVICE_FOLLOWUP')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><History size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">Follow-ups Técnicos</h3>
                            </button>
                            <button onClick={() => setSubCategory('SERVICE_RI')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><Search size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">RI — Registro de Interação</h3>
                            </button>
                            <button onClick={() => setSubCategory('SERVICE_RETURNS')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-amber-50 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><Coins size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">Devoluções</h3>
                            </button>
                            <button onClick={() => setSubCategory('SUMMARY')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-600 mb-2 md:mb-4 group-hover:rotate-6 transition-transform"><TrendingUp size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800">BI / Dash</h3>
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setSubCategory('INVENTORY')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-brand-50 rounded-xl md:rounded-2xl flex items-center justify-center text-brand-600 mb-2 md:mb-4 group-hover:scale-110 transition-transform"><Package size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800 uppercase tracking-tighter">Estoque</h3>
                            </button>
                            <button onClick={() => setSubCategory('AUDIT')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-rose-50 rounded-xl md:rounded-2xl flex items-center justify-center text-rose-600 mb-2 md:mb-4 group-hover:scale-110 transition-transform"><Target size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800 uppercase tracking-tighter">Custos</h3>
                            </button>
                            <button onClick={() => setSubCategory('TESTS')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 mb-2 md:mb-4 group-hover:scale-110 transition-transform"><FileText size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800 uppercase tracking-tighter">Testes</h3>
                            </button>
                            <button onClick={() => setSubCategory('ADJUSTMENTS')} className="group bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                                <div className="w-10 h-10 md:w-16 md:h-16 bg-rose-50 rounded-xl md:rounded-2xl flex items-center justify-center text-rose-600 mb-2 md:mb-4 group-hover:scale-110 transition-transform"><History size={isMobile ? 24 : 32} /></div>
                                <h3 className="font-bold text-xs md:text-sm text-slate-800 uppercase tracking-tighter">Furos</h3>
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // 2.5 Service Sub-Category Selection (Partial vs Final)
    if (['SERVICE_SAC', 'SERVICE_RNC', 'SERVICE_FOLLOWUP', 'SERVICE_RI', 'SERVICE_RETURNS'].includes(subCategory)) {
        const config = {
            SERVICE_SAC: { title: 'OT — Ocorrência Técnica', color: 'text-brand-600', icon: MessageSquare, bg: 'bg-brand-50' },
            SERVICE_RNC: { title: 'RNC — Não Conformidade', color: 'text-rose-600', icon: AlertTriangle, bg: 'bg-rose-50' },
            SERVICE_FOLLOWUP: { title: 'Follow-ups Técnicos', color: 'text-indigo-600', icon: History, bg: 'bg-indigo-50' },
            SERVICE_RI: { title: 'RI — Registro de Interação', color: 'text-emerald-600', icon: Search, bg: 'bg-emerald-50' },
            SERVICE_RETURNS: { title: 'Devoluções', color: 'text-amber-600', icon: Coins, bg: 'bg-amber-50' }
        }[subCategory];

        const Icon = config.icon;

        return (
            <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-4 md:p-6 overflow-hidden">
                <div className={`flex items-center gap-2 md:gap-4 ${isMobile ? 'mb-4' : 'mb-8'}`}>
                    <button onClick={() => setSubCategory(null)} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"><ChevronLeft size={isMobile ? 20 : 24} /></button>
                    <div>
                        <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight`}>
                            {Icon && <Icon className={config.color} size={isMobile ? 20 : 24} />} {config.title}
                        </h1>
                        <p className={`${isMobile ? 'text-[9px]' : 'text-sm'} text-slate-500 font-bold uppercase tracking-widest mt-0.5`}>Selecione o estado dos relatórios</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 max-w-4xl">
                    <button 
                        onClick={() => setSubCategory(`${subCategory}_PARTIAL`)} 
                        className="group bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-4"
                    >
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:rotate-6 transition-transform">
                            <Clock size={28} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm md:text-base text-slate-800 uppercase">Parciais</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Em aberto</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setSubCategory(`${subCategory}_FINAL`)} 
                        className="group bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-4"
                    >
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:rotate-6 transition-transform">
                            <CheckCircle2 size={28} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm md:text-base text-slate-800 uppercase">Finalizados</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Concluídos</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setSubCategory(`${subCategory}_ALL`)} 
                        className="group bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-4 col-span-2 md:col-span-1"
                    >
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:rotate-6 transition-transform">
                            <BarChart3 size={28} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm md:text-base text-slate-800 uppercase">Relatório Geral</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão e Auditoria</p>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // 3. Commercial Dashboard View
    if (subCategory === 'SUMMARY') {
        return (
            <CommercialDashboard
                clients={clients}
                tasks={allTasks}
                timeRange={biTimeRange}
                onClose={() => setSubCategory(null)}
                currentUser={currentUser}
            />
        );
    }

    // 4. Final List View
    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-3 md:p-6 overflow-hidden">
            {/* Header with Back Button */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={() => setSubCategory(null)}
                        className="p-1.5 md:p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                        title="Voltar"
                    >
                        <ChevronLeft size={isMobile ? 20 : 24} />
                    </button>
                    <div>
                        <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight`}>
                            {subCategory === 'INVENTORY' ? 'Estoque' :
                             subCategory === 'AUDIT' ? 'Custos' :
                             subCategory === 'TESTS' ? 'Engenharia' :
                             subCategory === 'ADJUSTMENTS' ? 'Histórico de Furos' :
                             subCategory.includes('SERVICE_SAC') ? 'OT — ' + (subCategory.includes('PARTIAL') ? 'Parciais' : subCategory.includes('FINAL') ? 'Finalizados' : 'Geral') :
                             subCategory.includes('SERVICE_RNC') ? 'RNC — ' + (subCategory.includes('PARTIAL') ? 'Parciais' : subCategory.includes('FINAL') ? 'Finalizados' : 'Geral') :
                             subCategory.includes('SERVICE_FOLLOWUP') ? 'Follow-up — ' + (subCategory.includes('PARTIAL') ? 'Parciais' : subCategory.includes('FINAL') ? 'Finalizados' : 'Geral') :
                             subCategory.includes('SERVICE_RI') ? 'RI — ' + (subCategory.includes('PARTIAL') ? 'Parciais' : subCategory.includes('FINAL') ? 'Finalizados' : 'Geral') :
                             subCategory.includes('SERVICE_RETURNS') ? 'Devoluções — ' + (subCategory.includes('PARTIAL') ? 'Parciais' : subCategory.includes('FINAL') ? 'Finalizados' : 'Geral') :
                             subCategory === 'SAVED_JOURNEYS' ? 'Jornadas' : 'Relatórios'}
                        </h1>
                        <p className={`${isMobile ? 'text-[x-small]' : 'text-sm'} text-brand-600 font-black uppercase tracking-widest mt-0.5`}>
                            {filteredReports.length} {filteredReports.length === 1 ? 'Registro Encontrado' : 'Registros Encontrados'} no Período
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handlePrintSummary} 
                        className="flex items-center gap-2 text-slate-600 font-bold text-[10px] md:text-sm bg-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-widest"
                    >
                        <Printer size={16} /> <span className="hidden md:inline">Imprimir Resumo</span>
                    </button>
                    <button onClick={() => fetchReports(mainCategory, subCategory)} className="text-brand-600 font-bold text-[10px] md:text-sm bg-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-widest">Atualizar</button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-2 md:p-4 rounded-xl border border-slate-200 shadow-sm mb-3 md:mb-6 flex flex-wrap gap-2 md:gap-4 items-center">
                <div className="relative min-w-[150px] md:min-w-[200px] flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-[10px] md:text-sm focus:outline-none focus:border-brand-500"
                    />
                </div>

                {(mainCategory === 'TASKS' || mainCategory === 'SERVICE') && (
                    <select
                        value={taskTypeFilter}
                        onChange={(e) => setTaskTypeFilter(e.target.value)}
                        className="px-2 md:px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-[10px] md:text-sm focus:outline-none focus:border-brand-500 min-w-[100px] md:min-w-[140px]"
                    >
                        <option value="">Tipos</option>
                        {[...new Set(reports.map(r => r.tasks?.category).filter(Boolean))].sort().map(cat => (
                            <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                        ))}
                    </select>
                )}

                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Ano"
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="px-2 md:px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-[10px] md:text-sm w-12 md:w-20 focus:outline-none focus:border-brand-500"
                    />
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="px-2 md:px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-[10px] md:text-sm focus:outline-none focus:border-brand-500 min-w-[90px] md:min-w-[120px]"
                    >
                        <option value="">Meses</option>
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 mt-4 text-sm font-medium">Buscando documentos...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-400 italic">Nenhum registro encontrado nesta categoria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pb-10">
                        {filteredReports.map(report => {
                            const isConsolidated = subCategory.endsWith('_ALL');
                            return (
                            <div key={report.id} className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-bold text-slate-800 text-xs line-clamp-2 flex-1 group-hover:text-brand-600 transition-colors uppercase tracking-tight">
                                        {!isConsolidated && mainCategory === 'SERVICE' && (
                                            report.followup_id ? <span className="text-blue-600">FOLLOW-UP | </span> :
                                                report.ri_id ? <span className="text-emerald-600">RI | </span> :
                                                    report.rnc_id ? <span className="text-rose-600">RNC | </span> :
                                                        <span className="text-indigo-600">OC | </span>
                                        )}
                                        {report.title}
                                    </h3>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${isConsolidated || mainCategory === 'CONTROLS' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : (report.status === 'FINALIZADO' || report.status === 'FINAL') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                        {isConsolidated ? 'Gestão' : mainCategory === 'CONTROLS' ? 'Snapshot' : (report.status === 'FINALIZADO' || report.status === 'FINAL') ? 'Finalizado' : 'Parcial'}
                                    </span>
                                </div>

                                <div className="space-y-1.5 mb-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-700">
                                        {mainCategory === 'TASKS' ? (
                                            <><User size={12} className="text-slate-400" /><span className="font-bold truncate">{report.tasks?.client || 'Cliente não informado'}</span></>
                                        ) : mainCategory === 'SERVICE' ? (
                                            <><User size={12} className="text-slate-400" /><span className="font-bold truncate">
                                                {report.sac_tickets?.client_name ||
                                                    report.rnc_records?.client_name ||
                                                    report.tech_followups?.client_name ||
                                                    report.simple_tickets?.client_name ||
                                                    report.client_name ||
                                                    'Cliente não informado'}
                                            </span></>
                                        ) : (
                                            <><Calendar size={12} className="text-slate-400" /><span className="font-bold">{report.period || 'Sem período'}</span></>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <FileText size={12} className="text-slate-400" />
                                        <span className="truncate font-medium">
                                            {mainCategory === 'TASKS' ? getCategoryLabel(report.tasks?.category) :
                                                mainCategory === 'SERVICE' ? (
                                                    report.followup_id ? (
                                                        <span className="text-blue-600 font-black">ACOMPANHAMENTO</span>
                                                    ) : report.ri_id ? (
                                                        <span className="text-emerald-600 font-black">REGISTRO DE RI</span>
                                                    ) : report.rnc_id ? (
                                                        <span className="text-rose-600 font-black">REGISTRO DE RNC</span>
                                                    ) : (
                                                        <span className="text-indigo-600 font-black">OCORRÊNCIA (SAC)</span>
                                                    )
                                                ) : `${report.raw_data_count || 0} registros incluídos`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <History size={12} className="text-slate-400" />
                                        <span>{new Date(report.updated_at || report.created_at).toLocaleDateString()} às {new Date(report.updated_at || report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        {mainCategory === 'SERVICE' ? (
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${(report.status === 'FINALIZADO' || report.status === 'FINAL') ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${(report.status === 'FINALIZADO' || report.status === 'FINAL') ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {(report.status === 'FINALIZADO' || report.status === 'FINAL') ? 'Concluído' : 'Rascunho / Aberto'}
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-white shadow-sm" style={{ backgroundColor: getUserInfo(report.user_id, report.users).color }}>
                                                    {getUserInfo(report.user_id, report.users).username?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600">{getUserInfo(report.user_id, report.users).username}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        {mainCategory === 'TASKS' ? (
                                            <>
                                                <button onClick={() => setSelectedReport(report)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Ver Detalhes"><Eye size={16} /></button>
                                                {!isMobile && (
                                                    <button onClick={async () => {
                                                        const { data: task } = await supabase.from('tasks').select('*').eq('id', report.task_id).single();
                                                        if (task) onEditTask(task);
                                                    }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Tarefa"><Edit size={16} /></button>
                                                )}
                                            </>
                                        ) : (mainCategory === 'SERVICE' && !isConsolidated) ? (
                                            (report.report_type === 'SERVICE_JOURNEY' || report.report_type === 'SERVICE_RETURN') ? (
                                                <button onClick={() => setSelectedReport(report)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Ver Relatório Profissional">
                                                    <Eye size={16} />
                                                </button>
                                            ) : (
                                                <button onClick={() => setSelectedJourney(report)} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-[10px] font-black rounded-lg hover:bg-brand-100 transition-all flex items-center gap-1.5 uppercase">
                                                    <Eye size={14} /> Abrir Ficha
                                                </button>
                                            )
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    setSelectedSnapshot(report);
                                                    setShowSnapshotModal(true);
                                                }} 
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5 uppercase" 
                                                title="Abrir Histórico"
                                            >
                                                <Eye size={14} /> Ver Fechamento
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Viewer Modal (Shared for TASKS) */}
            <TechnicalReportModal
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                currentUser={currentUser}
                taskTypes={categories?.map(c => ({ id: c.id, name: c.label }))}
                onEditTask={async (taskId) => {
                    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
                    if (task) { onEditTask(task); setSelectedReport(null); }
                }}
            />

            {/* Snapshot Viewer Modal (Unificado com Controles) */}
            {selectedSnapshot && (
                <ReportModal
                    showReportModal={showSnapshotModal}
                    setShowReportModal={(val) => {
                        setShowSnapshotModal(val);
                        if (!val) setSelectedSnapshot(null);
                    }}
                    reportContext={selectedSnapshot.type}
                    reportTotals={selectedSnapshot.totals || {}}
                    aiAnalysis={selectedSnapshot.ai_analysis}
                    filteredReportData={selectedSnapshot.raw_data || []}
                    inventory={inventory}
                    tasks={allTasks}
                    period={selectedSnapshot.period}
                    MONTHS={MONTHS}
                    // Desativamos os botões de ação passando null
                    handleGenerateAIInsights={null}
                    handleSaveSnapshot={null}
                    selectedYear="ALL"
                    selectedMonth="ALL"
                />
            )}

            {/* Journey Viewer Modal (SAC -> RNC) */}
            {selectedJourney && journeyData && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 printable-area">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white no-print">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Ficha de Jornada do Atendimento</h2>
                                    <p className="text-[10px] text-brand-400 font-black uppercase tracking-widest">SAC #{journeyData.sac.appointment_number || 'N/A'} • {journeyData.sac.client_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="px-6 py-3 bg-brand-600 text-white text-[10px] font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95"
                                >
                                    <Printer size={16} /> Imprimir Ficha
                                </button>
                                <button onClick={() => setSelectedJourney(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-slate-50/50">
                            {/* SAC Info Card */}
                            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full border border-indigo-100 uppercase">ABERTURA SAC</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-tighter">
                                    <Info className="text-indigo-500" /> Detalhes da Solicitação
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Assunto do Chamado</label>
                                        <p className="text-sm font-bold text-slate-700">{journeyData.sac.subject}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data de Abertura</label>
                                        <p className="text-sm font-bold text-slate-700">{new Date(journeyData.sac.report_date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Descrição Inicial</label>
                                        <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100">{journeyData.sac.description}</p>
                                    </div>
                                </div>
                            </div>

                            {/* RNC Connection (if exists) */}
                            {journeyData.rnc ? (
                                <div className="bg-white p-6 rounded-[32px] border-2 border-brand-100 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <span className="px-3 py-1 bg-brand-50 text-brand-600 text-[10px] font-black rounded-full border border-brand-100 uppercase">EVOLUÇÃO RNC</span>
                                    </div>
                                    <h3 className="text-lg font-black text-brand-800 mb-4 flex items-center gap-2 uppercase tracking-tighter">
                                        <Target className="text-brand-500" /> Registro de Não Conformidade #{journeyData.rnc.rnc_number}
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100/50">
                                                <label className="text-[8px] font-black text-brand-400 uppercase tracking-widest block mb-1">Causa Raiz (Ishikawa)</label>
                                                <p className="text-xs font-bold text-brand-900">{journeyData.rnc.root_cause_ishikawa || 'Não informada'}</p>
                                            </div>
                                            <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                                                <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Status RNC</label>
                                                <p className="text-xs font-black text-emerald-700 uppercase">{journeyData.rnc.status}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 text-white p-6 rounded-[24px]">
                                            <label className="text-[8px] font-black text-brand-400 uppercase tracking-widest block mb-2">Ações Corretivas / Checklist</label>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar">
                                                {journeyData.rnc.checklist && journeyData.rnc.checklist.length > 0 ? (
                                                    journeyData.rnc.checklist.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.completed ? 'bg-emerald-400' : 'bg-brand-400 animate-pulse'}`}></div>
                                                            <span className={item.completed ? 'text-slate-400 line-through' : 'text-slate-200'}>{item.text}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs italic text-slate-500">Consulte o histórico de tarefas para detalhes operacionais.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 p-6 rounded-[32px] border border-dashed border-amber-200 text-center">
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-tight">Este atendimento não gerou uma Registro de Não Conformidade (RNC).</p>
                                </div>
                            )}

                            {/* Tasks Timeline */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
                                    <ClipboardList size={14} /> Histórico de Ações Operacionais (Kanban)
                                </h3>
                                <div className="space-y-3">
                                    {journeyData.tasks.length > 0 ? journeyData.tasks.map((task, idx) => (
                                        <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 group hover:border-brand-300 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                                    {task.title}
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase ${task.status === 'CONCLUÍDO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {task.status}
                                                    </span>
                                                </h4>
                                                <p className="text-[10px] text-slate-500 line-clamp-1">{task.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(task.created_at).toLocaleDateString()}</p>
                                                <p className="text-[8px] font-bold text-slate-300">CRIADA EM</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="bg-slate-100 p-8 rounded-[32px] text-center border border-dashed border-slate-300">
                                            <p className="text-xs text-slate-400 italic">Nenhuma tarefa operacional foi registrada no Kanban para este atendimento.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="text-center p-2 bg-white rounded-xl border border-slate-200 min-w-[80px]">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Tempo Total</span>
                                    <span className="text-xs font-black text-slate-800">{Math.ceil((new Date(journeyData.sac.updated_at) - new Date(journeyData.sac.created_at)) / (1000 * 60 * 60 * 24))} DIAS</span>
                                </div>
                                <div className="text-center p-2 bg-white rounded-xl border border-slate-200 min-w-[80px]">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Ações</span>
                                    <span className="text-xs font-black text-slate-800">{journeyData.tasks.length} TAREFAS</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setSelectedJourney(null)} className="px-6 py-3 text-slate-500 text-[10px] font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest">Fechar</button>
                                <button onClick={() => notifyInfo('Em breve', 'A exportação dessa ficha em PDF será implementada na próxima etapa.')} className="px-8 py-3 bg-brand-600 text-white text-[10px] font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center gap-2 uppercase tracking-widest">
                                    <Printer size={16} /> Imprimir Ficha de Jornada
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
