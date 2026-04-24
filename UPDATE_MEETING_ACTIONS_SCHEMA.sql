-- ============================================================
-- MIGRATION: Soft Delete e Auditoria para Hub de Reuniões
-- ============================================================

DO $$ 
BEGIN
    -- 1. Colunas de Exclusão Lógica
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meeting_action_items' AND column_name='is_deleted') THEN
        ALTER TABLE public.meeting_action_items ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meeting_action_items' AND column_name='deleted_at') THEN
        ALTER TABLE public.meeting_action_items ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meeting_action_items' AND column_name='deleted_by') THEN
        ALTER TABLE public.meeting_action_items ADD COLUMN deleted_by UUID REFERENCES public.users(id);
    END IF;

    -- 2. Colunas de Auditoria de Reabertura
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meeting_action_items' AND column_name='reopened_at') THEN
        ALTER TABLE public.meeting_action_items ADD COLUMN reopened_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meeting_action_items' AND column_name='reopened_by') THEN
        ALTER TABLE public.meeting_action_items ADD COLUMN reopened_by UUID REFERENCES public.users(id);
    END IF;
END $$;
