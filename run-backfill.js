import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxhhjyyjwhlnqcystbqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aGhqeXlqd2hsbnFjeXN0YnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODE4NjAsImV4cCI6MjA4OTI1Nzg2MH0.Tp07Pg9CMZrOUglInBJ8Ir6G2Z16fgw6HyQxVrq7U-Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function backfill() {
  console.log("=== INICIANDO CARGA HISTÓRICA DO ESTOQUE (BACKFILL) ===");
  
  // 1. Buscar todos os testes
  const { data: tests, error: errTests } = await supabase.from('tech_tests').select('*');
  if (errTests) {
    console.error("Erro ao buscar testes:", errTests);
    return;
  }
  
  console.log(`Foram encontrados ${tests.length} testes para processamento.`);
  
  // 2. Buscar inventário atual para mapeamento
  const { data: currentInventory, error: errInv } = await supabase.from('ee_inventory').select('*');
  if (errInv) {
    console.error("Erro ao buscar inventário atual:", errInv);
    return;
  }
  
  console.log(`Há atualmente ${currentInventory.length} itens no ee_inventory.`);

  let successCount = 0;
  let skipCount = 0;

  for (const test of tests) {
    const qtyProduced = test.produced_quantity || 0;
    
    // Se não teve produção, garante que não tem item correspondente no estoque (limpeza)
    if (qtyProduced <= 0) {
      const existing = currentInventory.find(i => i.test_id === test.id);
      if (existing) {
        console.log(`[-] Removendo do estoque: Teste "${test.title}" (ID: ${test.id}) - Produção zero.`);
        await supabase.from('ee_inventory').delete().eq('id', existing.id);
      }
      skipCount++;
      continue;
    }
    
    // Calcular consumo por outros testes (reuso)
    const reuses = tests.filter(t => t.consumed_stock_id && String(t.consumed_stock_id) === String(test.id));
    const totalConsumed = reuses.reduce((sum, t) => sum + (t.produced_quantity || 0), 0);
    
    const qtyBilled = test.quantity_billed || 0;
    const qtyDiscarded = test.quantity_discarded || 0;
    
    const calcBalance = qtyProduced - qtyBilled - qtyDiscarded - totalConsumed;
    
    // Buscar se já tem item no estoque para pegar o ajuste manual de inventário
    const existingStock = currentInventory.find(i => i.test_id === test.id);
    const adjustment = existingStock?.inventory_adjustment || 0;
    const finalBalance = parseFloat((calcBalance + adjustment).toFixed(2));
    
    // Mapear Depósito
    const targetBin = test.stock_destination || 'ESTOQUE 0';
    
    // Mapear Volumes Faturados
    const shipments = test.extra_data?.shipments || [];
    const volsBilled = shipments.length > 0 
        ? shipments.reduce((sum, s) => sum + (parseInt(s.volumes) || 0), 0)
        : (parseInt(test.extra_data?.volumes_faturados) || 0);
    const remainingVolumes = Math.max(0, (parseInt(test.volumes) || 0) - volsBilled);
    
    // Mapear Status
    let stockStatus = 'ACTIVE';
    if (test.stock_destination === 'DISCARDED' || test.status === 'DESCARTADO') {
        stockStatus = 'DISCARDED';
    } else if (finalBalance <= 0) {
        stockStatus = 'BILLED';
    }
    
    // Calcular Custo
    const unitCost = qtyProduced > 0 ? (test.op_cost || test.gross_total_cost || 0) / qtyProduced : 0;
    const assetValue = parseFloat((unitCost * Math.max(0, finalBalance)).toFixed(2));
    
    const stockPayload = {
        user_id: test.user_id,
        name: `ITEM: ${test.title}`,
        description: `Saldo gerado via teste de engenharia.`,
        quantity: (stockStatus === 'DISCARDED' || stockStatus === 'BILLED') ? 0 : Math.max(0, finalBalance),
        unit: test.unit || 'KG',
        location: 'Depósito Engenharia',
        stock_bin: targetBin,
        test_id: test.id,
        client_name: test.client_name,
        op: test.extra_data?.OP || test.op_number || '',
        pedido: test.extra_data?.PEDIDO || test.test_order || '',
        qty_produced: qtyProduced,
        qty_billed: qtyBilled,
        quantity_discarded: qtyDiscarded,
        volumes: (stockStatus === 'DISCARDED' || stockStatus === 'BILLED') ? 0 : remainingVolumes,
        production_cost: assetValue,
        status: stockStatus,
        updated_at: new Date().toISOString()
    };
    
    if (existingStock) {
        console.log(`[~] Atualizando estoque para: "${test.title}" (ID: ${test.id}) -> Status: ${stockStatus}, Saldo: ${stockPayload.quantity} KG, Volumes: ${stockPayload.volumes}`);
        const { error: updErr } = await supabase.from('ee_inventory').update(stockPayload).eq('id', existingStock.id);
        if (updErr) {
            console.error(`Erro ao atualizar item ${existingStock.id}:`, updErr);
        } else {
            successCount++;
        }
    } else {
        console.log(`[+] Inserindo no estoque: "${test.title}" (ID: ${test.id}) -> Status: ${stockStatus}, Saldo: ${stockPayload.quantity} KG, Volumes: ${stockPayload.volumes}`);
        const { error: insErr } = await supabase.from('ee_inventory').insert(stockPayload);
        if (insErr) {
            console.error(`Erro ao inserir item para teste ${test.id}:`, insErr);
        } else {
            successCount++;
        }
    }
  }
  
  console.log(`=== CARGA CONCLUÍDA! SUCESSO: ${successCount}, IGNORADOS/ZERO: ${skipCount} ===`);
}

backfill();
