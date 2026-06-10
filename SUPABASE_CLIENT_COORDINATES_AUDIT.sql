-- =========================================================================================
-- MIGRATION: ADICIONAR COORDENADAS E HISTÓRICO DE AUDITORIA À TABELA CLIENTS
-- =========================================================================================
-- Instruções:
-- 1. Acesse o painel do seu projeto no Supabase (SQL Editor).
-- 2. Cole este código e clique em "Run".
-- =========================================================================================

-- 1. Adicionar colunas de coordenadas para os clientes
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Adicionar coluna JSONB de histórico de edições do endereço
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS address_edit_history JSONB DEFAULT '[]'::jsonb;

-- 3. Notificar recarga de schema
NOTIFY pgrst, 'reload schema';

SELECT 'Colunas de geolocalização e histórico de auditoria adicionadas à tabela clients com sucesso!' AS Sucesso;
