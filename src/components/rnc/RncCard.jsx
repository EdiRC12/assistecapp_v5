import { ShieldAlert, Trash2, History, RefreshCcw } from 'lucide-react';

const RncCard = ({ rnc, RNC_STATUS, onClick, onOpenJourneyReport, onDelete, onReopen }) => {
    const status = RNC_STATUS[rnc.status] || RNC_STATUS.ABERTO;

    return (
        <div
            onClick={() => onClick(rnc)}
            className="bg-white rounded-[28px] border border-slate-200 p-6 hover:shadow-xl transition-all cursor-pointer group shadow-sm flex flex-col gap-4 relative"
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">RNC INTERNAL #{rnc.rnc_number}</span>
                    <h3 className="text-lg font-black text-slate-800 mt-1 leading-tight">
                        {rnc.sac_tickets?.client_name || rnc.client_name || 'RNC Avulsa'}
                    </h3>
                </div>
                <div className={`px-2.5 py-1 rounded-lg ${status.bg} ${status.color} flex items-center gap-1.5`}>
                    <status.icon size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tight">{status.label}</span>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                    <span className="text-slate-400 font-black text-[10px] uppercase">Assunto:</span>
                    <span className="truncate">{rnc.subject || rnc.sac_tickets?.subject || 'Sem assunto'}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs bg-slate-50 px-2 py-1 rounded-lg">
                        <span className="text-slate-400 font-black text-[9px] uppercase">Scopi:</span>
                        <span>{rnc.external_id || '---'}</span>
                    </div>
                </div>
                {rnc.item_name && (
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs border-t border-slate-50 pt-2">
                        <span className="text-slate-400 font-black text-[9px] uppercase">Produto Principal:</span>
                        <span className="truncate">{rnc.item_name}</span>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-between items-center mt-auto">
                <div className="flex -space-x-2">
                    {/* Placeholder for avatars if needed */}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenJourneyReport('RNC', rnc);
                        }}
                        className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all ${rnc.is_audited
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                : 'bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-100'
                            }`}
                    >
                        <History size={14} />
                        <span className="text-[8px] font-black">{rnc.is_audited ? 'AUDITADO' : 'RELATÓRIO'}</span>
                    </button>
                    
                    {rnc.status === 'FECHADO' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onReopen?.(rnc);
                            }}
                            title="Reabrir RNC e Relatório"
                            className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all flex items-center justify-center"
                        >
                            <RefreshCcw size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(rnc.id); }}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RncCard;
