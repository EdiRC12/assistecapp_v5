-- SCRIPT DE ATUALIZAÇÃO - ACOMPANHAMENTOS "TURBINADOS"
-- Este script adiciona os campos de Timeline e Checklist, além dos campos de monitoramento anteriores.

ALTER TABLE tech_followups 
ADD COLUMN IF NOT EXISTS monitoring_objective TEXT,
ADD COLUMN IF NOT EXISTS review_cycle TEXT DEFAULT 'MENSAL',
ADD COLUMN IF NOT EXISTS control_parameter TEXT,
ADD COLUMN IF NOT EXISTS stability_status TEXT DEFAULT 'EM OBSERVAÇÃO',
ADD COLUMN IF NOT EXISTS final_verdict TEXT,
ADD COLUMN IF NOT EXISTS followup_number INT,
ADD COLUMN IF NOT EXISTS converted_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

-- Criar índice para performance de busca por número
CREATE INDEX IF NOT EXISTS idx_tech_followups_number ON tech_followups(followup_number);

-- Comentário para documentação
COMMENT ON TABLE tech_followups IS 'Tabela de acompanhamentos técnicos com monitoramento, timeline e checklist.';
