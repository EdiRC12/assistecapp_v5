-- Remover valores padrão (default) e redefinir para NULL
ALTER TABLE public.clients ALTER COLUMN visit_frequency_months DROP DEFAULT;
ALTER TABLE public.clients ALTER COLUMN visit_lead_time_months DROP DEFAULT;

-- Zerar (setar para NULL) todos os clientes existentes para que comecem "Sem definição de tempo"
UPDATE public.clients
SET visit_frequency_months = NULL,
    visit_lead_time_months = NULL;

-- Recarregar o schema do PostgREST
NOTIFY pgrst, 'reload schema';
