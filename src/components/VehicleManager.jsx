import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Car, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const VehicleManager = ({ isOpen, onClose, currentUser, vehicles = [], setVehicles, notifySuccess, notifyError, notifyWarning }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ model: '', plate: '' });

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchVehicles();
        }
    }, [isOpen, currentUser]);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .order('model');

            if (error) throw error;
            if (setVehicles) setVehicles(data || []);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.model.trim() || !formData.plate.trim()) return;

        setLoading(true);
        try {
            const payload = {
                model: formData.model.trim(),
                plate: formData.plate.trim().toUpperCase(),
                created_by: currentUser.id
            };

            const { error } = await supabase
                .from('vehicles')
                .insert(payload);

            if (error) {
                if (error.code === '23505') {
                    if (notifyWarning) notifyWarning('Placa já cadastrada', 'Já existe um veículo cadastrado com esta placa.');
                    else alert('Já existe um veículo cadastrado com esta placa.');
                } else {
                    throw error;
                }
            } else {
                if (notifySuccess) notifySuccess('Sucesso', 'Veículo cadastrado com sucesso!');
                setFormData({ model: '', plate: '' });
                fetchVehicles();
            }
        } catch (error) {
            console.error('Error saving vehicle:', error);
            if (notifyError) notifyError('Erro ao salvar veículo');
            else alert('Erro ao salvar veículo');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover este veículo?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            if (notifySuccess) notifySuccess('Sucesso', 'Veículo removido da frota.');
            fetchVehicles();
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            if (notifyError) notifyError('Erro ao excluir veículo', 'Verifique se ele não está sendo usado em alguma viagem.');
            else alert('Erro ao excluir veículo. Verifique se ele não está sendo usado em alguma viagem.');
        } finally {
            setLoading(false);
        }
    };

    const filteredVehicles = (vehicles || []).filter(v =>
        v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.plate?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-100 p-2.5 rounded-xl text-brand-600">
                            <Car size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Frota de Veículos</h2>
                            <p className="text-sm text-slate-500">Gerencie os veículos da empresa</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Add Form */}
                    <form onSubmit={handleSave} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Novo Veículo</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Modelo</label>
                                <input
                                    type="text"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="Ex: Fiat Uno"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Placa</label>
                                <input
                                    type="text"
                                    value={formData.plate}
                                    onChange={e => setFormData({ ...formData, plate: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="ABC-1234"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : <><Plus size={16} /> Adicionar à Frota</>}
                        </button>
                    </form>

                    {/* Search and List */}
                    <div className="space-y-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar veículo ou placa..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <div className="space-y-2">
                            {filteredVehicles.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="text-sm">Nenhum veículo encontrado</p>
                                </div>
                            ) : (
                                filteredVehicles.map(vehicle => (
                                    <div key={vehicle.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                                <Car size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700">{vehicle.model}</div>
                                                <div className="text-xs font-mono text-slate-500 bg-slate-50 px-1.5 rounded border border-slate-100 inline-block">{vehicle.plate}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(vehicle.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                        **Nota:** Os veículos removidos continuarão aparecendo em relatórios antigos para manter o histórico de viagens intacto (lógica de snapshot).
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VehicleManager;
