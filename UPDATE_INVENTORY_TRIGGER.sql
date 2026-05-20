-- ========================================================
-- ATUALIZAÇÃO DA TRIGGER DE ESTOQUE (ENGENHARIA)
-- ========================================================
-- Execute este script completo no SQL Editor do Supabase.
-- Ele atualiza a função de sincronização para:
-- 1. Usar a coluna correta 'produced_quantity' em vez de 'quantity_produced'.
-- 2. Não deletar itens faturados (saldo 0) ou descartados do estoque.
-- 3. Definir o status correto: ACTIVE, BILLED ou DISCARDED.
-- 4. Ajustar volumes e quantidade física para 0 quando faturado ou descartado.

CREATE OR REPLACE FUNCTION fn_sync_test_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_balance DECIMAL;
    v_unit_cost DECIMAL;
    v_asset_value DECIMAL;
    v_target_bin TEXT;
    v_total_consumed DECIMAL;
    v_vols_billed INT;
    v_remaining_vols INT;
    v_status TEXT;
BEGIN
    -- 1. Calcular consumo por outros testes (Reuso de Saldo)
    SELECT COALESCE(SUM(produced_quantity), 0)
    INTO v_total_consumed
    FROM tech_tests
    WHERE consumed_stock_id IN (SELECT id FROM ee_inventory WHERE test_id = NEW.id);

    -- 2. Calcular Saldo Real em KG/Sacos
    -- Saldo = Produzido - Faturado - Descartado - Consumido por outros
    v_balance := (COALESCE(NEW.produced_quantity, 0) - COALESCE(NEW.quantity_billed, 0) - COALESCE(NEW.quantity_discarded, 0)) - v_total_consumed;
    
    -- 3. Definir Depósito/Endereço de Estoque
    IF NEW.stock_destination IS NOT NULL AND NEW.stock_destination <> '' THEN
        v_target_bin := NEW.stock_destination;
    ELSIF NEW.status IN ('REPROVADO', 'CANCELADO') THEN
        v_target_bin := 'ESTOQUE 14';
    ELSE
        v_target_bin := 'ESTOQUE 65';
    END IF;

    -- 4. Calcular Saldo de Volumes (Dedução de volumes faturados)
    IF jsonb_typeof(NEW.extra_data->'shipments') = 'array' THEN
        SELECT COALESCE(SUM(COALESCE((val->>'volumes')::numeric, 0)), 0)
        INTO v_vols_billed
        FROM jsonb_array_elements(NEW.extra_data->'shipments') val;
    ELSE
        v_vols_billed := 0;
    END IF;

    -- Fallback se volumes_faturados estiver no extra_data como texto/número direto
    IF v_vols_billed = 0 AND NEW.extra_data->>'volumes_faturados' IS NOT NULL THEN
        v_vols_billed := COALESCE((NEW.extra_data->>'volumes_faturados')::numeric, 0);
    END IF;

    v_remaining_vols := COALESCE(NEW.volumes, 0) - v_vols_billed;
    IF v_remaining_vols < 0 THEN
        v_remaining_vols := 0;
    END IF;

    -- 5. Calcular Status
    IF NEW.stock_destination = 'DISCARDED' OR NEW.status = 'DESCARTADO' OR NEW.stock_destination = 'ESTOQUE 0' AND NEW.quantity_discarded > 0 THEN
        v_status := 'DISCARDED';
    ELSIF v_balance <= 0 THEN
        v_status := 'BILLED';
    ELSE
        v_status := 'ACTIVE';
    END IF;

    -- Se o status for faturado (BILLED) ou descartado (DISCARDED), o saldo físico no estoque vira 0
    IF v_status = 'DISCARDED' OR v_status = 'BILLED' THEN
        v_balance := 0;
        v_remaining_vols := 0;
    END IF;

    -- 6. Sincronizar com ee_inventory
    IF COALESCE(NEW.produced_quantity, 0) > 0 THEN
        -- Calcular Custo Unitário
        IF NEW.produced_quantity > 0 THEN
            v_unit_cost := (COALESCE(NEW.op_cost, 0) + COALESCE(NEW.gross_total_cost, 0)) / NEW.produced_quantity;
        ELSE
            v_unit_cost := 0;
        END IF;
        
        v_asset_value := v_unit_cost * GREATEST(0, v_balance);

        INSERT INTO ee_inventory (
            test_id, name, description, quantity, unit, 
            location, stock_bin, user_id, client_name,
            qty_produced, qty_billed, production_cost, volumes, status, op, pedido, quantity_discarded, updated_at
        )
        VALUES (
            NEW.id, 'ITEM: ' || NEW.title, 'Saldo automático via engenharia.', GREATEST(0, v_balance), NEW.unit,
            'Depósito Engenharia', v_target_bin, NEW.user_id, NEW.client_name,
            NEW.produced_quantity, NEW.quantity_billed, v_asset_value, 
            v_remaining_vols, v_status, COALESCE(NEW.extra_data->>'OP', NEW.op_number), COALESCE(NEW.extra_data->>'PEDIDO', NEW.test_order), COALESCE(NEW.quantity_discarded, 0), NOW()
        )
        ON CONFLICT (test_id) DO UPDATE SET
            name = EXCLUDED.name,
            quantity = EXCLUDED.quantity,
            unit = EXCLUDED.unit,
            stock_bin = EXCLUDED.stock_bin,
            client_name = EXCLUDED.client_name,
            qty_produced = EXCLUDED.qty_produced,
            qty_billed = EXCLUDED.qty_billed,
            production_cost = EXCLUDED.production_cost,
            volumes = EXCLUDED.volumes,
            status = EXCLUDED.status,
            op = EXCLUDED.op,
            pedido = EXCLUDED.pedido,
            quantity_discarded = EXCLUDED.quantity_discarded,
            updated_at = NOW();
    ELSE
        -- Se não houve nenhuma produção, remove o item do estoque
        DELETE FROM ee_inventory WHERE test_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
