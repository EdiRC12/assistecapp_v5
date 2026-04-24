-- Create table for SAC Tickets
CREATE TABLE IF NOT EXISTS sac_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ABERTO' NOT NULL, -- 'ABERTO', 'EM_ANALISE', 'RESOLVIDO', 'CANCELADO'
    priority TEXT DEFAULT 'MEDIA' NOT NULL, -- 'BAIXA', 'MEDIA', 'ALTA', 'CRITICA'
    attendant_notes TEXT,
    user_id UUID, -- Creator
    assigned_to UUID, -- Optional: Assigned tech/agent
    contact_info TEXT, -- Phone/Email
    tags TEXT[] -- ['RECLAMACAO', 'SUGESTAO', 'QUALIDADE']
);

-- Enable RLS
ALTER TABLE sac_tickets ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for current requirement)
DROP POLICY IF EXISTS "Enable read access for all" ON sac_tickets;
CREATE POLICY "Enable read access for all" ON sac_tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all" ON sac_tickets;
CREATE POLICY "Enable insert access for all" ON sac_tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all" ON sac_tickets;
CREATE POLICY "Enable update access for all" ON sac_tickets FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for all" ON sac_tickets;
CREATE POLICY "Enable delete access for all" ON sac_tickets FOR DELETE USING (true);
