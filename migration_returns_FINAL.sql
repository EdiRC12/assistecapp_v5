-- ============================================================
-- MIGRATION: product_returns - Correção Completa (v_final)
-- Execute este script INTEIRO de uma vez no console do Supabase
-- Ele cobre TODAS as etapas anteriores de forma segura
-- ============================================================

-- 1. Adicionar colunas que podem estar faltando
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS return_destination TEXT;
ALTER TABLE public.product_returns ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'un';

-- 2. Adicionar constraint UNIQUE no rnc_id (se já existir, ignora)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_returns_rnc_id_key'
  ) THEN
    ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_rnc_id_key UNIQUE (rnc_id);
  END IF;
END $$;

-- 3. Desabilitar o RLS temporariamente para limpar
ALTER TABLE public.product_returns DISABLE ROW LEVEL SECURITY;

-- 4. Remover TODAS as policies existentes (qualquer nome)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'product_returns' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.product_returns', pol.policyname);
    END LOOP;
END $$;

-- 5. Criar policy permissiva correta para usuários autenticados
CREATE POLICY "product_returns_auth_all" ON public.product_returns
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Reabilitar o RLS
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

-- 7. Garantir que a tabela aceita anon para o caso de chave anon estar em uso
-- (necessário se o app usa chave anon do Supabase ao invés de service key)
GRANT ALL ON public.product_returns TO anon;
GRANT ALL ON public.product_returns TO authenticated;
GRANT ALL ON public.product_returns TO service_role;
