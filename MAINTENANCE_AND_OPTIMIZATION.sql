-- =====================================================
-- SCRIPT DE MANUTENÇÃO E OTIMIZAÇÃO DE PERFORMANCE
-- =====================================================
-- Este script realiza a limpeza da tabela de logs e prepara
-- a tabela de tarefas para um rastreamento mais leve.
--
-- INSTRUÇÕES:
-- 1. Copie todo este código
-- 2. Acesse o Supabase Dashboard > SQL Editor
-- 3. Cole e execute (RUN)
-- =====================================================

-- 1. ADICIONAR COLUNAS DE RASTREAMENTO NA TABELA TASKS
-- Estas colunas substituirão a necessidade da tabela de logs para rastreamento básico.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- 2. CRIAR ÍNDICES PARA BUSCAS RÁPIDAS (MELHORA O I/O)
-- Isso ajuda o Supabase a encontrar os dados sem ler o disco inteiro.
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_visibility ON tasks(visibility);

-- 3. LIMPEZA DE DADOS REDUNDANTES
-- Remove a tabela de logs que está sobrecarregando o sistema.
DROP TABLE IF EXISTS logs;

-- 4. OTIMIZAÇÃO NA TABELA DE RELATÓRIOS (OPCIONAL)
-- Garante que as buscas de relatório por tarefa sejam instantâneas.
CREATE INDEX IF NOT EXISTS idx_task_reports_task_id ON task_reports(task_id);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
