import React from 'react';
import { ExternalLink, User, Calendar, MapPin, FileText, Hash, Layers } from 'lucide-react';

const RncClientInfo = ({
    newRnc, setNewRnc,
    allClients,
    showClientSuggestions, setShowClientSuggestions
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pai (SAC Origem)</label>
                    <div className="w-full h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center font-bold text-slate-500 text-sm">
                        {newRnc.sac_tickets?.appointment_number || 'Sem vínculo direto'}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ExternalLink size={12} className="text-amber-600" /> ID Externo (Scopi)
                    </label>
                    <input
                        type="text"
                        placeholder="Ex: RNC-2024-051"
                        value={newRnc.external_id || ''}
                        onChange={(e) => setNewRnc({ ...newRnc, external_id: e.target.value })}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                    />
                </div>
            </div>

            {/* SECTION: CLIENT AND PRODUCT INFORMATION */}
            <div className="space-y-6 pt-8 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={14} className="text-brand-600" /> Informações do Cliente e Produto
                </h3>

                {/* Client, Date, City */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-2 relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User size={12} className="text-brand-600" /> Cliente
                        </label>
                        <input
                            type="text"
                            placeholder="Digite o nome do cliente..."
                            value={newRnc.client_name}
                            onChange={(e) => {
                                setNewRnc({ ...newRnc, client_name: e.target.value });
                                setShowClientSuggestions(true);
                            }}
                            onFocus={() => setShowClientSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                        {showClientSuggestions && newRnc.client_name && allClients && allClients.length > 0 && (() => {
                            const searchTerm = newRnc.client_name.toLowerCase().trim();
                            const clientNames = allClients.map(c => {
                                if (typeof c === 'string') return c;
                                return c?.name || c?.client_name || '';
                            }).filter(Boolean);

                            const filtered = clientNames.filter(name =>
                                name.toLowerCase().includes(searchTerm)
                            );

                            return filtered.length > 0 ? (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                    {filtered.slice(0, 50).map((client, idx) => (
                                        <button
                                            key={`${client}-${idx}`}
                                            type="button"
                                            onClick={() => {
                                                setNewRnc({ ...newRnc, client_name: client });
                                                setShowClientSuggestions(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition-all border-b border-slate-50 last:border-none flex items-center gap-2"
                                        >
                                            <User size={14} className="opacity-50" />
                                            {client}
                                        </button>
                                    ))}
                                </div>
                            ) : null;
                        })()}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={12} className="text-brand-600" /> Data Apontamento
                        </label>
                        <input
                            type="date"
                            value={newRnc.report_date || ''}
                            onChange={(e) => setNewRnc({ ...newRnc, report_date: e.target.value })}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} className="text-brand-600" /> Cidade
                        </label>
                        <input
                            type="text"
                            placeholder="Cidade do Cliente"
                            value={newRnc.city || ''}
                            onChange={(e) => setNewRnc({ ...newRnc, city: e.target.value })}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                    </div>
                </div>

                {/* Invoice, OP, Batch */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={12} className="text-brand-600" /> Nota Fiscal
                        </label>
                        <input
                            type="text"
                            placeholder="Número da NF"
                            value={newRnc.invoice_number || ''}
                            onChange={(e) => setNewRnc({ ...newRnc, invoice_number: e.target.value })}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Hash size={12} className="text-brand-600" /> OP (Ordem de Prod.)
                        </label>
                        <input
                            type="text"
                            placeholder="No. da OP"
                            value={newRnc.op || ''}
                            onChange={(e) => setNewRnc({ ...newRnc, op: e.target.value })}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={12} className="text-brand-600" /> Lote de Fabricação
                        </label>
                        <input
                            type="text"
                            placeholder="Identificador Lote"
                            value={newRnc.batch_number || ''}
                            onChange={(e) => setNewRnc({ ...newRnc, batch_number: e.target.value })}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RncClientInfo;
