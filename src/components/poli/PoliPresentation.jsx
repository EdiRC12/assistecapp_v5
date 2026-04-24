import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Printer, ChevronLeft, ChevronRight,
    Sparkles, Presentation, Download,
    TrendingUp, ShieldAlert, Package, FlaskConical, Target,
    BarChart3, PieChart, Users, DollarSign, Plane, Clock, ListChecks, CheckCircle2,
    Bell, RefreshCw, AlertTriangle, MessageCircle, AlertCircle
} from 'lucide-react';
import logoPlastimarau from '../../assets/logo_plastimarau.png';

// --- COMPONENTES DE SLIDE ---

const IntroSlide = ({ data }) => (
    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl animate-pulse" />
        <div className="relative z-10 space-y-8">
            <div className="w-64 h-32 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl border border-slate-100 p-8 animate-in zoom-in-50 duration-1000">
                <img src={logoPlastimarau} alt="Logo" className="w-full h-full object-contain scale-125" />
            </div>
            <div className="space-y-4">
                <h1 className="text-7xl font-black tracking-tighter leading-none bg-gradient-to-br from-slate-900 via-slate-800 to-brand-600 bg-clip-text text-transparent italic drop-shadow-sm">
                    Análise Estratégica Assistec
                </h1>
                <p className="text-2xl font-bold text-slate-400 max-w-xl mx-auto tracking-wide uppercase">
                    Relatório Inteligente POLI • {new Date().toLocaleDateString('pt-BR')}
                </p>
            </div>
            <div className="flex items-center justify-center gap-4 pt-8">
                <div className="px-6 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                    Módulo de Inteligência Ativa
                </div>
            </div>
        </div>
    </div>
);

const KPISlide = ({ title, module, metrics = [], subcontent = [], icon: Icon }) => (
    <div className="h-full flex flex-col p-12 bg-white relative">
        <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-5">
                <img src={logoPlastimarau} alt="Logo" className="h-8 opacity-70" />
                <div className="h-8 w-px bg-slate-200" />
                <div>
                    <span className="text-brand-600 font-black text-[10px] uppercase tracking-[0.3em] mb-1 block">{module}</span>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">{title}</h2>
                </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                {Icon && <Icon className="text-brand-600" size={32} />}
            </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10 flex-1 items-center">
            {metrics.map((m, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] group hover:bg-white hover:border-brand-200 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-brand-500/5 h-full flex flex-col justify-center text-center">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:bg-brand-50 transition-all duration-500 shadow-sm border border-slate-100">
                        {m.icon && <m.icon size={24} className="text-brand-600" />}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{m.label}</p>
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">{m.value}</p>
                    </div>
                </div>
            ))}
        </div>

        {subcontent.length > 0 && (
            <div className="grid grid-cols-3 gap-8 p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-inner">
                {subcontent.map((sc, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{sc.label}</p>
                        <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-600 rounded-full" style={{ width: `${Math.min((Number(sc.value) / (sc.max || 10)) * 100, 100)}%` }} />
                            </div>
                            <span className="font-black text-[11px] text-slate-700">{sc.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const DetailListSlide = ({ title, subtitle, items = [], icon: Icon, colorClass }) => (
    <div className="h-full flex flex-col p-12 bg-white">
        <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
                <div className={`p-3 bg-slate-50 rounded-2xl border border-slate-100 ${colorClass}`}>
                    <Icon size={28} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
                </div>
            </div>
            <div className="px-5 py-2.5 bg-brand-50 border border-brand-100 rounded-2xl text-[10px] font-black text-brand-600 uppercase tracking-widest">
                Detalhamento Operacional
            </div>
        </div>

            <div className="relative z-10 flex-1 bg-slate-50/50 rounded-[3rem] border border-slate-100 p-6 overflow-hidden flex flex-col">
                <div className="grid grid-cols-4 px-8 py-3 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    <div className="col-span-1">Entidade / Referência</div>
                    <div className="col-span-2">Informações Adicionais</div>
                    <div className="col-span-1 text-right">Status / Valor</div>
                </div>
                
                <div className="flex-1 space-y-2">
                    {items.slice(0, 6).map((item, idx) => (
                        <div key={idx} className="grid grid-cols-4 px-8 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm items-center hover:border-brand-200 transition-all hover:translate-x-1">
                            <div className="col-span-1 text-[11px] font-black text-slate-800 truncate pr-4 uppercase">{item.name}</div>
                            <div className="col-span-2 text-[10px] font-bold text-slate-400 truncate pr-8">{item.info}</div>
                            <div className="col-span-1 text-right">
                                <span className={`text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter ${
                                    item.status?.toLowerCase().includes('concluido') || item.status?.toLowerCase().includes('resolvido') || item.status?.toLowerCase().includes('sucesso') || item.status?.toLowerCase().includes('ativo')
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : item.status?.toLowerCase().includes('atrasado') || item.status?.toLowerCase().includes('alerta') || item.status?.toLowerCase().includes('pendente') 
                                        ? 'bg-amber-100 text-amber-600'
                                        : item.status?.toLowerCase().includes('erro') || item.status?.toLowerCase().includes('cancelado')
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-60">
                            <ListChecks size={64} />
                            <p className="font-black uppercase tracking-[0.2em] text-xs">Sem registros detalhados neste módulo</p>
                        </div>
                    )}
                </div>

                {items.length > 6 && (
                    <div className="text-center pt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                        Mostrando os 6 registros mais relevantes • +{items.length - 6} itens ocultos para otimização visual
                    </div>
                )}
            </div>
    </div>
);

const ConclusionSlide = ({ content }) => (
    <div className="h-full flex flex-col items-center justify-center p-20 bg-white text-center">
        <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-10 shadow-xl border border-brand-100">
            <Sparkles size={48} className="animate-pulse" />
        </div>
        <h2 className="text-5xl font-black mb-12 italic bg-gradient-to-br from-slate-900 to-brand-600 bg-clip-text text-transparent leading-tight tracking-tighter">
            Conclusão Estratégica
        </h2>
        <div className="max-w-4xl relative">
            <div className="absolute -left-12 -top-12 text-9xl font-serif text-slate-100 pointer-events-none opacity-50">"</div>
            <p className="text-3xl font-bold leading-relaxed text-slate-600 italic">
                {content}
            </p>
            <div className="absolute -right-12 -bottom-12 text-9xl font-serif text-slate-100 pointer-events-none opacity-50">"</div>
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL ---

const PoliPresentation = ({ data, onClose, currentUser }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const pdfRef = useRef();

    if (!data) return null;

    // Gerador da Sequência de Slides
    const slides = [
        { type: 'COVER', component: <IntroSlide data={data} /> }
    ];

    // Clientes
    if (data.customers) {
        slides.push({
            type: 'KPI',
            component: <KPISlide 
                title="Gestão de Clientes & CRM"
                module="Vendas & Pós-Venda"
                icon={Users}
                metrics={[
                    { label: 'Total Base', value: data.customers.total, icon: Users },
                    { label: 'Tier Ouro', value: data.customers.gold, icon: TrendingUp },
                    { label: 'Tier Prata', value: data.customers.silver, icon: CheckCircle2 },
                    { label: 'Tier Bronze', value: data.customers.bronze, icon: ShieldAlert }
                ]}
                subcontent={data.customers.ranking?.slice(0, 3).map(c => ({ label: c.name, value: c.count }))}
            />
        });
        slides.push({
            type: 'DETAIL',
            component: <DetailListSlide 
                title="Carteira de Clientes"
                subtitle="Classificação e Status de Atividade"
                items={data.customers.details || []}
                icon={Users}
                colorClass="text-brand-600"
            />
        });
    }

    // Comercial & SAC
    if (data.commercial) {
        slides.push({
            type: 'KPI',
            component: <KPISlide 
                title="Performance Comercial & SAC"
                module="Satisfação & Qualidade"
                icon={MessageCircle}
                metrics={[
                    { label: 'SACs Registrados', value: data.commercial.totalSacs, icon: MessageCircle },
                    { label: 'RNCs Geradas', value: data.commercial.totalRncs, icon: ShieldAlert },
                    { label: 'SLA Resolução', value: `${data.commercial.slaRate}%`, icon: CheckCircle2 },
                    { label: 'Faturamento Ref.', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.commercial.totalRevenue), icon: DollarSign }
                ]}
                subcontent={data.commercial.topReasons?.slice(0, 3).map(r => ({ label: r.reason, value: r.count }))}
            />
        });
        slides.push({
            type: 'DETAIL',
            component: <DetailListSlide 
                title="Histórico de OTs & RNCs"
                subtitle="Monitoramento de Reclamações e Qualidade"
                items={data.commercial.details || []}
                icon={MessageCircle}
                colorClass="text-rose-600"
            />
        });
    }

    // Operações & Viagens
    if (data.operations) {
        slides.push({
            type: 'KPI',
            component: <KPISlide 
                title="Logística & Operações de Campo"
                module="Esforço & Logística"
                icon={Plane}
                metrics={[
                    { label: 'Total Viagens', value: data.operations.totalTrips, icon: Plane },
                    { label: 'Kilometragem', value: `${data.operations.totalKm} KM`, icon: TrendingUp },
                    { label: 'Custo Logístico', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.operations.totalCost), icon: DollarSign },
                    { label: 'Custo por KM', value: `R$ ${data.operations.avgCostPerKm}`, icon: Target }
                ]}
            />
        });
        slides.push({
            type: 'DETAIL',
            component: <DetailListSlide 
                title="Rastreabilidade de Viagens"
                subtitle="Detalhamento de Trechos e Atendimentos"
                items={data.operations.details || []}
                icon={Plane}
                colorClass="text-blue-600"
            />
        });
    }

    // Engenharia
    if (data.engineering) {
        slides.push({
            type: 'KPI',
            component: <KPISlide 
                title="Engenharia & Desenvolvimento"
                module="P&D Técnicos"
                icon={FlaskConical}
                metrics={[
                    { label: 'Testes Totais', value: data.engineering.total, icon: FlaskConical },
                    { label: 'Taxa Sucesso', value: `${data.engineering.successRate}%`, icon: Target },
                    { label: 'Custo Prod.', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.engineering.productionCost), icon: DollarSign },
                    { label: 'Custo Log.', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.engineering.logisticsCost), icon: TrendingUp }
                ]}
            />
        });
        slides.push({
            type: 'DETAIL',
            component: <DetailListSlide 
                title="Relatório de Testes"
                subtitle="Validação e Resultados de Engenharia"
                items={data.engineering.details || []}
                icon={FlaskConical}
                colorClass="text-purple-600"
            />
        });
    }

    // Daily Hub, Devoluções e Ocorrências
    if (data.dailyHub) {
        slides.push({
            type: 'KPI',
            component: <KPISlide 
                title="Daily Hub Productivity"
                module="Agenda & Lembretes"
                icon={Clock}
                metrics={[
                    { label: 'Total Lembretes', value: data.dailyHub.total || 0, icon: Bell },
                    { label: 'Confirmados', value: data.dailyHub.confirmed || 0, icon: CheckCircle2 },
                    { label: 'Pendentes', value: data.dailyHub.pending || 0, icon: Clock },
                    { label: 'Atrasados', value: data.dailyHub.overdue || 0, icon: AlertTriangle }
                ]}
            />
        });
        slides.push({
            type: 'DETAIL',
            component: <DetailListSlide 
                title="Lembretes do Período"
                subtitle="Próximas Atividades e Follow-ups"
                items={data.dailyHub.details || []}
                icon={Clock}
                colorClass="text-orange-600"
            />
        });
    }

    if (data.returns) {
        slides.push({
            type: 'KPI',
            component: <KPISlide 
                title="Controle de Devoluções"
                module="Logística Reversa"
                icon={RefreshCw}
                metrics={[
                    { label: 'Devoluções', value: data.returns.total || 0, icon: RefreshCw },
                    { label: 'Em Processo', value: data.returns.pending || 0, icon: Clock },
                    { label: 'Valor Retorno', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.returns.totalValue || 0), icon: DollarSign },
                    { label: 'Taxa R/S', value: `${data.returns.total > 0 ? Math.round((data.returns.total / (data.commercial?.totalSacs || 1)) * 100) : 0}%`, icon: TrendingUp }
                ]}
            />
        });
        slides.push({
            type: 'DETAIL',
            component: <DetailListSlide 
                title="Lista de Itens Retornados"
                subtitle="Monitoramento de Reversas em Aberto"
                items={data.returns.details || []}
                icon={RefreshCw}
                colorClass="text-red-700"
            />
        });
    }

    if (data.occurrences) {
        slides.push({
            type: 'KPI',
            component: <KPISlide 
                title="Incidentes Operacionais"
                module="Gestão de Riscos"
                icon={AlertTriangle}
                metrics={[
                    { label: 'Incidentes', value: data.occurrences.total || 0, icon: ShieldAlert },
                    { label: 'Multas/Custos', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.occurrences.totalFines || 0), icon: DollarSign },
                    { label: 'Nível Risco', value: data.occurrences.total > 5 ? 'Alto' : 'Baixo', icon: AlertTriangle },
                    { label: 'Média/Viagem', value: (data.occurrences.total / (data.operations?.totalTrips || 1)).toFixed(2), icon: TrendingUp }
                ]}
            />
        });
        slides.push({
            type: 'DETAIL',
            component: <DetailListSlide 
                title="Fatos em Campo"
                subtitle="Ocorrências e Eventos Logísticos"
                items={data.occurrences.details || []}
                icon={AlertCircle}
                colorClass="text-red-900"
            />
        });
    }

    // Conclusão
    slides.push({ 
        type: 'CONCLUSION', 
        component: <ConclusionSlide content={data.aiConclusion || "Processando recomendações estratégicas..."} /> 
    });

    const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
    const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

    const exportPDF = async () => {
        alert("Preparando PDF consolidado... Isso pode levar alguns segundos.");
        window.print(); // O CSS @media print cuidará de formatar todos os slides.
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col animate-in fade-in duration-300 overflow-hidden poli-presentation-engine">
            {/* Barra de Ferramentas (Escondida no Print) */}
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex justify-between items-center print:hidden shadow-sm">
                <div className="flex items-center gap-5">
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-all hover:scale-105 active:scale-95 text-slate-600">
                        <X size={26} />
                    </button>
                    <div className="h-8 w-px bg-slate-300" />
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-100">
                            <Presentation size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">POLI Presentation</h2>
                            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{slides.length} Slides • Resumo e Detalhamento</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="bg-white border border-slate-200 shadow-xl rounded-full px-6 py-2 flex items-center gap-6 ring-4 ring-slate-100/50">
                        <button onClick={prevSlide} disabled={currentSlide === 0} className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-20 transition-all"><ChevronLeft size={24} /></button>
                        <span className="text-xs font-black text-slate-600 min-w-[60px] text-center uppercase tracking-widest italic">{currentSlide + 1} / {slides.length}</span>
                        <button onClick={nextSlide} disabled={currentSlide === slides.length - 1} className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-20 transition-all"><ChevronRight size={24} /></button>
                    </div>
                    <button onClick={exportPDF} className="bg-slate-900 border border-slate-800 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-600 hover:border-brand-500 transition-all flex items-center gap-3 shadow-2xl active:scale-95 group">
                        <Printer size={20} className="group-hover:rotate-12 transition-transform" /> Exportar Relatório
                    </button>
                </div>
            </div>

            {/* Stage Principal */}
            <div className="flex-1 flex items-center justify-center p-12 relative overflow-hidden bg-slate-100 print:bg-white print:p-0">
                <div className="w-full max-w-[1100px] aspect-video bg-white rounded-[4rem] shadow-2xl border border-white relative overflow-hidden print:w-full print:h-full print:max-w-none print:shadow-none print:border-none print:rounded-none">
                    <div className="h-full print:hidden">
                        {slides[currentSlide].component}
                    </div>

                    {/* Versão para Impressão: Renderiza TUDO sequencialmente */}
                    <div className="hidden print:block">
                        {slides.map((s, i) => (
                            <div key={i} className="page-break-after-always h-screen w-screen flex items-center justify-center bg-white">
                                {s.component}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rodapé de Progresso (Escondido no Print) */}
            <div className="px-12 py-8 bg-slate-50 border-t border-slate-200 flex items-center gap-10 print:hidden shrink-0">
                <div className="flex items-center gap-4 min-w-[200px]">
                    <img src={logoPlastimarau} alt="Logo" className="h-6 opacity-40" />
                    <div className="h-4 w-px bg-slate-300" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{currentUser?.username || 'POLI SYSTEM'}</span>
                </div>
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className="h-full bg-brand-600 transition-all duration-700 shadow-xl"
                        style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                    />
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: landscape; margin: 0; }
                    #root, .print\\:hidden { display: none !important; }
                    .poli-presentation-engine { position: static !important; width: 100% !important; background: white !important; }
                    .page-break-after-always { page-break-after: always !important; }
                    body { background: white !important; }
                }
                .poli-presentation-engine { font-family: 'Inter', sans-serif; }
            `}</style>
        </div>,
        document.body
    );
};

export default PoliPresentation;
