-- Migration: Add unique constraint to rnc_id in product_returns
-- Description: Ensures that each RNC has only one linked return record for synchronization purposes.

ALTER TABLE public.product_returns ADD CONSTRAINT product_returns_rnc_id_key UNIQUE (rnc_id);
