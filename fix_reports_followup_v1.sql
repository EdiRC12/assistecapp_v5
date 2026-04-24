-- =====================================================
-- SCRIPT DE AJUSTE: SUPORTE A RELATÓRIOS DE DOSSIÊ (FOLLOWUP)
-- =====================================================
-- Este script adiciona o vínculo necessário entre a tabela
-- 'task_reports' e 'tech_followups' para permitir salvar relatórios.
-- =====================================================

-- 1. Adicionar followup_id para vinculação direta com Acompanhamentos
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS followup_id UUID REFERENCES tech_followups(id) ON DELETE CASCADE;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_task_reports_followup_id ON task_reports(followup_id);

-- 3. Comentário para documentação
COMMENT ON COLUMN task_reports.followup_id IS 'Vínculo com o Dossiê de Acompanhamento (tech_followups)';
