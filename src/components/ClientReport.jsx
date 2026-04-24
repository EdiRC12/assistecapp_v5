import React, { useState, useMemo } from 'react';
import { X, Printer, User, Calendar, CheckSquare, AlertCircle, TrendingUp, Eye, List, Settings, BarChart3 } from 'lucide-react';

const ClientReport = ({ clientName, tasks, filters, onClose, currentUser }) => {
    const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'detailed'

    const handlePrint = () => {
        window.print();
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const byStatus = {};
        const byCategory = {};
        const byPriority = {};

        tasks.forEach(task => {
            // By status
            byStatus[task.status] = (byStatus[task.status] || 0) + 1;

            // By category
            byCategory[task.category] = (byCategory[task.category] || 0) + 1;

            // By priority
            byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
        });

        const total = tasks.length;
        const completed = byStatus['DONE'] || 0;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            total,
            completed,
            completionRate,
            byStatus,
            byCategory,
            byPriority
        };
    }, [tasks]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Não definida';
        return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    const getStatusLabel = (status) => {
        const labels = {
            'TO_START': 'A Iniciar',
            'IN_PROGRESS': 'Em Andamento',
            'WAITING': 'Aguardando',
            'DONE': 'Concluída',
            'CANCELED': 'Cancelada'
        };
        return labels[status] || status;
    };

    const getPriorityLabel = (priority) => {
        const labels = {
            'LOW': 'Baixa',
            'MEDIUM': 'Média',
            'HIGH': 'Alta'
        };
        return labels[priority] || priority;
    };

    const getCategoryLabel = (category) => {
        const labels = {
            'DEVELOPMENT': 'Desenvolvimento',
            'RNC': 'RNC',
            'AFTER_SALES': 'Pós-Venda',
            'TRAINING': 'Treinamento',
            'FAIRS': 'Feiras'
        };
        return labels[category] || category;
    };

    return (
        <div className="fixed inset-0 z-[999] bg-white overflow-auto">
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
                    
                    .mb-8, section {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    
                    section {
                        page-break-before: auto;
                        break-before: auto;
                    }
                    
                    .border-b-2 {
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    
                    h1 {
                        font-size: 18pt !important;
                    }
                    
                    h2 {
                        font-size: 13pt !important;
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    
                    h3 {
                        font-size: 11pt !important;
                    }
                    
                    .text-3xl {
                        font-size: 18pt !important;
                    }
                    
                    .text-2xl {
                        font-size: 14pt !important;
                    }
                    
                    .text-xl {
                        font-size: 12pt !important;
                    }
                    
                    .text-sm {
                        font-size: 9pt !important;
                    }
                    
                    .text-xs {
                        font-size: 8pt !important;
                    }
                    
                    .mb-8 {
                        margin-bottom: 10pt !important;
                    }
                    
                    .mb-6 {
                        margin-bottom: 8pt !important;
                    }
                    
                    .mb-4 {
                        margin-bottom: 6pt !important;
                    }
                    
                    .p-6, .p-4 {
                        padding: 6pt !important;
                    }
                    
                    .overflow-auto {
                        overflow: visible !important;
                    }
                }
            `}</style>

            {/* Header - Hidden on print */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 print:hidden shadow-sm z-10">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-brand-600" size={24} />
                        Relatório do Cliente
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                        >
                            <Printer size={18} />
                            Imprimir
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                        >
                            <X size={18} />
                            Fechar
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('summary')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'summary'
                            ? 'bg-brand-100 text-brand-700 font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <BarChart3 size={16} />
                        Resumo
                    </button>
                    <button
                        onClick={() => setViewMode('detailed')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'detailed'
                            ? 'bg-brand-100 text-brand-700 font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <List size={16} />
                        Detalhado
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="max-w-3xl mx-auto p-6 print:p-0">
                {/* Report Header */}
                <div className="mb-8 pb-6 border-b-2 border-slate-300">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">AssisTecApp</h1>
                            <p className="text-sm text-slate-600">
                                Relatório de Cliente - {viewMode === 'summary' ? 'Resumo' : 'Detalhado'}
                            </p>
                        </div>
                        <div className="text-right text-sm text-slate-600">
                            <p className="font-bold">Cliente: {clientName}</p>
                            <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                            <p>Por: {currentUser?.username || 'Usuário'}</p>
                        </div>
                    </div>

                    {/* Filter Summary */}
                    {(filters.category || filters.month || filters.year || filters.visitation !== 'ALL') && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Filtros Aplicados</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {filters.category && (
                                    <span className="px-2 py-1 bg-brand-100 text-brand-700 rounded">
                                        Categoria: {getCategoryLabel(filters.category)}
                                    </span>
                                )}
                                {filters.month && (
                                    <span className="px-2 py-1 bg-brand-100 text-brand-700 rounded">
                                        Mês: {filters.month}
                                    </span>
                                )}
                                {filters.year && (
                                    <span className="px-2 py-1 bg-brand-100 text-brand-700 rounded">
                                        Ano: {filters.year}
                                    </span>
                                )}
                                {filters.visitation !== 'ALL' && (
                                    <span className="px-2 py-1 bg-brand-100 text-brand-700 rounded">
                                        Visitação: {filters.visitation === 'YES' ? 'Sim' : 'Não'}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Statistics Section */}
                <section className="mb-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                        <TrendingUp size={20} className="text-brand-600" />
                        Estatísticas
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total de Tarefas</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                            <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Concluídas</p>
                            <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
                        </div>
                        <div className="bg-brand-50 p-4 rounded-lg border border-brand-200">
                            <p className="text-xs font-bold text-brand-600 uppercase mb-1">Taxa de Conclusão</p>
                            <p className="text-2xl font-bold text-brand-700">{stats.completionRate}%</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <p className="text-xs font-bold text-amber-600 uppercase mb-1">Em Andamento</p>
                            <p className="text-2xl font-bold text-amber-700">{stats.byStatus['IN_PROGRESS'] || 0}</p>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Por Status</h3>
                        <div className="space-y-2">
                            {Object.entries(stats.byStatus).map(([status, count]) => (
                                <div key={status} className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                        <div
                                            className="h-full bg-brand-500 flex items-center justify-end px-2"
                                            style={{ width: `${(count / stats.total) * 100}%` }}
                                        >
                                            <span className="text-xs font-bold text-white">{count}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-600 w-24">
                                        {getStatusLabel(status)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    {Object.keys(stats.byCategory).length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-slate-700 mb-2">Por Categoria</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.byCategory).map(([category, count]) => (
                                    <span key={category} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                        {getCategoryLabel(category)}: {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Priority Breakdown */}
                    {Object.keys(stats.byPriority).length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-2">Por Prioridade</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.byPriority).map(([priority, count]) => (
                                    <span key={priority} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                        {getPriorityLabel(priority)}: {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Task List - Show in detailed mode or if summary has few tasks */}
                {(viewMode === 'detailed' || stats.total <= 10) && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-300 flex items-center gap-2">
                            <CheckSquare size={20} className="text-brand-600" />
                            Lista de Tarefas ({tasks.length})
                        </h2>

                        {tasks.length === 0 ? (
                            <p className="text-slate-500 italic text-center py-8">Nenhuma tarefa encontrada com os filtros aplicados.</p>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map((task, index) => (
                                    <div key={task.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                                                    <h3 className="text-base font-bold text-slate-900">
                                                        {task.title || `Tarefa ${task.id}`}
                                                    </h3>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <span className="px-2 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded font-semibold">
                                                        📁 {getCategoryLabel(task.category)}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded font-semibold ${task.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' :
                                                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                            task.status === 'CANCELED' ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {getStatusLabel(task.status)}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded font-semibold ${task.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                        task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {getPriorityLabel(task.priority)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {task.description && (
                                            <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-2 pt-2 border-t border-slate-300">
                                            {task.created_at && (
                                                <div>
                                                    <span className="font-bold text-slate-500">Criada:</span>{' '}
                                                    <span className="text-slate-700">{formatDate(task.created_at)}</span>
                                                </div>
                                            )}
                                            {task.updated_at && (
                                                <div>
                                                    <span className="font-bold text-slate-500">Atualizada:</span>{' '}
                                                    <span className="text-slate-700">{formatDate(task.updated_at)}</span>
                                                </div>
                                            )}
                                            {task.due_date && (
                                                <div>
                                                    <span className="font-bold text-slate-500">Prazo:</span>{' '}
                                                    <span className="text-slate-700">{formatDate(task.due_date)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
                    <p>Este relatório foi gerado automaticamente pelo AssisTecApp</p>
                    <p className="mt-1">© {new Date().getFullYear()} - Todos os direitos reservados</p>
                </div>
            </div>
        </div>
    );
};

export default ClientReport;
