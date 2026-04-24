import React, { useState, useMemo } from 'react';
import { X, Printer, Calendar, User, MapPin, Clock, CheckSquare, AlertCircle, Paperclip, Activity, TrendingUp, Eye, List, Settings } from 'lucide-react';
import logo from '../assets/logo_plastimarau.png';

const TaskReport = ({ task, data, onClose, currentUser }) => {
    const [viewMode, setViewMode] = useState('overview'); // 'overview', 'detailed', or 'custom'

    // Custom fields selection
    const [customFields, setCustomFields] = useState({
        progress: true,
        basicInfo: true,
        dates: true,
        location: true,
        additionalFields: true,
        assignedUsers: true,
        stages: true,
        travels: true,
        comments: true,
        cancellationHistory: true,
        activityLog: true,
        attachments: true,
    });

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Não definida';
        return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'Não definida';
        const date = new Date(dateStr);
        return date.toLocaleString('pt-BR');
    };

    const StatusLabels = {
        TO_START: 'A Iniciar',
        IN_PROGRESS: 'Em Andamento',
        WAITING_CLIENT: 'Aguardando Cliente',
        CANCELED: 'Cancelada',
        DONE: 'Finalizada',
    };

    const PriorityLabels = {
        LOW: 'Baixa',
        MEDIUM: 'Média',
        HIGH: 'Alta',
    };

    const StageStatusLabels = {
        NOT_STARTED: 'Não Iniciada',
        IN_PROGRESS: 'Em Andamento',
        COMPLETED: 'Finalizada',
        DATE_TO_DEFINE: 'A Definir Data',
        DEVOLVIDO: 'Devolvido',
        SOLUCIONADO: 'Solucionado',
        'EM NEGOCIAÇÃO': 'Em Negociação',
        FINALIZADO: 'Finalizado',
        CANCELED: 'Cancelada',
    };

    // Calculate completion percentage
    const completionPercentage = useMemo(() => {
        if (!task.stages) return 0;
        const activeStages = Object.values(task.stages).filter(s => s?.active);
        if (activeStages.length === 0) return 0;

        const completedStages = activeStages.filter(s =>
            ['COMPLETED', 'SOLUCIONADO', 'FINALIZADO'].includes(s.status)
        );

        return Math.round((completedStages.length / activeStages.length) * 100);
    }, [task.stages]);

    // Extract cancellation and reopen events
    const cancellationHistory = useMemo(() => {
        if (!data.activityLogs) return [];
        return data.activityLogs.filter(log =>
            log.action?.includes('CANCELADA') ||
            log.action?.includes('REABERTA') ||
            log.details?.includes('CANCELADA') ||
            log.details?.includes('REABERTA')
        );
    }, [data.activityLogs]);

    // Helper to get stage observations (checking multiple possible field names)
    const getStageObservations = (stage) => {
        return stage.observation || stage.notes || stage.description || stage.obs || stage.observations || '';
    };

    // Determine which fields to show based on mode
    const shouldShow = (field) => {
        if (viewMode === 'overview') {
            // Overview shows only essential fields
            return ['progress', 'basicInfo', 'dates', 'stages', 'travels', 'comments', 'cancellationHistory', 'activityLog'].includes(field);
        } else if (viewMode === 'detailed') {
            // Detailed shows everything
            return true;
        } else {
            // Custom mode uses user selection
            return customFields[field];
        }
    };

    const toggleCustomField = (field) => {
        setCustomFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const selectAllFields = () => {
        const allTrue = Object.keys(customFields).reduce((acc, key) => ({ ...acc, [key]: true }), {});
        setCustomFields(allTrue);
    };

    const deselectAllFields = () => {
        const allFalse = Object.keys(customFields).reduce((acc, key) => ({ ...acc, [key]: false }), {});
        setCustomFields(allFalse);
    };

    return (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1.5cm;
                    }
                    
                    html, body {
                        height: auto !important;
                    }
                    
                    .max-w-3xl {
                        max-width: 100% !important;
                    }
                    
                    /* Smart Page Breaks */
                    section {
                        page-break-inside: auto;
                        break-inside: auto;
                        page-break-before: auto;
                        break-before: auto;
                        display: block; /* Ensure block layout */
                    }

                    /* Prevent individual content blocks from splitting */
                    .bg-slate-50, 
                    .rounded-lg, 
                    .bg-amber-50, 
                    .bg-emerald-50,
                    .border {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    
                    /* Ensure headers stay with their content */
                    h1, h2, h3, h4 {
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    
                    /* Utility for consistent spacing */
                    .mb-8 {
                        margin-bottom: 20px !important;
                    }

                    /* Allow tables/lists to flow but rows/items distinct */
                    tr, .flex-col > div {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    /* Hide interactive elements */
                    button, input[type="checkbox"], .print\:hidden {
                        display: none !important;
                    }

                    /* Remove overflow restrictions */
                    .overflow-auto, .overflow-y-auto {
                        overflow: visible !important;
                        max-height: none !important;
                    }
                }
            `}</style>
            {/* Header - Hidden on print */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 print:hidden shadow-sm z-10">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <CheckSquare className="text-brand-600" size={24} />
                        Relatório da Tarefa
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                            <Printer size={18} />
                            Imprimir
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                            <X size={18} />
                            Fechar
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 rounded-lg p-1 flex-1">
                        <button
                            onClick={() => setViewMode('overview')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-semibold transition-colors ${viewMode === 'overview'
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Eye size={16} />
                            Visão Geral
                        </button>
                        <button
                            onClick={() => setViewMode('detailed')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-semibold transition-colors ${viewMode === 'detailed'
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <List size={16} />
                            Detalhado
                        </button>
                        <button
                            onClick={() => setViewMode('custom')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-semibold transition-colors ${viewMode === 'custom'
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Settings size={16} />
                            Personalizado
                        </button>
                    </div>
                </div>

                {/* Custom Fields Selection */}
                {viewMode === 'custom' && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-slate-700">Selecione os campos para impressão:</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAllFields}
                                    className="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded hover:bg-brand-200 font-semibold"
                                >
                                    Marcar Todos
                                </button>
                                <button
                                    onClick={deselectAllFields}
                                    className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-semibold"
                                >
                                    Desmarcar Todos
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.progress}
                                    onChange={() => toggleCustomField('progress')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Progresso da Tarefa</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.basicInfo}
                                    onChange={() => toggleCustomField('basicInfo')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Informações Básicas</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.dates}
                                    onChange={() => toggleCustomField('dates')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Datas</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.location}
                                    onChange={() => toggleCustomField('location')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Localização</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.additionalFields}
                                    onChange={() => toggleCustomField('additionalFields')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Campos Adicionais</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.assignedUsers}
                                    onChange={() => toggleCustomField('assignedUsers')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Responsáveis</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.stages}
                                    onChange={() => toggleCustomField('stages')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Etapas do Processo</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.travels}
                                    onChange={() => toggleCustomField('travels')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Detalhes de Viagens</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.comments}
                                    onChange={() => toggleCustomField('comments')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Comentários</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.cancellationHistory}
                                    onChange={() => toggleCustomField('cancellationHistory')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Cancelamento/Reabertura</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.activityLog}
                                    onChange={() => toggleCustomField('activityLog')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Histórico de Atividades</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customFields.attachments}
                                    onChange={() => toggleCustomField('attachments')}
                                    className="w-4 h-4 text-brand-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Anexos</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Report Content */}
            <div className="max-w-3xl mx-auto p-6 print:p-0">
                {/* Report Header */}
                <div className="mb-8 pb-6 border-b-2 border-slate-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <img src={logo} alt="Plastimarau" className="h-16 w-auto object-contain" />
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-0">AssisTec</h1>
                                <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">
                                    {viewMode === 'overview' ? 'Visão Geral' : viewMode === 'detailed' ? 'Detalhado' : 'Personalizado'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right text-sm text-slate-600">
                            <p className="font-bold">Tarefa #{task.id}</p>
                            <p>Gerado em: {formatDateTime(new Date().toISOString())}</p>
                            <p>Por: {currentUser.username}</p>
                        </div>
                    </div>
                </div>

                {/* Progress Indicator */}
                {shouldShow('progress') && task.stages && Object.keys(task.stages).length > 0 && (
                    <section className="mb-6 bg-gradient-to-r from-brand-50 to-blue-50 p-4 rounded-lg border border-brand-200">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={16} className="text-brand-600" />
                                Progresso da Tarefa
                            </h3>
                            <span className="text-2xl font-black text-brand-600">{completionPercentage}%</span>
                        </div>
                        <div className="h-3 bg-white rounded-full overflow-hidden border border-brand-300 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500 rounded-full"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 text-center">
                            {Object.values(task.stages).filter(s => s?.active && ['COMPLETED', 'SOLUCIONADO', 'FINALIZADO'].includes(s.status)).length} de {Object.values(task.stages).filter(s => s?.active).length} etapas concluídas
                        </p>
                    </section>
                )}

                {/* Basic Information */}
                {shouldShow('basicInfo') && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <CheckSquare size={20} className="text-brand-600" />
                            Informações Básicas
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Título</p>
                                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Cliente</p>
                                <p className="text-sm font-semibold text-slate-900">{task.client || 'Não informado'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Status</p>
                                <p className="text-sm font-semibold text-slate-900">{StatusLabels[task.status]}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</p>
                                <p className="text-sm font-semibold text-slate-900">{PriorityLabels[task.priority]}</p>
                            </div>
                            {viewMode === 'detailed' && (
                                <>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Categoria</p>
                                        <p className="text-sm font-semibold text-slate-900">{data.categoryLabel || task.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Visibilidade</p>
                                        <p className="text-sm font-semibold text-slate-900">{task.visibility === 'PRIVATE' ? 'Privada' : 'Pública'}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {task.description && (
                            <div className="mt-4">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Descrição</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">{task.description}</p>
                            </div>
                        )}
                    </section>
                )}

                {/* Dates */}
                {shouldShow('dates') && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <Calendar size={20} className="text-brand-600" />
                            Datas
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Criação</p>
                                <p className="text-sm font-semibold text-slate-900">{formatDateTime(task.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Prazo</p>
                                <p className="text-sm font-semibold text-slate-900">{formatDate(task.due_date)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Última Atualização</p>
                                <p className="text-sm font-semibold text-slate-900">{formatDateTime(task.updated_at)}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Location */}
                {shouldShow('location') && task.address && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <MapPin size={20} className="text-brand-600" />
                            Localização
                        </h2>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">{task.address}</p>
                        {(task.latitude && task.longitude) && (
                            <p className="text-xs text-slate-500 mt-2">Coordenadas: {task.latitude}, {task.longitude}</p>
                        )}
                    </section>
                )}

                {/* Additional Fields */}
                {shouldShow('additionalFields') && (task.op || task.pedido || task.item || task.rnc) && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300">
                            Campos Adicionais
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {task.op && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">OP</p>
                                    <p className="text-sm font-semibold text-slate-900">{task.op}</p>
                                </div>
                            )}
                            {task.pedido && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Pedido</p>
                                    <p className="text-sm font-semibold text-slate-900">{task.pedido}</p>
                                </div>
                            )}
                            {task.item && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Item</p>
                                    <p className="text-sm font-semibold text-slate-900">{task.item}</p>
                                </div>
                            )}
                            {task.rnc && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">RNC</p>
                                    <p className="text-sm font-semibold text-slate-900">{task.rnc}</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Assigned Users */}
                {shouldShow('assignedUsers') && data.assignedUsers && data.assignedUsers.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <User size={20} className="text-brand-600" />
                            Responsáveis
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            {data.assignedUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                        style={{ backgroundColor: user.color || '#64748b' }}
                                    >
                                        {user.username[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-900">{user.username}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {(shouldShow('travels') && (task.travels?.length > 0 || task.visitation?.required)) && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <MapPin size={20} className="text-brand-600" />
                            Controle de Deslocamento
                        </h2>
                        <div className="space-y-4">
                            {/* Specific travels */}
                            {task.travels?.map((travel, index) => (
                                <div key={travel.id || index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-slate-900">Viagem {index + 1}</h3>
                                        {travel.date && (
                                            <span className="text-xs font-semibold px-2 py-1 bg-brand-100 text-brand-700 rounded">
                                                {formatDate(travel.date)}
                                            </span>
                                        )}
                                        {travel.isDateDefined === false && (
                                            <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-700 rounded">
                                                Data a Definir
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                                        {(travel.vehicle || task.vehicle_info) && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Veículo</p>
                                                <p className="text-sm font-semibold text-slate-700">{travel.vehicle || task.vehicle_info}</p>
                                            </div>
                                        )}
                                        {(travel.km_end > 0 || task.trip_km_end > 0) && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">KM Percorrido</p>
                                                <p className="text-sm font-semibold text-slate-700">{(travel.km_end || task.trip_km_end).toLocaleString()} KM</p>
                                            </div>
                                        )}
                                        {(travel.cost > 0 || task.trip_cost > 0) && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Custo</p>
                                                <p className="text-sm font-bold text-emerald-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: travel.currency || task.trip_cost_currency || 'BRL' }).format(travel.cost || task.trip_cost)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {travel.team && travel.team.length > 0 && travel.team.some(t => t) && (
                                        <div className="mb-2">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Equipe</p>
                                            <div className="flex flex-wrap gap-2">
                                                {travel.team.filter(t => t).map((member, idx) => (
                                                    <span key={idx} className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        {member}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(travel.contacts || travel.role) && (
                                        <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-200">
                                            {travel.contacts && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Contato</p>
                                                    <p className="text-sm text-slate-700">{travel.contacts}</p>
                                                </div>
                                            )}
                                            {travel.role && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Cargo</p>
                                                    <p className="text-sm text-slate-700">{travel.role}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Task-level fallback if no specific travels but visitation is required */}
                            {(!task.travels || task.travels.length === 0) && (task.vehicle_info || task.trip_km_end > 0 || task.trip_cost > 0) && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider text-slate-400">Dados Gerais de Viagem</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {task.vehicle_info && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Veículo</p>
                                                <p className="text-sm font-semibold text-slate-700">{task.vehicle_info}</p>
                                            </div>
                                        )}
                                        {task.trip_km_end > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">KM Percorrido</p>
                                                <p className="text-sm font-semibold text-slate-700">{task.trip_km_end.toLocaleString()} KM</p>
                                            </div>
                                        )}
                                        {task.trip_cost > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Custo</p>
                                                <p className="text-sm font-bold text-emerald-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: task.trip_cost_currency || 'BRL' }).format(task.trip_cost)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Comments */}
                {shouldShow('comments') && task.comments && task.comments.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <Activity size={20} className="text-brand-600" />
                            Comentários ({task.comments.length})
                        </h2>
                        <div className="space-y-3">
                            {task.comments.map((comment, index) => (
                                <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-bold text-slate-900">
                                                    {comment.username || comment.user || 'Usuário'}
                                                </span>
                                                {comment.timestamp && (
                                                    <span className="text-xs text-slate-500">
                                                        {formatDateTime(comment.timestamp)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                {comment.text || comment.comment || comment.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Stages - Always show observations */}
                {shouldShow('stages') && task.stages && Object.keys(task.stages).length > 0 && (
                    <section className="mb-8 page-break-before">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <Clock size={20} className="text-brand-600" />
                            Etapas do Processo
                        </h2>
                        <div className="space-y-3">
                            {Object.entries(task.stages).map(([stageName, stage]) => {
                                if (!stage || !stage.active) return null;
                                const observations = getStageObservations(stage);
                                return (
                                    <div key={stageName} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-900">{stageName}</h3>
                                            <span className="text-xs font-semibold px-2 py-1 bg-white rounded border border-slate-300">
                                                {StageStatusLabels[stage.status] || stage.status}
                                            </span>
                                        </div>
                                        {stage.date && (
                                            <p className="text-sm text-slate-600">
                                                <span className="font-semibold">Data:</span> {formatDate(stage.date)}
                                            </p>
                                        )}
                                        {observations && (
                                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                <p className="text-xs font-bold text-amber-800 uppercase mb-1">Observações:</p>
                                                <p className="text-sm text-amber-900 whitespace-pre-wrap">{observations}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Cancellation/Reopen History */}
                {shouldShow('cancellationHistory') && cancellationHistory.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <AlertCircle size={20} className="text-amber-600" />
                            Histórico de Cancelamento/Reabertura
                        </h2>
                        <div className="space-y-2">
                            {cancellationHistory.map((log, index) => (
                                <div key={log.id || index} className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="text-xs text-amber-700 font-semibold w-32 shrink-0">
                                            {formatDateTime(log.created_at || log.timestamp)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-amber-900">{log.users?.username || 'Sistema'}</p>
                                            <p className="text-sm text-amber-800 mt-1">{log.action || log.details}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Activity History - Simplified */}
                {shouldShow('activityLog') && data.activityLogs && data.activityLogs.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <Activity size={20} className="text-brand-600" />
                            Histórico de Atividades
                        </h2>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <p className="text-sm text-slate-700">
                                <span className="font-bold text-2xl text-brand-600">{data.activityLogs.length}</span>
                                <span className="ml-2">atualizações registradas nesta tarefa</span>
                            </p>
                            {viewMode === 'detailed' && (
                                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                                    {data.activityLogs.slice(0, 10).map((log, index) => (
                                        <div key={log.id || index} className="flex gap-3 text-xs border-l-2 border-slate-300 pl-3 py-1">
                                            <div className="text-slate-500 w-28 shrink-0">
                                                {formatDateTime(log.created_at || log.timestamp)}
                                            </div>
                                            <div className="flex-1 text-slate-600">
                                                <span className="font-semibold">{log.users?.username || 'Sistema'}</span> - {log.action}
                                            </div>
                                        </div>
                                    ))}
                                    {data.activityLogs.length > 10 && (
                                        <p className="text-xs text-slate-500 italic text-center pt-2">
                                            ... e mais {data.activityLogs.length - 10} atualizações
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Attachments */}
                {shouldShow('attachments') && data.attachments && data.attachments.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <Paperclip size={20} className="text-brand-600" />
                            Anexos ({data.attachments.length})
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {data.attachments.map((attachment, index) => (
                                <div key={attachment.id || index} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{attachment.file_name || `Anexo ${index + 1}`}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Adicionado em: {formatDateTime(attachment.created_at)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t-2 border-slate-300 text-center text-xs text-slate-500">
                    <p>Este relatório foi gerado automaticamente pelo AssisTecApp</p>
                    <p className="mt-1">© {new Date().getFullYear()} - Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
};

export default TaskReport;


