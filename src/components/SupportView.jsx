import React, { useState } from 'react';
import { MapPin, Phone, AlertTriangle, Clock, LayoutGrid, ArrowRight } from 'lucide-react';
import SupportMapView from './support/SupportMapView';
import SupportContacts from './support/SupportContacts';
import SupportSOS from './support/SupportSOS';
import SupportOvertime from './support/SupportOvertime';

const SupportView = ({
    supabase,
    currentUser,
    tasks,
    theme,
    notifySuccess,
    notifyError,
    notifyWarning
}) => {
    // Initial state set to null to render the Welcome Cards Dashboard (ante-tela)
    const [activeSection, setActiveSection] = useState(null);

    const tabs = [
        { id: 'MAP', label: 'Mapa de Apoio', icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { id: 'CONTACTS', label: 'Contatos Úteis', icon: Phone, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'SOS', label: 'Canal SOS', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
        { id: 'OVERTIME', label: 'Horas Extras', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' }
    ];

    const renderActiveSection = () => {
        switch (activeSection) {
            case 'MAP':
                return (
                    <SupportMapView
                        supabase={supabase}
                        currentUser={currentUser}
                        theme={theme}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                );
            case 'CONTACTS':
                return (
                    <SupportContacts
                        supabase={supabase}
                        currentUser={currentUser}
                        theme={theme}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                );
            case 'SOS':
                return (
                    <SupportSOS
                        supabase={supabase}
                        currentUser={currentUser}
                        theme={theme}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                    />
                );
            case 'OVERTIME':
                return (
                    <SupportOvertime
                        supabase={supabase}
                        currentUser={currentUser}
                        tasks={tasks}
                        theme={theme}
                        notifySuccess={notifySuccess}
                        notifyError={notifyError}
                        notifyWarning={notifyWarning}
                    />
                );
            default:
                return null;
        }
    };

    // Portal Welcome Dashboard (Ante-tela)
    const renderPortalDashboard = () => {
        const userName = currentUser?.username || 'Técnico';
        
        const cardDetails = [
            {
                id: 'MAP',
                title: 'Mapa de Apoio',
                desc: 'Localize hotéis, postos de combustíveis e restaurantes na estrada de forma rápida. Exibe pins neutros de clientes cadastrados como referência espacial.',
                icon: MapPin,
                gradient: 'from-emerald-500 to-teal-600',
                btnText: 'Abrir Mapa'
            },
            {
                id: 'CONTACTS',
                title: 'Contatos Úteis',
                desc: 'Diretório compartilhado com telefones de fornecedores, suporte técnico interno, serviços de guincho e atalho verde integrado direto para o WhatsApp.',
                icon: Phone,
                gradient: 'from-blue-500 to-indigo-600',
                btnText: 'Ver Agenda'
            },
            {
                id: 'SOS',
                title: 'Canal SOS / Emergência',
                desc: 'Botão de pânico híbrido. Funciona online e offline (com leitura de coordenadas GPS satélite na tela e disparo de SMS nativo preenchido via operadora).',
                icon: AlertTriangle,
                gradient: 'from-red-500 to-rose-600',
                btnText: 'Acessar SOS'
            },
            {
                id: 'OVERTIME',
                title: 'Diário de Horas Extras',
                desc: 'Registro 100% privado de ponto e horas extras. Permite configurar expediência, calcula multiplicadores (50% e 100%) e apura o fechamento mensal corporativo.',
                icon: Clock,
                gradient: 'from-amber-500 to-orange-600',
                btnText: 'Acessar Diário'
            }
        ];

        return (
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar flex items-center justify-center">
                <div className="max-w-4xl w-full space-y-8 animate-fade">
                    
                    {/* Welcome Header */}
                    <div className="text-center md:text-left space-y-2">
                        <span className="text-xs font-black uppercase text-brand-600 tracking-widest bg-brand-50 px-3 py-1 rounded-full border">
                            Suporte de Campo
                        </span>
                        <h1 className={`text-2xl md:text-4xl font-black tracking-tight ${theme.text} mt-2`}>
                            Olá, {userName}! Como posso te ajudar na estrada hoje?
                        </h1>
                        <p className={`text-sm ${theme.subtext} font-medium leading-relaxed max-w-2xl`}>
                            Selecione um dos módulos abaixo para acessar as ferramentas de apoio. Nenhum dado do servidor será carregado até que você ative uma funcionalidade.
                        </p>
                    </div>

                    {/* Cards Dashboard Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cardDetails.map((card) => {
                            const IconComponent = card.icon;
                            return (
                                <button
                                    key={card.id}
                                    onClick={() => setActiveSection(card.id)}
                                    className="bg-white hover:bg-slate-50/50 rounded-2xl p-6 text-left border border-slate-200 shadow-sm transition-all duration-300 card-hover flex gap-5 items-start group focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    {/* Gradient Icon Badge */}
                                    <div className={`p-4 bg-gradient-to-br ${card.gradient} text-white rounded-2xl shadow-md shrink-0 transition-transform group-hover:scale-110`}>
                                        <IconComponent size={24} />
                                    </div>

                                    {/* Card textual info */}
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <h3 className="font-extrabold text-slate-800 text-base leading-snug flex items-center justify-between">
                                            <span>{card.title}</span>
                                            <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1.5 transition-all shrink-0 ml-2" />
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-3">
                                            {card.desc}
                                        </p>
                                        <div className="pt-1">
                                            <span className="text-[10px] font-black uppercase text-brand-600 tracking-wider">
                                                {card.btnText}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header & Sub-Navigation Panel */}
            <div className={`p-4 md:px-6 md:py-4 border-b shrink-0 ${theme.sidebar} ${theme.border} shadow-sm z-10`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h2 className={`text-xl md:text-2xl font-black tracking-tight ${theme.text}`}>
                            Suporte de Campo
                        </h2>
                        <p className={`text-xs ${theme.subtext} font-medium mt-0.5 opacity-85`}>
                            Central de recursos, rotas, segurança e apuração para o técnico na estrada
                        </p>
                    </div>

                    {/* Premium Pills Navigation (Displays Menu Principal Home button as well) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 px-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-max max-w-full">
                        {/* Dashboard Home tab option */}
                        <button
                            onClick={() => setActiveSection(null)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                                activeSection === null
                                    ? `bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm scale-102`
                                    : `text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40`
                            }`}
                        >
                            <LayoutGrid size={14} className={activeSection === null ? 'text-brand-500' : 'text-slate-400'} />
                            <span>Menu Principal</span>
                        </button>

                        {tabs.map((tab) => {
                            const IconComponent = tab.icon;
                            const isActive = activeSection === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSection(tab.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                                        isActive
                                            ? `bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm scale-102`
                                            : `text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40`
                                    }`}
                                >
                                    <IconComponent size={14} className={isActive ? 'text-brand-500' : 'text-slate-400'} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Section Content (Portal or Sub-component) */}
            <div className="flex-1 min-h-0 relative flex flex-col bg-slate-50">
                {activeSection === null ? renderPortalDashboard() : renderActiveSection()}
            </div>
        </div>
    );
};

export default SupportView;
