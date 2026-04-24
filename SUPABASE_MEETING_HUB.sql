-- ============================================================
-- MIGRATION: Hub de Reuniões, Controle de Coleta e Diagnóstico
-- ============================================================

-- 1. Tabela de Sessões de Reunião
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Reunião de Alinhamento',
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FINISHED')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Apontamentos (Checklist) da Reunião
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO')),
    linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    user_id UUID REFERENCES public.users(id)
);

-- 3. Atualização de Tabelas para Controle de Coleta (Idempotente)
DO $$ 
BEGIN
    -- product_returns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_returns' AND column_name='collection_status') THEN
        ALTER TABLE public.product_returns ADD COLUMN collection_status TEXT DEFAULT 'PENDENTE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_returns' AND column_name='scheduled_collection_date') THEN
        ALTER TABLE public.product_returns ADD COLUMN scheduled_collection_date DATE;
    END IF;

    -- sac_tickets (OT)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sac_tickets' AND column_name='collection_status') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN collection_status TEXT DEFAULT 'PENDENTE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sac_tickets' AND column_name='scheduled_collection_date') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN scheduled_collection_date DATE;
    END IF;

    -- rnc_records
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rnc_records' AND column_name='collection_status') THEN
        ALTER TABLE public.rnc_records ADD COLUMN collection_status TEXT DEFAULT 'PENDENTE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rnc_records' AND column_name='scheduled_collection_date') THEN
        ALTER TABLE public.rnc_records ADD COLUMN scheduled_collection_date DATE;
    END IF;

    -- tasks (Vínculo com Reunião)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='meeting_action_id') THEN
        ALTER TABLE public.tasks ADD COLUMN meeting_action_id UUID REFERENCES public.meeting_action_items(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Habilitar RLS e criar Políticas (Com DROP prévio para evitar erro "already exists")
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated for meeting_sessions" ON public.meeting_sessions;
CREATE POLICY "Allow all authenticated for meeting_sessions" ON public.meeting_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for meeting_action_items" ON public.meeting_action_items;
CREATE POLICY "Allow all authenticated for meeting_action_items" ON public.meeting_action_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Garantir acesso
GRANT ALL ON public.meeting_sessions TO authenticated, service_role;
GRANT ALL ON public.meeting_action_items TO authenticated, service_role;
