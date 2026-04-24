import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, ChevronRight, Info, FlaskConical, AlertCircle } from 'lucide-react';
import AutocompleteInput from '../AutocompleteInput';

const InventoryJustificationModal = ({
    pendingJustifications,
    handleJustifyInventory,
    setPendingJustifications,
    setIsInventorySessionActive,
    inventoryReasons = [],
    techTests = []
}) => {
    // Map of itemId -> reason label
    const [justificationsMap, setJustificationsMap] = useState({});
    // Map of itemId -> selected test object
    const [testsMap, setTestsMap] = useState({});
    // Map of itemId -> raw typed string (for recovery if select wasn't clicked)
    const [testsRefsMap, setTestsRefsMap] = useState({});

    useEffect(() => {
        if (pendingJustifications) {
            const initialMap = {};
            pendingJustifications.forEach(item => {
                initialMap[item.id] = inventoryReasons[0]?.label || 'EXTRAVIO';
            });
            setJustificationsMap(initialMap);
        }
    }, [pendingJustifications, inventoryReasons]);

    if (!pendingJustifications) return null;

    const handleConfirm = () => {
        const finalJustifications = {};
        pendingJustifications.forEach(item => {
            let selectedTest = testsMap[item.id];
            
            // Backup logic: if no test object but we have raw text, try matching by number
            if (!selectedTest && testsRefsMap[item.id]) {
                const typed = testsRefsMap[item.id].toUpperCase();
                // Tenta encontrar por "#123" ou apenas "123"
                const testIdFromNum = typed.match(/#?(\d+)/)?.[1];
                if (testIdFromNum) {
                    const matchedTest = techTests.find(t => String(t.test_number) === testIdFromNum);
                    if (matchedTest) selectedTest = matchedTest;
                }
            }

            finalJustifications[item.id] = {
                reason: justificationsMap[item.id],
                difference: item.difference,
                prevQty: item.theoretical,
                newQty: item.physical,
                related_test_id: selectedTest?.id || null,
                test_reference: selectedTest ? `#${selectedTest.test_number} - ${selectedTest.title}` : (testsRefsMap[item.id] || null)
            };
        });
        handleJustifyInventory(finalJustifications);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[44px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center shadow-inner shrink-0 leading-none">
                            <AlertTriangle size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">Direcionamento de Estoque</h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Conclua o inventário definindo o destino e o vínculo técnico dos furos</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setPendingJustifications(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Counter Stats */}
                <div className="px-8 pb-6 flex gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {pendingJustifications.length} ITENS COM DIVERGÊNCIA
                        </span>
                    </div>
                </div>

                {/* Discrepancy List / Conformity View */}
                <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar flex flex-col">
                    {pendingJustifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                                <CheckCircle2 size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Estoque em Conformidade</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                                Nenhum ajuste de saldo foi necessário nesta conferência. 
                                <br />
                                Clique em <span className="text-emerald-600">Confirmar</span> para arquivar o relatório oficial.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingJustifications.map(item => {
                                const selectedTest = testsMap[item.id];
                                const hasNF = selectedTest?.nf_number;

                                return (
                                    <div key={item.id} className="bg-slate-50/50 rounded-[32px] p-6 border border-slate-100 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between group hover:bg-white hover:border-brand-200 hover:shadow-lg transition-all duration-300">
                                        
                                        {/* Item Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight truncate">{item.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">OP: {item.op || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                                    TEÓRICO: <span className="text-slate-600">{(item.theoretical || 0).toFixed(1)} {item.unit}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                                                    FÍSICO: <span className="text-brand-700">{(item.physical || 0).toFixed(1)} {item.unit}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Difference Badge */}
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.difference < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {item.difference > 0 ? '+' : ''}{item.difference.toFixed(1)} {item.unit}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {item.difference < 0 ? 'Divergência Negativa' : 'Sobra de Estoque'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Selectors Column */}
                                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0">
                                            {/* Reason Selector */}
                                            <div className="w-full sm:w-48 shrink-0">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Motivo do Ajuste</label>
                                                <select 
                                                    value={justificationsMap[item.id] || ''}
                                                    onChange={(e) => setJustificationsMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-black text-slate-700 uppercase outline-none focus:border-brand-500 transition-all cursor-pointer appearance-none shadow-sm"
                                                >
                                                    {inventoryReasons.map(reason => (
                                                        <option key={reason.label} value={reason.label}>{reason.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Test Link Selector */}
                                            <div className="w-full sm:w-72 shrink-0">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block">Vincular Teste Técnico</label>
                                                    {hasNF ? (
                                                        <div className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase animate-pulse">
                                                            <AlertCircle size={10} /> NF Emitida
                                                        </div>
                                                    ) : (
                                                        (justificationsMap[item.id] === 'CONSUMO INTERNO' || justificationsMap[item.id] === 'REUSO DE MATERIAL') && !selectedTest && (
                                                            <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase animate-bounce">
                                                                <AlertTriangle size={10} /> Link Obrigatório
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                                <div className="relative group/test">
                                                    <AutocompleteInput
                                                        placeholder="QUAL TESTE CONSUMIU?"
                                                        icon={FlaskConical}
                                                        value={selectedTest ? `#${selectedTest.test_number} - ${selectedTest.title}` : ''}
                                                        options={techTests.map(t => ({
                                                            id: t.id,
                                                            label: `#${t.test_number} - ${t.title}`,
                                                            sublabel: `${t.client_name} • NF: ${t.nf_number || 'PENDENTE'}`
                                                        }))}
                                                        onChange={(label) => {
                                                            setTestsRefsMap(prev => ({ ...prev, [item.id]: label }));
                                                            const test = techTests.find(t => `#${t.test_number} - ${t.title}` === label);
                                                            setTestsMap(prev => ({ ...prev, [item.id]: test }));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex items-start gap-3 max-w-md">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg shrink-0">
                            <Info size={16} />
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                            Ao confirmar, o histórico registrará que estas quantidades foram direcionadas aos destinos e testes selecionados acima, garantindo a rastreabilidade fiscal e técnica do estoque.
                        </p>
                    </div>
                    
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button 
                            onClick={() => setPendingJustifications(null)}
                            className="flex-1 sm:flex-none px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirm}
                            className="flex-1 sm:flex-none px-12 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-[20px] shadow-2xl shadow-slate-200 hover:bg-black hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={16} /> Confirmar e Salvar Ajustes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryJustificationModal;
