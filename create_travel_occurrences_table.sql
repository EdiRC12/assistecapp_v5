-- Create travel_occurrence_types table for suggestions
CREATE TABLE IF NOT EXISTS travel_occurrence_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: No changes to tasks table as we use JSONB for travels field.
-- Grant permissions
GRANT ALL ON travel_occurrence_types TO anon, authenticated, service_role;
