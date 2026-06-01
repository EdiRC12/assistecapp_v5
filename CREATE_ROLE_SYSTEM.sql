-- Script para estruturar o sistema de cargos (roles) de usuários no Supabase

-- 1. Adicionar a coluna role na tabela users caso não exista
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Atualizar todos os usuários que não tenham cargo para 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;

-- 3. Definir o usuário Evandro como Master (Acesso Total)
UPDATE users 
SET role = 'master' 
WHERE username ILIKE '%Evandro%' OR email ILIKE '%Evandro%';

-- 4. Opcional: Atualizar a política de segurança da tabela users (RLS) se necessário
-- Caso sua tabela use RLS, descomente as linhas abaixo para permitir que os masters editem os usuários
-- DROP POLICY IF EXISTS "Masters podem editar roles" ON users;
-- CREATE POLICY "Masters podem editar roles" ON users 
--     FOR UPDATE 
--     USING (auth.uid() IN (SELECT id FROM users WHERE role = 'master'));
