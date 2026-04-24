import React, { useState, useEffect } from 'react';
import {
    X, FileSpreadsheet, RefreshCw, CheckCircle, Info, Database,
    Plus, Coins, AlertTriangle, Search, FileText
} from 'lucide-react';

const TestDetailsModal = ({
    isOpen,
    onClose,
    test: temporaryTest,
    setTest: setTemporaryTest,
    onSave: handleSaveDetails,
    isSaving,
    tasks = [],
    onConvertToTask,
    testFlows = [],
    testStatusPresets = [],
    notifySuccess,
    notifyError,
    inventory = [],
    tests = [],
    getNormalizedParams = (data) => data,
    handleRegisterClient,
    isClientRegistered,
    registeredClients = [],
    allClients = [],
    isMeetingView
}) => {
    // Estado local para controle do seletor (Garante reatividade sem dependência de props lentas)
    const [localShowStock, setLocalShowStock] = useState(false);
    const [localStockSearch, setLocalStockSearch] = useState('');
    // Sincronização automática dos campos importados com os controles visuais
    useEffect(() => {
        if (!temporaryTest) return;

        let needsSync = false;
        let syncedTest = { ...temporaryTest };

        // Sincronização de Situação com Status Visual (se bater com algum preset)
        if (syncedTest.situation) {
            const situationUpper = syncedTest.situation.toUpperCase().trim();
            let targetLabel = situationUpper;

            if (situationUpper === 'CONCLUÍDO' || situationUpper === 'CONCLUIDO') {
                targetLabel = 'APROVADO';
            } else if (situationUpper === 'AGUARDANDO') {
                targetLabel = 'AGUARDANDO RETORNO DO CLIENTE';
            }

            const matchedPreset = testStatusPresets.find(p => p.label.toUpperCase() === targetLabel);
            if (matchedPreset && syncedTest.status !== matchedPreset.label) {
                syncedTest.status = matchedPreset.label;
                syncedTest.status_color = matchedPreset.color;
                needsSync = true;
            }
        }

        if (needsSync) {
            setTemporaryTest(syncedTest);
        }
    }, [
        temporaryTest?.situation,
        temporaryTest?.nf_number,
        temporaryTest?.extra_data?.nf_nota,
        temporaryTest?.extra_data?.material_enviado
    ]);

    // Helpers para Gestão de Múltiplas NFs / Remessas
    const handleAddShipment = () => {
        const shipments = temporaryTest?.extra_data?.shipments || [];
        // Se já existia uma NF única antiga, migra ela para o primeiro item se a lista estiver vazia
        if (shipments.length === 0 && temporaryTest.nf_number) {
            shipments.push({
                id: Date.now(),
                nf: temporaryTest.nf_number,
                qty: temporaryTest.quantity_billed || 0,
                volumes: temporaryTest.extra_data?.volumes_faturados || 0,
                date: new Date().toISOString().split('T')[0]
            });
        }

        const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
        const consumedByOthers = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
        const currentBilled = shipments.reduce((sum, s) => sum + (parseFloat(s.qty) || 0), 0);
        const available = Math.max(0, (temporaryTest.produced_quantity || 0) + (invItem?.inventory_adjustment || 0) - consumedByOthers - currentBilled);

        const newShipments = [
            ...shipments,
            { id: Date.now() + 1, nf: '', qty: available, volumes: 0, date: new Date().toISOString().split('T')[0] }
        ];
        syncShipments(newShipments);
    };

    const syncShipments = (newShipments) => {
        const totalQty = newShipments.reduce((sum, s) => sum + (parseFloat(s.qty) || 0), 0);
        const nfList = newShipments.map(s => s.nf).filter(Boolean).join(', ');
        
        setTemporaryTest({
            ...temporaryTest,
            quantity_billed: totalQty,
            nf_number: nfList,
            extra_data: {
                ...temporaryTest.extra_data,
                shipments: newShipments,
                nf_nota: nfList,
                material_enviado: newShipments.length > 0 ? 'SIM' : temporaryTest.extra_data?.material_enviado
            }
        });
    };

    const updateShipmentField = (id, field, value) => {
        const shipments = [...(temporaryTest?.extra_data?.shipments || [])];
        const idx = shipments.findIndex(s => s.id === id);
        if (idx === -1) return;

        let val = value;
        if (field === 'qty') {
            const numVal = parseFloat(value) || 0;
            const otherShipmentsQty = shipments.filter(s => s.id !== id).reduce((sum, s) => sum + (parseFloat(s.qty) || 0), 0);
            const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
            const consumedByOthers = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
            const maxAvailable = (temporaryTest.produced_quantity || 0) + (invItem?.inventory_adjustment || 0) - consumedByOthers - otherShipmentsQty;
            val = Math.min(numVal, Math.max(0, maxAvailable));
        }

        shipments[idx] = { ...shipments[idx], [field]: val };
        syncShipments(shipments);
    };

    const removeShipment = (id) => {
        const newShipments = (temporaryTest?.extra_data?.shipments || []).filter(s => s.id !== id);
        syncShipments(newShipments);
    };

    if (!isOpen) return null;

    return (
        <div className={`absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm ${isMeetingView ? 'p-1' : 'p-4'} animate-in fade-in duration-200`}>
            <div className={`bg-white rounded-[40px] shadow-2xl w-full ${isMeetingView ? 'max-w-5xl' : 'max-w-2xl'} overflow-hidden flex flex-col ${isMeetingView ? 'max-h-[98%]' : 'max-h-[90vh]'} animate-in zoom-in-95 duration-200`}>
                <div className="flex justify-between items-center px-8 py-8 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-brand-50 text-brand-600 rounded-3xl shadow-sm"><FileSpreadsheet size={28} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {temporaryTest?.test_number && (
                                    <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm shrink-0">
                                        #{temporaryTest.test_number}
                                    </span>
                                )}
                                <input
                                    value={temporaryTest?.title || ''}
                                    onChange={(e) => setTemporaryTest({ ...temporaryTest, title: e.target.value })}
                                    className="w-full text-xl font-black text-slate-800 uppercase tracking-tighter bg-transparent border-none outline-none focus:ring-2 focus:ring-brand-500 rounded-xl px-1"
                                    placeholder="Nome do Experimento / Teste"
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        list="client-list"
                                        value={temporaryTest?.client_name || ''}
                                        onChange={(e) => setTemporaryTest({ ...temporaryTest, client_name: e.target.value })}
                                        className="text-sm text-brand-600 font-bold uppercase tracking-widest bg-transparent border-none outline-none focus:ring-2 focus:ring-brand-500 rounded-xl px-2 -ml-2"
                                    />
                                    {temporaryTest?.client_name && !isClientRegistered(temporaryTest.client_name) && (
                                        <button
                                            onClick={() => handleRegisterClient(temporaryTest.client_name)}
                                            className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse hover:bg-amber-100"
                                            title="Adicionar à base oficial de clientes"
                                        >
                                            OFICIALIZAR +
                                        </button>
                                    )}
                                </div>
                                <datalist id="client-list">
                                    {registeredClients?.map((c, i) => (
                                        <option key={i} value={c.name} />
                                    ))}
                                </datalist>
                                <div className="flex items-center gap-1.5 ml-0.5">
                                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Lançado em</span>
                                    <span className="text-[9px] text-slate-600 font-black uppercase">
                                        {temporaryTest?.created_at ? new Date(temporaryTest.created_at).toLocaleDateString('pt-BR') : 'Pendente'}
                                    </span>
                                    {temporaryTest?.consumed_stock_id && (
                                        <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-brand-50 border border-brand-100 rounded-md animate-pulse">
                                            <RefreshCw size={8} className="text-brand-600" />
                                            <span className="text-[7px] text-brand-700 font-black uppercase tracking-tighter">Material Reutilizado</span>
                                        </div>
                                    )}
                                    {temporaryTest?.client_name && !isClientRegistered(temporaryTest.client_name) && (
                                        <span className="text-[8px] text-amber-500 font-bold italic ml-2">⚠️ Não cadastrado</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-800 transition-colors"><X size={28} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CARD STATUS & LOGÍSTICA UNIFICADO */}
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-4 shadow-sm">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status do Experimento</label>
                            <div className="flex flex-wrap gap-1.5">
                                {testStatusPresets.map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => setTemporaryTest({ ...temporaryTest, status: p.label, status_color: p.color })}
                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black transition-all border ${temporaryTest?.status === p.label ? 'shadow-sm scale-105' : 'border-slate-200 bg-white text-slate-400 opacity-60'}`}
                                        style={{
                                            backgroundColor: temporaryTest?.status === p.label ? p.color : 'transparent',
                                            color: temporaryTest?.status === p.label ? 'white' : '#94a3b8',
                                            borderColor: temporaryTest?.status === p.label ? 'transparent' : '#e2e8f0'
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fluxo (Fase Atual)</label>
                                <select
                                    value={temporaryTest?.flow_stage || ''}
                                    onChange={(e) => setTemporaryTest({ ...temporaryTest, flow_stage: e.target.value })}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-sm uppercase tracking-wide"
                                >
                                    <option value="">FASE NÃO DEFINIDA</option>
                                    {testFlows?.map((f, i) => (
                                        <option key={i} value={typeof f === 'string' ? f : f.label}>
                                            {typeof f === 'string' ? f : f.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-4 shadow-sm flex flex-col justify-between">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logística de Envio</label>
                                <div className="p-1 bg-slate-200/50 rounded-xl flex border border-slate-200 shadow-inner">
                                    {['NÃO', 'SIM'].map(option => (
                                        <button
                                            key={option}
                                            onClick={() => {
                                                const newExtra = { ...temporaryTest.extra_data, material_enviado: option };
                                                if (option === 'NÃO') delete newExtra.nf_nota;
                                                setTemporaryTest({ ...temporaryTest, extra_data: newExtra });
                                            }}
                                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${temporaryTest?.extra_data?.material_enviado === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                                           {temporaryTest?.extra_data?.material_enviado === 'SIM' && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                    <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {(temporaryTest?.extra_data?.shipments || []).map((s, idx) => (
                                            <div key={s.id || idx} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 relative group">
                                                <button 
                                                    onClick={() => removeShipment(s.id)}
                                                    className="absolute -top-1 -right-1 p-1 bg-rose-50 text-rose-400 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100"
                                                >
                                                    <X size={12} />
                                                </button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">N° NF</label>
                                                        <input
                                                            type="text"
                                                            placeholder="000.000"
                                                            value={s.nf || ''}
                                                            onChange={(e) => updateShipmentField(s.id, 'nf', e.target.value.toUpperCase())}
                                                            className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Qtd ({temporaryTest?.unit || 'KG'})</label>
                                                        <input
                                                            type="number"
                                                            value={s.qty || ''}
                                                            onChange={(e) => updateShipmentField(s.id, 'qty', e.target.value)}
                                                            className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Volumes</label>
                                                        <input
                                                            type="number"
                                                            value={s.volumes || ''}
                                                            onChange={(e) => updateShipmentField(s.id, 'volumes', e.target.value)}
                                                            className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Data</label>
                                                        <input
                                                            type="date"
                                                            value={s.date || ''}
                                                            onChange={(e) => updateShipmentField(s.id, 'date', e.target.value)}
                                                            className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {(!temporaryTest?.extra_data?.shipments || temporaryTest?.extra_data?.shipments?.length === 0) && (
                                            <div className="text-center py-4 bg-white/50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-bold text-slate-400">
                                                Nenhum faturamento registrado.
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={handleAddShipment}
                                        className="w-full py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                                    >
                                        <Plus size={14} /> Adicionar Faturamento
                                    </button>
                                </div>
                            )}
                            {temporaryTest?.extra_data?.material_enviado !== 'SIM' && (
                                <div className="text-[9px] font-bold text-slate-400 italic text-center">Aguardando envio de material</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* DADOS DA PRODUÇÃO ( NOVOS CAMPOS ) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nº do Pedido</label>
                            <input
                                type="text"
                                value={temporaryTest?.test_order || ''}
                                onChange={(e) => setTemporaryTest({ ...temporaryTest, test_order: e.target.value })}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nº da OP</label>
                            <input
                                type="text"
                                value={temporaryTest?.op_number || ''}
                                onChange={(e) => setTemporaryTest({ ...temporaryTest, op_number: e.target.value })}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data de Entrega</label>
                            <input
                                type="date"
                                value={temporaryTest?.delivery_date ? temporaryTest.delivery_date.split('T')[0] : ''}
                                onChange={(e) => setTemporaryTest({ ...temporaryTest, delivery_date: e.target.value })}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Produto</label>
                            <input
                                type="text"
                                value={temporaryTest?.product_name || ''}
                                onChange={(e) => setTemporaryTest({ ...temporaryTest, product_name: e.target.value })}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Situação / NF</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Situação"
                                    value={temporaryTest?.situation || ''}
                                    onChange={(e) => setTemporaryTest({ ...temporaryTest, situation: e.target.value })}
                                    className="w-1/2 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                                />
                                <input
                                    type="text"
                                    placeholder="Nº da NF"
                                    value={temporaryTest?.nf_number || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setTemporaryTest({
                                            ...temporaryTest,
                                            nf_number: val,
                                            flow_stage: val ? 'FATURADO' : temporaryTest.flow_stage,
                                            extra_data: {
                                                ...temporaryTest.extra_data,
                                                nf_nota: val,
                                                material_enviado: val ? 'SIM' : temporaryTest.extra_data?.material_enviado
                                            }
                                        });
                                    }}
                                    className="w-1/2 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 ml-1 text-[10px] font-black text-slate-500 uppercase tracking-widest"><Info size={14} className="text-brand-500" /> Descrição Técnica</div>
                        <textarea
                            value={temporaryTest?.description || ''}
                            onChange={(e) => setTemporaryTest({ ...temporaryTest, description: e.target.value })}
                            className="w-full p-5 bg-slate-50 rounded-[28px] border border-slate-100 text-sm text-slate-700 leading-relaxed font-medium outline-none focus:ring-2 focus:ring-brand-500 min-h-[120px] resize-none shadow-inner"
                            placeholder="Descreva aqui os detalhes do teste..."
                        />
                    </div>

                    {/* PARÂMETROS DO EXCEL */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 ml-1 text-[10px] font-black text-slate-500 uppercase tracking-widest"><Database size={14} className="text-indigo-500" /> Parâmetros do Excel</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {temporaryTest && Object.entries(getNormalizedParams(temporaryTest.extra_data))
                                .map(([k, v]) => (
                                    <div key={k} className="p-4 bg-white border border-slate-100 rounded-[24px] shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{k}</span>
                                        <input
                                            type={k === 'VOLUMES' ? 'number' : 'text'}
                                            step={k === 'VOLUMES' ? '1' : undefined}
                                            value={v?.toString() || ''}
                                            onChange={(e) => {
                                                const newExtra = { ...temporaryTest.extra_data };
                                                const originalKey = Object.keys(newExtra).find(key => key.trim().toUpperCase() === k.toUpperCase()) || k;
                                                newExtra[originalKey] = e.target.value;
                                                setTemporaryTest({ ...temporaryTest, extra_data: newExtra });
                                            }}
                                            className="text-xs text-slate-700 font-black bg-transparent border-none outline-none p-0 focus:text-indigo-600"
                                        />
                                    </div>
                                ))}
                            <button
                                onClick={() => { const key = prompt('Nome do parâmetro:'); if (key) { const newExtra = { ...temporaryTest.extra_data, [key]: '' }; setTemporaryTest({ ...temporaryTest, extra_data: newExtra }); } }}
                                className="p-4 border-2 border-dashed border-slate-100 rounded-[24px] text-slate-300 hover:border-indigo-100 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase"
                            >
                                <Plus size={16} /> Novo Parâmetro
                            </button>
                        </div>
                    </div>

                    {/* GESTÃO FINANCEIRA E PRODUTIVA */}
                    <div className="bg-slate-900 rounded-[28px] p-6 text-white shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/10 rounded-lg"><Coins size={16} className="text-amber-400" /></div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest">Gestão Financeira e Produtiva</h3>
                            </div>
                            {(() => {
                                const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                const isDonor = invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                if (isDonor) {
                                    return (
                                        <div className="px-3 py-1 bg-rose-500/20 rounded-full border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
                                            <AlertTriangle size={10} className="text-rose-400" />
                                            <span className="text-[7px] font-black text-rose-400 uppercase tracking-widest">Registro Travado: Saldo em Uso</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="px-3 py-1 bg-brand-500/20 rounded-full border border-brand-500/30">
                                        <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest">Integração Estoque 65</span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Stock Reusage Selection */}
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <RefreshCw size={14} className="text-brand-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Reaproveitamento de Saldo</span>
                                </div>
                                {temporaryTest?.consumed_stock_id ? (
                                    <button
                                        onClick={() => setTemporaryTest({ ...temporaryTest, consumed_stock_id: null })}
                                        className="text-[8px] font-bold text-rose-400 hover:text-rose-300 uppercase underline"
                                    >
                                        Remover Vínculo
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            console.log('[TestDetailsModal] Toggle localShowStock:', !localShowStock);
                                            setLocalShowStock(!localShowStock);
                                        }}
                                        className="text-[8px] font-black bg-brand-500 text-white px-3 py-1 rounded-lg uppercase hover:bg-brand-600 transition-all"
                                    >
                                        {localShowStock ? 'Cancelar' : 'Vincular Origem'}
                                    </button>
                                )}
                            </div>

                            {temporaryTest?.consumed_stock_id && (
                                <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-brand-400 uppercase">
                                            {inventory.find(i => i.id === temporaryTest.consumed_stock_id)?.name || 'Item Vinculado'}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">
                                            Disponível: {inventory.find(i => i.id === temporaryTest.consumed_stock_id)?.quantity} {inventory.find(i => i.id === temporaryTest.consumed_stock_id)?.unit}
                                        </span>
                                    </div>
                                    <CheckCircle size={16} className="text-brand-400" />
                                </div>
                            )}

                            {localShowStock && !temporaryTest?.consumed_stock_id && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar em todos os depósitos..."
                                            className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-[10px] font-bold text-white outline-none focus:ring-1 focus:ring-brand-500"
                                            value={localStockSearch}
                                            onChange={e => setLocalStockSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                        {inventory
                                            .filter(i => i.quantity > 0 && (!localStockSearch || i.name.toLowerCase().includes(localStockSearch.toLowerCase()) || i.client_name?.toLowerCase().includes(localStockSearch.toLowerCase())))
                                            .map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        const sourceTest = tests.find(t => t.id === item.test_id);
                                                        const originalQty = item.qty_produced || (sourceTest?.produced_quantity || 0);
                                                        const originalCost = sourceTest?.op_cost || 0;

                                                        // Regra de Três: (Custo Original / Qtd Original) * Qtd no Estoque
                                                        const unitPrice = originalQty > 0 ? originalCost / originalQty : 0;
                                                        const inheritedCost = item.production_cost || (unitPrice * item.quantity);

                                                        setTemporaryTest({
                                                            ...temporaryTest,
                                                            consumed_stock_id: item.id,
                                                            produced_quantity: item.quantity,
                                                            op_cost: parseFloat(inheritedCost.toFixed(2)),
                                                            unit: item.unit
                                                        });
                                                        setLocalShowStock(false);
                                                    }}
                                                    className="w-full p-2 hover:bg-white/5 rounded-lg text-left flex justify-between items-center transition-colors group"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-200 group-hover:text-brand-400">{item.name}</span>
                                                        <span className="text-[7px] font-bold text-slate-500 uppercase">{item.client_name || 'Sem Cliente'} • {item.stock_bin}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-300">{item.quantity} {item.unit}</span>
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Volumes (Bobinas/Pacotes)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={temporaryTest?.volumes || ''}
                                        onChange={(e) => setTemporaryTest({ ...temporaryTest, volumes: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px]">Vols</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Custo Total (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px]">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        readOnly={!!temporaryTest?.consumed_stock_id || (() => {
                                            const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                            return invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                        })()}
                                        value={temporaryTest?.op_cost || ''}
                                        onChange={(e) => {
                                            if (temporaryTest?.consumed_stock_id) return;
                                            setTemporaryTest({ ...temporaryTest, op_cost: parseFloat(e.target.value) || 0 });
                                        }}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-xs font-black outline-none transition-all ${temporaryTest?.consumed_stock_id || (() => {
                                            const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                            return invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                        })()
                                            ? 'bg-slate-800/80 border-white/5 text-slate-500 cursor-not-allowed'
                                            : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-brand-500'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Qtd Produzida ({temporaryTest?.unit || 'KG'})</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        readOnly={!!temporaryTest?.consumed_stock_id || (() => {
                                            const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                            return invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                        })()}
                                        value={temporaryTest?.produced_quantity || ''}
                                        onChange={(e) => {
                                            if (temporaryTest?.consumed_stock_id) return;
                                            setTemporaryTest({ ...temporaryTest, produced_quantity: parseFloat(e.target.value) || 0 });
                                        }}
                                        className={`w-full px-4 py-3 border rounded-xl text-xs font-black outline-none transition-all ${temporaryTest?.consumed_stock_id || (() => {
                                            const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                            return invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                        })()
                                            ? 'bg-slate-800/80 border-white/5 text-slate-500 cursor-not-allowed'
                                            : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-brand-500'
                                            }`}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px]">{temporaryTest?.unit || 'KG'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                            Qtd Faturada Total ({temporaryTest?.unit || 'KG'}) 
                                            {(temporaryTest?.extra_data?.shipments?.length > 0) && <span className="text-amber-500/60 italic ml-2"> (Vinc. Logística)</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                readOnly={(() => {
                                                    const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                                    const hasReuse = invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                                    const hasShipments = (temporaryTest?.extra_data?.shipments?.length > 0);
                                                    return hasReuse || hasShipments;
                                                })()}
                                                value={temporaryTest?.quantity_billed ?? ''}
                                                onChange={(e) => {
                                                    if (!temporaryTest) return;
                                                    const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                                    const hasReuse = invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                                    const hasShipments = (temporaryTest?.extra_data?.shipments?.length > 0);
                                                    if (hasReuse || hasShipments) return;
                                                    
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const maxAvailable = (temporaryTest.produced_quantity || 0) + (invItem?.inventory_adjustment || 0);

                                                    if (val > (maxAvailable)) {
                                                        setTemporaryTest({ ...temporaryTest, quantity_billed: maxAvailable });
                                                    } else {
                                                        setTemporaryTest({ ...temporaryTest, quantity_billed: val });
                                                    }
                                                }}
                                                className={`w-full px-4 py-3 border rounded-xl text-xs font-black outline-none transition-all ${(() => {
                                                    const invItem = inventory.find(i => i.test_id === temporaryTest?.id);
                                                    const hasReuse = invItem && tests.some(t => t.consumed_stock_id === invItem.id);
                                                    const hasShipments = (temporaryTest?.extra_data?.shipments?.length > 0);
                                                    return hasReuse || hasShipments;
                                                })()
                                                    ? 'bg-slate-800/80 border-white/5 text-slate-500 cursor-not-allowed shadow-inner'
                                                    : (temporaryTest?.quantity_billed > (temporaryTest?.produced_quantity || 0)) ? 'bg-white/5 border-rose-500 text-rose-500' : 'bg-white/5 border-white/10 text-white focus:ring-brand-500'
                                                    }`}
                                            />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px]">{temporaryTest?.unit || 'KG'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unidade de Medida</label>
                                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                                    {['KG', 'SACOS'].map(u => (
                                        <button
                                            key={u}
                                            type="button"
                                            onClick={() => setTemporaryTest({ ...temporaryTest, unit: u })}
                                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${temporaryTest?.unit === u || (!temporaryTest?.unit && u === 'KG') ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white/60'}`}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Destino de Saldo</label>
                                <select
                                    value={temporaryTest?.stock_destination || 'ESTOQUE 0'}
                                    onChange={(e) => setTemporaryTest({ ...temporaryTest, stock_destination: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all appearance-none cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="ESTOQUE 0" className="bg-slate-900 text-amber-500 font-black italic">ESTOQUE 0 (A RESERVAR)</option>
                                    <option value="ESTOQUE 01" className="bg-slate-900 text-brand-400">ESTOQUE 01 (ACABADO)</option>
                                    <option value="ESTOQUE 65" className="bg-slate-900">ESTOQUE 65 (BOA)</option>
                                    <option value="ESTOQUE 14" className="bg-slate-900">ESTOQUE 14 (QUARENTENA)</option>
                                    <option value="DISCARDED" className="bg-slate-900 text-rose-400">DESCARTE DIRETO</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div className="bg-white/5 p-4 rounded-2xl flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest italic">
                                    {temporaryTest?.consumed_stock_id ? 'Custo Amortizado p/ ' + (temporaryTest?.unit || 'KG') : 'Custo por ' + (temporaryTest?.unit || 'KG')}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold">R$</span>
                                    <span className={`text-xl font-black ${temporaryTest?.consumed_stock_id ? 'text-brand-300' : 'text-amber-400'}`}>
                                        {temporaryTest?.produced_quantity > 0
                                            ? (temporaryTest.op_cost / temporaryTest.produced_quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                            : '0,00'}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl flex flex-col gap-1 border border-brand-500/10">
                                <span className={`text-[8px] font-bold text-slate-500 uppercase tracking-widest italic`}>
                                    Status do Saldo p/ {temporaryTest?.stock_destination || 'ESTOQUE'}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-xl font-black ${(temporaryTest?.quantity_billed || 0) > (temporaryTest?.produced_quantity || 0) ? 'text-rose-500' : 'text-brand-400'}`}>
                                        {(() => {
                                            if (!temporaryTest) return '0.0';
                                            const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                            const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                            const currentBalance = ((temporaryTest?.produced_quantity || 0) - (temporaryTest?.quantity_billed || 0)) - totalConsumed + (invItem?.inventory_adjustment || 0);
                                            return currentBalance.toFixed(1);
                                        })()}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase ${(temporaryTest?.quantity_billed || 0) > (temporaryTest?.produced_quantity || 0) ? 'text-rose-500/60' : 'text-slate-500'}`}>{temporaryTest?.unit || 'KG'}</span>
                                </div>
                            </div>
                        </div>

                        {/* PAINEL DE RASTREABILIDADE DE AUDITORIA */}
                        {temporaryTest && (() => {
                            const produced = temporaryTest?.produced_quantity || 0;
                            let unitCost = 0;
                            if (temporaryTest?.consumed_stock_id) {
                                const donorInventory = inventory.find(i => String(i.id) === String(temporaryTest.consumed_stock_id));
                                const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                if (parentTest && parentTest.produced_quantity > 0) {
                                    unitCost = (parentTest.op_cost || parentTest.gross_total_cost || 0) / parentTest.produced_quantity;
                                }
                            } else if (produced > 0) {
                                unitCost = (temporaryTest.op_cost || 0) / produced;
                            }

                            return (
                                <div className="mt-2 p-5 bg-white/5 border border-white/5 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Database size={12} className="text-brand-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fluxo de Rastreabilidade (Auditoria)</span>
                                        </div>
                                        {unitCost > 0 && (
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                                Base: R$ {unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {temporaryTest.unit || 'KG'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                    <div className="flex flex-col gap-1 px-2 py-1 hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-500 uppercase">
                                                {temporaryTest?.consumed_stock_id ? '(+) Reaproveitamento de Saldo' : '(+) Produção Original'}
                                            </span>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-slate-300">{(temporaryTest?.produced_quantity || 0).toFixed(1)} {temporaryTest?.unit || 'KG'}</span>
                                                <span className="text-[9px] font-black text-white/40">R$ {((temporaryTest?.produced_quantity || 0) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                        {(() => {
                                            const sourceInvItem = inventory?.find(i => i.id === temporaryTest?.consumed_stock_id);
                                            const sourceTest = tests?.find(t => t.id === sourceInvItem?.test_id);
                                            return sourceTest && (
                                                <span className="text-[10px] font-black text-brand-400/60 uppercase tracking-tighter italic break-words">
                                                    ORIGEM: {sourceTest.test_number || 'Sem N°'} - {sourceTest.title}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    <div className="flex flex-col gap-1 px-2 py-1 hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-500 uppercase">(-) Saídas Faturadas (NFs)</span>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-rose-400">{(temporaryTest?.quantity_billed || 0).toFixed(1)} {temporaryTest?.unit || 'KG'}</span>
                                                <span className="text-[9px] font-black text-rose-400/60">R$ -{((temporaryTest?.quantity_billed || 0) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                        {(temporaryTest?.extra_data?.shipments || []).length > 0 ? (
                                            <div className="flex flex-col gap-1.5 mt-2 pl-2 border-l-2 border-rose-500/20">
                                                {temporaryTest.extra_data.shipments.map((s, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-[9px] font-black bg-white/5 p-2 rounded border border-white/5">
                                                        <span className="text-rose-400/80">NF {s.nf || 'S/N'}</span>
                                                        <span className="text-slate-400">{s.qty || 0} {temporaryTest?.unit || 'KG'} | R$ {( (parseFloat(s.qty)||0) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (temporaryTest?.nf_number || temporaryTest?.extra_data?.nf_nota) && (
                                            <div className="mt-1 p-2 bg-white/5 rounded border border-white/5">
                                                <span className="text-[9px] font-black text-amber-500/60 uppercase italic tracking-tighter shrink-0">
                                                    NOTA: {temporaryTest.nf_number || temporaryTest.extra_data.nf_nota}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1 px-2 py-1 hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-500 uppercase">(-) Consumo em outros Testes</span>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-amber-500">
                                                    {(() => {
                                                        const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                        const qty = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                        return qty.toFixed(1);
                                                    })()} {temporaryTest?.unit || 'KG'}
                                                </span>
                                                <span className="text-[9px] font-black text-amber-500/80">
                                                    R$ -{((() => {
                                                        const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                        return tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                    })() * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                        {(() => {
                                            const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                            const consumers = tests?.filter(t => t.consumed_stock_id === invItem?.id);
                                            return consumers?.length > 0 && (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {consumers.map((c, i) => (
                                                        <span key={i} className="text-[9px] font-black bg-white/5 text-amber-500/60 px-2 py-1 rounded border border-white/5 break-words">
                                                            {c.test_number || 'Sem N°'} - {c.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="flex flex-col gap-1 px-2 py-1 hover:bg-white/5 rounded-lg transition-colors border-t border-white/5 pt-3">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-500 uppercase">
                                                {(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const adj = invItem?.inventory_adjustment || 0;
                                                    return adj >= 0 ? '(+) Ajustes de Inventário' : '(-) Ajustes de Inventário (Auditoria)';
                                                })()}
                                            </span>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-xs font-black ${(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const adj = invItem?.inventory_adjustment || 0;
                                                    return adj >= 0 ? (adj === 0 ? 'text-slate-400' : 'text-emerald-400') : 'text-rose-400';
                                                })()}`}>
                                                    {(() => {
                                                        const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                        return (invItem?.inventory_adjustment || 0).toFixed(1);
                                                    })()} {temporaryTest?.unit || 'KG'}
                                                </span>
                                                <span className={`text-[9px] font-black ${(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const adj = invItem?.inventory_adjustment || 0;
                                                    return adj >= 0 ? (adj === 0 ? 'text-white/20' : 'text-emerald-400/80') : 'text-rose-400/80';
                                                })()}`}>
                                                    R$ {(() => {
                                                        const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                        const adj = invItem?.inventory_adjustment || 0;
                                                        return (adj * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        {(() => {
                                            const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                            return invItem?.justification_reason && (
                                                <span className="text-[10px] font-black text-brand-400/60 uppercase tracking-tighter italic break-words">MOTIVO: {invItem.justification_reason}</span>
                                            );
                                        })()}
                                    </div>

                                    <div className="flex justify-between items-center px-4 py-4 bg-brand-500/10 border border-brand-500/20 rounded-xl mt-2">
                                        <span className="text-xs font-black text-brand-400 uppercase tracking-widest">(=) Saldo Final Disponível</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-black text-white">
                                                {(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                    const currentBalance = ((temporaryTest?.produced_quantity || 0) - (temporaryTest?.quantity_billed || 0)) - totalConsumed + (invItem?.inventory_adjustment || 0);
                                                    return currentBalance.toFixed(1);
                                                })()} {temporaryTest?.unit || 'KG'}
                                            </span>
                                            <span className="text-[10px] font-black text-emerald-400">
                                                R$ {(() => {
                                                    const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                    const totalConsumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                    const currentBalance = ((temporaryTest?.produced_quantity || 0) - (temporaryTest?.quantity_billed || 0)) - totalConsumed + (invItem?.inventory_adjustment || 0);
                                                    return (Math.max(0, currentBalance) * unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                    {/* RESUMO FINANCEIRO CONSOLIDADO */}
                    {(() => {
                        if (!temporaryTest) return null;
                        const linkedTaskCosts = tasks
                            .filter(t => t.parent_test_id === temporaryTest.id)
                            .reduce((acc, curr) => acc + (curr.trip_cost || 0) + (curr.travels || []).reduce((tAcc, tCurr) => tAcc + (tCurr.cost || 0), 0), 0);

                        if (linkedTaskCosts > 0 || (temporaryTest?.op_cost || 0) > 0) {
                            return (
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 block mb-4">Resumo Financeiro Consolidado</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 flex flex-col justify-between">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Investimento Produção</span>
                                                <span className="text-lg font-black text-slate-800">R$ {(temporaryTest?.op_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            
                                            {(() => {
                                                const produced = temporaryTest?.produced_quantity || 0;
                                                let uCost = 0;
                                                if (temporaryTest?.consumed_stock_id) {
                                                    const donorInventory = inventory.find(i => String(i.id) === String(temporaryTest.consumed_stock_id));
                                                    const parentTest = tests.find(pt => String(pt.id) === String(donorInventory?.test_id));
                                                    if (parentTest && parentTest.produced_quantity > 0) {
                                                        uCost = (parentTest.op_cost || parentTest.gross_total_cost || 0) / parentTest.produced_quantity;
                                                    }
                                                } else if (produced > 0) {
                                                    uCost = (temporaryTest.op_cost || 0) / produced;
                                                }

                                                const invItem = inventory?.find(i => i.test_id === temporaryTest?.id);
                                                const billed = temporaryTest?.quantity_billed || 0;
                                                const consumed = tests?.filter(t => t.consumed_stock_id === invItem?.id)?.reduce((sum, t) => sum + (t.produced_quantity || 0), 0) || 0;
                                                const adj = invItem?.inventory_adjustment || 0;
                                                const currentBal = produced - billed - consumed + adj;

                                                const hasMovements = billed > 0 || consumed > 0 || adj !== 0;

                                                if (hasMovements && uCost > 0) {
                                                    return (
                                                        <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
                                                            <div className="flex justify-between items-center text-[9px] font-bold">
                                                                <span className="text-slate-400 uppercase">Faturado:</span>
                                                                <span className="text-slate-600">R$ {(billed * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                                <span className="text-slate-400 uppercase">Reuso/Doação:</span>
                                                                <span className="text-amber-600">R$ {(consumed * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            {adj !== 0 && (
                                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                                    <span className="text-slate-400 uppercase">Ajustes Invent.:</span>
                                                                    <span className={adj < 0 ? "text-rose-500" : "text-emerald-500"}>
                                                                        R$ {(adj * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center text-[10px] font-black pt-1">
                                                                <span className="text-brand-600 uppercase">Ativo em Estoque:</span>
                                                                <span className="text-brand-600 underline">R$ {(Math.max(0, currentBal) * uCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return <div className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Investimento Integral em Estoque</div>;
                                            })()}
                                        </div>
                                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Vistorias/Viagens</span>
                                            <span className="text-sm font-black text-indigo-600">R$ {linkedTaskCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="p-4 bg-slate-900 rounded-2xl shadow-lg border border-slate-800">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Investimento Total</span>
                                            <span className="text-sm font-black text-white">R$ {((temporaryTest?.op_cost || 0) + linkedTaskCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-white text-slate-400 text-xs font-black rounded-2xl border border-slate-200 uppercase tracking-widest hover:bg-slate-50 transition-all">Sair</button>
                    <button
                        onClick={handleSaveDetails}
                        disabled={isSaving}
                        className="flex-[2] py-4 bg-slate-900 text-white text-xs font-black rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestDetailsModal;
