-- SCRIPT SIMPLIFICADO - GARANTIR COLUNAS NA sac_tickets
-- Execute estas linhas individualmente ou todas juntas no SQL Editor do Supabase

ALTER TABLE public.sac_tickets ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sac_tickets ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sac_tickets ADD COLUMN IF NOT EXISTS commercial_agreement TEXT;

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';
