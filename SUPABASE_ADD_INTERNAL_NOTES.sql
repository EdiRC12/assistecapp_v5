-- Adiciona a coluna de observações internas na tabela de relatórios
ALTER TABLE public.task_reports 
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Adiciona comentário para documentação no banco
COMMENT ON COLUMN public.task_reports.internal_notes IS 'Observações internas e sigilosas do relatório, não enviadas ao cliente por padrão';
