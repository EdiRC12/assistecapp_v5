-- SAC Restructuring Database Migration

-- 1. Update sac_tickets table with missing columns for parity with RNC and OT requirements
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

-- 2. Create simple_tickets table for RI (Registro de Interação)
CREATE TABLE IF NOT EXISTS simple_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number TEXT UNIQUE,
    client_name TEXT NOT NULL,
    report_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    city TEXT,
    external_id TEXT,
    status TEXT DEFAULT 'Aberto', -- Aberto, Em Análise, Finalizado, Convertido em OT
    priority TEXT DEFAULT 'Média', -- Baixa, Média, Alta, Crítica
    checklist JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    converted_to_ot_id UUID REFERENCES sac_tickets(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update updated_at trigger for simple_tickets (assuming the common trigger function exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER set_simple_tickets_updated_at
        BEFORE UPDATE ON simple_tickets
        FOR EACH ROW
        EXECUTE FUNCTION handle_updated_at();
    END IF;
END $$;

-- 4. Set standard RLS for simple_tickets
ALTER TABLE simple_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all simple tickets" ON simple_tickets
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert simple tickets" ON simple_tickets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update simple tickets" ON simple_tickets
    FOR UPDATE USING (auth.role() = 'authenticated');
