-- SCRIPT DE REPARAÇÃO DEFINITIVA DE CONTAS E IDENTIDADES DE USUÁRIOS
-- Execute este script completo no SQL Editor do Supabase.
-- Ele remove qualquer tentativa corrompida anterior e insere os registros completos
-- tanto no cofre de segurança (auth.users) quanto na tabela de vínculos de autenticação (auth.identities),
-- usando os mesmos IDs antigos que eles já possuem na tabela pública e nas tarefas.
-- Isso restabelecerá o acesso imediato de Nicolas e Amado com a senha Plastimarau123.

-- 1. Garante que a extensão de criptografia esteja ativa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Limpa qualquer tentativa antiga de autenticação na tabela de identidades e de usuários
DELETE FROM auth.identities WHERE user_id IN ('f51728fc-080b-4f88-acfd-5e15ae12b1e5', '85f4c9ff-5abc-4d88-9f03-a68a78e3b123');
DELETE FROM auth.users WHERE email IN ('engenharia3@plastimarau.com.br', 'sac@plastimarau.com.br');

-- 3. CRIA A CREDENCIAL DE SEGURANÇA DO NICOLAS (auth.users)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'f51728fc-080b-4f88-acfd-5e15ae12b1e5', -- ID original do Nicolas em public.users
    'authenticated',
    'authenticated',
    'engenharia3@plastimarau.com.br',
    crypt('Plastimarau123', gen_salt('bf')), -- Senha provisória Plastimarau123
    NOW(), -- Confirma o e-mail na hora (pula o spam corporativo!)
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "Nicolas", "role": "USER"}',
    NOW(),
    NOW()
);

-- 4. CRIA A IDENTIDADE DO NICOLAS (auth.identities - O VÍNCULO QUE FALTAVA)
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    'f51728fc-080b-4f88-acfd-5e15ae12b1e5', -- ID da identidade (mesmo UUID)
    'f51728fc-080b-4f88-acfd-5e15ae12b1e5', -- Referência a auth.users(id)
    'f51728fc-080b-4f88-acfd-5e15ae12b1e5', -- provider_id
    '{"sub": "f51728fc-080b-4f88-acfd-5e15ae12b1e5", "email": "engenharia3@plastimarau.com.br"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
);

-- 5. CRIA A CREDENCIAL DE SEGURANÇA DO AMADO (auth.users)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '85f4c9ff-5abc-4d88-9f03-a68a78e3b123', -- ID original do Amado em public.users
    'authenticated',
    'authenticated',
    'sac@plastimarau.com.br',
    crypt('Plastimarau123', gen_salt('bf')), -- Senha provisória Plastimarau123
    NOW(), -- Confirma o e-mail na hora
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "Amado", "role": "USER"}',
    NOW(),
    NOW()
);

-- 6. CRIA A IDENTIDADE DO AMADO (auth.identities - O VÍNCULO QUE FALTAVA)
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    '85f4c9ff-5abc-4d88-9f03-a68a78e3b123', -- ID da identidade (mesmo UUID)
    '85f4c9ff-5abc-4d88-9f03-a68a78e3b123', -- Referência a auth.users(id)
    '85f4c9ff-5abc-4d88-9f03-a68a78e3b123', -- provider_id
    '{"sub": "85f4c9ff-5abc-4d88-9f03-a68a78e3b123", "email": "sac@plastimarau.com.br"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
);
