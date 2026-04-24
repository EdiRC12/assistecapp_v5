-- Drop table if exists to ensure a clean slate and remove old constraints
DROP TABLE IF EXISTS saved_reports CASCADE;

-- Create table for saved report snapshots
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL, -- 'INVENTORY', 'AUDIT', 'TESTS'
    title TEXT NOT NULL,
    period TEXT, -- e.g., 'Fevereiro 2026'
    totals JSONB NOT NULL, -- Store reportTotals calculations
    ai_analysis TEXT,
    raw_data JSONB, -- Store the full list of items (Snapshot)
    user_id UUID, -- Removed REFERENCES to avoid FK violations with custom auth
    raw_data_count INTEGER -- Optional: Store how many records were included
);

-- Enable RLS
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- Policy for viewing
CREATE POLICY "Enable read access for all" ON saved_reports
    FOR SELECT USING (true);

-- Policy for inserting
CREATE POLICY "Enable insert access for all" ON saved_reports
    FOR INSERT WITH CHECK (true);

-- Policy for deleting
CREATE POLICY "Enable delete for all" ON saved_reports
    FOR DELETE USING (true);
