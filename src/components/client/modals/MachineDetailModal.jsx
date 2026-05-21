import React, { useState, useEffect } from 'react';
import { X, Factory, Edit2, Save, ChevronLeft, ChevronRight, Camera, Trash2 } from 'lucide-react';
import { compressImageToBase64 } from '../../../utils/helpers';

const MachineDetailModal = ({
    selectedMachineForView,
    setSelectedMachineForView,
    isEditingMachineDetails,
    setIsEditingMachineDetails,
    machineEditForm,
    setMachineEditForm,
    handleEnterEditMode,
    handleSaveMachineDetails
}) => {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Reseta o index ao mudar de máquina ou entrar em edição
    useEffect(() => {
        setCurrentPhotoIndex(0);
    }, [selectedMachineForView?.id, isEditingMachineDetails]);

    if (!selectedMachineForView) return null;

    // Helper para extrair fotos de forma resiliente
    const getPhotosList = (machine) => {
        if (machine.photos && Array.isArray(machine.photos) && machine.photos.length > 0) {
            return machine.photos;
        }
        if (machine.photo) {
            // Tenta detectar se o campo 'photo' contém um JSON de array (fallback)
            if (typeof machine.photo === 'string' && machine.photo.startsWith('[') && machine.photo.endsWith(']')) {
                try {
                    const parsed = JSON.parse(machine.photo);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {
                    return [machine.photo];
                }
            }
            return [machine.photo];
        }
        return [];
    };

    const photos = isEditingMachineDetails 
        ? (machineEditForm.photos || []) 
        : getPhotosList(selectedMachineForView);

    const nextPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    const handleEditPhotoChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const currentPhotos = machineEditForm.photos || [];
        if (currentPhotos.length >= 6) return;

        const remainingSlots = 6 - currentPhotos.length;
        const filesToProcess = files.slice(0, remainingSlots);

        try {
            const base64Array = await Promise.all(filesToProcess.map(file => compressImageToBase64(file)));
            setMachineEditForm(prev => ({
                ...prev,
                photos: [...(prev.photos || []), ...base64Array]
            }));
        } catch (err) {
            console.error('Error adding photos in edit mode:', err);
        }
    };

    const removeEditPhoto = (index) => {
        const updated = (machineEditForm.photos || []).filter((_, i) => i !== index);
        setMachineEditForm({ ...machineEditForm, photos: updated });
        if (currentPhotoIndex >= updated.length && updated.length > 0) {
            setCurrentPhotoIndex(updated.length - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setSelectedMachineForView(null); setIsEditingMachineDetails(false); }} />
            <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                
                {/* Galeria de Fotos (60%) */}
                <div className="w-full md:w-3/5 bg-slate-900 relative group overflow-hidden flex items-center justify-center">
                    {photos.length > 0 ? (
                        <div className="w-full h-full relative">
                            <img 
                                src={photos[currentPhotoIndex]} 
                                alt={selectedMachineForView.name} 
                                className="w-full h-full object-contain animate-in fade-in duration-500" 
                                key={currentPhotoIndex}
                            />
                            
                            {/* Navegação */}
                            {photos.length > 1 && (
                                <>
                                    <button onClick={prevPhoto} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full transition-all">
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button onClick={nextPhoto} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full transition-all">
                                        <ChevronRight size={24} />
                                    </button>
                                    
                                    {/* Indicadores */}
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {photos.map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`h-1.5 rounded-full transition-all ${i === currentPhotoIndex ? 'w-6 bg-brand-500' : 'w-1.5 bg-white/30'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Controles de Edição na Foto */}
                            {isEditingMachineDetails && (
                                <div className="absolute top-6 right-6 flex gap-2">
                                    <button 
                                        onClick={() => removeEditPhoto(currentPhotoIndex)}
                                        className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-xl backdrop-blur-md transition-all shadow-lg"
                                        title="Remover esta foto"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    {photos.length < 6 && (
                                        <label className="bg-brand-600/80 hover:bg-brand-600 text-white p-2 rounded-xl backdrop-blur-md transition-all shadow-lg cursor-pointer">
                                            <Camera size={20} />
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleEditPhotoChange} />
                                        </label>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                            <Factory size={120} strokeWidth={1} />
                            <span className="text-sm font-bold mt-4 uppercase tracking-[0.2em] opacity-40">Sem Foto Cadastrada</span>
                            {isEditingMachineDetails && (
                                <label className="mt-6 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold uppercase text-xs tracking-widest cursor-pointer hover:bg-brand-500 transition-all">
                                    Adicionar Foto
                                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleEditPhotoChange} />
                                </label>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => { setSelectedMachineForView(null); setIsEditingMachineDetails(false); }}
                        className="absolute top-6 left-6 bg-black/40 backdrop-blur-md text-white p-3 rounded-full hover:bg-white hover:text-slate-900 transition-all shadow-xl z-20"
                    >
                        <X size={24} />
                    </button>

                    {photos.length > 0 && (
                        <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                            Foto {currentPhotoIndex + 1} de {photos.length}
                        </div>
                    )}
                </div>

                {/* Informações e Edição (40%) */}
                <div className="w-full md:w-2/5 p-10 flex flex-col bg-white border-l border-slate-100 overflow-y-auto">
                    <div className="mb-10 flex justify-between items-start">
                        <div className="flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                                    <Factory size={22} />
                                </div>
                                <span className="text-[11px] font-black text-brand-600 uppercase tracking-[0.2em]">Registro de Ativo</span>
                            </div>
                            {isEditingMachineDetails ? (
                                <input
                                    type="text"
                                    value={machineEditForm.name}
                                    onChange={(e) => setMachineEditForm({ ...machineEditForm, name: e.target.value })}
                                    className="text-2xl font-black text-slate-800 uppercase border-b-2 border-brand-500 outline-none w-full bg-slate-50 p-2 rounded-t-lg"
                                    placeholder="Nome da Máquina"
                                />
                            ) : (
                                <h3 className="text-3xl font-black text-slate-800 uppercase leading-tight tracking-tight">{selectedMachineForView.name}</h3>
                            )}
                        </div>
                        {!isEditingMachineDetails && (
                            <button
                                onClick={handleEnterEditMode}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 border border-slate-200"
                            >
                                <Edit2 size={14} /> Editar
                            </button>
                        )}
                    </div>

                    <div className="space-y-8 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className={`p-5 rounded-2xl border transition-all ${isEditingMachineDetails ? 'bg-slate-50 border-brand-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-widest">Modelo / Marca</span>
                                {isEditingMachineDetails ? (
                                    <input
                                        type="text"
                                        value={machineEditForm.model}
                                        onChange={(e) => setMachineEditForm({ ...machineEditForm, model: e.target.value })}
                                        className="text-sm font-bold text-slate-700 w-full bg-transparent outline-none border-b border-brand-300"
                                    />
                                ) : (
                                    <span className="text-sm font-bold text-slate-700">{selectedMachineForView.model || '---'}</span>
                                )}
                            </div>

                            <div className={`p-5 rounded-2xl border transition-all ${isEditingMachineDetails ? 'bg-slate-50 border-brand-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-widest">Quantidade</span>
                                {isEditingMachineDetails ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setMachineEditForm(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))}
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-all font-bold"
                                        >
                                            -
                                        </button>
                                        <span className="text-sm font-black text-brand-600 w-12 text-center">
                                            {machineEditForm.quantity || 1}
                                        </span>
                                        <button
                                            onClick={() => setMachineEditForm(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))}
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-all font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-sm font-black text-brand-600 uppercase">
                                        {selectedMachineForView.quantity || 1} UNIDADE(S)
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={`p-6 rounded-2xl border transition-all ${isEditingMachineDetails ? 'bg-slate-50 border-brand-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-widest">Número de Série / TAG</span>
                            {isEditingMachineDetails ? (
                                <input
                                    type="text"
                                    value={machineEditForm.serial_number}
                                    onChange={(e) => setMachineEditForm({ ...machineEditForm, serial_number: e.target.value })}
                                    className="text-base font-mono font-black text-brand-600 w-full bg-transparent outline-none border-b border-brand-300"
                                />
                            ) : (
                                <span className="text-xl font-mono font-black text-brand-600 tracking-wider">
                                    {selectedMachineForView.serial_number || '---'}
                                </span>
                            )}
                        </div>

                        <div className={`p-6 rounded-2xl border transition-all ${isEditingMachineDetails ? 'bg-slate-50 border-brand-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-widest">Observações Técnicas</span>
                            {isEditingMachineDetails ? (
                                <textarea
                                    value={machineEditForm.notes}
                                    onChange={(e) => setMachineEditForm({ ...machineEditForm, notes: e.target.value })}
                                    className="text-sm text-slate-600 w-full bg-transparent outline-none min-h-[100px] resize-none leading-relaxed"
                                    placeholder="Descreva observações sobre o ativo..."
                                />
                            ) : (
                                <p className="text-sm text-slate-500 leading-relaxed font-medium italic">
                                    {selectedMachineForView.notes || 'Nenhuma observação técnica registrada.'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-12 flex gap-4">
                        {isEditingMachineDetails ? (
                            <>
                                <button
                                    onClick={() => setIsEditingMachineDetails(false)}
                                    className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handleSaveMachineDetails}
                                    className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-200 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Save size={18} /> Salvar Alterações
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setSelectedMachineForView(null)}
                                className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                            >
                                Fechar Visualização
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MachineDetailModal;
