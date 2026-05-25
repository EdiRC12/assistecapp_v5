-- ====================================================
-- ASSISTEC PLATINUM - SUPABASE MODULE: FIELD SUPPORT
-- Author: Evandro da Silva / Antigravity AI
-- Date: 2026-05-25
-- Description: Direct table provisioning (No RLS / No Policy SQL statements)
-- ====================================================

-- 1. Table for Support Places (Hotels, Restaurants, Fuel, etc.)
CREATE TABLE IF NOT EXISTS support_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('hotel', 'restaurant', 'fuel', 'other')),
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    notes TEXT,
    created_by UUID
);

-- 2. Table for Important Support Contacts
CREATE TABLE IF NOT EXISTS support_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('internal', 'supplier', 'road_service', 'machine_contact')),
    company TEXT,
    notes TEXT,
    created_by UUID
);

-- 3. Table for Emergency SOS Contacts configured by each technician
CREATE TABLE IF NOT EXISTS support_sos_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT
);

-- 4. Table for Overtime Preferences (Shift setup, Salary metrics)
CREATE TABLE IF NOT EXISTS support_overtime_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID UNIQUE NOT NULL,
    work_start TIME WITHOUT TIME ZONE DEFAULT '07:40'::time,
    work_end TIME WITHOUT TIME ZONE DEFAULT '16:58'::time,
    interval_minutes INTEGER DEFAULT 30,
    base_salary NUMERIC,
    contracted_hours NUMERIC DEFAULT 220
);

-- 5. Table for Overtime Logs / Ledger
CREATE TABLE IF NOT EXISTS support_overtime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    interval_minutes INTEGER NOT NULL,
    is_holiday_or_weekend BOOLEAN DEFAULT false NOT NULL,
    associated_task_id UUID,
    associated_travel_id TEXT,
    notes TEXT
);
