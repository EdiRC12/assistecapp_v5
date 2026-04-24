-- SCRIPTS PARA INICIALIZAÇÃO DO NOVO BANCO DE DADOS
-- COPIE E COLE TUDO ABAIXO NO SEU SUPABASE -> SQL EDITOR -> NEW QUERY, E CLIQUE EM RUN.

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'USER',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    classification TEXT,
    last_pos_venda_at TIMESTAMP WITH TIME ZONE,
    whatsapp TEXT,
    main_phone TEXT,
    classification_date TIMESTAMP WITH TIME ZONE
);

-- 3. TABELA DE TAREFAS (A mais importante)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    trip_cost NUMERIC,
    trip_cost_currency TEXT,
    rnc_resolution_date TIMESTAMP WITH TIME ZONE,
    outcome TEXT,
    last_modified_by UUID REFERENCES public.users(id),
    last_modified_at TIMESTAMP WITH TIME ZONE,
    trip_km_start NUMERIC,
    trip_km_end NUMERIC,
    vehicle_info TEXT,
    vehicle_id UUID,
    production_cost NUMERIC,
    parent_test_id UUID,
    parent_followup_id UUID,
    parent_sac_id UUID,
    parent_rnc_id UUID
);

-- 4. TABELA DE RELATÓRIOS (Reports)
CREATE TABLE IF NOT EXISTS public.task_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    content TEXT,
    raw_notes TEXT,
    media_urls JSONB DEFAULT '[]',
    status TEXT DEFAULT 'DRAFT',
    ai_generated BOOLEAN DEFAULT false,
    last_edited_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA SAC E TICKETS
CREATE TABLE IF NOT EXISTS public.sac_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    status TEXT DEFAULT 'ABERTO',
    priority TEXT DEFAULT 'MEDIA',
    category TEXT,
    appointment_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.simple_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    status TEXT DEFAULT 'ABERTO',
    report_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. DESATIVAR RLS PARA TESTES RÁPIDOS (COMO É UM APP LOCAL DE TESTE E USO INTERNO)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sac_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_tickets DISABLE ROW LEVEL SECURITY;

-- 7. REFRESH NO CACHE SE NECESSARIO POSTGREST
NOTIFY pgrst, 'reload schema';
