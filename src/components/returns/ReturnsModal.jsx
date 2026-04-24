import React from 'react';
import { X, RotateCcw, Users, RefreshCw, Clock } from 'lucide-react';
import AutocompleteInput from '../controls/AutocompleteInput';

const ReturnsModal = ({
    showAddForm,
    setShowAddForm,
    editingId,
    newItem,
    setNewItem,
    registeredClients,
    handleSaveReturn,
    isSaving,
    isMeetingView
}) => {
    if (!showAddForm) return null;

    return (
        <div className={`absolute inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm ${isMeetingView ? 'p-1' : 'p-4'} animate-in fade-in duration-300`}>
            <div className={`bg-white rounded-[40px] shadow-2xl w-full ${isMeetingView ? 'max-w-4xl' : 'max-w-xl'} overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col ${isMeetingView ? 'max-h-[98%]' : ''}`}>
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-100">
                            <RotateCcw size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                            {editingId ? 'Editar Devolução' : 'Nova Devolução'}
                        </h2>
                    </div>
                    <button onClick={() => setShowAddForm(false)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-slate-800 transition-all hover:bg-slate-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className={`p-8 space-y-6 ${isMeetingView ? 'flex-1' : 'max-h-[70vh]'} overflow-y-auto custom-scrollbar`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AutocompleteInput
                            label="Cliente"
                            icon={Users}
                            placeholder="BUSCAR CLIENTE..."
                            value={newItem?.client_name || ''}
                            options={(registeredClients || []).map(c => ({ id: c.name, label: c.name }))}
                            onChange={(val) => setNewItem({ ...newItem, client_name: val })}
                        />

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">NF / Cupom</label>
                            <input
                                type="text"
                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase"
                                value={newItem?.invoice_number || ''}
                                onChange={(e) => setNewItem({ ...newItem, invoice_number: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Item Devolvido</label>
                            <input
                                type="text"
                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase"
                                value={newItem?.item_name || ''}
                                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value.toUpperCase() })}
                                placeholder="NOME DO MATERIAL..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OP / Lote</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="OP"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase"
                                    value={newItem?.op || ''}
                                    onChange={(e) => setNewItem({ ...newItem, op: e.target.value.toUpperCase() })}
                                />
                                <input
                                    type="text"
                                    placeholder="LOTE"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase"
                                    value={newItem?.batch_number || ''}
                                    onChange={(e) => setNewItem({ ...newItem, batch_number: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantidade</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                value={newItem?.quantity || ''}
                                onChange={(e) => {
                                    const qty = parseFloat(e.target.value) || 0;
                                    setNewItem({
                                        ...newItem,
                                        quantity: qty,
                                        total_value: parseFloat((qty * (newItem.unit_price || 0)).toFixed(2))
                                    });
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço Unit. (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                value={newItem?.unit_price || ''}
                                onChange={(e) => {
                                    const price = parseFloat(e.target.value) || 0;
                                    setNewItem({
                                        ...newItem,
                                        unit_price: price,
                                        total_value: parseFloat((price * (newItem.quantity || 0)).toFixed(2))
                                    });
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor Total</label>
                            <div className="w-full p-3.5 bg-slate-100 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-400">
                                R$ {(newItem?.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data da Devolução</label>
                            <input
                                type="date"
                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                value={newItem?.return_date || ''}
                                onChange={(e) => setNewItem({ ...newItem, return_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
                            <select
                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                value={newItem?.status || 'PENDENTE'}
                                onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                            >
                                <option value="PENDENTE">PENDENTE</option>
                                <option value="EM ANALISE">EM ANÁLISE</option>
                                <option value="RECEBIDO">RECEBIDO</option>
                                <option value="CONCLUÍDO">CONCLUÍDO</option>
                                <option value="CANCELADO">CANCELADO</option>
                            </select>
                        </div>
                    </div>

                    {/* Novo: Controle de Coleta */}
                    <div className="bg-rose-50/50 p-6 rounded-[32px] border border-rose-100/50 space-y-4">
                        <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Clock size={14} /> Agendamento de Coleta
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Status da Coleta</label>
                                <select
                                    className="w-full p-3.5 bg-white border border-rose-100 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                    value={newItem?.collection_status || 'PENDENTE'}
                                    onChange={(e) => setNewItem({ ...newItem, collection_status: e.target.value })}
                                >
                                    <option value="PENDENTE">PENDENTE (AGUARDANDO)</option>
                                    <option value="PROGRAMADA">PROGRAMADA / AGENDADA</option>
                                    <option value="COLETADA">COLETADA / EM TRANSITO</option>
                                    <option value="EM_CASA">EM CASA (RECEBIDO NO CD)</option>
                                    <option value="RESOLVIDA">RESOLVIDA (PROCESSADA)</option>
                                    <option value="NAO_SE_APLICA">NÃO SE APLICA</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Programada</label>
                                <input
                                    type="date"
                                    className="w-full p-3.5 bg-white border border-rose-100 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                    value={newItem?.scheduled_collection_date || ''}
                                    onChange={(e) => setNewItem({ ...newItem, scheduled_collection_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destinação Detalhada</label>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${Math.abs((newItem.rework_qty || 0) + (newItem.loss_qty || 0) + (newItem.discard_qty || 0) - (newItem.quantity || 0)) < 0.01 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                Total: {(newItem.rework_qty || 0) + (newItem.loss_qty || 0) + (newItem.discard_qty || 0)} / {newItem.quantity || 0}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">Retrabalho</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-full p-3 bg-white border border-emerald-100 rounded-xl text-[11px] font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    value={newItem?.rework_qty || ''}
                                    onChange={(e) => setNewItem({ ...newItem, rework_qty: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest ml-1">Perda Prod.</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-full p-3 bg-white border border-amber-100 rounded-xl text-[11px] font-black text-amber-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                    value={newItem?.loss_qty || ''}
                                    onChange={(e) => setNewItem({ ...newItem, loss_qty: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest ml-1">Descarte</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-full p-3 bg-white border border-rose-100 rounded-xl text-[11px] font-black text-rose-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                    value={newItem?.discard_qty || ''}
                                    onChange={(e) => setNewItem({ ...newItem, discard_qty: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        {(newItem.rework_qty || 0) + (newItem.loss_qty || 0) + (newItem.discard_qty || 0) !== (newItem.quantity || 0) && (
                            <p className="text-[9px] font-bold text-amber-500 italic text-center">
                                * A soma das destinações deve ser igual à quantidade total ({newItem.quantity || 0}).
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveReturn}
                            disabled={isSaving}
                            className="flex-[2] py-4 bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : null}
                            {editingId ? 'Salvar Alterações' : 'Confirmar Devolução'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnsModal;
