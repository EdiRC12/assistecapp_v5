-- BIDIRECTIONAL TRACKING AND TRACEABILITY
-- Adds missing links between Kanban tasks and Tech records

-- 1. Ensure tasks table can link to followups
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_followup_id UUID REFERENCES tech_followups(id);

-- 2. Ensure tech_followups can link back to tasks
ALTER TABLE tech_followups 
ADD COLUMN IF NOT EXISTS converted_task_id UUID REFERENCES tasks(id);

-- 3. Add traceability number to followups (matching tech_tests pattern)
CREATE SEQUENCE IF NOT EXISTS tech_followups_number_seq START 1;

ALTER TABLE tech_followups 
ADD COLUMN IF NOT EXISTS followup_number INTEGER DEFAULT nextval('tech_followups_number_seq');

CREATE UNIQUE INDEX IF NOT EXISTS idx_tech_followups_number ON tech_followups(followup_number);

ALTER TABLE tech_followups 
ALTER COLUMN followup_number SET DEFAULT nextval('tech_followups_number_seq');

COMMENT ON COLUMN tech_followups.followup_number IS 'Número sequencial amigável do acompanhamento (Traceability ID).';
