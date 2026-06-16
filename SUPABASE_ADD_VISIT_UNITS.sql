-- Adicionar colunas de valor e unidade para controle flexível de prazos
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS visit_frequency_value INTEGER,
ADD COLUMN IF NOT EXISTS visit_frequency_unit VARCHAR(20) DEFAULT 'MESES',
ADD COLUMN IF NOT EXISTS visit_lead_time_value INTEGER,
ADD COLUMN IF NOT EXISTS visit_lead_time_unit VARCHAR(20) DEFAULT 'MESES';

-- Recarregar o schema do PostgREST
NOTIFY pgrst, 'reload schema';
