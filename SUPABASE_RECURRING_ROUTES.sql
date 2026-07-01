/* ====================================================
   ASSISTEC PLATINUM - CRM LOGÍSTICO (ROTEIROS RECORRENTES)
   ==================================================== */

-- 1. Adicionar colunas necessárias
ALTER TABLE public.support_routes ADD COLUMN IF NOT EXISTS recurrence_months NUMERIC DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS route_template_id UUID REFERENCES public.support_routes(id);

-- 2. Criar a função que calcula e insere a próxima viagem recorrente
CREATE OR REPLACE FUNCTION public.auto_schedule_recurring_route()
RETURNS TRIGGER AS $$
DECLARE
    v_recurrence NUMERIC;
    v_next_date TIMESTAMPTZ;
BEGIN
    -- Só prossegue se o status mudou PARA 'CONCLUIDO' e possui um template_id
    IF NEW.status = 'CONCLUIDO' AND OLD.status != 'CONCLUIDO' AND NEW.route_template_id IS NOT NULL THEN
        
        -- Busca a recorrência configurada no modelo da rota
        SELECT recurrence_months INTO v_recurrence 
        FROM public.support_routes 
        WHERE id = NEW.route_template_id;

        -- Se houver recorrência configurada (maior que 0)
        IF v_recurrence IS NOT NULL AND v_recurrence > 0 THEN
            
            -- A base do cálculo é a data que estava agendada na OS atual.
            -- Mas se estiver nula, usamos a data atual da conclusão.
            v_next_date := COALESCE(NEW.due_date, NOW()) + (v_recurrence || ' months')::INTERVAL;
            
            -- Cria a nova viagem planejada idêntica, apenas com nova data e status pendente
            INSERT INTO public.tasks (
                title,
                description,
                category,
                priority,
                status,
                due_date,
                geo,
                travels,
                visitation,
                user_id,
                route_template_id,
                created_at,
                updated_at
            ) VALUES (
                NEW.title,
                NEW.description,
                NEW.category,
                NEW.priority,
                'NOT_STARTED', -- Status inicial da nova viagem
                v_next_date,
                NEW.geo,
                NEW.travels,
                NEW.visitation,
                NEW.user_id,
                NEW.route_template_id,
                NOW(),
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Vincular a função ao gatilho na tabela tasks
DROP TRIGGER IF EXISTS trg_auto_schedule_recurring_route ON public.tasks;
CREATE TRIGGER trg_auto_schedule_recurring_route
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.auto_schedule_recurring_route();

-- Recarrega o schema da API do Supabase
NOTIFY pgrst, 'reload schema';
