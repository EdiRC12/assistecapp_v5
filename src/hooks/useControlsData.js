import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

export const useControlsData = (currentUser, activeTab, selectedMonth, selectedYear, stockStatusFilter, tasks, testStatusPresets = []) => {
    const [loading, setLoading] = useState(false);
    const [tests, setTests] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [adjustmentLogs, setAdjustmentLogs] = useState([]);
    const [registeredClients, setRegisteredClients] = useState([]);
    
    // Pagination States
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    const fetchData = async (loadMore = false) => {
        if (!activeTab) return;
        setLoading(true);
        
        const currentPage = loadMore ? page + 1 : 0;
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        try {
            let startDate = null;
            let endDate = null;

            if (selectedYear !== 'ALL') {
                if (selectedMonth !== 'ALL') {
                    startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
                    endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
                } else {
                    startDate = new Date(selectedYear, 0, 1).toISOString();
                    endDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
                }
            }

            if (['tests', 'inventory', 'costs', 'inventory_check', 'adjustment_logs'].includes(activeTab)) {
                let testsQuery = supabase.from('tech_tests')
                    .select('id, created_at, updated_at, user_id, client_name, title, description, status, status_color, extra_data, metadata, converted_task_id, produced_quantity, quantity_billed, op_cost, unit_cost, gross_total_cost, unit, consumed_stock_id, test_order, op_number, product_name, nf_number, delivery_date, situation, flow_stage, stock_destination, volumes, test_number')
                    .order('created_at', { ascending: false })
                    .range(from, to);

                let invQuery = supabase.from('ee_inventory')
                    .select('id, created_at, updated_at, user_id, name, description, quantity, unit, location, stock_bin, test_id, client_name, op, pedido, qty_produced, qty_billed, production_cost, status, inventory_adjustment, last_inventory_at, justification_reason, justified_at, volumes, is_checked')
                    .order('created_at', { ascending: false })
                    .range(from, to);

                let logQuery = supabase.from('inventory_adjustments_log')
                    .select(`
                        id, 
                        created_at, 
                        inventory_item_id, 
                        prev_qty, 
                        new_qty, 
                        difference, 
                        reason, 
                        related_test_id,
                        test_reference,
                        user_id(username)
                    `)
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (startDate && endDate) {
                    testsQuery = testsQuery.gte('created_at', startDate).lte('created_at', endDate);
                    logQuery = logQuery.gte('created_at', startDate).lte('created_at', endDate);
                }

                if (activeTab === 'inventory') {
                    if (startDate && endDate) {
                        invQuery = invQuery.gte('created_at', startDate).lte('created_at', endDate);
                    }
                }

                const [testsRes, invRes, logsRes] = await Promise.all([
                    testsQuery,
                    invQuery,
                    logQuery
                ]);

                // Update Data
                if (loadMore) {
                    if (activeTab === 'tests' || activeTab === 'costs') setTests(prev => [...prev, ...(testsRes.data || [])]);
                    if (activeTab === 'inventory') setInventory(prev => [...prev, ...(invRes.data || [])]);
                    if (activeTab === 'adjustment_logs') setAdjustmentLogs(prev => [...prev, ...(logsRes.data || [])]);
                    setPage(currentPage);
                } else {
                    setTests(testsRes.data || []);
                    setInventory(invRes.data || []);
                    setAdjustmentLogs(logsRes.data || []);
                    setPage(0);
                }

                // Check if has more
                const currentDataCount = activeTab === 'inventory' ? (invRes.data?.length || 0) : 
                                       activeTab === 'adjustment_logs' ? (logsRes.data?.length || 0) : 
                                       (testsRes.data?.length || 0);
                setHasMore(currentDataCount === PAGE_SIZE);

            }

            const { data: clientList } = await supabase.from('clients').select('name');
            setRegisteredClients(clientList || []);
        } catch (error) {
            console.error('Error fetching controls data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab) fetchData();
    }, [activeTab, selectedMonth, selectedYear, stockStatusFilter]);

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);

                    if (data.length > 0) {
                        const bulkData = data.map(row => {
                            const title = row.Objetivo || row.Titulo || row.title || row.Assunto || `Teste de ${row.Cliente || 'Diversos'} `;
                            const client = row.Cliente || row.client || 'Diversos';
                            const desc = row.Obs || row.Descricao || row.description || '';

                            const pedido = row.Pedido ? row.Pedido.toString() : '';
                            const op = row.OP ? row.OP.toString() : '';
                            const prodName = row.Produto || row.produto || '';
                            const nf = row['Nº'] || row.NF || row.nf || '';
                            const situacao = row.Situação || row.situacao || '';
                            let fluxo = row.Fase || row.fase || row.Fluxo || row.fluxo || '';

                            // Lidar com data do Excel serializada
                            let dataEntrega = null;
                            if (row.Entrega) {
                                if (typeof row.Entrega === 'number') {
                                    // Excel days since 1900
                                    const date = new Date((row.Entrega - (25567 + 1)) * 86400 * 1000);
                                    dataEntrega = date.toISOString().split('T')[0];
                                } else {
                                    dataEntrega = row.Entrega;
                                }
                            }

                            const qtyProduced = parseFloat(row['Quantidade Produzida'] || row.Produzido || 0);
                            const opCost = parseFloat(row['Custo/OP'] || row['Custo / OP'] || row.Custo || 0);
                            const costKg = parseFloat(row['Custo KG'] || row['Custo Unitario'] || 0);
                            const grossCost = parseFloat(row['Custo Total Bruto'] || row['Custo Total'] || 0);

                            const finalUnitCost = costKg || (qtyProduced > 0 ? opCost / qtyProduced : 0);
                            const finalGrossCost = grossCost || opCost;

                            const {
                                Objetivo, Titulo, title: t, Assunto, Cliente, client: c, Obs, Descricao, description: d,
                                Pedido, OP, Produto, 'Nº': num, NF, nf: n, Situação, situacao: s, Fase, fase: f, Fluxo, fluxo: fl, Entrega,
                                'Quantidade Produzida': qp, Produzido, 'Custo/OP': cop, 'Custo / OP': cop2, Custo,
                                'Custo KG': ckg, 'Custo Unitario': cu, 'Custo Total Bruto': ctb, 'Custo Total': ct,
                                ...extra
                            } = row;

                            // Auto-Sincronização Lógica Excel
                            let materialEnviado = 'NÃO';
                            if (nf) {
                                materialEnviado = 'SIM';
                                if (!fluxo || fluxo.toString().toUpperCase() !== 'FATURADO') {
                                    fluxo = 'FATURADO';
                                }
                            }

                            let mappedStatus = (row.Status || row.status || 'AGUARDANDO RETORNO DO CLIENTE').toString().toUpperCase();
                            let mappedColor = '#eab308';

                            const situationMapping = (txt) => {
                                const upper = txt.toString().toUpperCase().trim();

                                // Mapeamentos especiais de legado
                                let searchLabel = upper;
                                if (upper === 'CONCLUIDO' || upper === 'CONCLUÍDO') searchLabel = 'APROVADO';
                                if (upper === 'AGUARDANDO') searchLabel = 'AGUARDANDO RETORNO DO CLIENTE';

                                // Tentar encontrar no preset dinâmico
                                const found = testStatusPresets.find(p => p.label === searchLabel);
                                if (found) return found;

                                // Fallback se não encontrar
                                return { label: searchLabel, color: '#94a3b8' };
                            };

                            if (situacao) {
                                const result = situationMapping(situacao);
                                mappedStatus = result.label;
                                mappedColor = result.color;
                            } else {
                                const result = situationMapping(mappedStatus);
                                mappedStatus = result.label;
                                mappedColor = result.color;
                            }

                            return {
                                title: title.toString(),
                                client_name: client.toString(),
                                description: desc.toString(),
                                user_id: currentUser.id,
                                status: mappedStatus,
                                status_color: mappedColor,

                                test_order: pedido,
                                op_number: op,
                                product_name: prodName,
                                nf_number: nf?.toString() || '',
                                situation: situacao?.toString() || '',
                                flow_stage: fluxo?.toString().toUpperCase() || '',
                                delivery_date: dataEntrega,

                                produced_quantity: qtyProduced,
                                op_cost: opCost,
                                unit_cost: finalUnitCost,
                                gross_total_cost: finalGrossCost,

                                extra_data: { ...extra, material_enviado: materialEnviado, nf_nota: nf?.toString() || '' }
                            };
                        });

                        const { error } = await supabase.from('tech_tests').insert(bulkData);
                        if (error) throw error;

                        await fetchData();
                        resolve(bulkData.length);
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    const handleDelete = async (table, id) => {
        if (!window.confirm('Tem certeza que deseja excluir?')) return false;

        try {
            if (table === 'tech_tests') {
                const { data: testToDelete } = await supabase.from('tech_tests').select('*').eq('id', id).maybeSingle();
                if (testToDelete) {
                    if (testToDelete.consumed_stock_id) {
                        const { data: donorItem } = await supabase.from('ee_inventory').select('quantity').eq('id', testToDelete.consumed_stock_id).maybeSingle();
                        if (donorItem) {
                            const restoredQty = parseFloat((donorItem.quantity + (testToDelete.quantity_produced || 0)).toFixed(2));
                            await supabase.from('ee_inventory').update({ quantity: restoredQty }).eq('id', testToDelete.consumed_stock_id);
                        }
                    }
                    await supabase.from('ee_inventory').delete().eq('test_id', id);
                }
            }

            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;

            await fetchData();
            return true;
        } catch (err) {
            console.error('Error deleting record:', err);
            throw err;
        }
    };

    // --- REAL-TIME SYNC ---
    useEffect(() => {
        if (!activeTab || !supabase) return;

        const channel = supabase
            .channel('controls_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tech_tests' },
                (payload) => {
                    console.log('[Real-time] tech_tests:', payload);
                    if (payload.eventType === 'INSERT') setTests(prev => [payload.new, ...prev]);
                    else if (payload.eventType === 'UPDATE') setTests(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
                    else if (payload.eventType === 'DELETE') setTests(prev => prev.filter(t => t.id === payload.old.id));
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ee_inventory' },
                (payload) => {
                    console.log('[Real-time] ee_inventory:', payload);
                    if (payload.eventType === 'INSERT') setInventory(prev => [payload.new, ...prev]);
                    else if (payload.eventType === 'UPDATE') setInventory(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
                    else if (payload.eventType === 'DELETE') setInventory(prev => prev.filter(i => i.id === payload.old.id));
                }
            )

            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTab]);

    return {
        loading,
        setLoading,
        tests,
        setTests,
        inventory,
        setInventory,
        adjustmentLogs,
        setAdjustmentLogs,
        registeredClients,
        setRegisteredClients,
        hasMore,
        fetchData,
        handleExcelUpload,
        handleDelete
    };
};
