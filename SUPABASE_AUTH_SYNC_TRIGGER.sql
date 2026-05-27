-- SCRIPT DE SYNC ENTRE SUPABASE AUTH E TABELA PÚBLICA DE USUÁRIOS
-- Execute este script completo no SQL Editor do Supabase para habilitar a sincronização.

-- 1. Cria a função que insere o novo usuário na tabela public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    username, 
    email, 
    password_hash, 
    role,
    avatar_url,
    created_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', substring(new.email from '^[^@]+')),
    new.email,
    '', -- Deixamos vazio pois o Supabase gerencia o hash de senha internamente em auth.users
    COALESCE(new.raw_user_meta_data->>'role', 'USER'),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.created_at, timezone('utc'::text, now()))
  )
  ON CONFLICT (email) DO UPDATE
  SET id = EXCLUDED.id; -- Trata caso o e-mail já exista temporariamente na tabela pública
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cria a trigger que dispara após a inserção na tabela nativa auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
