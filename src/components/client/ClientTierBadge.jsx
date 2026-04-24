import React from 'react';
import { Award } from 'lucide-react';

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

export const ClientTierBadge = ({ client }) => {
    if (!client?.classification) return null;

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
    const nextUpdateDate = client.classification_date ? new Date(new Date(client.classification_date).setMonth(new Date(client.classification_date).getMonth() + 6)) : null;

    return (
        <div className="flex flex-col gap-1.5 items-start animate-in fade-in zoom-in-95 duration-500">
            <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-xl border-t border-l bg-gradient-to-br shadow-lg ${config.gradient} ${config.border} ${config.text} ${config.glow}`}>
                <div className="bg-white/20 p-1 rounded-lg backdrop-blur-md border border-white/30">
                    <Award size={14} className="brightness-200 drop-shadow-sm" strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] leading-none drop-shadow-sm">
                        {config.label}
                    </span>
                    {nextUpdateDate && (
                        <span className="text-[7px] opacity-80 font-bold uppercase tracking-widest mt-0.5">
                            Rev: {nextUpdateDate.toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
