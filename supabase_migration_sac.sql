-- SAC Restructuring Database Script

-- 1. Add missing columns to sac_tickets (OT tier)
ALTER TABLE sac_tickets 
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS has_return BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS uom TEXT,
ADD COLUMN IF NOT EXISTS returned_quantity DECIMAL,
ADD COLUMN IF NOT EXISTS return_destination TEXT,
ADD COLUMN IF NOT EXISTS final_quantity DECIMAL,
ADD COLUMN IF NOT EXISTS new_unit_price DECIMAL;

-- 2. Create simple_tickets table (RI tier)
CREATE TABLE IF NOT EXISTS simple_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number TEXT,
    client_name TEXT NOT NULL,
    report_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    city TEXT,
    external_id TEXT,
    status TEXT DEFAULT 'Aberto', -- Aberto, Em Atendimento, Concluído, Convertido
    priority TEXT DEFAULT 'Baixa', -- Baixa, Média, Alta
    checklist JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    converted_to_ot_id UUID REFERENCES sac_tickets(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add RLS (Row Level Security) if needed or just follow existing patterns
-- Assuming public access or existing policies for simplicity in this script, 
-- but in a real environment, policies should be explicitly defined.

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_simple_tickets_client_name ON simple_tickets(client_name);
CREATE INDEX IF NOT EXISTS idx_simple_tickets_status ON simple_tickets(status);
