import React from 'react';
import { Factory, Plus, Camera, Trash2 } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import useIsMobile from '../../../hooks/useIsMobile';

const ClientMachinesTab = ({
    clientMachines,
    loadingMachines,
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

    const removePhoto = (index) => {
        const updatedPhotos = newMachine.photos.filter((_, i) => i !== index);
        setNewMachine({ 
            ...newMachine, 
            photos: updatedPhotos,
            photo: updatedPhotos[0] || '' 
        });
    };

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
                    <form onSubmit={handleAddMachine} className="bg-white p-6 rounded-2xl border-2 border-brand-200 shadow-xl animate-in zoom-in-95 duration-200 mb-8 max-w-4xl">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4">Cadastrar Ativo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    {(newMachine.photos || []).map((pic, idx) => (
                                        <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group border border-slate-200">
                                            <img src={pic} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                            <button 
                                                type="button"
                                                onClick={() => removePhoto(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {(!newMachine.photos || newMachine.photos.length < 6) && (
                                        <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all bg-slate-50">
                                            <Camera size={20} className="text-slate-400 mb-1" />
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Add Foto</span>
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleMachinePhotoChange} />
                                        </label>
                                    )}
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium italic">* Máximo 6 fotos por máquina. Carregamento em lote suportado.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsAddingMachine(false)} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-brand-200">Salvar Máquina</button>
                        </div>
                    </form>
                )}

                {loadingMachines ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Carregando Inventário...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientMachines.map(machine => (
                            <div key={machine.id} onClick={() => setSelectedMachineForView(machine)} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-brand-300 hover:shadow-lg transition-all flex flex-col cursor-pointer relative">
                                {machine.quantity > 1 && (
                                    <div className="absolute top-4 left-4 z-10 bg-brand-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20">
                                        {machine.quantity} UNIDADES
                                    </div>
                                )}
                                
                                {machine.photos?.length > 1 && (
                                    <div className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-white/10">
                                        {machine.photos.length} FOTOS
                                    </div>
                                )}

                                {(() => {
                                    const getFirstPhoto = (m) => {
                                        if (m.photos && Array.isArray(m.photos) && m.photos.length > 0) return m.photos[0];
                                        if (m.photo) {
                                            if (typeof m.photo === 'string' && m.photo.startsWith('[') && m.photo.endsWith(']')) {
                                                try {
                                                    const p = JSON.parse(m.photo);
                                                    if (Array.isArray(p)) return p[0];
                                                } catch(e) {}
                                            }
                                            return m.photo;
                                        }
                                        return null;
                                    };
                                    const firstPhoto = getFirstPhoto(machine);
                                    const totalPhotos = (machine.photos?.length) || (machine.photo?.startsWith('[') ? JSON.parse(machine.photo).length : 1);

                                    return firstPhoto ? (
                                        <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                                            <img src={firstPhoto} alt={machine.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                                            
                                            {totalPhotos > 1 && (
                                                <div className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-white/10">
                                                    {totalPhotos} FOTOS
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMachine(machine.id);
                                                }}
                                                className="absolute top-2 right-2 bg-white/20 backdrop-blur-md text-white p-2 rounded-lg hover:bg-red-500 transition-all opacity-100 lg:opacity-0 group-hover:opacity-100 z-20"
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
                                    );
                                })()}
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
                )}
            </div>
        </DashboardCard>
    );
};

export default ClientMachinesTab;
