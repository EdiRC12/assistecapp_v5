import React from 'react';
import {
    Search, Calendar, Plus, BarChart3, Upload
} from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const ControlsActionBar = ({
    searchTerm,
    setSearchTerm,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    activeTab,
    stockStatusFilter,
    setStockStatusFilter,
    statusFilter,
    setStatusFilter,
    setShowAddForm,
    setNewItem,
    setReportContext,
    setShowReportModal,
    setAiAnalysis,
    handleExcelUpload,
    MONTHS = [],
    testStatusPresets = [],
    DEFAULT_TEST_PARAMS = {},
    viewMode = 'LIST',
    setViewMode,
    activeSection,
    setActiveSection
}) => {
    const isMobile = useIsMobile();
    if (!activeTab) return null;

    return (
        <div className={`animate-in slide-in-from-top-2 duration-300 ${isMobile ? 'mt-2' : 'mt-4'}`}>
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-4'} items-center`}>
                <div className={`flex-1 w-full bg-white ${isMobile ? 'p-0.5' : 'p-1'} rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 md:gap-2`}>
                    <div className="relative flex-1">
                        <Search className={`absolute ${isMobile ? 'left-3' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={isMobile ? 14 : 16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                            className={`w-full ${isMobile ? 'pl-9 pr-3 py-1.5' : 'pl-10 pr-4 py-2'} bg-slate-50/50 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-600 placeholder:text-slate-300 text-[10px] md:text-xs`}
                        />
                    </div>

                    {/* Temporal Filters */}
                    <div className={`flex gap-1.5 md:gap-2 px-2 md:px-3 border-l border-slate-100 items-center h-7 md:h-8`}>
                        <Calendar size={isMobile ? 12 : 14} className="text-slate-400" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                            className="bg-transparent font-black text-[8px] md:text-[9px] uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:text-brand-600 transition-colors"
                        >
                            {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                            <option value="ALL">TUDO</option>
                        </select>

                        {selectedYear !== 'ALL' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                                className={`bg-transparent font-black text-[8px] md:text-[9px] uppercase tracking-widest text-slate-600 outline-none cursor-pointer border-l border-slate-100 ${isMobile ? 'pl-1' : 'pl-2'} hover:text-brand-600 transition-colors`}
                            >
                                <option value="ALL">{isMobile ? "MESES" : "TODOS MESES"}</option>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{isMobile ? m.label.substring(0,3) : m.label}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {activeTab === 'inventory' && (
                            <select
                                value={stockStatusFilter}
                                onChange={(e) => setStockStatusFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest text-slate-500 outline-none focus:ring-2 focus:ring-brand-500 appearance-none min-w-[140px] text-center hover:bg-white transition-all"
                            >
                                <option value="ACTIVE">ATIVOS (EM ESTOQUE)</option>
                                <option value="BILLED">FATURADOS (SALDO 0)</option>
                                <option value="DISCARDED">DESCARTADOS</option>
                                <option value="ALL">TODOS ITENS</option>
                            </select>
                        )}

                        {activeTab !== 'costs' && (
                            <button
                                onClick={() => {
                                    const defaults = activeTab === 'tests' ? { extra_data: DEFAULT_TEST_PARAMS } : {};
                                    setNewItem(defaults);
                                    setShowAddForm(true);
                                }}
                                className="bg-gradient-to-br from-slate-800 to-slate-950 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95 group"
                            >
                                <Plus size={16} className="group-hover:rotate-90 transition-transform" /> {activeTab === 'tests' ? 'Novo Teste' : 'Novo'}
                            </button>
                        )}

                        {activeTab === 'tests' && (
                            <>
                                <button
                                    onClick={() => {
                                        setReportContext('TESTS');
                                        setAiAnalysis('');
                                        setShowReportModal(true);
                                    }}
                                    className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-2 shadow-xl shadow-indigo-100 active:scale-95 group"
                                >
                                    <BarChart3 size={16} className="group-hover:bounce transition-transform" /> Relatórios
                                </button>
                                <label className="bg-gradient-to-br from-brand-500 to-brand-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-2 shadow-xl shadow-brand-100 cursor-pointer active:scale-95 group">
                                    <Upload size={16} className="group-hover:-translate-y-1 transition-transform" /> Importar
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-white border border-slate-200 px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest text-slate-500 outline-none focus:ring-2 focus:ring-brand-500 appearance-none min-w-[120px] text-center focus:border-brand-300"
                                >
                                    <option value="ALL">TODOS STATUS</option>
                                    {testStatusPresets.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                                </select>
                            </>
                        )}

                        {/* View Switcher (List/Dashboard) */}
                        {(activeTab === 'tests' || activeTab === 'inventory') && (
                            <div className={`flex bg-slate-100 p-0.5 md:p-1 rounded-xl border border-slate-200 ${isMobile ? 'ml-0' : 'ml-2'}`}>
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setViewMode('DASHBOARD')}
                                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'DASHBOARD' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Dash
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ControlsActionBar;
