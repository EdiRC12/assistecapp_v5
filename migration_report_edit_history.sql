-- Migration: Add edit_history column to task_reports table
ALTER TABLE task_reports ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
