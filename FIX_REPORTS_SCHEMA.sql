-- =====================================================
-- SCRIPT DE MANUTENÇÃO: SCHEMA DE RELATÓRIOS V6 (CORRIGIDO)
-- =====================================================
-- Este script ajusta a tabela 'task_reports' para suportar
-- Relatórios de Jornada de Atendimento e outros tipos.
-- =====================================================

-- 1. Tornar task_id opcional (nullable)
-- Relatórios de Jornada (Service Journey) não são vinculados a uma única Task
ALTER TABLE IF EXISTS task_reports ALTER COLUMN task_id DROP NOT NULL;

-- 2. Adicionar sac_id para vinculação direta com SAC
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS sac_id UUID REFERENCES sac_tickets(id) ON DELETE CASCADE;

-- 3. Adicionar rnc_id para vinculação direta com RNC
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS rnc_id UUID REFERENCES rnc_records(id) ON DELETE CASCADE;

-- 4. Adicionar report_type para categorização
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS report_type TEXT;

-- 5. Remover constraint antiga se existir e criar uma nova e robusta
-- Isso garante que SERVICE_JOURNEY, PARCIAL e FINAL sejam aceitos
ALTER TABLE task_reports DROP CONSTRAINT IF EXISTS task_reports_report_type_check;
ALTER TABLE task_reports ADD CONSTRAINT task_reports_report_type_check 
    CHECK (report_type IN ('TECHNICAL', 'SERVICE_JOURNEY', 'PARCIAL', 'FINAL'));

-- 6. Adicionar colunas de Gestão Comercial e Pós-Venda
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS solicitante TEXT;
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS contato TEXT;
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS produto TEXT;
ALTER TABLE IF EXISTS task_reports ADD COLUMN IF NOT EXISTS manual_actions JSONB DEFAULT '[]'::jsonb;

-- 6. Atualizar relatórios existentes se necessário
UPDATE task_reports SET report_type = 'TECHNICAL' WHERE report_type IS NULL;

-- 7. Adicionar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_task_reports_sac_id ON task_reports(sac_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_rnc_id ON task_reports(rnc_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_report_type ON task_reports(report_type);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
