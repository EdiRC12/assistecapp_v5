import React from 'react';
import { Search, Printer, Plus } from 'lucide-react';

import { TierIcon } from './ClientTierBadge';

const ClientMarketIntelligence = ({
    clientsData,
    biTimeRange,
    setBiTimeRange,
    onOpenConsolidatedBI,
    setAnalysisTier,
    setIsExplorerActive,
    setIsClientManagerOpen
}) => {
    return (
        <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500 overflow-y-auto custom-scrollbar p-6 md:p-12">
            {/* Boas Vindas & BI Controls */}
            <div className="hidden md:flex mb-12 flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-none">
                        Inteligência de <span className="text-brand-600">Mercado</span>
                    </h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Análise de Engajamento e Classificação de Clientes</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Period Selector */}
                    <div className="flex items-center gap-1 p-1 bg-white rounded-xl shadow-sm border border-slate-200">
                        <button
                            onClick={() => setBiTimeRange('30')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${biTimeRange === '30' ? 'bg-brand-600 text-white shadow-md shadow-brand-100' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            30 Dias
                        </button>
                        <button
                            onClick={() => setBiTimeRange('180')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${biTimeRange === '180' ? 'bg-brand-600 text-white shadow-md shadow-brand-100' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            6 Meses
                        </button>
                    </div>

                    {/* Consolidated Report Button */}
                    <button
                        onClick={onOpenConsolidatedBI}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-600 transition-all shadow-lg shadow-slate-200"
                    >
                        <Printer size={16} />
                        Relatório Geral
                    </button>
                </div>
            </div>

            {/* Métricas de Elite */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                {[
                    { tier: 'OURO', count: clientsData.filter(c => c.classification === 'OURO').length, label: 'Parceiros Estratégicos', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                    { tier: 'PRATA', count: clientsData.filter(c => c.classification === 'PRATA').length, label: 'Clientes em Ascensão', color: 'bg-slate-100 text-slate-600 border-slate-200' },
                    { tier: 'BRONZE', count: clientsData.filter(c => c.classification === 'BRONZE').length, label: 'Base de Operação', color: 'bg-orange-50 text-orange-600 border-orange-100' }
                ].map(metric => (
                    <div
                        key={metric.tier}
                        onClick={() => setAnalysisTier(metric.tier)}
                        className={`p-6 rounded-2xl border ${metric.color} shadow-sm flex flex-col items-center text-center transition-all hover:scale-105 cursor-pointer hover:shadow-md active:scale-95`}
                    >
                        <div className="mb-4">
                            <TierIcon tier={metric.tier} size={28} />
                        </div>
                        <span className="text-4xl font-black mb-1">{metric.count}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">{metric.tier}</span>
                        <span className="text-xs font-bold opacity-60">{metric.label}</span>
                    </div>
                ))}
            </div>

            {/* Cards de Ação Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card: Consultar */}
                <button
                    onClick={() => setIsExplorerActive(true)}
                    className="group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-left transition-all hover:border-brand-500 hover:shadow-brand-100 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50" />
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-300">
                            <Search size={28} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Explorar Clientes</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Acesse a lista completa de parceiros, consulte históricos, máquinas e relatórios técnicos exclusivos.
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-brand-600 font-black text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                            Abrir Lista <Search size={16} />
                        </div>
                    </div>
                </button>

                {/* Card: Cadastrar */}
                <button
                    onClick={() => setIsClientManagerOpen(true)}
                    className="group relative bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl text-left transition-all hover:bg-black hover:scale-[1.02] overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-brand-500/20 text-brand-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                            <Plus size={28} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Novo Cadastro</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Adicione novos parceiros estratégicos à sua base de dados de forma rápida e intuitiva.
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-brand-400 font-black text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                            Iniciar Registro <Plus size={16} />
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ClientMarketIntelligence;
