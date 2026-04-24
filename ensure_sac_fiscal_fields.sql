-- GARANTIR PARIDADE DE CAMPOS FISCAIS NA TABELA sac_tickets
-- Execute este script no SQL Editor do Supabase

DO $$ 
BEGIN 
    -- 1. Campos Básicos de Devolução
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='has_return') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN has_return BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='returned_quantity') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN returned_quantity DECIMAL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='return_destination') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN return_destination TEXT;
    END IF;

    -- 2. Campos Fiscais (NFs já deveriam existir, mas por segurança)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='return_invoice_number') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN return_invoice_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='rework_invoice_number') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN rework_invoice_number TEXT;
    END IF;

    -- 3. Campos de Resultado de Reprocesso
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='final_quantity') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN final_quantity DECIMAL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='new_unit_price') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN new_unit_price DECIMAL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sac_tickets' AND COLUMN_NAME='uom') THEN
        ALTER TABLE public.sac_tickets ADD COLUMN uom TEXT DEFAULT 'un';
    END IF;

END $$;

NOTIFY pgrst, 'reload schema';
