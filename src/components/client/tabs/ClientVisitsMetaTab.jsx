import React, { useState, useEffect } from 'react';
import { Calendar, Save, Loader2, Info } from 'lucide-react';
import DashboardCard from '../DashboardCard';

const ClientVisitsMetaTab = ({ activeClientObj, currentUser, supabase, notifySuccess, notifyError, fetchClients }) => {
    const [metaFreqVal, setMetaFreqVal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeClientObj) {
            const months = activeClientObj.visit_frequency_months || 0;
            setMetaFreqVal(months);
        }
    }, [activeClientObj]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!activeClientObj) return;

        setLoading(true);
        try {
            const freqMonths = parseInt(metaFreqVal);
            const finalFreq = freqMonths > 0 ? freqMonths : null;

            const { error } = await supabase
                .from('clients')
                .update({
                    visit_frequency_months: finalFreq,
                    visit_frequency_value: finalFreq,
                    visit_frequency_unit: 'MESES'
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

                <div className="space-y-4 border-l-4 border-brand-500 pl-4 py-1 animate-in slide-in-from-top-3 duration-200">
                    {/* Frequência */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                            Frequência de Visitas Exigida
                        </label>
                        <select
                            value={metaFreqVal}
                            onChange={(e) => setMetaFreqVal(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                        >
                            <option value="0">Sem meta / Livre</option>
                            <option value="1">A cada 1 mês (Mensal)</option>
                            <option value="2">A cada 2 meses (Bimestral)</option>
                            <option value="3">A cada 3 meses (Trimestral)</option>
                            <option value="4">A cada 4 meses (Quadrimestral)</option>
                            <option value="6">A cada 6 meses (Semestral)</option>
                            <option value="12">A cada 12 meses (Anual)</option>
                            <option value="24">A cada 24 meses (Bianual)</option>
                        </select>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                            Selecione a frequência ideal. O sistema avisará quando este prazo for ultrapassado desde a última visita. Se "Sem meta", ele não aparecerá nos alertas.
                        </p>
                    </div>
                </div>

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
