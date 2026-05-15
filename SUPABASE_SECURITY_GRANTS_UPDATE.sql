-- =====================================================
-- SCRIPT DE ATUALIZAÇÃO DE SEGURANÇA - MAIO 2026
-- =====================================================
-- Este script garante que as tabelas no esquema 'public' 
-- tenham permissões explícitas para a Data API do Supabase,
-- conforme novas políticas de segurança da plataforma.
-- =====================================================

-- 1. Permissão de uso no schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Permissões em todas as tabelas atuais
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Permissões em todas as sequências (IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 4. Permissões em todas as funções (RPCs)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 5. Configuração de privilégios padrão para FUTURAS tabelas
-- Isso garante que novas tabelas já nasçam com as permissões corretas.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
