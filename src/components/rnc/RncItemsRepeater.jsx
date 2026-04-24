import React from 'react';
import { Package, Plus, Trash2, HelpCircle } from 'lucide-react';

const RncItemsRepeater = ({
    newRnc, setNewRnc,
    addReturnItem, removeReturnItem, updateReturnItem
}) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-lg flex items-center justify-center">
                        <Package size={16} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Itens e Quantidades</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Adicione um ou mais itens a esta RNC</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={addReturnItem}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-brand-700 transition-all shadow-md shadow-brand-100"
                >
                    <Plus size={14} /> Adicionar Item
                </button>
            </div>

            {/* Cabeçalho da Lista - Mobile Hidden */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-2">Cód. Item</div>
                <div className="col-span-4">Descrição</div>
                <div className="col-span-2">Qtd</div>
                <div className="col-span-3">Preço Unit. (R$)</div>
                <div className="col-span-1 border-l pl-2">Ações</div>
            </div>

            {/* Lista de Itens */}
            <div className="space-y-4">
                {(!newRnc.return_items || newRnc.return_items.length === 0) ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-2xl border border-slate-100 group hover:border-brand-200 transition-all">
                        <div className="md:col-span-2 space-y-1">
                            <label className="md:hidden text-[9px] font-black text-slate-400">Cód. Item</label>
                            <input
                                type="text"
                                placeholder="Cód."
                                value={newRnc.item_code || ''}
                                onChange={(e) => setNewRnc({ ...newRnc, item_code: e.target.value })}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                            />
                        </div>
                        <div className="md:col-span-4 space-y-1">
                            <label className="md:hidden text-[9px] font-black text-slate-400">Descrição</label>
                            <input
                                type="text"
                                placeholder="Descrição do item"
                                value={newRnc.item_name || ''}
                                onChange={(e) => setNewRnc({ ...newRnc, item_name: e.target.value })}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="md:hidden text-[9px] font-black text-slate-400">Qtd</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={newRnc.quantity || 0}
                                onChange={(e) => setNewRnc({ ...newRnc, quantity: parseFloat(e.target.value) || 0 })}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                            />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                            <label className="md:hidden text-[9px] font-black text-slate-400">Preço Unit.</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={newRnc.unit_price || 0}
                                onChange={(e) => setNewRnc({ ...newRnc, unit_price: parseFloat(e.target.value) || 0 })}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                            />
                        </div>
                        <div className="md:col-span-1 flex items-center justify-center border-l pl-2">
                            <HelpCircle size={14} className="text-slate-200" title="Item principal da RNC" />
                        </div>
                    </div>
                ) : (
                    newRnc.return_items.map((item, index) => (
                        <div key={item.id} className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <input
                                        type="text"
                                        placeholder="Cód."
                                        value={item.item_code}
                                        onChange={(e) => updateReturnItem(item.id, 'item_code', e.target.value)}
                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-1">
                                    <input
                                        type="text"
                                        placeholder="Descrição do item"
                                        value={item.item_name}
                                        onChange={(e) => updateReturnItem(item.id, 'item_name', e.target.value)}
                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={item.quantity}
                                        onChange={(e) => updateReturnItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                                    />
                                </div>
                                <div className="md:col-span-3 space-y-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={item.unit_price}
                                        onChange={(e) => updateReturnItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 text-xs"
                                    />
                                </div>
                                <div className="md:col-span-1 flex items-center justify-center border-l pl-2">
                                    <button
                                        type="button"
                                        onClick={() => removeReturnItem(item.id)}
                                        className="text-rose-400 hover:text-rose-600 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Detalhes da Devolução por Item se a RNC tem devolução */}
                            {newRnc.has_return && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-rose-50/50 rounded-xl border border-rose-100 mt-2">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-rose-600 uppercase">Qtd. Devolvida</label>
                                        <input
                                            type="number"
                                            value={item.returned_quantity}
                                            onChange={(e) => updateReturnItem(item.id, 'returned_quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full h-9 px-3 bg-white border border-rose-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 text-[11px]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-rose-600 uppercase">Destino</label>
                                        <select
                                            value={item.return_destination || ''}
                                            onChange={(e) => updateReturnItem(item.id, 'return_destination', e.target.value || null)}
                                            className="w-full h-9 px-3 bg-white border border-rose-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 text-[11px]"
                                        >
                                            <option value="">A Definir</option>
                                            <option value="REWORK">Retrabalhar</option>
                                            <option value="DISCARD">Descartar</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-rose-600 uppercase">Qtd Final (Pós)</label>
                                        <input
                                            type="number"
                                            value={item.final_quantity}
                                            onChange={(e) => updateReturnItem(item.id, 'final_quantity', parseFloat(e.target.value) || 0)}
                                            disabled={item.return_destination === 'DISCARD'}
                                            className="w-full h-9 px-3 bg-white border border-rose-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 text-[11px] disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-rose-600 uppercase">Preço Rework</label>
                                        <input
                                            type="number"
                                            value={item.new_unit_price}
                                            onChange={(e) => updateReturnItem(item.id, 'new_unit_price', parseFloat(e.target.value) || 0)}
                                            disabled={item.return_destination === 'DISCARD'}
                                            className="w-full h-9 px-3 bg-white border border-rose-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 text-[11px] disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Botão Adicionar Item */}
            <button
                type="button"
                onClick={addReturnItem}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50/30 transition-all active:scale-[0.98]"
            >
                <Plus size={16} /> Adicionar Item
            </button>
        </div>
    );
};

export default RncItemsRepeater;
