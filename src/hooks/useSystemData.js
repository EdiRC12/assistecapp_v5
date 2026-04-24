import { useState, useCallback, useEffect } from 'react';
import { setAiConfig } from '../services/aiService';

export const useSystemData = (supabase, currentUser, { notifySuccess, notifyError } = {}) => {
    const [users, setUsers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [aiConfig, setAiConfigState] = useState({ GEMINI_API_KEY: '', OPENAI_API_KEY: '' });
    const [testFlows, setTestFlows] = useState([
        { label: 'CADASTRADO', color: '#94a3b8' },
        { label: 'EM PRODUÇÃO', color: '#3b82f6' },
        { label: 'FATURADO', color: '#10b981' }
    ]);
    const [testStatusPresets, setTestStatusPresets] = useState([
        { label: 'APROVADO', color: '#10b981' },
        { label: 'REPROVADO', color: '#ef4444' },
        { label: 'CANCELADO', color: '#f87171' },
        { label: 'EM DESENVOLVIMENTO', color: '#94a3b8' },
        { label: 'EM ANÁLISE', color: '#f97316' },
        { label: 'AGUARDANDO RETORNO DO CLIENTE', color: '#eab308' },
        { label: 'DESCARTADO', color: '#f43f5e' }
    ]);
    const [inventoryReasons, setInventoryReasons] = useState([
        { label: 'DESCARTE' },
        { label: 'EXTRAVIO' },
        { label: 'AVARIA' },
        { label: 'ERRO DE LANÇAMENTO' },
        { label: 'CONSUMO INTERNO' }
    ]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, [supabase]);

    const fetchVehicles = useCallback(async () => {
        if (!supabase || !currentUser) return;
        try {
            const { data, error } = await supabase.from('vehicles').select('*').order('model');
            if (error) throw error;
            setVehicles(data || []);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    }, [supabase, currentUser]);

    const fetchInventoryReasons = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('inventory_reasons').select('label').order('label');
            if (error) throw error;
            if (data && data.length > 0) {
                setInventoryReasons(data);
            }
        } catch (error) {
            console.error('Error fetching inventory reasons:', error);
        }
    }, [supabase]);

    const [sysIntegrity, setSysIntegrity] = useState('VALID');

    const fetchAiConfig = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('app_configs').select('*');
            if (error) throw error;

            if (data) {
                const configMap = { GEMINI_API_KEY: '', OPENAI_API_KEY: '' };
                let loadedFlows = null;
                let loadedStatus = null;
                data.forEach(item => {
                    if (item.config_key === 'test_flows') loadedFlows = item.config_value;
                    else if (item.config_key === 'test_status_presets') loadedStatus = item.config_value;
                    else if (item.config_key === 'sys_integrity_checksum') {
                        // Check for Master Key: v6-platinum-active-0422-evandrsilv
                        if (item.config_value !== 'v6-platinum-active-0422-evandrsilv') {
                            setSysIntegrity('RESTRICTED');
                        }
                    }
                    else configMap[item.config_key] = item.config_value;
                });
                setAiConfigState(configMap);
                setAiConfig(configMap);
                
                if (loadedFlows) {
                    try { 
                        let parsed = typeof loadedFlows === 'string' ? JSON.parse(loadedFlows) : loadedFlows;
                        if (Array.isArray(parsed)) {
                            const normalized = parsed.map(f => typeof f === 'string' ? { label: f, color: '#94a3b8' } : f);
                            setTestFlows(normalized);
                        }
                    } catch(e){}
                }

                if (loadedStatus) {
                    try { 
                        let parsed = typeof loadedStatus === 'string' ? JSON.parse(loadedStatus) : loadedStatus;
                        if (Array.isArray(parsed)) {
                            let normalized = parsed.map(p => typeof p === 'string' ? { label: p, color: '#94a3b8' } : p);
                            if (!normalized.some(p => p.label === 'DESCARTADO')) {
                                normalized.push({ label: 'DESCARTADO', color: '#f43f5e' });
                            }
                            setTestStatusPresets(normalized);
                        }
                    } catch(e){}
                }
            }
        } catch (error) {
            console.warn("[Hook] Erro ao carregar configurações de IA do banco:", error);
        }
    }, [supabase]);

    const handleSaveAiConfig = useCallback(async (newConfig) => {
        if (!supabase || !currentUser) return;
        try {
            setLoading(true);
            const updates = Object.entries(newConfig).map(([key, value]) => ({
                config_key: key,
                config_value: value,
                updated_at: new Date().toISOString(),
                updated_by: currentUser.id
            }));

            const { error } = await supabase.from('app_configs').upsert(updates, { onConflict: 'config_key' });
            if (error) throw error;

            setAiConfigState(newConfig);
            setAiConfig(newConfig);
            if (notifySuccess) notifySuccess("Sucesso", "Configurações de IA salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar config de IA:", error);
            if (notifyError) notifyError("Erro ao salvar", "Erro ao salvar configurações: " + error.message);
        } finally {
            setLoading(false);
        }
    }, [supabase, currentUser]);

    const handleSaveInventoryReasons = useCallback(async (newReasons) => {
        if (!supabase || !currentUser) return;
        try {
            setLoading(true);
            await supabase.from('inventory_reasons').delete().neq('label', '___PROTECT___');
            
            const payload = newReasons.map(r => ({ label: r.label.toUpperCase() }));
            const { error } = await supabase.from('inventory_reasons').insert(payload);
            
            if (error) throw error;
            setInventoryReasons(newReasons);
            if (notifySuccess) notifySuccess("Sucesso", "Motivos de inventário atualizados!");
        } catch (error) {
            console.error("Erro ao salvar inventory_reasons:", error);
            if (notifyError) notifyError("Erro", "Não foi possível salvar os motivos.");
        } finally {
            setLoading(false);
        }
    }, [supabase, currentUser, notifySuccess, notifyError]);

    const handleSaveTestFlows = useCallback(async (newFlows) => {
        if (!supabase || !currentUser) return;
        try {
            setLoading(true);
            const { error } = await supabase.from('app_configs').upsert({
                config_key: 'test_flows',
                config_value: newFlows,
                updated_at: new Date().toISOString(),
                updated_by: currentUser.id
            }, { onConflict: 'config_key' });
            if (error) throw error;
            setTestFlows(newFlows);
            if (notifySuccess) notifySuccess("Sucesso", "Fluxos de teste atualizados!");
        } catch (error) {
            console.error("Erro ao salvar test_flows:", error);
            if (notifyError) notifyError("Erro", "Não foi possível salvar os fluxos de teste.");
        } finally {
            setLoading(false);
        }
    }, [supabase, currentUser, notifySuccess, notifyError]);

    const handleSaveTestStatusPresets = useCallback(async (newPresets) => {
        if (!supabase || !currentUser) return;
        try {
            setLoading(true);
            const { error } = await supabase.from('app_configs').upsert({
                config_key: 'test_status_presets',
                config_value: newPresets,
                updated_at: new Date().toISOString(),
                updated_by: currentUser.id
            }, { onConflict: 'config_key' });
            if (error) throw error;
            setTestStatusPresets(newPresets);
            if (notifySuccess) notifySuccess("Sucesso", "Status de experimentos atualizados!");
        } catch (error) {
            console.error("Erro ao salvar test_status_presets:", error);
            if (notifyError) notifyError("Erro", "Não foi possível salvar os status.");
        } finally {
            setLoading(false);
        }
    }, [supabase, currentUser, notifySuccess, notifyError]);

    const updateHeartbeat = useCallback(async () => {
        if (!supabase || !currentUser) return;
        await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    }, [supabase, currentUser]);

    useEffect(() => {
        if (currentUser) {
            fetchUsers();
            fetchVehicles();
            fetchAiConfig();
            fetchInventoryReasons();

            // Polling de 30s para lista de usuários (substitui Realtime WebSocket)
            // Mais econômico para a cota do Supabase do que manter um canal aberto.
            // O heartbeat do usuário já é gerenciado pelo App.jsx (intervalo de 120s).
            const usersPollingInterval = setInterval(() => {
                fetchUsers();
            }, 30000);

            return () => {
                clearInterval(usersPollingInterval);
            };
        } else {
            setUsers([]);
            setVehicles([]);
        }
    }, [currentUser, fetchUsers, fetchVehicles, fetchAiConfig, fetchInventoryReasons]);

    return {
        users,
        setUsers,
        vehicles,
        setVehicles,
        aiConfig,
        setAiConfigState,
        loading,
        fetchUsers,
        fetchVehicles,
        fetchAiConfig,
        handleSaveAiConfig,
        testFlows,
        handleSaveTestFlows,
        testStatusPresets,
        handleSaveTestStatusPresets,
        inventoryReasons,
        handleSaveInventoryReasons,
        updateHeartbeat,
        sysIntegrity
    };
};
