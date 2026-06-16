import React, { useState, useEffect } from 'react';
import { Calendar, Save, Loader2, Info } from 'lucide-react';
import DashboardCard from '../DashboardCard';

const ClientVisitsMetaTab = ({ activeClientObj, currentUser, supabase, notifySuccess, notifyError, fetchClients }) => {
    const [hasMeta, setHasMeta] = useState(false);
    const [metaFreqVal, setMetaFreqVal] = useState(6);
    const [metaFreqUnit, setMetaFreqUnit] = useState('MESES');
    const [metaLeadVal, setMetaLeadVal] = useState(2);
    const [metaLeadUnit, setMetaLeadUnit] = useState('MESES');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeClientObj) {
            // Check if user has defined meta (either legacy col or new cols)
            const hasDefinedMeta = (activeClientObj.visit_frequency_value !== undefined && activeClientObj.visit_frequency_value !== null && activeClientObj.visit_frequency_value > 0) || 
                                   (activeClientObj.visit_frequency_months !== undefined && activeClientObj.visit_frequency_months !== null && activeClientObj.visit_frequency_months > 0);
            
            setHasMeta(hasDefinedMeta);
            
            if (activeClientObj.visit_frequency_value !== undefined && activeClientObj.visit_frequency_value !== null) {
                setMetaFreqVal(activeClientObj.visit_frequency_value);
                setMetaFreqUnit(activeClientObj.visit_frequency_unit || 'MESES');
            } else {
                setMetaFreqVal(activeClientObj.visit_frequency_months || 6);
                setMetaFreqUnit('MESES');
            }

            if (activeClientObj.visit_lead_time_value !== undefined && activeClientObj.visit_lead_time_value !== null) {
                setMetaLeadVal(activeClientObj.visit_lead_time_value);
                setMetaLeadUnit(activeClientObj.visit_lead_time_unit || 'MESES');
            } else {
                setMetaLeadVal(activeClientObj.visit_lead_time_months || 2);
                setMetaLeadUnit('MESES');
            }
        }
    }, [activeClientObj]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!activeClientObj) return;

        setLoading(true);
        try {
            const freqVal = hasMeta ? (parseInt(metaFreqVal) || 6) : null;
            const freqUnit = hasMeta ? metaFreqUnit : null;
            const leadVal = hasMeta ? (parseInt(metaLeadVal) || 2) : null;
            const leadUnit = hasMeta ? metaLeadUnit : null;

            // Legacy backward-compatibility conversion to months (rough approximation)
            let freqMonths = freqVal;
            if (hasMeta) {
                if (freqUnit === 'DIAS') freqMonths = Math.max(1, Math.round(freqVal / 30));
                if (freqUnit === 'ANOS') freqMonths = freqVal * 12;
            } else {
                freqMonths = null;
            }

            let leadMonths = leadVal;
            if (hasMeta) {
                if (leadUnit === 'DIAS') leadMonths = Math.round(leadVal / 30);
                if (leadUnit === 'ANOS') leadMonths = leadVal * 12;
            } else {
                leadMonths = null;
            }

            const { error } = await supabase
                .from('clients')
                .update({
                    visit_frequency_value: freqVal,
                    visit_frequency_unit: freqUnit,
                    visit_lead_time_value: leadVal,
                    visit_lead_time_unit: leadUnit,
                    // Maintain legacy columns updated in case other components depend on them
                    visit_frequency_months: freqMonths,
                    visit_lead_time_months: leadMonths
                })
                .eq('id', activeClientObj.id);

            if (error) throw error;

            notifySuccess('Sucesso!', 'Configurações de prazos atualizadas.');
            if (fetchClients) {
                await fetchClients();
            }
        } catch (error) {
            console.error('Error saving visit metas:', error);
            notifyError('Erro ao salvar', error.message || 'Falha ao atualizar metas de visitas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardCard title="Metas de Visitas" icon={Calendar}>
            <form onSubmit={handleSave} className="max-w-md space-y-6 animate-in fade-in duration-300">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-indigo-800 text-xs font-semibold">
                    <Info size={18} className="shrink-0 text-indigo-500 mt-0.5" />
                    <div>
                        <p className="font-bold text-indigo-900 mb-1">Regras de Cronograma de Viagens</p>
                        Defina se este cliente possui acompanhamento periódico de visitas ou deve ficar de fora do cronograma automático.
                    </div>
                </div>

                {/* Toggle Habilitar Cronograma */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-inner">
                    <input
                        type="checkbox"
                        id="enable-meta-toggle"
                        checked={hasMeta}
                        onChange={(e) => setHasMeta(e.target.checked)}
                        className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
                    />
                    <label htmlFor="enable-meta-toggle" className="text-xs font-black text-slate-700 uppercase tracking-wider cursor-pointer select-none">
                        Habilitar Cronograma de Visitas para este cliente
                    </label>
                </div>

                {hasMeta && (
                    <div className="space-y-4 border-l-4 border-brand-500 pl-4 py-1 animate-in slide-in-from-top-3 duration-200">
                        {/* Frequência */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                                Frequência Limite de Visita
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={metaFreqVal}
                                    onChange={(e) => setMetaFreqVal(e.target.value)}
                                    className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                    required={hasMeta}
                                />
                                <select
                                    value={metaFreqUnit}
                                    onChange={(e) => setMetaFreqUnit(e.target.value)}
                                    className="px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                >
                                    <option value="DIAS">Dias</option>
                                    <option value="MESES">Meses</option>
                                    <option value="ANOS">Anos</option>
                                </select>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                Tempo máximo tolerado entre uma visita e outra (ex: a cada 15 Dias, 6 Meses, 1 Ano).
                            </p>
                        </div>

                        {/* Aviso Prévio */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                                Antecedência de Alerta (Aviso Prévio)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={metaLeadVal}
                                    onChange={(e) => setMetaLeadVal(e.target.value)}
                                    className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                    required={hasMeta}
                                />
                                <select
                                    value={metaLeadUnit}
                                    onChange={(e) => setMetaLeadUnit(e.target.value)}
                                    className="px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                >
                                    <option value="DIAS">Dias</option>
                                    <option value="MESES">Meses</option>
                                    <option value="ANOS">Anos</option>
                                </select>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                Tempo de antecedência para o cliente entrar na lista de prospecção (ex: avisar 2 Meses antes).
                            </p>
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-200 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Salvar Configurações
                            </>
                        )}
                    </button>
                </div>
            </form>
        </DashboardCard>
    );
};

export default ClientVisitsMetaTab;
