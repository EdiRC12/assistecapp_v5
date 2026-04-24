-- ADICIONAR COLUNA DE NÚMERO SEQUENCIAL AOS TESTES TÉCNICOS
-- Este script cria uma sequência e uma coluna test_number que não permite reutilização em exclusões.

-- 1. Criar a sequência se não existir
CREATE SEQUENCE IF NOT EXISTS tech_tests_number_seq START 1;

-- 2. Adicionar a coluna à tabela tech_tests
ALTER TABLE tech_tests 
ADD COLUMN IF NOT EXISTS test_number INTEGER DEFAULT nextval('tech_tests_number_seq');

-- 3. Criar índice único para garantir que não haja duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_tech_tests_number ON tech_tests(test_number);

-- 4. Garantir que registros futuros usem a sequência automaticamente
-- (O passo 2 já faz isso via DEFAULT, mas garantimos aqui)
ALTER TABLE tech_tests 
ALTER COLUMN test_number SET DEFAULT nextval('tech_tests_number_seq');

-- COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON COLUMN tech_tests.test_number IS 'Número sequencial amigável do teste (Traceability ID). Imutável e não reutilizável.';
