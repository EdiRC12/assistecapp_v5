import { supabase } from '../supabaseClient';

/**
 * Diagnostic Service
 * Encapsulates the core logic for system health checks.
 * Focused on Infrastructure, Schema, and Master Data.
 */

export const TABLES_TO_SCAN = [
    { name: 'tasks', columns: ['id', 'status', 'parent_rnc_id'] },
    { name: 'rnc_records', columns: ['id', 'rnc_number', 'status'] },
    { name: 'sac_tickets', columns: ['id', 'subject', 'status', 'appointment_number'] },
    { name: 'task_reports', columns: ['id', 'task_id', 'title', 'content', 'report_type'] },
    { name: 'ee_inventory', columns: ['id', 'name', 'stock_bin', 'quantity', 'inventory_adjustment'] },
    { name: 'tech_tests', columns: ['id', 'title', 'produced_quantity', 'op_cost', 'test_number'] },
    { name: 'inventory_adjustments_log', columns: ['id', 'inventory_item_id', 'difference', 'reason'] },
    { name: 'saved_reports', columns: ['id', 'type', 'totals', 'raw_data'] },
    { name: 'product_returns', columns: ['id', 'sac_id', 'status', 'quantity'] },
    { name: 'vehicles', columns: ['id', 'model', 'plate', 'created_by'] },
    { name: 'tech_followups', columns: ['id', 'title', 'client_name', 'user_id'] },
    { name: 'travel_occurrence_types', columns: ['id', 'name'] },
    { name: 'sac_sectors', columns: ['id', 'name'] },
    { name: 'sac_problem_types', columns: ['id', 'name'] },
    { name: 'app_configs', columns: ['config_key', 'config_value'] },
    { name: 'inventory_reasons', columns: ['label'] },
    { name: 'visit_pending_actions', columns: ['id', 'client_name', 'status'] },
    { name: 'notes', columns: ['id', 'content', 'user_id', 'note_date', 'is_public', 'is_confirmed'] },
    { name: 'users', columns: ['id', 'email', 'username', 'layout_mode'] },
    { name: 'clients', columns: ['id', 'name'] },
    { name: 'app_error_logs', columns: ['id', 'error_name', 'error_message', 'created_at'] }
];

export const runStructuralDiagnostics = async () => {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    const log = (name, detail, status) => {
        results.push({ name, detail, status, time: new Date().toLocaleTimeString() });
        if (status === 'SUCCESS') successCount++;
        else failCount++;
    };

    try {
        // 1. Connection Check
        const start = Date.now();
        const { error: connErr } = await supabase.from('users').select('id').limit(1);
        const latency = Date.now() - start;

        if (connErr) {
            log('Conexão Supabase', `Erro: ${connErr.message}`, 'FAIL');
        } else {
            log('Conexão Supabase', `Latência: ${latency}ms. Banco respondendo.`, 'SUCCESS');
        }

        // 2. Schema Check
        for (const table of TABLES_TO_SCAN) {
            const { error: structErr } = await supabase.from(table.name).select(table.columns.join(',')).limit(1);
            if (structErr) {
                log(`Estrutura: ${table.name}`, `Falha: ${structErr.message}`, 'FAIL');
            } else {
                log(`Estrutura: ${table.name}`, `Tabela e colunas críticas validadas.`, 'SUCCESS');
            }
        }

        // 3. Master Data Sanity
        const { count: secCount } = await supabase.from('sac_sectors').select('*', { count: 'exact', head: true });
        const { count: probCount } = await supabase.from('sac_problem_types').select('*', { count: 'exact', head: true });
        const { count: configCount } = await supabase.from('app_configs').select('*', { count: 'exact', head: true });

        if (!secCount || !probCount || !configCount) {
             log('Sanidade do Sistema', 'Configurações globais incompletas ou vazias.', 'FAIL');
        } else {
             log('Sanidade do Sistema', `Master Data validado (${secCount} setores, ${configCount} chaves).`, 'SUCCESS');
        }

        // 4. Storage Check (Optional)
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            const avatarBucket = buckets?.find(b => b.name === 'avatars' || b.name === 'uploads' || b.name === 'profiles');
            if (!avatarBucket) {
                log('Storage: Bucket de Arquivos', `Opcional: Nenhum bucket de uploads configurado.`, 'SUCCESS');
            } else {
                log('Storage: Bucket de Arquivos', `Bucket "${avatarBucket.name}" acessível.`, 'SUCCESS');
            }
        } catch(e) {
            log('Storage: Bucket de Arquivos', `Erro ao acessar Storage (Opcional).`, 'SUCCESS');
        }

    } catch (err) {
        log('Diagnóstico Crítico', err.message, 'FAIL');
    }

    const healthScore = Math.round((successCount / (successCount + failCount)) * 100);

    return {
        results,
        summary: { success: successCount, fail: failCount },
        healthScore,
        timestamp: new Date().toISOString()
    };
};

/**
 * Persists the successful weekly diagnostic record to the database
 */
export const saveGlobalWeeklyDiagnostic = async (weekKey, healthScore) => {
    try {
        const { error } = await supabase
            .from('app_configs')
            .upsert({ 
                config_key: 'last_weekly_diagnostic', 
                config_value: JSON.stringify({ weekKey, healthScore, date: new Date().toISOString() }) 
            }, { onConflict: 'config_key' });
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro ao salvar diagnóstico global:', err);
        return false;
    }
};

/**
 * Checks if the weekly diagnostic has already been performed globally
 */
export const checkGlobalWeeklyDiagnostic = async (currentWeekKey) => {
    try {
        const { data, error } = await supabase
            .from('app_configs')
            .select('config_value')
            .eq('config_key', 'last_weekly_diagnostic')
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return false;

        const config = typeof data.config_value === 'string' ? JSON.parse(data.config_value) : data.config_value;
        return config?.weekKey === currentWeekKey;
    } catch (err) {
        console.error('Erro ao consultar diagnóstico global:', err);
        return false;
    }
};

/**
 * Logs a runtime error to the database for future diagnosis
 */
export const logRuntimeError = async (errorInfo) => {
    try {
        const { error } = await supabase
            .from('app_error_logs')
            .insert([{
                error_name: errorInfo.name || 'Error',
                error_message: errorInfo.message,
                error_stack: errorInfo.stack,
                component_stack: errorInfo.componentStack,
                user_id: errorInfo.userId,
                user_email: errorInfo.userEmail,
                path: window.location.pathname,
                metadata: errorInfo.metadata || {},
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Falha ao registrar log de erro:', err);
        return false;
    }
};

/**
 * Fetches the most recent runtime errors for the diagnostic view
 */
export const fetchRuntimeErrors = async (limit = 50) => {
    try {
        const { data, error } = await supabase
            .from('app_error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Erro ao buscar logs de erro:', err);
        return [];
    }
};
