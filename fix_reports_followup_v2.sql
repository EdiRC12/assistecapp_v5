-- =====================================================
-- SCRIPT DE AJUSTE: SUPORTE A RELATÓRIOS DE RI (REGISTRO DE INTERAÇÃO)
-- =====================================================
-- Este script adiciona o vínculo necessário entre a tabela
-- 'task_reports' e 'simple_tickets' (RI).
-- =====================================================

-- 1. Adicionar ri_id para vinculação direta com Registro de Interação (Tier 1)
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS ri_id UUID REFERENCES simple_tickets(id) ON DELETE CASCADE;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_task_reports_ri_id ON task_reports(ri_id);

-- 3. Comentário para documentação
COMMENT ON COLUMN task_reports.ri_id IS 'Vínculo com o Registro de Interação (simple_tickets)';
