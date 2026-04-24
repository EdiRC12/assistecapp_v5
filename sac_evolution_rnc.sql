-- 1. Tabelas de Configuração (Setores e Problemas)
CREATE TABLE IF NOT EXISTS sac_sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS sac_problem_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector_id UUID REFERENCES sac_sectors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sector_id, name)
);

-- 2. Sistema de Sequência Customizada
CREATE TABLE IF NOT EXISTS sac_sequences (
    name TEXT PRIMARY KEY,
    last_value INTEGER DEFAULT 0 NOT NULL
);

-- Inicializar sequências
INSERT INTO sac_sequences (name, last_value) VALUES ('SAC', 0) ON CONFLICT DO NOTHING;
INSERT INTO sac_sequences (name, last_value) VALUES ('RNC', 0) ON CONFLICT DO NOTHING;

-- Função para obter próximo número formatado
CREATE OR REPLACE FUNCTION get_next_sac_number(seq_name TEXT)
RETURNS TEXT AS $$
DECLARE
    new_val INTEGER;
    year_prefix TEXT;
BEGIN
    year_prefix := to_char(now(), 'YYYY');
    
    UPDATE sac_sequences 
    SET last_value = last_value + 1 
    WHERE name = seq_name 
    RETURNING last_value INTO new_val;
    
    RETURN seq_name || '-' || year_prefix || '-' || LPAD(new_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Tabela de RNC (Relatório de Não Conformidade)
CREATE TABLE IF NOT EXISTS rnc_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sac_id UUID REFERENCES sac_tickets(id) ON DELETE SET NULL,
    rnc_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Análise de Causa Raiz (5 Porquês)
    root_cause_5whys JSONB DEFAULT '[]'::jsonb,
    root_cause_ishikawa TEXT,
    
    -- Plano de Ação (5W2H)
    action_plan JSONB DEFAULT '[]'::jsonb,
    
    -- Eficácia
    efficiency_check_date DATE,
    efficiency_result TEXT,
    efficiency_verified_by UUID,
    
    status TEXT DEFAULT 'ABERTO' NOT NULL, -- ABERTO, EM_EXECUCAO, VERIFICANDO, FECHADO
    user_id UUID -- Responsável pela RNC
);

-- 4. Atualizações na tabela sac_tickets
ALTER TABLE sac_tickets 
ADD COLUMN IF NOT EXISTS report_date DATE, -- Data que o cliente apontou
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES sac_sectors(id),
ADD COLUMN IF NOT EXISTS problem_type_id UUID REFERENCES sac_problem_types(id),
ADD COLUMN IF NOT EXISTS rnc_id UUID REFERENCES rnc_records(id);

-- 5. Ativar RLS nas novas tabelas
ALTER TABLE sac_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sac_problem_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sac_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnc_records ENABLE ROW LEVEL SECURITY;

-- Políticas Simples (Permitir tudo para autenticados)
CREATE POLICY "Enable all for all" ON sac_sectors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all" ON sac_problem_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all" ON sac_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all" ON rnc_records FOR ALL USING (true) WITH CHECK (true);
