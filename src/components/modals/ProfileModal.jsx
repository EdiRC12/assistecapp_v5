import React, { useState, useEffect } from 'react';
import { X, Paperclip } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import { convertFileToBase64 } from '../../utils/helpers';

const ProfileModal = ({ isOpen, onClose, currentUser, onUpdate, notifySuccess, notifyError }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#64748b');
    const [appBg, setAppBg] = useState('#e2e8f0');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [themeStyle, setThemeStyle] = useState('DEFAULT'); // DEFAULT, MIDNIGHT, GLASS
    const [poliInteraction, setPoliInteraction] = useState('MEDIUM');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && currentUser) {
            setName(currentUser.username);
            setColor(currentUser.color || '#64748b');
            setAppBg(currentUser.app_bg || '#e2e8f0');
            setAvatarUrl(currentUser.avatar_url || '');
            setThemeStyle(currentUser.theme_style || 'DEFAULT');
            setPoliInteraction(currentUser.poli_interaction || 'MEDIUM');
        }
    }, [isOpen, currentUser]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate({
                username: name,
                color,
                app_bg: appBg,
                avatar_url: avatarUrl,
                theme_style: themeStyle,
                poli_interaction: poliInteraction
            });
            onClose();
        } catch (error) {
            console.error(error);
            notifyError('Erro ao atualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const THEME_COLORS = ['#64748b', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#1e293b'];

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-in zoom-in-95 duration-300">
                {/* Header Premium */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Editar Perfil</h2>
                        <p className="text-[10px] text-brand-600 font-bold uppercase tracking-widest leading-none mt-1">
                            Configurações de Identidade
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-600 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar bg-white flex-1">
                    {/* Avatar Display Section */}
                    <div className="flex flex-col items-center mb-2">
                        <div className="relative group">
                            <div className="p-1.5 rounded-full bg-slate-50 shadow-inner border-2 border-slate-100 group-hover:border-brand-200 transition-colors">
                                <UserAvatar user={{ username: name, color, avatar_url: avatarUrl }} size={96} />
                            </div>
                            <label 
                                htmlFor="avatar-upload" 
                                className="absolute bottom-1 right-1 bg-white p-2.5 rounded-full shadow-xl border border-slate-100 text-brand-600 cursor-pointer hover:scale-110 active:scale-95 transition-all group-hover:shadow-brand-100"
                                title="Alterar foto"
                            >
                                <Paperclip size={18} />
                            </label>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    try {
                                        const b64 = await convertFileToBase64(file);
                                        setAvatarUrl(b64);
                                    } catch (err) {
                                        notifyError('Erro ao carregar imagem');
                                    }
                                }
                            }}
                            className="hidden"
                            id="avatar-upload"
                        />
                        {avatarUrl && (
                            <button
                                type="button"
                                onClick={() => setAvatarUrl('')}
                                className="mt-3 text-[10px] font-black uppercase text-red-500 hover:text-red-600 tracking-widest transition-colors"
                            >
                                Remover Imagem
                            </button>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Nome de Exibição
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome no sistema"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-slate-700"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Cor do Seu Tema
                            </label>
                            <div className="bg-slate-50 p-3 rounded-2xl flex flex-wrap items-center gap-3">
                                {THEME_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full shadow-sm transition-all relative flex items-center justify-center ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400 z-10' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                        style={{ backgroundColor: c }}
                                    >
                                        {color === c && <div className="w-2 h-2 bg-white rounded-full shadow-sm animate-in zoom-in" />}
                                    </button>
                                ))}
                                <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />
                                <input 
                                    type="color" 
                                    value={color} 
                                    onChange={(e) => setColor(e.target.value)} 
                                    className="w-10 h-8 rounded-lg bg-white p-1 border border-slate-200 cursor-pointer" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Estilo Visual
                                </label>
                                <select
                                    value={themeStyle}
                                    onChange={(e) => setThemeStyle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-slate-600 text-xs cursor-pointer appearance-none"
                                >
                                    <option value="DEFAULT">Clássico (V5)</option>
                                    <option value="MIDNIGHT">Nuit (Escuro)</option>
                                    <option value="GLASS">Crystal (Transparent)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Interação POLI
                                </label>
                                <select
                                    value={poliInteraction}
                                    onChange={(e) => setPoliInteraction(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-slate-600 text-[10px] uppercase cursor-pointer appearance-none"
                                >
                                    <option value="MINIMAL">Mínima</option>
                                    <option value="MEDIUM">Moderada</option>
                                    <option value="MAXIMAL">Proativa</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Fixado */}
                <div className="p-6 border-t border-slate-50 bg-white flex gap-4 shrink-0 px-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-6 rounded-2xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-[2] py-3 px-6 bg-brand-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-brand-100 hover:bg-brand-700 hover:shadow-brand-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
