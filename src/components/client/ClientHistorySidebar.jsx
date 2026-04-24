import React from 'react';
import { Users, ChevronLeft, Plus, Search } from 'lucide-react';
import { TierIcon } from './ClientTierBadge';

const ClientHistorySidebar = ({
    isExplorerActive,
    selectedClient,
    setSelectedClient,
    setIsExplorerActive,
    setIsClientManagerOpen,
    searchTerm,
    setSearchTerm,
    classificationFilter,
    setClassificationFilter,
    filteredClients,
    clientsData,
    setActiveTopic
}) => {
    return (
        <div className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col print:hidden ${selectedClient ? 'hidden md:flex' : 'flex'} animate-in slide-in-from-left duration-300`}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users size={20} className="text-brand-600" /> Clientes
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setIsExplorerActive(false);
                            setSelectedClient(null);
                        }}
                        className="bg-slate-50 text-slate-400 p-2 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        title="Voltar ao Painel Geral"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setIsClientManagerOpen(true)} className="bg-brand-50 text-brand-600 p-2 rounded-lg hover:bg-brand-100 transition-colors">
                        <Plus size={18} />
                    </button>
                </div>
            </div>
            <div className="p-3 bg-slate-50/50 space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                </div>

                {/* Classification Filter Pills */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                    {['ALL', 'OURO', 'PRATA', 'BRONZE'].map(type => (
                        <button
                            key={type}
                            onClick={() => setClassificationFilter(type)}
                            className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all shrink-0 ${classificationFilter === type
                                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {type === 'ALL' ? 'Todos' : type}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredClients.map(client => {
                    const cData = clientsData.find(c => c.name === client);
                    return (
                        <button
                            key={client}
                            onClick={() => {
                                setSelectedClient(client);
                                setActiveTopic(null); // Reset detail view to dashboard
                            }}
                            className={`w-full text-left px-4 py-3.5 border-b border-slate-50 transition-all flex items-center justify-between ${selectedClient === client ? 'bg-brand-50 border-l-4 border-l-brand-600 text-brand-700 shadow-sm' : 'border-l-4 border-transparent hover:bg-slate-50 text-slate-600'}`}
                        >
                            <span className="font-semibold text-sm truncate block flex-1">{client}</span>
                            {cData?.classification && <TierIcon tier={cData.classification} size={14} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ClientHistorySidebar;
