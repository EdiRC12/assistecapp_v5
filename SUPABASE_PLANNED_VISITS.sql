-- Criar tabela para armazenar visitas planejadas (rascunhos do cronograma)
CREATE TABLE IF NOT EXISTS public.planned_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    visit_date DATE NOT NULL,
    notes TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS simplificado ou desativar conforme padrão do projeto
ALTER TABLE public.planned_visits DISABLE ROW LEVEL SECURITY;

-- Recarregar o schema do PostgREST
NOTIFY pgrst, 'reload schema';
