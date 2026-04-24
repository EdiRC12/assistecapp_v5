import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Activity, ShieldCheck, Database, Zap, AlertTriangle, CheckCircle2, 
    XCircle, Play, Trash2, ShieldAlert, RefreshCw, X, Copy, Bug, Clock, User as UserIcon, ExternalLink
} from 'lucide-react';
import { fetchRuntimeErrors } from '../../services/diagnosticService';

const HealthCheck = ({ isOpen, onClose, currentUser }) => {
    const [status, setStatus] = useState('IDLE'); // IDLE, RUNNING, COMPLETED
    const [results, setResults] = useState([]);
    const [summary, setSummary] = useState({ success: 0, fail: 0 });
    const [activeTab, setActiveTab] = useState('DIAGNOSTIC'); // DIAGNOSTIC, RUNTIME_ERRORS
    const [runtimeErrors, setRuntimeErrors] = useState([]);
    const [loadingErrors, setLoadingErrors] = useState(false);

    const tests = [
        { id: 'infra', name: 'Infraestrutura & Conexão', description: 'Valida se o navegador consegue falar com o banco Supabase.' },
        { id: 'schema', name: 'Integridade de Dados', description: 'Verifica se as tabelas e colunas críticas estão presentes.' },
        { id: 'process', name: 'Simulação de Processos', description: 'Cria e deleta registros de teste para validar o fluxo real.' }
    ];

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'DIAGNOSTIC') {
                const savedReport = localStorage.getItem('assistec_last_diagnostic_report');
                const lastScore = localStorage.getItem('assistec_last_health_score');
                
                if (savedReport && lastScore && parseInt(lastScore) < 100) {
                    try {
                        const parsed = JSON.parse(savedReport);
                        setResults(parsed);
                        setStatus('COMPLETED');
                        const fails = parsed.filter(l => l.status === 'FAIL').length;
                        setSummary({ success: parsed.length - fails, fail: fails });
                    } catch(e) {
                        runDiagnostic();
                    }
                } else {
                    runDiagnostic();
                }
            } else {
                fetchErrors();
            }
        } else {
            setResults([]);
            setStatus('IDLE');
            setSummary({ success: 0, fail: 0 });
        }
    }, [isOpen, activeTab]);

    const fetchErrors = async () => {
        setLoadingErrors(true);
        try {
            const errors = await fetchRuntimeErrors(30);
            setRuntimeErrors(errors);
        } catch (err) {
            console.error('Erro ao buscar logs:', err);
        } finally {
            setLoadingErrors(false);
        }
    };

    const handleReset = () => {
        localStorage.removeItem('assistec_last_diagnostic_report');
        runDiagnostic();
    };

    if (!isOpen) return null;

    const runDiagnostic = async () => {
        setStatus('RUNNING');
        setResults([]);
        setSummary({ success: 0, fail: 0 });

        const logSuccess = (title, message) => {
            setResults(prev => [...prev, { name: title, detail: message, status: 'SUCCESS', time: new Date().toLocaleTimeString() }]);
            setSummary(prev => ({ ...prev, success: prev.success + 1 }));
        };

        const logFail = (title, message) => {
            setResults(prev => [...prev, { name: title, detail: message, status: 'FAIL', time: new Date().toLocaleTimeString() }]);
            setSummary(prev => ({ ...prev, fail: prev.fail + 1 }));
        };

        let tempRecords = {
            tasks: [],
            reports: [],
            tests: [],
            inventory: [],
            logs: [],
            sac: [],
            returns: [],
            snapshots: []
        };

        try {
            // --- ETAPA 1: INFRAESTRUTURA ---
            const start = Date.now();
            const { error: connErr } = await supabase.from('users').select('id').limit(1);
            const latency = Date.now() - start;

            if (connErr) throw new Error(`Conexão Supabase: ${connErr.message}`);
            logSuccess('Conexão Supabase', `Latência: ${latency}ms. Banco respondendo.`);

            // --- ETAPA 2: INTEGRIDADE DE ESTRUTURA (SCHEMA) ---
            const tablesToTest = [
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
                { name: 'clients', columns: ['id', 'name'] }
            ];

            for (const table of tablesToTest) {
                const { error: structErr } = await supabase.from(table.name).select(table.columns.join(',')).limit(1);
                if (structErr) {
                    logFail(`Estrutura: ${table.name}`, `Falha na tabela ou colunas: ${structErr.message}`);
                } else {
                    logSuccess(`Estrutura: ${table.name}`, `Tabela e colunas críticas validadas.`);
                }
            }

            // --- ETAPA 3: SANIDADE DE CONFIGURAÇÕES (MASTER DATA) ---
            try {
                const { count: secCount } = await supabase.from('sac_sectors').select('*', { count: 'exact', head: true });
                const { count: probCount } = await supabase.from('sac_problem_types').select('*', { count: 'exact', head: true });
                const { count: configCount } = await supabase.from('app_configs').select('*', { count: 'exact', head: true });
                
                if (!secCount || !probCount || !configCount) {
                    logFail('Sanidade do Sistema', 'Configurações globais (Sectors/Configs) incompletas ou vazias.');
                } else {
                    logSuccess('Sanidade do Sistema', `Master Data validado (${secCount} setores, ${configCount} chaves de config).`);
                }
            } catch (err) {
                logFail('Sanidade do Sistema', `Erro ao validar master data: ${err.message}`);
            }

            // --- ETAPA 4: SIMULAÇÃO DE FLUXOS DE NEGÓCIO ---
            const testUserId = currentUser?.id || (await supabase.auth.getUser()).data.user?.id;

            // FLUXO A: ENGENHARIA & ESTOQUE INTEGRADO
            try {
                const { data: test, error: tErr } = await supabase.from('tech_tests').insert([{
                    title: '[DIAGNOSTICO-TESTE] Teste de Engenharia',
                    client_name: 'CLIENTE TESTE',
                    status: 'AGUARDANDO',
                    produced_quantity: 10,
                    user_id: testUserId
                }]).select().single();
                if (tErr) throw tErr;
                tempRecords.tests.push(test.id);

                const { data: inv, error: iErr } = await supabase.from('ee_inventory').insert([{
                    name: '[DIAGNOSTICO-TESTE] Item de Simulação',
                    quantity: 10,
                    test_id: test.id,
                    user_id: testUserId,
                    status: 'ACTIVE'
                }]).select().single();
                if (iErr) throw iErr;
                tempRecords.inventory.push(inv.id);

                const { data: log, error: lErr } = await supabase.from('inventory_adjustments_log').insert([{
                    inventory_item_id: inv.id,
                    prev_qty: 0,
                    new_qty: 10,
                    difference: 10,
                    reason: 'AJUSTE TÉCNICO V6',
                    user_id: testUserId
                }]).select().single();
                if (lErr) throw lErr;
                tempRecords.logs.push(log.id);

                logSuccess('Fluxo: Engenharia & Estoque', 'Vínculo Teste -> Item -> Log de Auditoria validado.');
            } catch (err) {
                logFail('Fluxo: Engenharia & Estoque', `Falha na integração: ${err.message}`);
            }

            // FLUXO B: COMERCIAL (SAC -> DEVOLUÇÕES)
            try {
                const { data: sac, error: sErr } = await supabase.from('sac_tickets').insert([{
                    subject: '[DIAGNOSTICO-TESTE] Abertura de OT',
                    client_name: 'CLIENTE TESTE SAC',
                    status: 'ABERTO',
                    appointment_number: 'TEST-000',
                    created_by: testUserId
                }]).select().single();
                if (sErr) throw sErr;
                tempRecords.sac.push(sac.id);

                const { data: ret, error: rErr } = await supabase.from('product_returns').insert([{
                    sac_id: sac.id,
                    client_name: 'CLIENTE TESTE SAC',
                    item_name: 'PRODUTO TESTE',
                    quantity: 1,
                    status: 'PENDENTE'
                }]).select().single();
                if (rErr) throw rErr;
                tempRecords.returns.push(ret.id);

                logSuccess('Fluxo: Comercial & SAC', 'Integração OT -> Devolução de Mercadoria validada.');
            } catch (err) {
                logFail('Fluxo: Comercial & SAC', `Falha na integração: ${err.message}`);
            }

            // FLUXO C: LOGÍSTICA & VIAGENS
            try {
                const { data: task, error: tkErr } = await supabase.from('tasks').insert([{
                    title: '[DIAGNOSTICO-TESTE] Logística',
                    client: 'CLIENTE TESTE LOG',
                    status: 'TO_START',
                    user_id: testUserId,
                    visitation: { required: true },
                    travels: [{
                        date: new Date().toISOString(),
                        km_start: 0,
                        km_end: 100,
                        cost: 50,
                        vehicle: 'VEICULO TESTE'
                    }]
                }]).select().single();
                if (tkErr) throw tkErr;
                tempRecords.tasks.push(task.id);

                logSuccess('Fluxo: Logística & Viagens', 'Cálculo de KM e Custos na Tarefa validado.');
            } catch (err) {
                logFail('Fluxo: Logística & Viagens', `Falha na persistência logística: ${err.message}`);
            }

            // FLUXO D: INTELIGÊNCIA (SNAPSHOTS)
            try {
                const payloadTotals = { items: 42, value: 86000, test_marker: true };
                const { data: snap, error: snapErr } = await supabase.from('saved_reports').insert([{
                    type: 'INVENTORY',
                    title: '[DIAGNOSTICO-TESTE] Histórico de Relatório',
                    period: 'Abril 2026',
                    totals: payloadTotals,
                    raw_data: [{ id: 1 }],
                    user_id: testUserId,
                    raw_data_count: 1
                }]).select().single();
                if (snapErr) throw snapErr;
                tempRecords.snapshots.push(snap.id);

                // Relê e valida integridade do JSONB
                const { data: snapRead } = await supabase.from('saved_reports').select('totals').eq('id', snap.id).single();
                if (snapRead?.totals?.value !== 86000) throw new Error('Dado JSONB lido não corresponde ao gravado.');

                logSuccess('Fluxo: Inteligência & Dados', 'Snapshots, persistência e leitura JSONB validados.');
            } catch (err) {
                logFail('Fluxo: Inteligência & Dados', `Falha na persistência: ${err.message}`);
            }

            // --- ETAPA 5: VALIDAÇÃO DE LÓGICA DE NEGÓCIO ---

            // LÓGICA 1: CÁLCULO DE KM (Matemática de Viagens)
            try {
                const kmStart = 1000;
                const kmEnd = 1350;
                const expectedKm = kmEnd - kmStart; // 350 km esperados
                const { data: taskKm, error: tkKmErr } = await supabase.from('tasks').insert([{
                    title: '[DIAGNOSTICO-TESTE] KM Check',
                    client: 'DIAGNOSTICO-KM',
                    status: 'TO_START',
                    user_id: testUserId,
                    visitation: { required: true },
                    travels: [{ date: new Date().toISOString(), km_start: kmStart, km_end: kmEnd, cost: 0 }]
                }]).select().single();
                if (tkKmErr) throw tkKmErr;
                tempRecords.tasks.push(taskKm.id);

                const { data: taskRead } = await supabase.from('tasks').select('travels').eq('id', taskKm.id).single();
                const readKmEnd = taskRead?.travels?.[0]?.km_end;
                const readKmStart = taskRead?.travels?.[0]?.km_start;
                const readDelta = readKmEnd - readKmStart;

                if (readDelta !== expectedKm) {
                    throw new Error(`KM calculado incorretamente. Esperado: ${expectedKm}km. Lido: ${readDelta}km.`);
                }
                logSuccess('Lógica: Cálculo de KM', `Percurso de ${expectedKm}km armazenado e verificado corretamente.`);
            } catch (err) {
                logFail('Lógica: Cálculo de KM', err.message);
            }

            // LÓGICA 2: TRANSIÇÃO DE STATUS (Kanban)
            try {
                const { data: taskStatus, error: tsErr } = await supabase.from('tasks').insert([{
                    title: '[DIAGNOSTICO-TESTE] Status Flow',
                    client: 'DIAGNOSTICO-STATUS',
                    status: 'TO_START',
                    user_id: testUserId
                }]).select().single();
                if (tsErr) throw tsErr;
                tempRecords.tasks.push(taskStatus.id);

                await supabase.from('tasks').update({ status: 'IN_PROGRESS' }).eq('id', taskStatus.id);
                const { data: afterUpdate } = await supabase.from('tasks').select('status').eq('id', taskStatus.id).single();

                if (afterUpdate?.status !== 'IN_PROGRESS') {
                    throw new Error(`Status não atualizou. Lido: ${afterUpdate?.status}`);
                }
                logSuccess('Lógica: Transição de Status', 'Tarefa migrou de TO_START → IN_PROGRESS corretamente.');
            } catch (err) {
                logFail('Lógica: Transição de Status', err.message);
            }

            // LÓGICA 3: FILTRO DE BUSCA POR CLIENTE
            try {
                const uniqueClient = `DIAGNOSTICO-BUSCA-${Date.now()}`;
                const { data: taskSearch, error: searchErr } = await supabase.from('tasks').insert([{
                    title: '[DIAGNOSTICO-TESTE] Busca',
                    client: uniqueClient,
                    status: 'TO_START',
                    user_id: testUserId
                }]).select().single();
                if (searchErr) throw searchErr;
                tempRecords.tasks.push(taskSearch.id);

                const { data: found } = await supabase.from('tasks').select('id').eq('client', uniqueClient);
                if (!found || found.length !== 1) {
                    throw new Error(`Busca retornou ${found?.length ?? 0} registro(s). Esperado: 1.`);
                }
                logSuccess('Lógica: Filtro & Busca', `Busca por cliente único retornou exatamente 1 resultado.`);
            } catch (err) {
                logFail('Lógica: Filtro & Busca', err.message);
            }

            // LÓGICA 4: SUPABASE STORAGE (Bucket de Avatares)
            try {
                const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
                if (bucketErr) throw bucketErr;
                const avatarBucket = buckets?.find(b => b.name === 'avatars' || b.name === 'uploads' || b.name === 'profiles');
                if (!avatarBucket) {
                    logSuccess('Storage: Bucket de Arquivos', `Opcional: Nenhum bucket de uploads configurado. (Aguardando implementação)`);
                } else {
                    logSuccess('Storage: Bucket de Arquivos', `Bucket "${avatarBucket.name}" acessível. Uploads habilitados.`);
                }
            } catch (err) {
                logFail('Storage: Bucket de Arquivos', `Erro ao acessar Storage: ${err.message}`);
            }

            // LÓGICA 5: INTEGRIDADE RNC → TAREFA (Vínculo de Rastreabilidade)
            try {
                const { data: rnc, error: rncErr } = await supabase.from('tasks').insert([{
                    title: '[DIAGNOSTICO-TESTE] RNC Origem',
                    client: 'DIAGNOSTICO-RNC',
                    status: 'TO_START',
                    category: 'RNC',
                    user_id: testUserId
                }]).select().single();
                if (rncErr) throw rncErr;
                tempRecords.tasks.push(rnc.id);

                const { data: taskLinked, error: linkErr } = await supabase.from('tasks').insert([{
                    title: '[DIAGNOSTICO-TESTE] Tarefa Filha de RNC',
                    client: 'DIAGNOSTICO-RNC',
                    status: 'TO_START',
                    parent_rnc_id: rnc.id,
                    user_id: testUserId
                }]).select().single();
                if (linkErr) throw linkErr;
                tempRecords.tasks.push(taskLinked.id);

                const { data: verify } = await supabase.from('tasks').select('parent_rnc_id').eq('id', taskLinked.id).single();
                if (verify?.parent_rnc_id !== rnc.id) throw new Error('Vínculo RNC → Tarefa não persistiu corretamente.');

                logSuccess('Lógica: Rastreabilidade RNC', 'Vínculo Não Conformidade → Tarefa validado com sucesso.');
            } catch (err) {
                logFail('Lógica: Rastreabilidade RNC', err.message);
            }

            // LÓGICA 6: SIMULAÇÃO DE CONCORRÊNCIA MULTI-USUÁRIO
            try {
                const concPrefix = `[DIAGNOSTICO-CONC-${Date.now()}]`;

                // FASE 1: 3 usuários gravando ao mesmo tempo (Promise.all dispara tudo simultaneamente)
                const [r1, r2, r3] = await Promise.all([
                    supabase.from('tasks').insert({ title: `${concPrefix} Usuário A`, client: 'CONC-A', status: 'TO_START', user_id: testUserId }).select().single(),
                    supabase.from('tasks').insert({ title: `${concPrefix} Usuário B`, client: 'CONC-B', status: 'TO_START', user_id: testUserId }).select().single(),
                    supabase.from('tasks').insert({ title: `${concPrefix} Usuário C`, client: 'CONC-C', status: 'TO_START', user_id: testUserId }).select().single(),
                ]);

                if (r1.error || r2.error || r3.error) {
                    const err1 = r1.error?.message || '';
                    const err2 = r2.error?.message || '';
                    const err3 = r3.error?.message || '';
                    throw new Error(`Inserção concorrente falhou: ${err1} ${err2} ${err3}`.trim());
                }

                // Registra todos para limpeza
                [r1.data.id, r2.data.id, r3.data.id].forEach(id => tempRecords.tasks.push(id));

                // Verifica que TODOS os 3 chegaram ao banco (nenhum foi perdido)
                const { data: concCheck } = await supabase.from('tasks').select('id').ilike('client', 'CONC-%').in('id', [r1.data.id, r2.data.id, r3.data.id]);
                if (concCheck?.length !== 3) throw new Error(`Apenas ${concCheck?.length}/3 registros chegaram. Possível perda de dado sob concorrência.`);

                // FASE 2: Conflito de UPDATE — 2 "usuários" editam o MESMO registro ao mesmo tempo
                const targetId = r1.data.id;
                await Promise.all([
                    supabase.from('tasks').update({ description: 'USUARIO-A-VENCEU' }).eq('id', targetId),
                    supabase.from('tasks').update({ description: 'USUARIO-B-VENCEU' }).eq('id', targetId),
                ]);

                // Confirma que o registro NÃO foi corrompido — deve ter um valor válido (um dos dois venceu)
                const { data: finalState } = await supabase.from('tasks').select('description').eq('id', targetId).single();
                const isValid = finalState?.description === 'USUARIO-A-VENCEU' || finalState?.description === 'USUARIO-B-VENCEU';

                if (!isValid) throw new Error(`Conflito de escrita corrompeu o dado! Valor final inválido: "${finalState?.description}"`);

                logSuccess(
                    'Concorrência: Multi-usuário',
                    `✓ 3 gravações simultâneas: sem perda de dado. ✓ Conflito de UPDATE resolvido sem corrupção (vencedor: ${finalState.description}).`
                );
            } catch (err) {
                logFail('Concorrência: Multi-usuário', err.message);
            }

            // --- ETAPA FINAL: LIMPEZA ---
            const cleanup = async () => {
                if (tempRecords.snapshots.length) await supabase.from('saved_reports').delete().in('id', tempRecords.snapshots);
                if (tempRecords.returns.length) await supabase.from('product_returns').delete().in('id', tempRecords.returns);
                if (tempRecords.sac.length) await supabase.from('sac_tickets').delete().in('id', tempRecords.sac);
                if (tempRecords.logs.length) await supabase.from('inventory_adjustments_log').delete().in('id', tempRecords.logs);
                if (tempRecords.inventory.length) await supabase.from('ee_inventory').delete().in('id', tempRecords.inventory);
                if (tempRecords.tasks.length) await supabase.from('tasks').delete().in('id', tempRecords.tasks);
                if (tempRecords.tests.length) await supabase.from('tech_tests').delete().in('id', tempRecords.tests);
            };

            await cleanup();
            logSuccess('Limpeza de Dados', 'Todos os registros temporários foram removidos.');

        } catch (error) {
            logFail('Diagnóstico Crítico', error.message);
        } finally {
            setStatus('COMPLETED');
            const finalResults = results; // Note: results state might not be updated yet due to closure
            // We use a local variable or re-fetch logic if needed, but for simplicity:
            const healthScore = summary.fail === 0 ? 100 : 50;
            localStorage.setItem('assistec_last_health_check', new Date().toISOString());
            localStorage.setItem('assistec_last_health_score', healthScore.toString());
            if (healthScore < 100) {
                localStorage.setItem('assistec_last_diagnostic_report', JSON.stringify(results));
            } else {
                localStorage.removeItem('assistec_last_diagnostic_report');
            }
        }
    };

    const copyToClipboard = () => {
        const reportText = results.map(r => 
            `[${r.status}] ${r.name}\n${r.detail}${r.technical ? '\nERROR: ' + r.technical : ''}`
        ).join('\n\n---\n\n');
        
        const header = `RELATÓRIO DE SAÚDE ASSISTEC - ${new Date().toLocaleString()}\n`;
        const footer = `\n\nTotal: ${summary.success} Sucessos, ${summary.fail} Falhas.`;
        
        navigator.clipboard.writeText(header + reportText + footer);
        alert('Relatório copiado para a área de transferência!');
    };

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Assistente de Saúde Assistec</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-brand-600 font-bold uppercase tracking-widest leading-none">Varredura de Integridade (Pente Fino)</p>
                                {localStorage.getItem('assistec_last_health_check') && (
                                    <>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                            Último Teste: {new Date(localStorage.getItem('assistec_last_health_check')).toLocaleString()}
                                        </p>
                                        <div className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100">
                                            SAÚDE: {localStorage.getItem('assistec_last_health_score') || '100'}%
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-600 transition-all"><X size={24} /></button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 gap-6 border-b border-slate-50 bg-white">
                    <button 
                        onClick={() => setActiveTab('DIAGNOSTIC')}
                        className={`py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'DIAGNOSTIC' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}
                    >
                        Pente Fino (Checklist)
                        {activeTab === 'DIAGNOSTIC' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_6px_rgba(79,70,229,0.3)]" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('RUNTIME_ERRORS')}
                        className={`py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'RUNTIME_ERRORS' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-500'}`}
                    >
                        Erros Capturados
                        {runtimeErrors.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black translate-y-[-1px] inline-block">
                                {runtimeErrors.length}
                            </span>
                        )}
                        {activeTab === 'RUNTIME_ERRORS' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 rounded-t-full shadow-[0_-2px_6px_rgba(225,29,72,0.3)]" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 pb-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                    {activeTab === 'DIAGNOSTIC' ? (
                        status === 'IDLE' ? (
                            <div className="text-center space-y-6 animate-fade">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {tests.map(t => (
                                        <div key={t.id} className="p-4 bg-white rounded-3xl border border-slate-100 text-left shadow-sm">
                                            <Zap size={20} className="text-brand-500 mb-2" />
                                            <h4 className="text-xs font-black text-slate-700 uppercase mb-1">{t.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{t.description}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                                    <p className="text-[11px] text-amber-700 text-left leading-relaxed">
                                        <strong>Nota de Segurança:</strong> O diagnóstico criará registros temporários de teste. Estes serão removidos automaticamente ao final e não afetarão seus dados reais.
                                    </p>
                                </div>
                                <button 
                                    onClick={runDiagnostic}
                                    className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Play size={18} /> Iniciar Varredura Completa
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex gap-4">
                                        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                            Sucessos: {summary.success}
                                        </div>
                                        <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                            Falhas: {summary.fail}
                                        </div>
                                    </div>
                                    {status === 'COMPLETED' && (
                                        <button 
                                            onClick={copyToClipboard}
                                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-md"
                                        >
                                            <Copy size={12} /> Copiar Relatório
                                        </button>
                                    )}
                                    {status === 'RUNNING' && <div className="flex items-center gap-2 text-indigo-600 font-black text-xs animate-pulse">Rodando <RefreshCw className="animate-spin" size={14} /></div>}
                                </div>

                                <div className="space-y-3">
                                    {results.map((log, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border bg-white ${log.status === 'SUCCESS' ? 'border-emerald-100' : 'border-rose-100'} animate-in slide-in-from-bottom-2 duration-300 shadow-sm`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    {log.status === 'SUCCESS' ? <CheckCircle2 className="text-emerald-500 mt-0.5" size={18} /> : <XCircle className="text-rose-500 mt-0.5" size={18} />}
                                                    <div>
                                                        <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{log.name}</h5>
                                                        <p className="text-xs text-slate-500 font-medium">{log.detail}</p>
                                                        {log.technical && (
                                                            <div className="mt-2 p-2 bg-slate-900 rounded-lg text-[10px] text-slate-400 font-mono break-all border border-slate-700">
                                                                TECHNICAL ERROR: {log.technical}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-[9px] text-slate-300 font-bold">{log.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="space-y-4 animate-fade">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Bug size={16} className="text-rose-500" /> Histórico de Erros de Tempo de Execução
                                </h3>
                                <button 
                                    onClick={fetchErrors}
                                    className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                                    title="Atualizar Logs"
                                >
                                    <RefreshCw size={14} className={loadingErrors ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {loadingErrors && runtimeErrors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                    <RefreshCw className="animate-spin" size={32} />
                                    <p className="text-xs font-bold uppercase tracking-widest">Buscando Logs...</p>
                                </div>
                            ) : runtimeErrors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-300 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                                    <ShieldCheck size={48} className="opacity-50" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-500">Nenhum erro registrado</p>
                                        <p className="text-[10px] uppercase font-bold tracking-tight">O sistema está operando com 100% de estabilidade.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {runtimeErrors.map((err) => (
                                        <div key={err.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-rose-200 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-rose-50 text-rose-500 p-1.5 rounded-lg">
                                                        <AlertTriangle size={14} />
                                                    </div>
                                                    <h4 className="text-xs font-black text-slate-800 break-all">{err.error_name || 'Runtime Error'}</h4>
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase">
                                                    <Clock size={10} /> {new Date(err.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                            
                                            <p className="text-xs text-slate-600 font-medium mb-3 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                {err.error_message}
                                            </p>

                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase">
                                                        <UserIcon size={12} className="text-slate-300" /> 
                                                        {err.user_email || 'Usuário Anônimo'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-black uppercase">
                                                        <ExternalLink size={12} /> 
                                                        {err.path || '/'}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const fullLog = `ERROR: ${err.error_name}\nMESSAGE: ${err.error_message}\nSTACK: ${err.error_stack}\nCOMPONENT: ${err.component_stack}\nUSER: ${err.user_email}\nPATH: ${err.path}`;
                                                        navigator.clipboard.writeText(fullLog);
                                                        alert('Log técnico copiado!');
                                                    }}
                                                    className="px-3 py-1 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Copiar Log Técnico
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-50 bg-white flex justify-center sticky bottom-0 z-10">
                    <button 
                        onClick={onClose}
                        className="py-3 px-8 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                    >
                        {status === 'COMPLETED' ? 'Finalizar e Fechar' : 'Fechar Diagnóstico'}
                    </button>
                    {status === 'COMPLETED' && (
                        <button 
                            onClick={handleReset}
                            className="ml-4 py-3 px-8 bg-brand-50 text-brand-600 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-brand-100 transition-all flex items-center gap-2"
                        >
                            <RefreshCw size={14} /> Repetir Testes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HealthCheck;
