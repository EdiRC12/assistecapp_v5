-- Adding columns to product_returns for better traceability and breakdown
ALTER TABLE product_returns 
ADD COLUMN IF NOT EXISTS op TEXT,
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS rework_qty DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS loss_qty DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discard_qty DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sac_id UUID REFERENCES sac_tickets(id) ON DELETE CASCADE;

-- Optional: Ensure status sync by adding a trigger or just handling in app logic (app logic is safer for complex rules)
