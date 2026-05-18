import React, { useState, useRef, useEffect } from 'react';
import { Award, ChevronDown } from 'lucide-react';

export const TierIcon = ({ tier, size = 16, className = "" }) => {
    const configs = {
        'OURO': {
            bg: 'bg-amber-100',
            text: 'text-amber-600',
            border: 'border-amber-200',
            inner: 'bg-amber-500'
        },
        'PRATA': {
            bg: 'bg-slate-100',
            text: 'text-slate-600',
            border: 'border-slate-200',
            inner: 'bg-slate-400'
        },
        'BRONZE': {
            bg: 'bg-orange-50',
            text: 'text-orange-600',
            border: 'border-orange-100',
            inner: 'bg-orange-400'
        }
    };

    const config = configs[tier];
    if (!config) return null;

    return (
        <div className={`relative flex items-center justify-center rounded-full p-1.5 border-2 shadow-sm ${config.bg} ${config.border} ${className}`} style={{ width: size + 12, height: size + 12 }}>
            <Award
                size={size}
                className={`${config.text} transition-all duration-500`}
                strokeWidth={2.5}
            />
            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${config.inner} shadow-sm animate-pulse`} />
        </div>
    );
};

export const ClientTierBadge = ({ client, onChangeTier = null }) => {
    if (!client?.classification) return null;

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const configs = {
        'OURO': {
            gradient: 'from-amber-400 via-amber-500 to-amber-600',
            border: 'border-amber-300',
            text: 'text-white',
            label: 'CLIENTE OURO',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]'
        },
        'PRATA': {
            gradient: 'from-slate-400 via-slate-500 to-slate-600',
            border: 'border-slate-300',
            text: 'text-white',
            label: 'CLIENTE PRATA',
            glow: 'shadow-md'
        },
        'BRONZE': {
            gradient: 'from-orange-400 via-orange-500 to-orange-600',
            border: 'border-orange-300',
            text: 'text-white',
            label: 'CLIENTE BRONZE',
            glow: 'shadow-sm'
        }
    };

    const config = configs[client.classification];
    if (!config) return null;

    const nextUpdateDate = client.classification_date ? new Date(new Date(client.classification_date).setMonth(new Date(client.classification_date).getMonth() + 6)) : null;

    const handleSelect = (tier) => {
        setIsOpen(false);
        if (onChangeTier && tier !== client.classification) {
            onChangeTier(tier);
        }
    };

    return (
        <div ref={containerRef} className="relative flex flex-col gap-1.5 items-start animate-in fade-in zoom-in-95 duration-500">
            <button
                type="button"
                onClick={() => onChangeTier && setIsOpen(!isOpen)}
                disabled={!onChangeTier}
                className={`flex items-center gap-2.5 px-4 py-1.5 rounded-xl border-t border-l bg-gradient-to-br shadow-lg text-left ${config.gradient} ${config.border} ${config.text} ${config.glow} ${
                    onChangeTier ? 'cursor-pointer hover:brightness-105 active:scale-95 transition-all' : ''
                }`}
            >
                <div className="bg-white/20 p-1 rounded-lg backdrop-blur-md border border-white/30">
                    <Award size={14} className="brightness-200 drop-shadow-sm" strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] leading-none drop-shadow-sm flex items-center gap-1">
                        {config.label}
                        {onChangeTier && <ChevronDown size={10} className={`opacity-80 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />}
                    </span>
                    {nextUpdateDate && (
                        <span className="text-[7px] opacity-80 font-bold uppercase tracking-widest mt-0.5">
                            Rev: {nextUpdateDate.toLocaleDateString()}
                        </span>
                    )}
                </div>
            </button>

            {/* Dropdown Options */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[160px] z-[100] animate-in slide-in-from-top-2 duration-200 flex flex-col gap-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2.5 py-1">Alterar Classificação</p>
                    {['OURO', 'PRATA', 'BRONZE'].map((tier) => {
                        const isCurrent = client.classification === tier;
                        const tierConfigs = {
                            'OURO': { bg: 'hover:bg-amber-50 text-amber-600 hover:text-amber-700', dot: 'bg-amber-500' },
                            'PRATA': { bg: 'hover:bg-slate-50 text-slate-600 hover:text-slate-700', dot: 'bg-slate-400' },
                            'BRONZE': { bg: 'hover:bg-orange-50 text-orange-600 hover:text-orange-700', dot: 'bg-orange-400' }
                        };
                        return (
                            <button
                                key={tier}
                                type="button"
                                onClick={() => handleSelect(tier)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold text-left transition-all ${
                                    isCurrent ? 'bg-slate-100 text-slate-800' : tierConfigs[tier].bg
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${tierConfigs[tier].dot} border border-white shadow-sm`} />
                                    <span>{tier}</span>
                                </div>
                                {isCurrent && <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded-md">Ativo</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
