-- ============================================================
-- MIGRATION: Visitation Planning & Pending Actions (FULL RESET v2)
-- Corrige colunas faltantes: sac_id, rnc_id (usadas por ServiceJourneyReport)
-- ============================================================

-- STEP 1: DROP existing tables
DROP TABLE IF EXISTS public.visit_pending_actions CASCADE;
DROP TABLE IF EXISTS public.visitation_planning CASCADE;

-- ============================================================
-- STEP 2: Create visitation_planning
-- Campos usados por ControlsView.jsx handleSaveNewRecord
-- ============================================================
CREATE TABLE public.visitation_planning (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name   TEXT NOT NULL,
    type          TEXT NOT NULL DEFAULT 'VISITA TÉCNICA',
    status        TEXT NOT NULL DEFAULT 'PLANEJADO',
    notes         TEXT,
    linked_test_id UUID,
    migrated_task_id UUID,                 -- NOVO: Vinculo com tarefa criada via migração
    user_id       UUID,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Create visit_pending_actions
-- IMPORTANTE: manter sac_id e rnc_id pois ServiceJourneyReport.jsx
-- insere e filtra por esses campos (linhas 204-206 e 74-77)
-- ============================================================
CREATE TABLE public.visit_pending_actions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description         TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDENTE',
    sac_id              UUID,                    -- Vinculado a SAC (ServiceJourneyReport)
    rnc_id              UUID,                    -- Vinculado a RNC (ServiceJourneyReport)
    linked_task_id      UUID,                    -- Vinculado a tarefa Kanban que gerou a pendencia
    migrated_task_id    UUID,                    -- NOVO: Vinculo com tarefa criada via conversão
    client_name         TEXT,                    -- Cliente relacionado (autocomplete)
    responsible_user_id UUID,
    deadline            DATE,
    user_id             UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 4: Disable RLS
-- ============================================================
ALTER TABLE public.visitation_planning    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_pending_actions  DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: Grant access
-- ============================================================
GRANT ALL ON TABLE public.visitation_planning   TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.visit_pending_actions TO anon, authenticated, service_role;

-- ============================================================
-- STEP 6: Ownership
-- ============================================================
ALTER TABLE public.visitation_planning   OWNER TO postgres;
ALTER TABLE public.visit_pending_actions OWNER TO postgres;

-- ============================================================
-- STEP 7: Indexes
-- ============================================================
CREATE INDEX idx_visitation_client    ON public.visitation_planning(client_name);
CREATE INDEX idx_visitation_user      ON public.visitation_planning(user_id);
CREATE INDEX idx_visitation_status    ON public.visitation_planning(status);
CREATE INDEX idx_pending_user         ON public.visit_pending_actions(user_id);
CREATE INDEX idx_pending_status       ON public.visit_pending_actions(status);
CREATE INDEX idx_pending_sac          ON public.visit_pending_actions(sac_id);
CREATE INDEX idx_pending_rnc          ON public.visit_pending_actions(rnc_id);
CREATE INDEX idx_pending_task         ON public.visit_pending_actions(linked_task_id);
