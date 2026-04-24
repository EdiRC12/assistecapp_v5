-- SAC Restructuring v6 - Database Changes
-- This script creates the RI table and adds missing columns to the OT (SAC) table.

-- 1. Create simple_tickets table (Tier 1 - RI)
CREATE TABLE IF NOT EXISTS simple_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number TEXT UNIQUE NOT NULL,
    client_name TEXT,
    subject TEXT,
    description TEXT,
    report_date DATE DEFAULT CURRENT_DATE,
    city TEXT,
    external_id TEXT,
    status TEXT DEFAULT 'ABERTO' NOT NULL, -- ABERTO, EM_ANALISE, RESOLVIDO, CANCELADO, MIGRADO_OT
    priority TEXT DEFAULT 'MEDIA' NOT NULL, -- BAIXA, MEDIA, ALTA, CRITICA
    checklist JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    converted_to_ot_id UUID REFERENCES sac_tickets(id),
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.1 Support for adding columns if table already exists
ALTER TABLE simple_tickets ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE simple_tickets ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Add sequence for RI
INSERT INTO sac_sequences (name, last_value) VALUES ('RI', 0) ON CONFLICT DO NOTHING;

-- 3. Add missing columns to sac_tickets (Tier 2 - OT) for RNC parity
ALTER TABLE sac_tickets 
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS has_return BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS uom TEXT,
ADD COLUMN IF NOT EXISTS returned_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS return_destination TEXT,
ADD COLUMN IF NOT EXISTS final_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS new_unit_price NUMERIC;

-- 4. Enable RLS for simple_tickets
ALTER TABLE simple_tickets ENABLE ROW LEVEL SECURITY;

-- 5. Policies for simple_tickets (Permissive for all active users)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON simple_tickets;
DROP POLICY IF EXISTS "Habilitar tudo para usuários autenticados" ON simple_tickets;
DROP POLICY IF EXISTS "Enable read access for all" ON simple_tickets;
DROP POLICY IF EXISTS "Enable insert access for all" ON simple_tickets;
DROP POLICY IF EXISTS "Enable update access for all" ON simple_tickets;
DROP POLICY IF EXISTS "Enable delete access for all" ON simple_tickets;

CREATE POLICY "Enable read access for all" ON simple_tickets FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON simple_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON simple_tickets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON simple_tickets FOR DELETE USING (true);
