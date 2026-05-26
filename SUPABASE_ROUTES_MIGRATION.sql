-- ====================================================
-- ASSISTEC PLATINUM - SUPABASE MODULE: ROUTE PLANNING TEMPLATES
-- Author: Evandro da Silva / Claude 4.5 Sonnet & Antigravity
-- Date: 2026-05-26
-- Description: Table provisioning and non-RLS configuration for custom login model
-- ====================================================

-- 6. Table for Saved Routes and Travel Templates
CREATE TABLE IF NOT EXISTS support_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    start_point JSONB NOT NULL,
    destinations JSONB NOT NULL,
    notes TEXT,
    distance_km NUMERIC,
    duration_min NUMERIC
);

-- Desabilitar Row Level Security (RLS)
-- Nota: O aplicativo utiliza um fluxo de autenticação customizado baseado na tabela "users"
-- ao invés do Supabase Auth nativo, o que faz com que o cliente JS opere sob a role "anon"
-- (fazendo com que auth.uid() retorne nulo). Desativamos o RLS para manter o funcionamento
-- e compatibilidade perfeitas com as demais tabelas do módulo de Suporte.
ALTER TABLE support_routes DISABLE ROW LEVEL SECURITY;

-- Remover políticas RLS antigas por segurança e limpeza
DROP POLICY IF EXISTS "Permitir leitura dos próprios roteiros" ON support_routes;
DROP POLICY IF EXISTS "Permitir inserção dos próprios roteiros" ON support_routes;
DROP POLICY IF EXISTS "Permitir atualização dos próprios roteiros" ON support_routes;
DROP POLICY IF EXISTS "Permitir exclusão dos próprios roteiros" ON support_routes;
