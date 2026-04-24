import React, { useState, useEffect } from 'react';
import {
    X, Briefcase, FlaskConical, Tag, RefreshCw, Plus, Repeat as Replay
} from 'lucide-react';
import AutocompleteInput from '../AutocompleteInput';

const NewRecordModal = ({
    isOpen,
    onClose,
    activeTab,
    newItem,
    setNewItem,
    onSave,
    isSaving,
    allClients = [],
    users = [],
    registeredClients = [],
    onRegisterClient,
    testFlows = [],
    testStatusPresets = [],
    inventory = [],
    tests = [],
    isMeetingView
}) => {
    const [localShowStock, setLocalShowStock] = useState(false);
    const [localStockSearch, setLocalStockSearch] = useState('');
    if (!isOpen) return null;

    if (activeTab === 'tests') {
        return (
            <div className={`absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm ${isMeetingView ? 'p-1' : 'p-4'} animate-in fade-in duration-300`}>
                <div className={`bg-white rounded-[40px] shadow-2xl w-full ${isMeetingView ? 'max-w-5xl' : 'max-w-lg'} overflow-hidden flex flex-col ${isMeetingView ? 'max-h-[98%]' : ''} animate-in zoom-in-95 duration-200`}>
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-600 text-white rounded-2xl drop-shadow-md"><FlaskConical size={24} /></div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                                    {newItem.id ? 'Editar Teste' : 'Novo Teste Técnico'}
                                </h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Módulo: Testes</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 border border-slate-200 rounded-xl shadow-sm hover:shadow"><X size={20} /></button>
                    </div>
                    <form onSubmit={onSave} className={`p-8 flex flex-col gap-6 ${isMeetingView ? 'flex-1' : 'max-h-[70vh]'} overflow-y-auto custom-scrollbar`}>

                        {/* 1. DADOS BÁSICOS */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-brand-600 border-b border-slate-100 pb-2 uppercase tracking-widest">1. Dados Básicos</h3>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título / Objetivo do Teste <span className="text-red-500">*</span></label>
                                <input required type="text" className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Ex: Produção Nova Resina..." value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente <span className="text-red-500">*</span></label>
                                        {newItem.client_name && !registeredClients.some(c => c.name.toLowerCase() === newItem.client_name.toLowerCase()) && (
                                            <button type="button" onClick={() => onRegisterClient(newItem.client_name)} className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse hover:bg-amber-100 transition-all">
                                                OFICIALIZAR +
                                            </button>
                                        )}
                                    </div>
                                    <AutocompleteInput
                                        label="Cliente"
                                        icon={Briefcase}
                                        placeholder="Nome do Cliente"
                                        value={newItem.client_name || ''}
                                        options={registeredClients.map(c => ({ id: c.name, label: c.name }))}
                                        onChange={(val) => setNewItem({ ...newItem, client_name: val })}
                                    />
                                    {newItem.client_name && !registeredClients.some(c => c.name.toLowerCase() === newItem.client_name.toLowerCase()) && (
                                        <p className="text-[9px] text-amber-500 font-bold ml-1 italic">* Cliente não oficial.</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto / Material</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="Nome do Produto..." value={newItem.product_name || ''} onChange={e => setNewItem({ ...newItem, product_name: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Detalhada</label>
                                <textarea className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none transition-all h-20 resize-none" placeholder="Detalhes técnicos maiores..." value={newItem.description || ''} onChange={e => setNewItem({ ...newItem, description: e.target.value })}></textarea>
                            </div>
                        </div>

                        {/* 2. PRODUÇÃO E CONTROLE */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-brand-600 border-b border-slate-100 pb-2 uppercase tracking-widest mt-2">2. Produção e Controle</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pedido</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="Nº Pedido" value={newItem.test_order || ''} onChange={e => setNewItem({ ...newItem, test_order: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ordem Prod. (OP)</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="Nº OP" value={newItem.op_number || ''} onChange={e => setNewItem({ ...newItem, op_number: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota Fiscal (NF)</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="Nº NF" value={newItem.nf_number || ''} onChange={e => setNewItem({ ...newItem, nf_number: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrega</label>
                                    <input type="date" className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-brand-500 outline-none transition-all" value={newItem.delivery_date || ''} onChange={e => setNewItem({ ...newItem, delivery_date: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fluxo (Etapa)</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                        value={newItem.flow_stage || ''}
                                        onChange={e => setNewItem({ ...newItem, flow_stage: e.target.value })}
                                    >
                                        <option value="">Fase Não Definida</option>
                                        {testFlows?.map((flow, i) => (
                                            <option key={i} value={typeof flow === 'string' ? flow : flow.label}>
                                                {typeof flow === 'string' ? flow : flow.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status do Experimento</label>
                                    <select
                                        className="w-full p-3 rounded-2xl border text-xs font-black uppercase outline-none transition-all text-white text-center shadow-lg"
                                        style={{
                                            backgroundColor: testStatusPresets.find(p => p.label === (newItem.status || 'AGUARDANDO RETORNO DO CLIENTE'))?.color || '#94a3b8',
                                            borderColor: 'transparent'
                                        }}
                                        value={newItem.status || 'AGUARDANDO RETORNO DO CLIENTE'}
                                        onChange={e => {
                                            const selected = testStatusPresets.find(p => p.label === e.target.value);
                                            setNewItem({
                                                ...newItem,
                                                status: e.target.value,
                                                status_color: selected ? selected.color : '#94a3b8'
                                            });
                                        }}
                                    >
                                        {testStatusPresets.map((p, i) => (
                                            <option key={i} value={p.label} className="bg-white text-slate-800">{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Situação / Obs Interna</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="Ex: Aguardando Retorno..." value={newItem.situation || ''} onChange={e => setNewItem({ ...newItem, situation: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* 2.5 REAPROVEITAMENTO DE SALDO */}
                        <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Replay size={16} className="text-brand-400" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">Reaproveitamento de Saldo</h3>
                                </div>
                                {newItem.consumed_stock_id ? (
                                    <button
                                        type="button"
                                        onClick={() => setNewItem({ ...newItem, consumed_stock_id: null, op_cost: 0, produced_quantity: 0 })}
                                        className="text-[8px] font-bold text-rose-400 hover:text-rose-300 uppercase underline"
                                    >
                                        Remover Vínculo
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            console.log('[NewRecordModal] Toggle localShowStock:', !localShowStock);
                                            setLocalShowStock(!localShowStock);
                                        }}
                                        className="text-[8px] font-black bg-brand-500 text-white px-3 py-1 rounded-lg uppercase hover:bg-brand-600 transition-all"
                                    >
                                        {localShowStock ? 'Cancelar' : 'Vincular Origem'}
                                    </button>
                                )}
                            </div>

                            {newItem.consumed_stock_id && (
                                <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-brand-400 uppercase">
                                            {inventory.find(i => i.id === newItem.consumed_stock_id)?.name || 'Item Vinculado'}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">
                                            Origem: {inventory.find(i => i.id === newItem.consumed_stock_id)?.client_name || 'Estoque'} • {inventory.find(i => i.id === newItem.consumed_stock_id)?.quantity} {inventory.find(i => i.id === newItem.consumed_stock_id)?.unit}
                                        </span>
                                    </div>
                                    <div className="p-1.5 bg-brand-500/20 rounded-full text-brand-400">
                                        <Plus size={12} className="rotate-45" />
                                    </div>
                                </div>
                            )}

                            {localShowStock && !newItem.consumed_stock_id && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="relative">
                                        <Replay size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar em todos os depósitos..."
                                            className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-[10px] font-bold text-white outline-none focus:ring-1 focus:ring-brand-500"
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
                                                    type="button"
                                                    onClick={() => {
                                                        const sourceTest = tests.find(t => t.id === item.test_id);
                                                        const originalQty = item.qty_produced || (sourceTest?.produced_quantity || 0);
                                                        const originalCost = sourceTest?.op_cost || 0;
                                                        const unitPrice = originalQty > 0 ? originalCost / originalQty : 0;
                                                        const inheritedCost = item.production_cost || (unitPrice * item.quantity);

                                                        setNewItem({
                                                            ...newItem,
                                                            consumed_stock_id: item.id,
                                                            produced_quantity: item.quantity,
                                                            op_cost: parseFloat(inheritedCost.toFixed(2)),
                                                            unit: item.unit,
                                                            unit_cost: (inheritedCost / (item.quantity || 1)).toFixed(2),
                                                            gross_total_cost: inheritedCost
                                                        });
                                                        setShowStockSelector(false);
                                                    }}
                                                    className="w-full p-3 hover:bg-white/5 rounded-xl text-left flex justify-between items-center transition-colors group border border-transparent hover:border-white/10"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-200 group-hover:text-brand-400">{item.name}</span>
                                                        <span className="text-[7px] font-bold text-slate-500 uppercase">{item.client_name || 'Sem Cliente'} • {item.stock_bin}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-black text-brand-400 block">{item.quantity} {item.unit}</span>
                                                        <span className="text-[8px] font-bold text-slate-500 uppercase">Disponível</span>
                                                    </div>
                                                </button>
                                            ))
                                        }
                                        {inventory.filter(i => i.quantity > 0).length === 0 && (
                                            <p className="text-center py-4 text-[10px] font-bold text-slate-500 italic">Nenhum saldo disponível para reaproveitamento</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. FINANCEIRO */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-brand-600 border-b border-slate-100 pb-2 uppercase tracking-widest mt-2">3. Custos e Produtividade</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtde. Produzida</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-[45%] text-slate-400 text-sm font-bold">#</span>
                                        <input type="number" step="0.01" min="0" className="w-full pl-8 pr-3 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="0.00" value={newItem.produced_quantity ?? ''}
                                            onChange={e => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                const opCost = parseFloat(newItem.op_cost) || 0;
                                                setNewItem({
                                                    ...newItem,
                                                    produced_quantity: e.target.value === '' ? '' : qty,
                                                    unit_cost: (qty > 0 ? opCost / qty : 0).toFixed(2)
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Volumes (Bobinas/Pacotes)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-[45%] text-slate-400 text-sm font-bold">V</span>
                                        <input type="number" step="1" min="0" className="w-full pl-8 pr-3 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="0" value={newItem.volumes ?? ''}
                                            onChange={e => setNewItem({ ...newItem, volumes: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo Total / OP</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-[45%] text-slate-400 text-sm font-bold">R$</span>
                                    <input type="number" step="0.01" min="0" className="w-full pl-9 pr-3 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="0.00" value={newItem.op_cost ?? ''}
                                        onChange={e => {
                                            const opCost = parseFloat(e.target.value) || 0;
                                            const qty = parseFloat(newItem.produced_quantity) || 0;
                                            setNewItem({
                                                ...newItem,
                                                op_cost: e.target.value === '' ? '' : opCost,
                                                unit_cost: (qty > 0 ? opCost / qty : 0).toFixed(2),
                                                gross_total_cost: opCost // Apenas salva o bruto igual, a soma c/ viagens ocorre na tarefa
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-100 p-4 rounded-2xl mt-2 border border-slate-200">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">Custo KG / Unit</label>
                                <p className="text-xl text-slate-700 font-mono tracking-tighter">
                                    R$ {parseFloat(newItem.unit_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">Custo Bruto OP</label>
                                <p className="text-xl text-emerald-600 font-mono font-bold tracking-tighter shadow-sm">
                                    R$ {parseFloat(newItem.gross_total_cost || newItem.op_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest text-center italic mt-2">
                            Os custos em cinza são calculados automaticamente.
                        </p>

                        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2 sticky bottom-0 bg-white pb-2 z-10">
                            <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] bg-slate-100 font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 rounded-2xl transition-all">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                                {isSaving ? <RefreshCw className="animate-spin" size={16} /> : null}
                                {newItem.id ? 'Salvar Edição' : 'Concluir Cadastro'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (activeTab === 'inventory') {
        return (
            <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-600 text-white rounded-2xl"><Plus size={24} /></div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Novo Registro</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Módulo: Estoque</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-300 hover:text-slate-800 transition-colors"><X size={24} /></button>
                    </div>
                    <form onSubmit={onSave} className="p-8 flex flex-col gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item / Amostra</label>
                            <input required type="text" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="NOME DO MATERIAL..." value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                                <input type="number" step="0.1" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="0.0" value={newItem.quantity ?? ''} onChange={e => setNewItem({ ...newItem, quantity: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Volumes</label>
                                <input type="number" step="1" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="0" value={newItem.volumes ?? ''} onChange={e => setNewItem({ ...newItem, volumes: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                                {['KG', 'SACOS'].map(u => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => setNewItem({ ...newItem, unit: u })}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newItem.unit === u || (!newItem.unit && u === 'KG') ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                                {newItem.client_name && !registeredClients.some(c => c.name.toLowerCase() === newItem.client_name.toLowerCase()) && (
                                    <button
                                        type="button"
                                        onClick={() => onRegisterClient(newItem.client_name)}
                                        className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse hover:bg-amber-100 transition-all"
                                    >
                                        OFICIALIZAR CLIENTE +
                                    </button>
                                )}
                            </div>
                            <AutocompleteInput
                                label="Cliente"
                                icon={FlaskConical}
                                placeholder="Nome do Cliente"
                                value={newItem.client_name || ''}
                                options={registeredClients.map(c => ({ id: c.name, label: c.name }))}
                                onChange={(val) => setNewItem({ ...newItem, client_name: val })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ordem de Produção (OP)</label>
                                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="NÚMERO DA OP..." value={newItem.op || ''} onChange={e => setNewItem({ ...newItem, op: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pedido</label>
                                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all uppercase" placeholder="NÚMERO DO PEDIDO..." value={newItem.pedido || ''} onChange={e => setNewItem({ ...newItem, pedido: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Depósito (Bin)</label>
                            <select
                                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-500"
                                value={newItem.stock_bin || 'ESTOQUE 0'}
                                onChange={e => setNewItem({ ...newItem, stock_bin: e.target.value })}
                            >
                                <option value="ESTOQUE 0">ESTOQUE 0 (A RESERVAR)</option>
                                <option value="ESTOQUE 01">ESTOQUE 01 (ACABADO)</option>
                                <option value="ESTOQUE 14">ESTOQUE 14 (QUARENTENA)</option>
                                <option value="ESTOQUE 65">ESTOQUE 65 (ENGENHARIA)</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={onClose} className="flex-1 py-4 text-sm font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {isSaving ? <RefreshCw className="animate-spin" size={16} /> : null}
                                Salvar Registro
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (activeTab === 'visitation') {
        return (
            <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 text-white rounded-xl">
                                <Briefcase size={20} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                                {newItem.id ? 'Editar Agendamento' : 'Novo Agendamento'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-800 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={onSave} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AutocompleteInput
                                label="Cliente Principal"
                                icon={Briefcase}
                                placeholder="BUSCAR CLIENTE..."
                                value={newItem.client_name}
                                options={registeredClients.map(c => ({ id: c.name, label: c.name }))}
                                onChange={(val) => setNewItem({ ...newItem, client_name: val })}
                            />

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo da Viagem</label>
                                <select
                                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={newItem.type || 'VISITA TÉCNICA'}
                                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                                >
                                    <option value="VISITA TÉCNICA">VISITA TÉCNICA</option>
                                    <option value="PROSPECÇÃO">PROSPECÇÃO</option>
                                    <option value="TREINAMENTO">TREINAMENTO</option>
                                    <option value="PÓS-VENDAS">PÓS-VENDAS</option>
                                    <option value="FEIRA/EVENTO">FEIRA / EVENTO</option>
                                </select>
                            </div>
                        </div>

                        <AutocompleteInput
                            label="Vincular Teste Técnico (Opcional)"
                            icon={FlaskConical}
                            placeholder="PESQUISAR TESTE EM DESENVOLVIMENTO..."
                            value={tests.find(t => t.id === newItem.linked_test_id)?.title || ''}
                            options={tests
                                .filter(t => !testStatusPresets.find(p => p.label === t.status && (p.label.includes('CONCLU') || p.label.includes('APROVADO') || p.label.includes('REPROV') || p.label.includes('CANCEL'))))
                                .map(t => ({
                                    id: t.id,
                                    label: t.title,
                                    sublabel: `${t.client_name} - #${t.test_number}`
                                }))}
                            onChange={(titleOrLabel) => {
                                // Captura o ID do teste baseado no título selecionado
                                const selectedTest = tests.find(t => t.title === titleOrLabel);
                                setNewItem({ ...newItem, linked_test_id: selectedTest ? selectedTest.id : null });
                            }}
                        />

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações da Prospecção</label>
                            <textarea
                                placeholder="DETALHES DO QUE PRECISA SER FEITO..."
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none uppercase"
                                value={newItem.notes || ''}
                                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value.toUpperCase() })}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-[2] py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <RefreshCw className="animate-spin" size={16} /> : null}
                                {newItem.id ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
};

export default NewRecordModal;
