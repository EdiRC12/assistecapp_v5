-- Migration: Create Product Returns table
-- Description: Centralizes return data from RNCs and standalone entries.

CREATE TABLE IF NOT EXISTS public.product_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    invoice_number TEXT,
    item_name TEXT NOT NULL,
    quantity DECIMAL NOT NULL DEFAULT 0,
    unit_price DECIMAL NOT NULL DEFAULT 0,
    total_value DECIMAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'RECEBIDO', 'CANCELADO'
    notes TEXT,
    rnc_id UUID REFERENCES public.rnc_records(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_returns_client ON public.product_returns(client_name);
CREATE INDEX IF NOT EXISTS idx_product_returns_rnc_id ON public.product_returns(rnc_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_status ON public.product_returns(status);

-- Enable RLS
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.product_returns
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_returns_updated_at
    BEFORE UPDATE ON public.product_returns
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
