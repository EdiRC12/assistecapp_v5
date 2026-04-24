import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { CategoryLabels } from '../../../constants/taskConstants';
import DashboardCard from '../DashboardCard';

const ClientReportsTab = ({
    clientReports,
    tasks,
    onViewTechnicalReport
}) => {
    return (
        <DashboardCard title="Relatórios Disponíveis" icon={FileText}>
            <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                    {clientReports.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 italic">Sem relatórios (parciais ou finalizados) para este cliente.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {clientReports.map(report => {
                                const relatedTask = tasks.find(t => t.id === report.task_id);
                                return (
                                    <div
                                        key={report.id}
                                        className="p-4 hover:bg-white flex items-center justify-between group transition-colors cursor-pointer"
                                        onClick={() => {
                                            if (report.task_id) onViewTechnicalReport(report.task_id);
                                        }}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-slate-700 truncate">{report.title || relatedTask?.title}</h4>
                                                <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase border ${report.status === 'FINALIZADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {report.status === 'FINALIZADO' ? 'FINAL' : 'PARCIAL'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {new Date(report.updated_at).toLocaleDateString()}
                                                {relatedTask && ` - ${CategoryLabels[relatedTask.category]}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (report.task_id) onViewTechnicalReport(report.task_id);
                                            }}
                                            className="bg-brand-50 text-brand-600 p-2 rounded-lg hover:bg-brand-600 hover:text-white transition-all shrink-0"
                                        >
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardCard>
    );
};

export default ClientReportsTab;
