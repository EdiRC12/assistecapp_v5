import React from 'react';
import { X, CheckCircle, XCircle, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PoliPanel = ({ suggestions, setSuggestions, onClose, currentUser, onAcceptAction, notifySuccess, notifyError }) => {

    const handleAcceptSuggestion = async (suggestion) => {
        if (suggestion.type === 'address_optimization') {
            // Handle address suggestion
            if (!window.confirm(`Atualizar endereço?\n\nDe: ${suggestion.original}\nPara: ${suggestion.suggestion}`)) {
                return;
            }

            try {
                const { error } = await supabase
                    .from('clients')
                    .update({
                        address: suggestion.suggestion,
                        address_verified: true,
                        address_verified_at: new Date().toISOString()
                    })
                    .eq('id', suggestion.clientId);

                if (error) throw error;
                setSuggestions(prev => prev.filter(s => s.clientId !== suggestion.clientId));
                if (onAcceptAction) onAcceptAction(suggestion);
            } catch (err) {
                notifyError('Erro ao atualizar endereço', err.message);
            }
        } else {
            // Handle other suggestion types (persistent in database)
            if (!suggestion.id || suggestion.id.includes('mock') || !suggestion.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
                // If it's a local/mock suggestion or invalid UUID, just remove from UI
                console.warn('Sugestão sem ID de banco válido, removendo apenas da interface.');
                setSuggestions(prev => prev.filter(s =>
                    suggestion.id ? s.id !== suggestion.id : s.clientId !== suggestion.clientId
                ));
                return;
            }

            try {
                const { error } = await supabase
                    .from('poli_suggestions')
                    .update({
                        status: 'accepted',
                        resolved_at: new Date().toISOString(),
                        resolved_by: currentUser?.id
                    })
                    .eq('id', suggestion.id);

                if (error) throw error;
                setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                if (onAcceptAction) onAcceptAction(suggestion);
            } catch (err) {
                notifyError('Erro ao processar sugestão', err.message);
            }
        }
    };

    const handleIgnoreSuggestion = (suggestion) => {
        setSuggestions(prev => prev.filter(s =>
            suggestion.id ? s.id !== suggestion.id : s.clientId !== suggestion.clientId
        ));
    };

    return (
        <>
            {/* Backdrop para fechar ao clicar fora */}
            <div 
                className="fixed inset-0 z-40 bg-transparent cursor-default" 
                onClick={onClose}
            />
            
            <div className="absolute top-16 right-4 w-96 max-h-[80vh] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Bell size={18} className="text-purple-600" />
                        <h3 className="font-bold text-slate-800">Sugestões da POLI</h3>
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            {suggestions.length}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 custom-scrollbar flex-1">
                    {suggestions.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="text-slate-300" size={32} />
                            </div>
                            <p className="text-slate-600 font-bold text-sm">Tudo limpo!</p>
                            <p className="text-slate-400 text-xs mt-1">Nenhuma sugestão pendente no momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {suggestions.map((suggestion, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <h3 className="font-bold text-slate-800 text-sm mb-1">
                                        {suggestion.title || suggestion.clientName}
                                    </h3>
                                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                                        {suggestion.description || suggestion.reason}
                                    </p>

                                    {suggestion.original && (
                                        <div className="space-y-1.5 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="flex items-start gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider w-12 shrink-0">Atual</span>
                                                <p className="text-xs text-slate-600 break-words">{suggestion.original}</p>
                                            </div>
                                            <div className="h-px bg-slate-200"></div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-[10px] font-bold text-green-600 mt-0.5 uppercase tracking-wider w-12 shrink-0">Sugestão</span>
                                                <p className="text-xs text-slate-800 font-bold break-words">{suggestion.suggestion}</p>
                                            </div>
                                        </div>
                                    )}

                                    {suggestion.type === 'inventory_alert' && suggestion.data && (
                                        <div className="bg-orange-50 p-2 rounded-lg mb-3 border border-orange-100">
                                            <p className="text-[10px] font-bold text-orange-700">
                                                📦 {suggestion.description}
                                            </p>
                                        </div>
                                    )}

                                    {suggestion.type === 'rnc_analysis' && suggestion.data && (
                                        <div className="bg-red-50 p-2 rounded-lg mb-3 border border-red-100">
                                            <p className="text-[10px] font-bold text-red-700">
                                                🔍 {suggestion.description}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => handleAcceptSuggestion(suggestion)}
                                            className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                        >
                                            <CheckCircle size={14} />
                                            Aceitar
                                        </button>
                                        <button
                                            onClick={() => handleIgnoreSuggestion(suggestion)}
                                            className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <XCircle size={14} />
                                            Ignorar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Footer decoration */}
                <div className="bg-slate-50 p-2 rounded-b-xl border-t border-slate-100 flex justify-center">
                    <div className="w-12 h-1 bg-slate-200 rounded-full"></div>
                </div>
            </div>
        </>
    );
};

export default PoliPanel;
