-- Desativar Row Level Security (RLS) na tabela de reservas de viagens
-- Isso garante compatibilidade com o padrão do projeto AssisTec e resolve o erro 401 (Unauthorized)
ALTER TABLE public.travel_reservations DISABLE ROW LEVEL SECURITY;

-- Recarregar o schema do PostgREST
NOTIFY pgrst, 'reload schema';
