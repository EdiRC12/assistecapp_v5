import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const AutocompleteInput = ({ label, icon: Icon, placeholder, options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    // Sincroniza o estado interno com a prop value (essencial para edição)
    useEffect(() => {
        setSearch(value || '');
    }, [value]);

    const filtered = useMemo(() => {
        const term = search.toLowerCase();
        return options.filter(opt => opt.label.toLowerCase().includes(term));
    }, [options, search]);

    return (
        <div className="relative space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Icon size={16} />
                </div>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSearch(val);
                        setIsOpen(true);
                        onChange(val); // Notifica o pai em tempo real
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                />
                {isOpen && search.length > 0 && (
                    <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                        {filtered.length > 0 ? (
                            filtered.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setSearch(opt.label);
                                        onChange(opt.label);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center justify-between group/opt"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-700 group-hover/opt:text-indigo-600 uppercase">{opt.label}</span>
                                        {opt.sublabel && <span className="text-[8px] font-bold text-slate-400 uppercase">{opt.sublabel}</span>}
                                    </div>
                                    <ArrowRight size={12} className="text-slate-200 group-hover/opt:text-indigo-400 -translate-x-2 opacity-0 group-hover/opt:translate-x-0 group-hover/opt:opacity-100 transition-all" />
                                </button>
                            ))
                        ) : (
                            <div className="px-5 py-4 text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase italic">Nenhum resultado</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutocompleteInput;
