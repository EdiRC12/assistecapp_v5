import React from 'react';
import { Factory, Plus, Camera, Trash2 } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import useIsMobile from '../../../hooks/useIsMobile';

const ClientMachinesTab = ({
    clientMachines,
    isAddingMachine,
    setIsAddingMachine,
    newMachine,
    setNewMachine,
    handleAddMachine,
    handleMachinePhotoChange,
    handleDeleteMachine,
    setSelectedMachineForView
}) => {
    const isMobile = useIsMobile();
    return (
        <DashboardCard title="Inventário de Máquinas" icon={Factory}>
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-brand-50 p-4 rounded-xl border border-brand-100 mb-6">
                    <span className="text-sm font-bold text-brand-700 uppercase">Gerenciar ativos instalados no cliente</span>
                    {!isAddingMachine && (
                        <button onClick={() => setIsAddingMachine(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-brand-500 flex items-center gap-1 shadow-md shadow-brand-200">
                            <Plus size={16} /> NOVA MÁQUINA
                        </button>
                    )}
                </div>

                {isAddingMachine && (
                    <form onSubmit={handleAddMachine} className="bg-white p-6 rounded-2xl border-2 border-brand-200 shadow-xl animate-in zoom-in-95 duration-200 mb-8 max-w-xl">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4">Cadastrar Ativo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <input type="text" placeholder="Nome / Identificação *" value={newMachine.name} onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" required />
                                <input type="text" placeholder="Modelo / Marca" value={newMachine.model} onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" />
                                <input type="text" placeholder="Número de Série / TAG" value={newMachine.serial_number} onChange={(e) => setNewMachine({ ...newMachine, serial_number: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" />
                                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quantidade:</span>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setNewMachine(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">-</button>
                                        <span className="text-sm font-bold w-8 text-center">{newMachine.quantity || 1}</span>
                                        <button type="button" onClick={() => setNewMachine(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">+</button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="flex flex-col items-center justify-center w-full h-full min-h-[140px] border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all bg-slate-50 relative overflow-hidden group">
                                    {newMachine.photo ? (
                                        <>
                                            <img src={newMachine.photo} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Camera size={24} className="text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Camera size={24} className="text-slate-400 mb-2" />
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Adicionar Foto</p>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleMachinePhotoChange} />
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsAddingMachine(false)} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-brand-200">Salvar Máquina</button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientMachines.map(machine => (
                        <div key={machine.id} onClick={() => setSelectedMachineForView(machine)} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-brand-300 hover:shadow-lg transition-all flex flex-col cursor-pointer relative">
                            {machine.quantity > 1 && (
                                <div className="absolute top-4 left-4 z-10 bg-brand-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20">
                                    {machine.quantity} UNIDADES
                                </div>
                            )}
                            {machine.photo ? (
                                <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                                    <img src={machine.photo} alt={machine.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMachine(machine.id);
                                        }}
                                        className="absolute top-2 right-2 bg-white/20 backdrop-blur-md text-white p-2 rounded-lg hover:bg-red-500 transition-all opacity-100 lg:opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="h-12 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-between px-5">
                                    <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                                        <Factory size={16} />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMachine(machine.id);
                                        }}
                                        className="text-slate-300 hover:text-red-500 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                            <div className="p-5 flex flex-col flex-1">
                                <h4 className="font-black text-slate-800 text-base uppercase mb-3 line-clamp-1">{machine.name}</h4>
                                <div className="grid grid-cols-1 gap-2 border-t border-slate-50 pt-3 mt-auto">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Modelo</span>
                                        <span className="text-xs font-bold text-slate-600">{machine.model || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Série / TAG</span>
                                        <span className="text-xs font-mono font-bold text-brand-600">{machine.serial_number || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {clientMachines.length === 0 && !isAddingMachine && <p className="col-span-full py-20 text-center text-slate-400 italic">Nenhuma máquina vinculada a este cliente.</p>}
                </div>
            </div>
        </DashboardCard>
    );
};

export default ClientMachinesTab;
