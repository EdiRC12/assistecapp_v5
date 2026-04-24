import React from 'react';
import {
    X, ChevronLeft, FlaskConical, Box, Briefcase,
    RefreshCw, ChevronRight, FileText, Edit2, Save, RotateCcw, Trash2, DollarSign
} from 'lucide-react';

const InventoryDetailModal = ({
    selectedInventoryItem,
    setSelectedInventoryItem,
    inventoryHistory,
    setInventoryHistory,
    tests,
    inventory,
    setInventory,
    supabase,
    setShowTestDetails,
    notifySuccess,
    notifyError,
    notifyWarning
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editForm, setEditForm] = React.useState({});
    const [isSaving, setIsSaving] = React.useState(false);

    if (!selectedInventoryItem) return null;

    const handleStartEdit = () => {
        setEditForm({ ...selectedInventoryItem });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('ee_inventory')
                .update({
                    name: editForm.name,
                    client_name: editForm.client_name,
                    qty_produced: parseFloat(editForm.qty_produced) || 0,
                    qty_billed: parseFloat(editForm.qty_billed) || 0,
                    production_cost: parseFloat(editForm.production_cost) || 0,
                    unit: editForm.unit,
                    op: editForm.op,
                    quantity: (parseFloat(editForm.qty_produced) || 0) // Reset original quantity if edited, or calculate logic? 
                    // Usually quantity is current balance. If we edit qty_produced, it might affect the logic.
                    // For now let's just update fields user asked.
                })
                .eq('id', editForm.id);

            if (error) throw error;

            const updated = { 
                ...selectedInventoryItem, 
                ...editForm,
                qty_produced: parseFloat(editForm.qty_produced) || 0,
                qty_billed: parseFloat(editForm.qty_billed) || 0,
                production_cost: parseFloat(editForm.production_cost) || 0,
                quantity: parseFloat(editForm.qty_produced) || 0 // Sync balance if edited
            };
            setInventory(prev => prev.map(i => i.id === editForm.id ? updated : i));
            setSelectedInventoryItem(updated);
            setIsEditing(false);
            notifySuccess('Item atualizado', 'As informações foram salvas com sucesso.');
        } catch (error) {
            console.error('Error updating inventory item:', error);
            notifyError('Erro ao atualizar', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white rounded-[40px] shadow-2xl w-full ${inventoryHistory.length > 0 ? 'max-w-5xl' : 'max-w-lg'} overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 transition-all`}>
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {inventoryHistory.length > 0 && (
                            <button
                                onClick={() => {
                                    const newHistory = [...inventoryHistory];
                                    const prevItem = newHistory.pop();
                                    setInventoryHistory(newHistory);
                                    setSelectedInventoryItem(prevItem);
                                }}
                                className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-brand-600 hover:border-brand-200 rounded-2xl transition-all shadow-sm flex items-center gap-2 group"
                            >
                                <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Voltar</span>
                            </button>
                        )}
                        <div className="flex gap-4">
                            <div className={`p-3 rounded-2xl shadow-sm ${selectedInventoryItem.stock_bin === 'ESTOQUE 65' ? 'bg-blue-50 text-blue-600' :
                                    selectedInventoryItem.stock_bin === 'ESTOQUE 0' ? 'bg-amber-50 text-amber-600' :
                                        'bg-emerald-50 text-emerald-600'}`}>
                                {selectedInventoryItem.stock_bin === 'ESTOQUE 65' ? <FlaskConical size={20} /> :
                                    selectedInventoryItem.stock_bin === 'ESTOQUE 0' ? <RefreshCw size={20} /> :
                                        <Box size={20} />}
                            </div>
                            <div>
                                {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                        <input 
                                            value={editForm.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-tight bg-white border-b-2 border-brand-500 outline-none w-full max-w-sm"
                                            placeholder="Nome do Item"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={10} className="text-brand-500" />
                                            <input 
                                                value={editForm.client_name}
                                                onChange={(e) => handleInputChange('client_name', e.target.value)}
                                                className="text-[9px] font-black text-brand-600 uppercase tracking-widest bg-indigo-50 border-none rounded px-2 py-0.5 outline-none"
                                                placeholder="Nome do Cliente"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-tight">
                                            {selectedInventoryItem.name.replace('RESÍDUO:', 'ITEM:')}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Briefcase size={10} className="text-brand-500" />
                                            <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">{selectedInventoryItem.client_name || 'Estoque Geral'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button 
                                onClick={handleStartEdit}
                                className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-brand-600 hover:border-brand-200 rounded-2xl transition-all shadow-sm flex items-center gap-2 group"
                            >
                                <Edit2 size={18} className="group-hover:rotate-12 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Editar</span>
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCancelEdit}
                                    className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm flex items-center gap-2 group"
                                >
                                    <RotateCcw size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Cancelar</span>
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="p-3 bg-brand-600 border border-brand-500 text-white hover:bg-brand-700 rounded-2xl transition-all shadow-lg flex items-center gap-2 group disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                                        {isSaving ? 'Salvando...' : 'Salvar'}
                                    </span>
                                </button>
                            </div>
                        )}
                        <button onClick={() => { setSelectedInventoryItem(null); setInventoryHistory([]); }} className="p-2 text-slate-300 hover:text-slate-800 transition-colors ml-2">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Parallel Content Container */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Previous Item (Reference Panel) */}
                    {inventoryHistory.length > 0 && (
                        <div className="w-1/3 border-r border-slate-100 bg-slate-50/50 overflow-y-auto hidden lg:block animate-in slide-in-from-left-4 duration-300">
                            <div className="p-6 space-y-6 opacity-60 grayscale-[0.5] pointer-events-none">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 bg-white px-2 py-0.5 rounded-full border border-slate-100">Item Anterior</label>
                                {(() => {
                                    const prevItem = inventoryHistory[inventoryHistory.length - 1];
                                    return (
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Saldo</span>
                                                <span className="text-lg font-black text-slate-700">{Number(prevItem.quantity || 0).toFixed(1)} {prevItem.unit}</span>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Produto</span>
                                                <span className="text-[10px] font-black text-slate-800 uppercase truncate block">{prevItem.name}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Active Content Panel */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-white">
                        {/* Detailed Metrics */}
                        <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Detalhamento de Saldo</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Produzido Total</span>
                                    {isEditing ? (
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number"
                                                value={editForm.qty_produced}
                                                onChange={(e) => handleInputChange('qty_produced', e.target.value)}
                                                className="w-full text-sm font-black text-slate-700 bg-slate-50 border-none h-6 outline-none rounded px-1"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-sm font-black text-slate-700">{Number(selectedInventoryItem.qty_produced || 0).toFixed(1)} {selectedInventoryItem.unit}</span>
                                    )}
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Faturado/Enviado</span>
                                    {isEditing ? (
                                        <div className="flex items-baseline gap-1">
                                            <input 
                                                type="number"
                                                value={editForm.qty_billed}
                                                onChange={(e) => handleInputChange('qty_billed', e.target.value)}
                                                className="w-full text-sm font-black text-brand-600 bg-slate-50 border-none h-6 outline-none rounded px-1"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-sm font-black text-brand-600">{Number(selectedInventoryItem.qty_billed || 0).toFixed(1)} {selectedInventoryItem.unit}</span>
                                    )}
                                </div>
                                
                                {isEditing && (
                                    <>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Custo de Produção (Total R$)</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-black text-slate-400">R$</span>
                                                <input 
                                                    type="number"
                                                    value={editForm.production_cost}
                                                    onChange={(e) => handleInputChange('production_cost', e.target.value)}
                                                    className="w-full text-sm font-black text-indigo-600 bg-slate-50 border-none h-6 outline-none rounded px-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Unidade de Medida</span>
                                            <select 
                                                value={editForm.unit}
                                                onChange={(e) => handleInputChange('unit', e.target.value)}
                                                className="w-full text-[10px] font-black text-slate-700 uppercase bg-slate-50 border-none h-6 outline-none rounded px-1"
                                            >
                                                <option value="KG">Quilogramas (KG)</option>
                                                <option value="UN">Unidades (UN)</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div className="bg-white p-4 rounded-2xl border border-slate-100 col-span-2">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Volumes (Bobinas/Pacotes)</span>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            step="1"
                                            value={isEditing ? editForm.volumes : selectedInventoryItem.volumes || 0}
                                            onChange={async (e) => {
                                                const newVal = parseFloat(e.target.value) || 0;
                                                if (isEditing) {
                                                    handleInputChange('volumes', newVal);
                                                } else {
                                                    const { error } = await supabase.from('ee_inventory').update({ volumes: newVal }).eq('id', selectedInventoryItem.id);
                                                    if (!error) {
                                                        setInventory(prev => prev.map(i => i.id === selectedInventoryItem.id ? { ...i, volumes: newVal } : i));
                                                        setSelectedInventoryItem({ ...selectedInventoryItem, volumes: newVal });
                                                    }
                                                }
                                            }}
                                            className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-black text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unid</span>
                                    </div>
                                </div>
                                {(() => {
                                    const totalConsumed = tests
                                        .filter(t => t.consumed_stock_id === selectedInventoryItem.id)
                                        .reduce((acc, curr) => acc + (curr.produced_quantity || 0), 0);

                                    if (totalConsumed === 0) return null;

                                    return (
                                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 col-span-2 flex justify-between items-center">
                                            <span className="text-[8px] font-bold text-amber-600 uppercase">Reutilizado em outros testes</span>
                                            <span className="text-sm font-black text-amber-600">-{Number(totalConsumed || 0).toFixed(1)} {selectedInventoryItem.unit}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="pt-4 border-t border-slate-200 flex justify-between items-end px-2">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">Saldo Real Disponível</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-slate-900">{Number(selectedInventoryItem.quantity || 0).toFixed(1)}</span>
                                        <span className="text-xs font-black text-slate-400 uppercase">{selectedInventoryItem.unit}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase block">Tempo em Estoque</span>
                                    <span className="text-[10px] font-black text-slate-600 uppercase">
                                        {(() => {
                                            const diffMs = new Date() - new Date(selectedInventoryItem.created_at);
                                            const days = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
                                            return diffMs < 0 ? 'Agendado' : (days === 0 ? 'Hoje' : `${days} dias`);
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Provenance & History */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rastreabilidade & Reuso</label>

                            {/* Provenance */}
                            {(() => {
                                const currentTest = tests.find(t => t.id === selectedInventoryItem.test_id);
                                const donorItem = currentTest?.consumed_stock_id ? inventory.find(i => i.id === currentTest.consumed_stock_id) : null;
                                if (!donorItem) return null;
                                return (
                                    <div
                                        onClick={() => {
                                            setInventoryHistory([...inventoryHistory, selectedInventoryItem]);
                                            setSelectedInventoryItem(donorItem);
                                        }}
                                        className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-indigo-100/80 active:scale-[0.98] transition-all group shadow-sm"
                                    >
                                        <div className="p-2 bg-indigo-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                                            <RefreshCw size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">Proveniente de:</span>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-indigo-700 uppercase leading-tight">{donorItem.name}</span>
                                                <span className="text-[9px] font-medium text-indigo-500 uppercase tracking-tight">{donorItem.client_name || 'Estoque Geral'}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                );
                            })()}

                            {/* Consumption History */}
                            {(() => {
                                const consumers = tests.filter(t => t.consumed_stock_id === selectedInventoryItem.id);
                                if (consumers.length === 0) return null;
                                return (
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase ml-1">Histórico de Destino (Consumo):</span>
                                        <div className="space-y-1.5">
                                            {consumers.map(c => (
                                                <div key={c.id} className="p-3 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{c.client_name || 'Novo Teste'}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Teste: {c.title}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-amber-600">-{c.produced_quantity} {selectedInventoryItem.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Actions & Settings */}
                        <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mover Depósito</label>
                                <select
                                    value={selectedInventoryItem.stock_bin}
                                    onChange={async (e) => {
                                        const newBin = e.target.value;
                                        const { error } = await supabase.from('ee_inventory').update({ stock_bin: newBin }).eq('id', selectedInventoryItem.id);
                                        if (!error) {
                                            // Atualizar também o teste de origem para manter consistência
                                            if (selectedInventoryItem.test_id) {
                                                await supabase.from('tech_tests').update({ stock_destination: newBin }).eq('id', selectedInventoryItem.test_id);
                                            }
                                            setInventory(prev => prev.map(i => i.id === selectedInventoryItem.id ? { ...i, stock_bin: newBin } : i));
                                            setSelectedInventoryItem({ ...selectedInventoryItem, stock_bin: newBin });
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-slate-100 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none hover:bg-slate-200 transition-colors cursor-pointer h-[38px]"
                                >
                                    <option value="ESTOQUE 0">ESTOQUE 0 (RESERVA)</option>
                                    <option value="ESTOQUE 01">ESTOQUE 01 (ACABADO)</option>
                                    <option value="ESTOQUE 14">ESTOQUE 14 (QUARENTENA)</option>
                                    <option value="ESTOQUE 65">ESTOQUE 65 (ENGENHARIA)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Descartar Saldo</label>
                                <button
                                    onClick={async () => {
                                        if (confirm('Deseja descartar o saldo deste item? O registro será mantido para fins de custo, mas a quantidade disponível será zerada.')) {
                                            const { error } = await supabase.from('ee_inventory').update({
                                                status: 'DISCARDED',
                                                quantity: 0,
                                                inventory_adjustment: -(selectedInventoryItem.quantity - (selectedInventoryItem.inventory_adjustment || 0)),
                                                last_inventory_at: new Date().toISOString()
                                            }).eq('id', selectedInventoryItem.id);

                                            if (!error) {
                                                const updated = { ...selectedInventoryItem, status: 'DISCARDED', quantity: 0, last_inventory_at: new Date().toISOString() };
                                                setInventory(prev => prev.map(i => i.id === selectedInventoryItem.id ? updated : i));
                                                setSelectedInventoryItem(updated);
                                                notifySuccess('Item descartado com sucesso.', 'O histórico financeiro foi preservado.');
                                            }
                                        }
                                    }}
                                    disabled={selectedInventoryItem.status === 'DISCARDED'}
                                    className={`w-full px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors h-[38px] ${selectedInventoryItem.status === 'DISCARDED'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        }`}
                                >
                                    {selectedInventoryItem.status === 'DISCARDED' ? 'Descartado' : 'Descartar'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Excluir Item</label>
                                <button
                                    onClick={async () => {
                                        if (confirm('Tem certeza que deseja excluir este item do estoque permanentemente?')) {
                                            const { count, error: countError } = await supabase.from('tech_tests').select('*', { count: 'exact', head: true }).eq('consumed_stock_id', selectedInventoryItem.id);
                                            if (countError) {
                                                notifyError('Erro ao verificar dependências', countError.message);
                                                return;
                                            }
                                            if (count > 0) {
                                                notifyWarning('Item não pode ser excluído', `Está sendo reutilizado em ${count} teste(s) técnico(s).`);
                                                return;
                                            }
                                            const { error } = await supabase.from('ee_inventory').delete().eq('id', selectedInventoryItem.id);
                                            if (!error) {
                                                setInventory(prev => prev.filter(i => i.id !== selectedInventoryItem.id));
                                                setSelectedInventoryItem(null);
                                                setInventoryHistory([]);
                                            }
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors h-[38px]"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                    {selectedInventoryItem.test_id && (
                        <button
                            onClick={() => {
                                const relatedTest = tests.find(t => t.id === selectedInventoryItem.test_id);
                                if (relatedTest) setShowTestDetails(relatedTest);
                            }}
                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <FileText size={16} /> Ver Registro de Origem
                        </button>
                    )}
                    <button
                        onClick={() => { setSelectedInventoryItem(null); setInventoryHistory([]); }}
                        className="flex-1 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Fechar Detalhes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventoryDetailModal;
