-- ============================================================================
-- SCRIPT ULTRA-MINIMAL: APENAS A ATUALIZAÇÃO DA FUNÇÃO DE SINCRONIZAÇÃO
-- ============================================================================
-- Como as colunas já existem no seu banco de dados, não precisamos rodar nenhum
-- comando "ALTER TABLE" ou recriação de trigger.
--
-- Cole APENAS o bloco abaixo no SQL Editor do Supabase e clique em "Run".
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_sync_test_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_balance DECIMAL;
    v_unit_cost DECIMAL;
    v_asset_value DECIMAL;
    v_target_bin TEXT;
    v_total_consumed DECIMAL;
BEGIN
    -- 1. Calcular consumo por outros testes (Reuso)
    SELECT COALESCE(SUM(quantity_produced), 0)
    INTO v_total_consumed
    FROM tech_tests
    WHERE consumed_stock_id IN (SELECT id FROM ee_inventory WHERE test_id = NEW.id);

    -- 2. Calcular Saldo Real (Deduzindo a Quantidade Descartada)
    v_balance := (NEW.quantity_produced - NEW.quantity_billed - COALESCE(NEW.quantity_discarded, 0)) - v_total_consumed;
    
    -- 3. Definir Depósito
    IF NEW.status IN ('REPROVADO', 'CANCELADO') THEN
        v_target_bin := 'ESTOQUE 14';
    ELSE
        v_target_bin := 'ESTOQUE 65';
    END IF;

    -- 4. Sincronizar com ee_inventory
    IF v_balance > 0 THEN
        IF NEW.quantity_produced > 0 THEN
            v_unit_cost := NEW.production_cost / NEW.quantity_produced;
        ELSE
            v_unit_cost := 0;
        END IF;
        v_asset_value := v_unit_cost * v_balance;

        INSERT INTO ee_inventory (
            test_id, name, description, quantity, unit, 
            location, stock_bin, user_id, client_name,
            qty_produced, qty_billed, production_cost, updated_at
        )
        VALUES (
            NEW.id, 'ITEM: ' || NEW.title, 'Saldo automático via engenharia.', v_balance, NEW.unit,
            'Depósito Engenharia', v_target_bin, NEW.user_id, NEW.client_name,
            NEW.quantity_produced, NEW.quantity_billed, v_asset_value, NOW()
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
            updated_at = NOW();
    ELSE
        DELETE FROM ee_inventory WHERE test_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
