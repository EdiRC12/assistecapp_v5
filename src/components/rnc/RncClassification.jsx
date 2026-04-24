import React from 'react';
import { UserPlus, Building2, AlertTriangle, Tag, Phone, Mail, Info, Plus } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const RncClassification = ({
    newRnc, setNewRnc,
    sectors, setSectors,
    problemTypes, setProblemTypes,
    fetchProblemTypes
}) => {
    return (
        <div className="space-y-6">
            {/* Requester Name, Sector, Subject */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <UserPlus size={12} className="text-brand-600" /> Nome do Solicitante
                    </label>
                    <input
                        type="text"
                        placeholder="Nome de quem enviou"
                        value={newRnc.requester_name || ''}
                        onChange={(e) => setNewRnc({ ...newRnc, requester_name: e.target.value })}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 size={12} className="text-brand-600" /> Setor do Solicitante
                    </label>
                    <input
                        type="text"
                        placeholder="Ex: Comercial, PCP"
                        value={newRnc.requester_sector || ''}
                        onChange={(e) => setNewRnc({ ...newRnc, requester_sector: e.target.value })}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                    />
                </div>
                <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={12} className="text-brand-600" /> Assunto Principal
                    </label>
                    <input
                        type="text"
                        placeholder="Breve resumo da demanda"
                        value={newRnc.subject || ''}
                        onChange={(e) => setNewRnc({ ...newRnc, subject: e.target.value })}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                    />
                </div>
            </div>

            {/* SECTION: PRIORITY, SECTOR, PROBLEM TYPE */}
            <div className="space-y-6 pt-8 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} className="text-brand-600" /> Classificação da Ocorrência
                </h3>

                {/* Priority */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[{ key: 'BAIXA', label: 'Baixa' }, { key: 'MEDIA', label: 'Média' }, { key: 'ALTA', label: 'Alta' }, { key: 'CRITICA', label: 'Crítica' }].map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setNewRnc({ ...newRnc, priority: key })}
                                className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase transition-all border ${newRnc.priority === key
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sector + Problem Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Building2 size={12} className="text-brand-600" /> Setor Responsável
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={newRnc.sector_id || ''}
                                onChange={(e) => {
                                    setNewRnc({ ...newRnc, sector_id: e.target.value, problem_type_id: '' });
                                    if (e.target.value) fetchProblemTypes(e.target.value);
                                    else setProblemTypes([]);
                                }}
                                className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                            >
                                <option value="">Selecione o setor...</option>
                                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={async () => {
                                    const name = prompt('Digite o nome do novo Setor:');
                                    if (name) {
                                        const { data } = await supabase.from('sac_sectors').insert({ name }).select().single();
                                        if (data) {
                                            setSectors(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                                            setNewRnc(prev => ({ ...prev, sector_id: data.id, problem_type_id: '' }));
                                            setProblemTypes([]);
                                        }
                                    }
                                }}
                                className="w-11 h-11 flex items-center justify-center bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shrink-0"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Tag size={12} className="text-brand-600" /> Tipo de Problema
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={newRnc.problem_type_id || ''}
                                onChange={(e) => setNewRnc({ ...newRnc, problem_type_id: e.target.value })}
                                disabled={!newRnc.sector_id}
                                className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all disabled:opacity-50"
                            >
                                <option value="">Selecione o problema...</option>
                                {problemTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button
                                type="button"
                                disabled={!newRnc.sector_id}
                                onClick={async () => {
                                    const name = prompt('Digite o nome do novo Tipo de Problema:');
                                    if (name && newRnc.sector_id) {
                                        const { data } = await supabase.from('sac_problem_types').insert({ name, sector_id: newRnc.sector_id }).select().single();
                                        if (data) {
                                            setProblemTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                                            setNewRnc(prev => ({ ...prev, problem_type_id: data.id }));
                                        }
                                    }
                                }}
                                className="w-11 h-11 flex items-center justify-center bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contact Phone / Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Phone size={12} className="text-brand-600" /> Telefone de Contato
                        </label>
                        <input
                            type="text"
                            placeholder="(00) 00000-0000"
                            value={newRnc.contact_phone || ''}
                            onChange={(e) => setNewRnc({ ...newRnc, contact_phone: e.target.value })}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Mail size={12} className="text-brand-600" /> E-mail de Contato
                        </label>
                        <input
                            type="email"
                            placeholder="email@cliente.com.br"
                            value={newRnc.contact_email || ''}
                            onChange={(e) => setNewRnc({ ...newRnc, contact_email: e.target.value })}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 transition-all"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Info size={12} className="text-brand-600" /> Descrição do Problema / Ocorrência
                    </label>
                    <textarea
                        placeholder="Descreva detalhadamente o que aconteceu..."
                        value={newRnc.description || ''}
                        onChange={(e) => setNewRnc({ ...newRnc, description: e.target.value })}
                        className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 resize-none"
                    />
                </div>

                {/* Total Value display */}
                <div className="bg-brand-50 p-3 rounded-xl border border-brand-100 flex flex-col items-center">
                    <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest leading-none mb-1">Total Geral (NF)</span>
                    <span className="text-lg font-black text-brand-800">
                        R$ {(newRnc.return_items?.length > 0
                            ? newRnc.return_items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unit_price || 0)), 0)
                            : (newRnc.quantity || 0) * (newRnc.unit_price || 0)
                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {newRnc.return_items?.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                            Soma de {newRnc.return_items.length} itens
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RncClassification;
