-- ============================================================
-- MIGRATION RNC MULTI-ITEM
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar suporte a múltiplos itens na RNC
ALTER TABLE public.rnc_records 
    ADD COLUMN IF NOT EXISTS return_items JSONB DEFAULT '[]'::jsonb;

-- 2. Garantir que as colunas de apoio existem em product_returns
-- (Caso não tenham sido criadas corretamente antes)
ALTER TABLE public.product_returns
    ADD COLUMN IF NOT EXISTS final_quantity NUMERIC(10, 3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_unit_price NUMERIC(10, 4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- 3. Verificação de total_value
-- Se esta coluna for gerada (GENERATED ALWAYS), não podemos inserí-la manualmente.
-- O erro do usuário confirma que ela é gerada. 
-- Apenas garantimos que ela existe e é do tipo correto.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_returns' AND column_name = 'total_value') THEN
        ALTER TABLE public.product_returns ADD COLUMN total_value NUMERIC(15, 2) 
        GENERATED ALWAYS AS (quantity * unit_price) STORED;
    END IF;
END $$;
