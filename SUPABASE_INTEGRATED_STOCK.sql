-- ==========================================
-- GESTÃO INTEGRADA DE ESTOQUE (ENGENHARIA)
-- ==========================================
-- Autor: Antigravity AI
-- Versão: 2.0 (Com Automação Nativa)

-- 1. ADICIONAR COLUNAS NECESSÁRIAS (SCHEMA)
-- ------------------------------------------

-- Atualizar Tabela de Testes Técnicos
ALTER TABLE tech_tests 
ADD COLUMN IF NOT EXISTS quantity_produced DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_billed DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS production_cost DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'KG',
ADD COLUMN IF NOT EXISTS consumed_stock_id UUID;

-- Atualizar Tabela de Estoque
ALTER TABLE ee_inventory 
ADD COLUMN IF NOT EXISTS stock_bin TEXT DEFAULT 'ESTOQUE 1',
ADD COLUMN IF NOT EXISTS test_id UUID,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS op TEXT,
ADD COLUMN IF NOT EXISTS pedido TEXT,
ADD COLUMN IF NOT EXISTS qty_produced DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_billed DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS production_cost DECIMAL DEFAULT 0;

-- Adicionar constraints de chave estrangeira com segurança
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tech_tests_consumed_stock_id_fkey') THEN
        ALTER TABLE tech_tests ADD CONSTRAINT tech_tests_consumed_stock_id_fkey FOREIGN KEY (consumed_stock_id) REFERENCES ee_inventory(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ee_inventory_test_id_fkey') THEN
        ALTER TABLE ee_inventory ADD CONSTRAINT ee_inventory_test_id_fkey FOREIGN KEY (test_id) REFERENCES tech_tests(id) ON DELETE SET NULL;
    END IF;

    -- Essencial para o ON CONFLICT da automação
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ee_inventory_test_id_key') THEN
        ALTER TABLE ee_inventory ADD CONSTRAINT ee_inventory_test_id_key UNIQUE (test_id);
    END IF;
END $$;

-- 2. FUNÇÃO DE SINCRONIZAÇÃO AUTOMÁTICA (TRIGGER)
-- ------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_test_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_balance DECIMAL;
    v_unit_cost DECIMAL;
    v_asset_value DECIMAL;
    v_target_bin TEXT;
    v_total_consumed DECIMAL;
BEGIN
    -- A. Calcular consumo por outros testes (Reuso)
    SELECT COALESCE(SUM(quantity_produced), 0)
    INTO v_total_consumed
    FROM tech_tests
    WHERE consumed_stock_id IN (SELECT id FROM ee_inventory WHERE test_id = NEW.id);

    -- B. Calcular Saldo Real
    v_balance := (NEW.quantity_produced - NEW.quantity_billed) - v_total_consumed;
    
    -- C. Definir Depósito
    IF NEW.status IN ('REPROVADO', 'CANCELADO') THEN
        v_target_bin := 'ESTOQUE 14';
    ELSE
        v_target_bin := 'ESTOQUE 65';
    END IF;

    -- D. Sincronizar
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

-- 3. ATIVAR TRIGGER
-- -----------------

DROP TRIGGER IF EXISTS trg_sync_test_to_inventory ON tech_tests;
CREATE TRIGGER trg_sync_test_to_inventory
AFTER INSERT OR UPDATE ON tech_tests
FOR EACH ROW
EXECUTE FUNCTION fn_sync_test_to_inventory();

-- 4. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON COLUMN ee_inventory.production_cost IS 'Valor patrimonial calculado proporcionalmente ao saldo disponível.';
COMMENT ON COLUMN tech_tests.quantity_produced IS 'Quantidade total fabricada no teste.';
