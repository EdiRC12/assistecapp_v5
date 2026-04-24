import React, { useState, useEffect } from 'react';
import { 
    History, Search, Printer, ChevronRight, 
    Headphones, AlertOctagon, ClipboardList, 
    MessageCircle, Settings2, Plane, FileText,
    Clock, CheckCircle2, AlertCircle, X, SearchCode
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import useIsMobile from '../hooks/useIsMobile';

const TRACE_TYPES = [
    { id: 'OT', label: 'OT (Ocorrência)', icon: Headphones, color: 'text-amber-500', table: 'sac_tickets', field: 'appointment_number', clientField: 'client_name' },
    { id: 'RNC', label: 'RNC (Não Conformidade)', icon: AlertOctagon, color: 'text-rose-500', table: 'rnc_records', field: 'rnc_number', clientField: 'client_name', labelPrefix: 'RNC INTERNAL #' },
    { id: 'RI', label: 'RI (Interação)', icon: MessageCircle, color: 'text-sky-500', table: 'simple_tickets', field: 'appointment_number', clientField: 'client_name' },
    { id: 'TASK', label: 'Tarefa', icon: ClipboardList, color: 'text-indigo-500', table: 'tasks', field: 'id', altSearchField: 'title', clientField: 'client' },
    { id: 'TEST', label: 'Teste (Industrial)', icon: Settings2, color: 'text-slate-500', table: 'tech_tests', field: 'test_number', clientField: 'client_name' }
];

const TraceabilityView = ({ 
    onEditTask, 
    onEditTest,
    onOpenJourneyReport,
    onOpenTravels,
    onViewTechnicalReport,
    notifyError,
    notifyWarning 
}) => {
    const isMobile = useIsMobile();
    const [filterType, setFilterType] = useState('OT');
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const [sortOrder, setSortOrder] = useState('DESC'); // Descending (recent first)
    const [anchorRecord, setAnchorRecord] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // 1. Autocomplete Logic
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchValue.trim().length < 1) {
                setSuggestions([]);
                return;
            }

            try {
                const config = TRACE_TYPES.find(t => t.id === filterType);
                if (!config) return;
                
                // Limpar o valor de busca se contiver o prefixo (Ex: "RNC INTERNAL #2" -> "2")
                let pureSearch = searchValue.trim();
                
                if (config.labelPrefix && pureSearch.toUpperCase().includes(config.labelPrefix.toUpperCase())) {
                    pureSearch = pureSearch.toUpperCase().replace(config.labelPrefix.toUpperCase(), '').trim();
                }

                // Remover o caractere '#' se o usuário pesquisar como "#1"
                if (pureSearch.startsWith('#')) {
                    pureSearch = pureSearch.substring(1).trim();
                }

                if (!pureSearch && searchValue.length >= 1) {
                    // Se o usuário digitou apenas o prefixo (ex: "RNC #"), mostramos resultados recentes
                    const { data: recentData, error: recentErr } = await supabase.from(config.table)
                        .select(`${config.field}, ${config.clientField}${config.id === 'TASK' ? ', title' : ''}`)
                        .order('created_at', { ascending: false })
                        .limit(8);
                    if (!recentErr) setSuggestions(processData(recentData, config));
                    return;
                }

                // Construir query inteligente: busca no código OU no nome do cliente
                const isNumericType = ['RNC', 'OT', 'RI'].includes(config.id);
                const isPureNumber = /^\d+$/.test(pureSearch);
                
                let query = supabase.from(config.table).select(`${config.field}, ${config.clientField}${config.id === 'TASK' ? ', title' : ''}`);
                
                if (config.id === 'TASK') {
                    // Tarefa busca Título ou Cliente
                    query = query.or(`${config.altSearchField}.ilike.%${pureSearch}%,${config.clientField}.ilike.%${pureSearch}%`);
                } else if (isNumericType) {
                    // Para tipos numéricos, tratamos diferente se for número puro ou texto (cliente)
                    if (isPureNumber) {
                        // Se for número, buscamos igualdade no ID ou parte no nome do cliente
                        query = query.or(`${config.field}.eq.${pureSearch},${config.clientField}.ilike.%${pureSearch}%`);
                    } else if (pureSearch) {
                        // Se for texto, buscamos apenas no nome do cliente
                        query = query.ilike(config.clientField, `%${pureSearch}%`);
                    } else {
                        // Vazio (ex: só prefixo), trazemos recentes
                        query = query.order('created_at', { ascending: false });
                    }
                } else {
                    // Tipos texto (TEST)
                    if (!pureSearch) {
                        query = query.order('created_at', { ascending: false });
                    } else {
                        query = query.or(`${config.field}.ilike.%${pureSearch}%,${config.clientField}.ilike.%${pureSearch}%`);
                    }
                }

                const { data, error } = await query.limit(8);

                if (error) {
                    console.error('[Traceability] Erro na busca de sugestões:', error);
                    // Tentativa de fallback simplificada
                    if (isNumericType) {
                        const fallbackQuery = supabase.from(config.table)
                            .select(`${config.field}, ${config.clientField}`)
                            .or(`${config.field}.eq.${pureSearch},${config.clientField}.ilike.%${pureSearch}%`);
                        const { data: fbData, error: fbErr } = await fallbackQuery.limit(8);
                        if (!fbErr && fbData) {
                            setSuggestions(processData(fbData, config));
                            return;
                        }
                    }
                    throw error;
                }
                
                setSuggestions(processData(data, config));
            } catch (err) {
                console.error('Error fetching suggestions:', err);
            }
        };

        const processData = (items, cfg) => {
            return (items || []).map(item => {
                const code = item[cfg.field];
                const client = item[cfg.clientField] || 'Sem identificação';
                
                let displayString = '';
                if (cfg.id === 'TASK') {
                    displayString = `[${client}] - ${item.title || 'Sem título'}`;
                } else if (cfg.labelPrefix) {
                    displayString = `${cfg.labelPrefix}${code} - ${client}`;
                } else {
                    displayString = `[${code}] - ${client}`;
                }

                return { value: code, display: displayString };
            });
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [searchValue, filterType]);

    const handleSearch = async (forcedValue = null) => {
        let val = forcedValue || searchValue;
        if (!val) {
            notifyWarning?.('Aviso', 'Por favor, informe o número do registro.');
            return;
        }

        const config = TRACE_TYPES.find(t => t.id === filterType);
        
        // Limpeza de prefixo antes da busca (Ex: "RNC INTERNAL #2" -> "2")
        if (config.labelPrefix && val.toString().toUpperCase().includes(config.labelPrefix.toUpperCase())) {
            val = val.toString().toUpperCase().replace(config.labelPrefix.toUpperCase(), '').trim();
        }

        // Remover '#' extra se presente no início
        if (val.toString().startsWith('#')) {
            val = val.toString().substring(1).trim();
        }

        // Validação de tipo: se for numérico, val deve ser um número puro
        const isNumericType = ['RNC', 'OT', 'RI'].includes(config.id);
        if (isNumericType && isNaN(val) && val !== '') {
            notifyWarning?.('Busca Inválida', `Para buscar ${config.label}, informe apenas o número ou utilize as sugestões do menu.`);
            return;
        }

        setLoading(true);
        setShowSuggestions(false);
        setEvents([]);
        setAnchorRecord(null);

        try {
            const config = TRACE_TYPES.find(t => t.id === filterType);
            
            // 1. Encontrar o Registro Ancora
            const { data: anchor, error: anchorError } = await supabase
                .from(config.table)
                .select('*')
                .eq(config.field, val)
                .maybeSingle();

            if (anchorError) throw anchorError;
            if (!anchor) {
                notifyWarning?.('Não encontrado', `Nenhum registro de ${config.label} encontrado com este número.`);
                setLoading(false);
                return;
            }

            setAnchorRecord(anchor);

            // 2. Coletar IDs de ligação de forma recursiva
            const sacId = anchor.parent_sac_id || (filterType === 'OT' ? anchor.id : null);
            const rncId = anchor.parent_rnc_id || (filterType === 'RNC' ? anchor.id : null);
            const riId = anchor.parent_ri_id || (filterType === 'RI' ? anchor.id : null);
            const testId = anchor.parent_test_id || (filterType === 'TEST' ? anchor.id : null);
            const linkedTaskIdFromTest = (filterType === 'TEST' && anchor.converted_task_id) ? anchor.converted_task_id : null;

            // 3. Construir filtros dinâmicos para evitar erros de sintaxe com 'null'
            const buildFilter = (conditions) => conditions.filter(c => c.value).map(c => `${c.field}.eq.${c.value}`).join(',');

            const sacFilters = buildFilter([
                { field: 'id', value: sacId },
                { field: 'rnc_id', value: rncId }
            ]);

            const rncFilters = buildFilter([
                { field: 'id', value: rncId },
                { field: 'parent_sac_id', value: sacId }
            ]);

            const taskFilters = buildFilter([
                { field: 'id', value: linkedTaskIdFromTest },
                { field: 'parent_sac_id', value: sacId },
                { field: 'parent_rnc_id', value: rncId },
                { field: 'parent_test_id', value: testId },
                { field: 'parent_test_number', value: (filterType === 'TEST' ? val : anchor.test_number) }
            ]);

            const reportFilters = buildFilter([
                { field: 'sac_id', value: sacId },
                { field: 'rnc_id', value: rncId },
                { field: 'task_id', value: linkedTaskIdFromTest }
            ]);

            const followupFilters = buildFilter([
                { field: 'converted_task_id', value: linkedTaskIdFromTest }
            ]);

            // 4. Buscar tudo relacionado em paralelo (apenas se houver filtros)
            const queries = [
                sacFilters ? supabase.from('sac_tickets').select('id, appointment_number, subject, created_at, status').or(sacFilters) : Promise.resolve({ data: [] }),
                rncFilters ? supabase.from('rnc_records').select('id, rnc_number, subject, created_at, status').or(rncFilters) : Promise.resolve({ data: [] }),
                supabase.from('simple_tickets').select('id, appointment_number, subject, created_at, status').or(`id.eq.${riId},converted_to_ot_id.eq.${sacId}`),
                taskFilters ? supabase.from('tasks').select('id, title, created_at, status, category, travels, parent_sac_id, parent_rnc_id, parent_test_id, parent_test_number').or(taskFilters) : Promise.resolve({ data: [] }),
                supabase.from('returns').select('id, created_at, status').or(`sac_id.eq.${sacId},rnc_id.eq.${rncId}`),
                reportFilters ? supabase.from('task_reports').select('id, task_id, sac_id, rnc_id, created_at, status, report_type').or(reportFilters) : Promise.resolve({ data: [] }),
                followupFilters ? supabase.from('tech_followups').select('id, created_at, status, client_name, subject, converted_task_id').or(followupFilters) : Promise.resolve({ data: [] })
            ];

            const results = await Promise.all(queries);
            
            // 5. Fragmentar e Normalizar Eventos
            const allEvents = [];

            // Adicionar Ancora
            allEvents.push({
                id: anchor.id,
                date: anchor.created_at,
                type: filterType,
                title: anchor.subject || anchor.title || anchor.client_name || 'Registro Principal',
                description: `Documento de Origem: ${val}`,
                status: anchor.status,
                rawData: anchor
            });

            // Processar resultados
            const [sacs, rncs, ris, tasks, returns, reports, followups] = results.map(r => r.data || []);

            sacs.forEach(item => {
                if (item.id === anchor.id && filterType === 'OT') return;
                allEvents.push({
                    id: item.id,
                    date: item.created_at,
                    type: 'OT',
                    title: `OT #${item.appointment_number}`,
                    description: item.subject,
                    status: item.status,
                    rawData: item
                });
            });

            rncs.forEach(item => {
                if (item.id === anchor.id && filterType === 'RNC') return;
                allEvents.push({
                    id: item.id,
                    date: item.created_at,
                    type: 'RNC',
                    title: `RNC #${item.rnc_number}`,
                    description: item.subject,
                    status: item.status,
                    rawData: item
                });
            });

            tasks.forEach(item => {
                if (item.id === anchor.id && filterType === 'TASK') return;
                allEvents.push({
                    id: item.id,
                    date: item.created_at,
                    type: 'TASK',
                    title: `Tarefa: ${item.title}`,
                    description: `Categoria: ${item.category}`,
                    status: item.status,
                    rawData: item
                });

                // Viagens dentro da tarefa
                const travels = item.travels || [];
                travels.forEach((tr, idx) => {
                    allEvents.push({
                        id: `${item.id}-travel-${idx}`,
                        date: tr.departure_date || item.created_at,
                        type: 'TRAVEL',
                        title: `Viagem: ${tr.destination || item.title || 'Indefinida'}`,
                        description: `Responsável: ${tr.driver || 'Não inf.'} - KM: ${tr.km_start || 0} ${tr.vehicle ? `(${tr.vehicle})` : ''}`,
                        status: 'INFO',
                        parentTask: item
                    });
                });
            });

            reports.forEach(item => {
                allEvents.push({
                    id: item.id,
                    date: item.created_at,
                    type: 'REPORT',
                    title: `Relatório Técnico (${item.report_type})`,
                    description: `Vínculo: ${item.task_id ? 'Tarefa' : item.sac_id ? 'SAC' : 'RNC'}`,
                    status: item.status,
                    rawData: item
                });
            });

            followups.forEach(item => {
                allEvents.push({
                    id: item.id,
                    date: item.created_at,
                    type: 'FOLLOWUP',
                    title: `Acompanhamento: ${item.subject}`,
                    description: `Status: ${item.status}`,
                    status: item.status,
                    rawData: item
                });
            });

            // Remover duplicados por ID
            const uniqueEvents = Array.from(new Map(allEvents.map(ev => [ev.id, ev])).values());

            // Ordenar
            uniqueEvents.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
            });

            setEvents(uniqueEvents);

        } catch (error) {
            console.error('Error tracking flow:', error);
            notifyError?.('Erro', 'Não foi possível carregar o histórico de rastreabilidade.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getIcon = (type) => {
        switch (type) {
            case 'OT': return <Headphones size={18} className="text-amber-500" />;
            case 'RNC': return <AlertOctagon size={18} className="text-rose-500" />;
            case 'RI': return <MessageCircle size={18} className="text-sky-500" />;
            case 'TASK': return <ClipboardList size={18} className="text-indigo-500" />;
            case 'TRAVEL': return <Plane size={18} className="text-sky-400" />;
            case 'REPORT': return <FileText size={18} className="text-emerald-500" />;
            case 'FOLLOWUP': return <History size={18} className="text-purple-500" />;
            default: return <FileText size={18} className="text-slate-400" />;
        }
    };

    return (
        <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            
            {/* Header Control Panel */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
                            <History size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Rastreabilidade Universal</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Cruzamento de fluxos e histórico de atendimento</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative">
                        <select 
                            value={filterType}
                            onChange={(e) => {
                                setFilterType(e.target.value);
                                setSuggestions([]);
                            }}
                            className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-500 text-slate-600 cursor-pointer"
                        >
                            {TRACE_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>

                        <div className="relative group flex-1 md:flex-none md:w-48">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Número..."
                                value={searchValue}
                                onChange={(e) => {
                                    setSearchValue(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                            />

                            {/* Autocomplete Suggestions */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setSearchValue(s.value);
                                                setShowSuggestions(false);
                                                handleSearch(s.value);
                                            }}
                                            className="w-full px-5 py-3 text-left text-xs font-black text-slate-600 hover:bg-brand-50 hover:text-brand-600 border-b border-slate-50 last:border-none transition-colors flex items-center justify-between group"
                                        >
                                            <span className="truncate pr-4">{s.display}</span>
                                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => handleSearch()}
                            disabled={loading}
                            className="h-12 px-8 bg-brand-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-700 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Buscando...' : 'Rastrear'}
                        </button>

                        <button 
                            onClick={handlePrint}
                            className="h-12 w-12 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                            title="Imprimir Histórico"
                        >
                            <Printer size={18} />
                        </button>
                    </div>
                </div>

                {anchorRecord && (
                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Processo Selecionado:</span>
                            <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-100 italic">
                                {filterType} #{searchValue}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Filtro de Ordem:</span>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button 
                                    onClick={() => setSortOrder('DESC')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${sortOrder === 'DESC' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                                >
                                    MAIS RECENTES
                                </button>
                                <button 
                                    onClick={() => setSortOrder('ASC')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${sortOrder === 'ASC' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                                >
                                    ANTIGOS PRIMEIRO
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline Results */}
            <div className={`flex-1 flex flex-col min-h-0 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8 printable-area ${loading ? 'opacity-50' : ''}`}>
                
                {/* Print Header */}
                <div className="hidden print:flex flex-col mb-8 border-b-2 border-slate-900 pb-4">
                    <h1 className="text-2xl font-black uppercase tracking-tight">Relatório de Rastreabilidade</h1>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Origem: {filterType} #{searchValue} | Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {!loading && events.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 grayscale opacity-40 print:hidden">
                        <SearchCode size={64} className="text-slate-300" />
                        <div className="text-center">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Aguardando busca...</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Selecione o tipo e número do registro inicial</p>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 print:overflow-visible">
                    <div className="relative space-y-8">
                        {/* Vertical line connector */}
                        {events.length > 0 && (
                            <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-slate-100 print:bg-slate-200" />
                        )}

                        {events.map((ev, idx) => (
                            <div key={idx} className="relative flex items-start gap-6 group animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                {/* Icon Dot */}
                                <div className="z-10 w-12 h-12 rounded-2xl bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    {getIcon(ev.type)}
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 pb-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                {new Date(ev.date).toLocaleDateString('pt-BR')} {new Date(ev.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">{ev.title}</h3>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 print:hidden">
                                            <button 
                                                onClick={() => {
                                                    if (ev.type === 'OT') {
                                                        onOpenJourneyReport?.('SAC', ev.rawData);
                                                    } else if (ev.type === 'RI') {
                                                        onOpenJourneyReport?.('RI', ev.rawData);
                                                    } else if (ev.type === 'TASK') {
                                                        onEditTask?.(ev.rawData);
                                                    } else if (ev.type === 'RNC') {
                                                        onOpenJourneyReport?.('RNC', ev.rawData);
                                                    } else if (ev.type === 'TEST') {
                                                        onEditTest?.(ev.rawData);
                                                    } else if (ev.type === 'REPORT') {
                                                        if (ev.rawData?.task_id) {
                                                            onViewTechnicalReport?.(ev.rawData.task_id);
                                                        } else {
                                                            const origin = ev.rawData?.rnc_id ? 'RNC' : 'SAC';
                                                            const id = ev.rawData?.rnc_id || ev.rawData?.sac_id;
                                                            onOpenJourneyReport?.(origin, { id });
                                                        }
                                                    } else if (ev.type === 'TRAVEL' && onOpenTravels) {
                                                        const searchTag = ev.parentTask?.parent_test_number || ev.parentTask?.title || '';
                                                        onOpenTravels(searchTag);
                                                    }
                                                }}
                                                className="px-4 py-1.5 bg-slate-50 hover:bg-brand-50 text-slate-400 hover:text-brand-600 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-transparent hover:border-brand-100 flex items-center gap-2"
                                            >
                                                Acessar <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase italic leading-relaxed">{ev.description}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter ${
                                            ev.status === 'FECHADO' || ev.status === 'RESOLVIDO' || ev.status === 'DONE' || ev.status === 'APROVADO' ? 'bg-emerald-50 text-emerald-600' :
                                            ev.status === 'ABERTO' || ev.status === 'PENDENTE' ? 'bg-rose-50 text-rose-600' : 
                                            'bg-slate-50 text-slate-500'
                                        }`}>
                                            {ev.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraceabilityView;
