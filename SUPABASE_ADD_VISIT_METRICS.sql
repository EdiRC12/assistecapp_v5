-- Adicionar colunas de controle de metas de visitas no cadastro de clientes
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS visit_frequency_months INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS visit_lead_time_months INTEGER DEFAULT 2;

-- Criar tabela de reservas de viagens/regiões no calendário
CREATE TABLE IF NOT EXISTS public.travel_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    notes TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sincronizar schema
NOTIFY pgrst, 'reload schema';
