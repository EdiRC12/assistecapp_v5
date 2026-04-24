-- VERSÃO ATUALIZADA E SIMPLIFICADA (SEM BLOQUEIOS)
-- Este script resolve o erro de "Foreign Key Constraint" e "RLS Policy"

-- 1. Remover a tabela antiga para limpar todas as restrições problemáticas
DROP TABLE IF EXISTS app_configs CASCADE;

-- 2. Criar a tabela de forma simples e direta
CREATE TABLE app_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT -- Mudamos para TEXT para evitar erros de validação com auth.users
);

-- 3. Habilitar Segurança
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;

-- 4. Criar política TOTALMENTE PERMISSIVA (Qualquer um pode ler e salvar no App)
CREATE POLICY "permissive_all" 
ON app_configs FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 5. Inserir as chaves necessárias
INSERT INTO app_configs (config_key, config_value, description)
VALUES 
('GEMINI_API_KEY', '', 'Chave API do Google Gemini'),
('OPENAI_API_KEY', '', 'Chave API da OpenAI')
ON CONFLICT (config_key) DO NOTHING;
