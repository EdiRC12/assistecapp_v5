-- 1. Melhorias na tabela sac_tickets
ALTER TABLE sac_tickets 
ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS commercial_agreement TEXT;

-- 2. Melhorias na tabela rnc_records
ALTER TABLE rnc_records 
ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS commercial_agreement TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
