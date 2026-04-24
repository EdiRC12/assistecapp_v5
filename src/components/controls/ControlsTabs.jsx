import React from 'react';
import {
    FlaskConical, Box, Briefcase, RotateCcw, TrendingUp, CheckSquare, History
} from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const ControlsTabs = ({ activeTab, setActiveTab }) => {
    const isMobile = useIsMobile();
    let tabs = [
        { id: 'tests', label: 'Testes', icon: FlaskConical, color: 'text-indigo-600' },
        { id: 'inventory', label: 'Estoque', icon: Box, color: 'text-emerald-600' },
        { id: 'adjustment_logs', label: 'Histórico de Furos', icon: History, color: 'text-rose-600' },
        { id: 'costs', label: 'Gestão de Custos', icon: TrendingUp, color: 'text-amber-600' },
        { id: 'inventory_check', label: 'Inventário', icon: CheckSquare, color: 'text-blue-600' }
    ];

    if (!activeTab) return null;

    return (
        <div className="flex gap-1 mt-6 p-1.5 bg-slate-200/60 rounded-2xl w-fit border border-slate-300/50 shadow-inner backdrop-blur-sm">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-xl shadow-slate-300/50 scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'} `}
                >
                    <tab.icon size={14} className={activeTab === tab.id ? tab.color : 'text-slate-400'} />
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default ControlsTabs;
