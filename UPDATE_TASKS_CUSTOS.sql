-- ==========================================
-- ESTRUTURA PARA INTEGRAÇÃO DE CUSTOS (TASKS)
-- ==========================================
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar colunas de vínculo e custo na tabela 'tasks'
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_test_id UUID references tech_tests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS production_cost DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_cost DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_cost_currency TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS trip_km_start DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_km_end DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_id UUID;

-- 2. Garantir que as colunas existentes para viagens sejam JSONB se necessário
-- (Assumindo que já existam como texto ou JSONB, mas garantindo a estrutura)
-- ALTER TABLE tasks ALTER COLUMN visitation SET DATA TYPE JSONB USING visitation::JSONB;
-- ALTER TABLE tasks ALTER COLUMN travels SET DATA TYPE JSONB USING travels::JSONB;

-- 3. Comentários para documentação
COMMENT ON COLUMN tasks.parent_test_id IS 'Vínculo com o registro original no módulo de Controles (Engenharia).';
COMMENT ON COLUMN tasks.production_cost IS 'Custo de produção herdado do teste técnico.';
COMMENT ON COLUMN tasks.trip_cost IS 'Custo total de logística/viagem acumulado nesta tarefa.';
