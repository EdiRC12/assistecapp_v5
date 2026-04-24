import React from 'react';
import { Search, User, Hash, Clock } from 'lucide-react';

const RncFilters = ({
    searchTerm, setSearchTerm,
    clientFilter, setClientFilter,
    externalIdFilter, setExternalIdFilter,
    statusFilter, setStatusFilter,
    RNC_STATUS
}) => {
    return (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="RNC, Produto ou Causa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-400 text-sm font-bold transition-all"
                />
            </div>

            {/* Client */}
            <div className="relative min-w-[200px] flex-1">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Filtrar por Cliente..."
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-400 text-sm font-bold transition-all"
                />
            </div>

            {/* Scopi ID */}
            <div className="relative min-w-[150px] flex-1">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Ref. Scopi..."
                    value={externalIdFilter}
                    onChange={(e) => setExternalIdFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-400 text-sm font-bold transition-all"
                />
            </div>

            {/* Status */}
            <div className="relative min-w-[150px]">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-400 text-[11px] font-black uppercase appearance-none cursor-pointer transition-all"
                >
                    <option value="ALL">Todos Status</option>
                    {Object.entries(RNC_STATUS).map(([key, val]) => (
                        <option key={key} value={key}>{val.label.toUpperCase()}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default RncFilters;
