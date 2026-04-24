-- Migration: Fix RLS and Auth for product_returns (Final Version)
-- Description: Ensures the table is accessible for insertions and updates during RNC synchronization.

-- 1. Disable RLS temporarily to confirm success
ALTER TABLE public.product_returns DISABLE ROW LEVEL SECURITY;

-- 2. Drop EVERY possible policy that might be blocking or causing conflicts
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.product_returns;
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON public.product_returns;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.product_returns;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.product_returns;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.product_returns;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.product_returns;

-- 3. Create a truly permissive policy for authenticated users (ALL = SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Allow all for authenticated users" ON public.product_returns
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Re-enable RLS (Permissive mode)
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
