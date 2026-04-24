-- =========================================================================================
-- SCRIPT DE INSTALAÇÃO COMPLETA: ASSISTEC V6
-- =========================================================================================
-- Instruções:
-- 1. Acesse o painel do seu novo projeto no Supabase (fxhhjyyjwhlnqcystbqf).
-- 2. Vá no "SQL Editor" e cole TODO este código.
-- 3. Clique em "Run".
-- Isso instalará todas as tabelas, relacionamentos, políticas de segurança e pastas (Storage).
-- =========================================================================================

-- Ativar extensão necessária para UUIDS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABELAS BASE (SEM DEPENDÊNCIAS FORTES)
-- ==========================================

-- 1.1 USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'USER',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 1.2 APP CONFIGS
CREATE TABLE IF NOT EXISTS public.app_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT 
);
INSERT INTO public.app_configs (config_key, config_value, description)
VALUES 
('GEMINI_API_KEY', '', 'Chave API do Google Gemini'),
('OPENAI_API_KEY', '', 'Chave API da OpenAI')
ON CONFLICT (config_key) DO NOTHING;

-- 1.3 VEHICLES (V6)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    model TEXT NOT NULL,
    plate TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id)
);


-- ==========================================
-- 2. TABELAS DE CLIENTES E DEPENDENTES
-- ==========================================

-- 2.1 CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    street TEXT,
    number TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    address_verified BOOLEAN DEFAULT false,
    address_verified_at TIMESTAMP WITH TIME ZONE,
    classification TEXT CHECK (classification IN ('OURO', 'PRATA', 'BRONZE')),
    classification_date TIMESTAMPTZ,
    last_pos_venda_at TIMESTAMP WITH TIME ZONE,
    whatsapp TEXT,
    main_phone TEXT
);

-- 2.2 CLIENT CONTACTS (V6)
CREATE TABLE IF NOT EXISTS public.client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    has_whatsapp BOOLEAN DEFAULT true
);

-- 2.3 MACHINES (V6)
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model TEXT,
    serial_number TEXT,
    notes TEXT
);


-- ==========================================
-- 3. TABELAS CENTRAIS E OPERACIONAIS
-- ==========================================

-- 3.1 TASKS (O Coração do Sistema)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'NOT_STARTED',
    client TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    location TEXT,
    geo JSONB,
    visitation JSONB,
    travels JSONB,
    stages JSONB,
    attachments JSONB,
    comments JSONB,
    user_id UUID REFERENCES public.users(id),
    assigned_users UUID[] DEFAULT '{}',
    visibility TEXT DEFAULT 'PUBLIC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    op TEXT,
    pedido TEXT,
    item TEXT,
    rnc TEXT,
    trip_cost DECIMAL(10,2),
    trip_cost_currency VARCHAR(3) DEFAULT 'BRL',
    rnc_resolution_date TIMESTAMP WITH TIME ZONE,
    outcome TEXT,
    last_modified_by UUID REFERENCES public.users(id),
    last_modified_at TIMESTAMP WITH TIME ZONE,
    trip_km_start NUMERIC DEFAULT 0,
    trip_km_end NUMERIC DEFAULT 0,
    vehicle_info TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id),
    production_cost NUMERIC,
    parent_test_id UUID,
    parent_followup_id UUID,
    parent_sac_id UUID,
    parent_rnc_id UUID
);

-- 3.2 TASK REPORTS (Relatórios Inteligentes)
CREATE TABLE IF NOT EXISTS public.task_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    title TEXT NOT NULL,
    raw_notes TEXT,
    content TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    suggested_actions JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED')),
    signed_by UUID REFERENCES public.users(id),
    signature_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 SAVED REPORTS (Relatórios Gerais de BI)
CREATE TABLE IF NOT EXISTS public.saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL, 
    title TEXT NOT NULL,
    period TEXT, 
    totals JSONB NOT NULL, 
    ai_analysis TEXT,
    raw_data JSONB, 
    user_id UUID, 
    raw_data_count INTEGER 
);


-- ==========================================
-- 4. SAC E REGISTROS DE INTERAÇÃO (RI)
-- ==========================================

-- 4.1 SAC TICKETS (OT)
CREATE TABLE IF NOT EXISTS public.sac_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ABERTO' NOT NULL, 
    priority TEXT DEFAULT 'MEDIA' NOT NULL, 
    category TEXT,
    appointment_number TEXT,
    attendant_notes TEXT,
    user_id UUID REFERENCES public.users(id), 
    assigned_to UUID REFERENCES public.users(id),
    contact_info TEXT, 
    contact_email TEXT,
    contact_phone TEXT,
    external_id TEXT,
    has_return BOOLEAN DEFAULT FALSE,
    uom TEXT,
    returned_quantity NUMERIC,
    return_destination TEXT,
    final_quantity NUMERIC,
    new_unit_price NUMERIC,
    tags TEXT[] 
);

-- 4.2 SIMPLE TICKETS (RI - Registro de Interação)
CREATE TABLE IF NOT EXISTS public.simple_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number TEXT UNIQUE NOT NULL,
    client_name TEXT,
    subject TEXT,
    description TEXT,
    report_date DATE DEFAULT CURRENT_DATE,
    city TEXT,
    external_id TEXT,
    status TEXT DEFAULT 'ABERTO' NOT NULL, 
    priority TEXT DEFAULT 'MEDIA' NOT NULL, 
    checklist JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    converted_to_ot_id UUID REFERENCES public.sac_tickets(id),
    user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- 5. MÓDULO CONTROLES (ENGENHARIA E ESTOQUE)
-- ==========================================

-- 5.1 TECH TESTS
CREATE TABLE IF NOT EXISTS public.tech_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id), 
    client_name TEXT, 
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'AGUARDANDO',
    status_color TEXT DEFAULT '#94a3b8', 
    extra_data JSONB, 
    metadata JSONB, 
    converted_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    quantity_produced DECIMAL DEFAULT 0,
    quantity_billed DECIMAL DEFAULT 0,
    production_cost DECIMAL DEFAULT 0,
    unit TEXT DEFAULT 'KG',
    consumed_stock_id UUID -- fk adicionada no DDL adiante
);

-- 5.2 EE INVENTORY (Estoque)
CREATE TABLE IF NOT EXISTS public.ee_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, 
    quantity INT DEFAULT 1,
    unit TEXT DEFAULT 'un',
    location TEXT, 
    metadata JSONB,
    stock_bin TEXT DEFAULT 'ESTOQUE 1',
    test_id UUID REFERENCES public.tech_tests(id) ON DELETE SET NULL UNIQUE,
    client_name TEXT,
    op TEXT,
    pedido TEXT,
    qty_produced DECIMAL DEFAULT 0,
    qty_billed DECIMAL DEFAULT 0,
    production_cost DECIMAL DEFAULT 0
);

-- Atualiza FK Circular
ALTER TABLE public.tech_tests ADD CONSTRAINT tech_tests_consumed_stock_id_fkey FOREIGN KEY (consumed_stock_id) REFERENCES public.ee_inventory(id) ON DELETE SET NULL;

-- 5.3 TECH FOLLOWUPS
CREATE TABLE IF NOT EXISTS public.tech_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id),
    client_name TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSTRUCTED', 'LOST', 'ON_HOLD')),
    last_contact_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 6. POLI INTELLIGENCE SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS public.poli_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    data JSONB,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id),
    created_by_poli BOOLEAN DEFAULT true,
    auto_expire_at TIMESTAMPTZ
);


-- ==========================================
-- 7. PASTAS DE ARQUIVOS (STORAGE BUCKETS)
-- ==========================================

-- Insere as principais pastas que o aplicativo V6 utiliza
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('report-media', 'report-media', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('sac-attachments', 'sac-attachments', true) ON CONFLICT DO NOTHING;


-- ==========================================
-- 8. POLÍTICAS DE SEGURANÇA (PERMISSIVAS PARA USO INTERNO)
-- ==========================================

-- Desativa restrições complexas para permitir uso livre pelos usuários cadastrados localmente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sac_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ee_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_followups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.poli_suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports DISABLE ROW LEVEL SECURITY;

-- Configura permissão pública nas pastas de armazenamento do Supabase Native
CREATE POLICY "Public Read All" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Public Insert All" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Delete All" ON storage.objects FOR DELETE USING (true);
CREATE POLICY "Public Update All" ON storage.objects FOR UPDATE USING (true);

-- Notifica a API REST do Supabase a atualizar o mapa de tabelas
NOTIFY pgrst, 'reload schema';

SELECT 'AssisTec V6 Completo Declarado e Arquitetura Inicializada no Novo Banco!' AS Sucesso;
