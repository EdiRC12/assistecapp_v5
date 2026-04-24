-- 1. Create the App Error Logs Table
CREATE TABLE IF NOT EXISTS public.app_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    username TEXT,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_name TEXT,
    severity TEXT DEFAULT 'ERROR',
    metadata JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Idempotent)
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.app_error_logs;
CREATE POLICY "Allow authenticated users to insert logs" ON public.app_error_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to read logs" ON public.app_error_logs;
CREATE POLICY "Allow authenticated users to read logs" ON public.app_error_logs
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update logs" ON public.app_error_logs;
CREATE POLICY "Allow authenticated users to update logs" ON public.app_error_logs
    FOR UPDATE TO authenticated
    USING (true);

-- 4. Grant access
GRANT ALL ON public.app_error_logs TO authenticated, service_role;
