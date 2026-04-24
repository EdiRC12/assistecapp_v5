-- ============================================================
-- FIX URGENTE: RLS em product_returns
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- Passo 1: Desabilitar RLS temporariamente para limpar tudo
ALTER TABLE public.product_returns DISABLE ROW LEVEL SECURITY;

-- Passo 2: Dropar TODAS as políticas existentes pelo nome real
DO $$
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'product_returns' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.product_returns', pol_name);
        RAISE NOTICE 'Dropada política: %', pol_name;
    END LOOP;
END $$;

-- Passo 3: Garantir privilégios de tabela
GRANT ALL PRIVILEGES ON public.product_returns TO authenticated;
GRANT ALL PRIVILEGES ON public.product_returns TO anon;

-- Passo 4: Reativar RLS com política única e permissiva
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

-- Política para leitura (SELECT)
CREATE POLICY "product_returns_select"
ON public.product_returns
FOR SELECT
TO authenticated
USING (true);

-- Política para inserção (INSERT)
CREATE POLICY "product_returns_insert"
ON public.product_returns
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para atualização (UPDATE)
CREATE POLICY "product_returns_update"
ON public.product_returns
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para exclusão (DELETE)
CREATE POLICY "product_returns_delete"
ON public.product_returns
FOR DELETE
TO authenticated
USING (true);

-- Verificação: listar políticas criadas
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'product_returns'
ORDER BY policyname;
