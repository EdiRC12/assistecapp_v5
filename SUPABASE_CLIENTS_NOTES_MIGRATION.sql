-- =====================================================================
-- MIGRATION: ADICIONAR NOTAS E RESTRIÇÕES OPERACIONAIS NA TABELA DE CLIENTES
-- =====================================================================

-- Adiciona a coluna operational_notes do tipo JSONB na tabela de clientes
-- com um valor padrão de array vazio '[]' para evitar quebras ou campos nulos
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS operational_notes JSONB DEFAULT '[]'::jsonb;

-- Comentário explicativo da estrutura da coluna
COMMENT ON COLUMN public.clients.operational_notes IS 'Lista de observações e restrições operacionais do cliente em formato JSON: [{"id": "uuid", "text": "...", "created_at": "..."}]';
