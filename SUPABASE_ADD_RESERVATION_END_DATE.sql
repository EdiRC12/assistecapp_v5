-- 1. Adicionar coluna end_date (Data de Fim) à tabela travel_reservations
ALTER TABLE public.travel_reservations
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. Atualizar os registros existentes para terem uma data de fim
-- Como as reservas antigas bloqueavam a semana toda a partir de segunda-feira (week_start),
-- vamos definir a end_date como a sexta-feira dessa semana (+ 4 dias).
UPDATE public.travel_reservations
SET end_date = week_start + interval '4 days'
WHERE end_date IS NULL;

-- 3. Atualizar o schema do PostgREST
NOTIFY pgrst, 'reload schema';
