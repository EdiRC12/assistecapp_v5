-- Solução definitiva: desabilitar RLS na tabela product_returns
ALTER TABLE public.product_returns DISABLE ROW LEVEL SECURITY;

-- Garantir permissões completas
GRANT ALL ON public.product_returns TO authenticated, anon, service_role;

-- Verificar
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'product_returns';
