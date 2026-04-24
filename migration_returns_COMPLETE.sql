-- =============================================================
-- MIGRATION COMPLETA DEVOLUÇÕES - VERSÃO DEFINITIVA
-- Execute este script completo no Supabase SQL Editor
-- =============================================================

-- ============================================================
-- PARTE 1: Coluna item_name_return na tabela rnc_records
-- ============================================================
ALTER TABLE public.rnc_records
    ADD COLUMN IF NOT EXISTS item_name_return TEXT;

-- ============================================================
-- PARTE 2: Colunas adicionais em product_returns
-- ============================================================
ALTER TABLE public.product_returns
    ADD COLUMN IF NOT EXISTS return_destination TEXT,
    ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'un',
    ADD COLUMN IF NOT EXISTS final_quantity NUMERIC(10, 3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_unit_price NUMERIC(10, 4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- ============================================================
-- PARTE 3: Remover a constraint unique em rnc_id (se existir)
-- Permite múltiplos itens de devolução por RNC
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_returns_rnc_id_key'
        AND conrelid = 'public.product_returns'::regclass
    ) THEN
        ALTER TABLE public.product_returns DROP CONSTRAINT product_returns_rnc_id_key;
        RAISE NOTICE 'Constraint product_returns_rnc_id_key removida com sucesso.';
    ELSE
        RAISE NOTICE 'Constraint product_returns_rnc_id_key não existe - OK.';
    END IF;
END $$;

-- ============================================================
-- PARTE 4: Reset completo das políticas RLS em product_returns
-- ============================================================

-- Dropar TODAS as políticas existentes dinamicamente
DO $$
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'product_returns' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.product_returns', pol_name);
        RAISE NOTICE 'Política removida: %', pol_name;
    END LOOP;
END $$;

-- Habilitar RLS (garantir que está ativo)
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva única para usuários autenticados
CREATE POLICY "allow_all_authenticated_users"
ON public.product_returns
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- PARTE 5: Garantir trigger updated_at em product_returns
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_product_returns_updated_at'
        AND tgrelid = 'public.product_returns'::regclass
    ) THEN
        -- Verificar se a função existe
        IF EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
        ) THEN
            CREATE TRIGGER update_product_returns_updated_at
                BEFORE UPDATE ON public.product_returns
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE 'Trigger updated_at criado para product_returns.';
        ELSE
            RAISE NOTICE 'Função update_updated_at_column não encontrada - pule esta etapa.';
        END IF;
    ELSE
        RAISE NOTICE 'Trigger updated_at já existe.';
    END IF;
END $$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'product_returns'
ORDER BY ordinal_position;
