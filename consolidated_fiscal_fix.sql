-- 1. ADICIONAR COLUNA PARA LISTA DE ITENS (JSONB)
ALTER TABLE public.rnc_records ADD COLUMN IF NOT EXISTS return_items JSONB DEFAULT '[]'::jsonb;

-- 2. ADICIONAR COLUNAS PARA NOTA DE DEVOLUÇÃO E RETRABALHO NA OT
ALTER TABLE public.sac_tickets ADD COLUMN IF NOT EXISTS return_invoice_number TEXT;
ALTER TABLE public.sac_tickets ADD COLUMN IF NOT EXISTS rework_invoice_number TEXT;

-- 3. ADICIONAR COLUNAS PARA NOTA DE DEVOLUÇÃO, RETRABALHO E NOME DO ITEM NA RNC
ALTER TABLE public.rnc_records ADD COLUMN IF NOT EXISTS return_invoice_number TEXT;
ALTER TABLE public.rnc_records ADD COLUMN IF NOT EXISTS rework_invoice_number TEXT;
ALTER TABLE public.rnc_records ADD COLUMN IF NOT EXISTS item_name_return TEXT;

-- 4. RECARREGAR CACHE
NOTIFY pgrst, 'reload schema';
