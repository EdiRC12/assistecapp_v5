-- Migration: Create Client Products table and normalize history
-- Description: Creates the client_products table and populates it with historical client-product associations.

CREATE TABLE IF NOT EXISTS public.client_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    client_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    CONSTRAINT client_products_unique UNIQUE (client_name, product_name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_client_products_client ON public.client_products(client_name);

-- Disable Row Level Security (consistent with rest of AssisTec DB schema)
ALTER TABLE public.client_products DISABLE ROW LEVEL SECURITY;

-- Populate with unique client-product combinations from historical data

-- 1. From tech_tests
INSERT INTO public.client_products (client_name, product_name)
SELECT DISTINCT TRIM(client_name), TRIM(product_name)
FROM public.tech_tests
WHERE client_name IS NOT NULL AND client_name != ''
  AND product_name IS NOT NULL AND product_name != ''
ON CONFLICT (client_name, product_name) DO NOTHING;

-- 2. From tasks
INSERT INTO public.client_products (client_name, product_name)
SELECT DISTINCT TRIM(client), TRIM(item)
FROM public.tasks
WHERE client IS NOT NULL AND client != ''
  AND item IS NOT NULL AND item != ''
ON CONFLICT (client_name, product_name) DO NOTHING;

-- 3. From sac_tickets
INSERT INTO public.client_products (client_name, product_name)
SELECT DISTINCT TRIM(client_name), TRIM(item_name)
FROM public.sac_tickets
WHERE client_name IS NOT NULL AND client_name != ''
  AND item_name IS NOT NULL AND item_name != ''
ON CONFLICT (client_name, product_name) DO NOTHING;

-- 4. From rnc_records
INSERT INTO public.client_products (client_name, product_name)
SELECT DISTINCT TRIM(client_name), TRIM(item_name)
FROM public.rnc_records
WHERE client_name IS NOT NULL AND client_name != ''
  AND item_name IS NOT NULL AND item_name != ''
ON CONFLICT (client_name, product_name) DO NOTHING;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
