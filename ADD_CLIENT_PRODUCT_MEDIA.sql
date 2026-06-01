-- Execute este script no painel do Supabase (SQL Editor)
-- Ele adiciona os campos necessários para o sistema de anexos de itens

ALTER TABLE client_products
ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Opcional: Para garantir que media_urls nunca seja nulo no futuro
UPDATE client_products SET media_urls = '[]'::jsonb WHERE media_urls IS NULL;
