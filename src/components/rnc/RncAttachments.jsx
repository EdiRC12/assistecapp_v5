import React from 'react';
import { Paperclip, FileCheck, Trash2, Download, X, FileText, Users, Info } from 'lucide-react';

const RncAttachments = ({
    newRnc, setNewRnc,
    handleFileUpload, removeAttachment
}) => {
    const updateAttachmentCaption = (id, caption) => {
        setNewRnc(prev => ({
            ...prev,
            attachments: prev.attachments.map(a => a.id === id ? { ...a, caption } : a)
        }));
    };

    const updateAttachmentDate = (id, reception_date) => {
        setNewRnc(prev => ({
            ...prev,
            attachments: prev.attachments.map(a => a.id === id ? { ...a, reception_date } : a)
        }));
    };

    return (
        <div className="space-y-8">
            {/* ANEXOS */}
            <div className="space-y-4 pt-8 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip size={12} className="text-brand-600" /> Documentação e Evidências
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-[28px] border border-slate-200 border-dashed">
                    <label className="aspect-video sm:aspect-square md:aspect-video border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:bg-white transition-all text-slate-400 hover:text-brand-600 group">
                        <Paperclip size={24} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase">Anexar Novo</span>
                        <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    </label>

                    {newRnc.attachments?.map((file) => (
                        <div key={file.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden group shadow-sm flex flex-col">
                            <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
                                {file.type.startsWith('image/') ? (
                                    <img src={file.url} alt="anexo" className="w-full h-full object-cover" />
                                ) : (
                                    <FileText size={48} className="text-slate-300" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(file.id)}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    <X size={14} />
                                </button>
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute bottom-2 right-2 bg-brand-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    <Download size={14} />
                                </a>
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Legenda / Descrição</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Foto da etiqueta..."
                                        value={file.caption || ''}
                                        onChange={(e) => updateAttachmentCaption(file.id, e.target.value)}
                                        className="w-full text-xs font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Data de Recebimento</label>
                                    <input
                                        type="date"
                                        value={file.reception_date || ''}
                                        onChange={(e) => updateAttachmentDate(file.id, e.target.value)}
                                        className="w-full text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION: ACORDO COMERCIAL */}
            <div className="space-y-4 pt-8 border-t border-slate-100">
                <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> Acordo Comercial / Decisão Final
                </label>
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[28px] space-y-4">
                    <textarea
                        placeholder="Descreva o acordo feito com o cliente (ex: Troca autorizada, Desconto de 10%, etc)..."
                        value={newRnc.commercial_agreement || ''}
                        onChange={(e) => setNewRnc({ ...newRnc, commercial_agreement: e.target.value })}
                        className="w-full h-24 bg-white border border-rose-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none shadow-sm"
                    />
                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase italic">
                        <Info size={12} /> Este campo deve registrar o desdobramento comercial final da ocorrência
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RncAttachments;
