-- ==========================================
-- SCRIPT DE RESTAURAÇÃO COMPLETA: RNC E DEVOLUÇÕES
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de RNC (rnc_records)
-- Contém todos os campos necessários para RncView e SacView
CREATE TABLE IF NOT EXISTS public.rnc_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rnc_number INTEGER NOT NULL,
    sac_id UUID DEFAULT NULL, -- Relacionamento opcional com sac_tickets
    external_id TEXT, -- Referência Scopi
    client_name TEXT NOT NULL,
    report_date DATE DEFAULT CURRENT_DATE,
    city TEXT,
    subject TEXT,
    description TEXT,
    status TEXT DEFAULT 'ABERTO', -- ABERTO, EM_EXECUCAO, VERIFICANDO, FECHADO
    priority TEXT DEFAULT 'MEDIA', -- BAIXA, MEDIA, ALTA, CRITICA
    
    -- Dados de Produto/Financeiro
    invoice_number TEXT,
    op TEXT,
    batch_number TEXT,
    item_code TEXT,
    item_name TEXT,
    quantity DECIMAL DEFAULT 0,
    unit_price DECIMAL DEFAULT 0,
    total_value DECIMAL DEFAULT 0,
    uom TEXT DEFAULT 'un', -- Unidade de Medida
    
    -- Solicitante
    requester_name TEXT,
    requester_sector TEXT,
    
    -- Classificação (Opcional se usar as tabelas satélites)
    sector_id UUID,
    problem_type_id UUID,
    
    -- Dados de Devolução (Legado/Resumo)
    has_return BOOLEAN DEFAULT FALSE,
    returned_quantity DECIMAL DEFAULT 0,
    return_destination TEXT, -- REWORK, DISCARD
    final_quantity DECIMAL DEFAULT 0,
    new_unit_price DECIMAL DEFAULT 0,
    commercial_agreement TEXT,
    
    -- Estruturas de Dados Complexas
    timeline JSONB DEFAULT '[]'::jsonb,
    checklist JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    root_cause_ishikawa TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Devoluções de Produtos (product_returns)
CREATE TABLE IF NOT EXISTS public.product_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rnc_id UUID REFERENCES public.rnc_records(id) ON DELETE CASCADE,
    client_name TEXT,
    item_name TEXT,
    quantity DECIMAL DEFAULT 0,
    unit_price DECIMAL DEFAULT 0,
    total_value DECIMAL DEFAULT 0,
    uom TEXT DEFAULT 'un',
    invoice_number TEXT,
    final_quantity DECIMAL DEFAULT 0,
    new_unit_price DECIMAL DEFAULT 0,
    return_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'PENDENTE', -- PENDENTE, RECEBIDO, CONCLUIDO
    return_destination TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Atualizar sac_tickets para incluir referência de RNC
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='rnc_id') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN rnc_id UUID REFERENCES public.rnc_records(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE public.rnc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso (Permitir tudo para autenticados/anon enquanto em dev)
-- Nota: Ajuste estas políticas conforme sua necessidade de segurança final
DROP POLICY IF EXISTS "Enable all for all" ON public.rnc_records;
CREATE POLICY "Enable all for all" ON public.rnc_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for all" ON public.product_returns;
CREATE POLICY "Enable all for all" ON public.product_returns FOR ALL USING (true) WITH CHECK (true);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_rnc_sac_id ON public.rnc_records(sac_id);
CREATE INDEX IF NOT EXISTS idx_rnc_number ON public.rnc_records(rnc_number);
CREATE INDEX IF NOT EXISTS idx_returns_rnc_id ON public.product_returns(rnc_id);
