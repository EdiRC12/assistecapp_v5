-- Script para o Módulo de Controles (REVISADO)
-- Autor: Antigravity AI
-- Motivo: Ajuste de chave estrangeira para referenciar public.users em vez de auth.users

-- Remover tabelas existentes para recriar com as restrições corretas
DROP TABLE IF EXISTS tech_tests CASCADE;
DROP TABLE IF EXISTS tech_followups CASCADE;
DROP TABLE IF EXISTS ee_inventory CASCADE;

-- 1. Tabela de Testes Técnicos (Pré-Produção - Refatorada para Registros Individuais)
CREATE TABLE tech_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES users(id), -- Referenciando a tabela public.users
    client_name TEXT, 
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'AGUARDANDO',
    status_color TEXT DEFAULT '#94a3b8', -- Slate 400 default
    extra_data JSONB, -- Para colunas adicionais vindas do Excel
    metadata JSONB, -- Informações extras (análises da IA, tags, etc)
    converted_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL
);

-- 2. Tabela de Acompanhamentos (Tratativas com Clientes)
CREATE TABLE tech_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    client_name TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSTRUCTED', 'LOST', 'ON_HOLD')),
    last_contact_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Estoque de Engenharia (Amostras e Sobras)
CREATE TABLE ee_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- Amostra, Sobra de Teste, Material de Desenvolvimento
    quantity INT DEFAULT 1,
    unit TEXT DEFAULT 'un',
    location TEXT, -- Gaveta, Prateleira, Armário
    metadata JSONB 
);

-- Habilitar RLS (Segurança)
ALTER TABLE tech_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ee_inventory ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Permitindo acesso para todos os usuários da tabela users)
CREATE POLICY "Enable access for all users" ON tech_tests FOR ALL USING (true);
CREATE POLICY "Enable access for all users" ON tech_followups FOR ALL USING (true);
CREATE POLICY "Enable access for all users" ON ee_inventory FOR ALL USING (true);
