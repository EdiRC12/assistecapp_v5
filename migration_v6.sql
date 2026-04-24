-- migration_v6.sql
-- Evolução Assistec V6: Veículos, Gestão de Viagens, Máquinas e Contatos

-- 1. Tabela de Veículos
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    model TEXT NOT NULL,
    plate TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Idempotência para Políticas de Veículos
DROP POLICY IF EXISTS "Allow all users to read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow all users to insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow all users to update/delete vehicles" ON public.vehicles;

CREATE POLICY "Allow all users to read vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow all users to insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all users to update/delete vehicles" ON public.vehicles FOR ALL USING (true);

-- 2. Campos extras na tabela Tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id),
ADD COLUMN IF NOT EXISTS vehicle_info TEXT,
ADD COLUMN IF NOT EXISTS trip_km_start NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_km_end NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_cost_currency TEXT DEFAULT 'BRL';

-- 3. Ajustes na tabela Clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS main_phone TEXT,
ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN ('OURO', 'PRATA', 'BRONZE')),
ADD COLUMN IF NOT EXISTS classification_date TIMESTAMPTZ;

-- 4. Tabela de Contatos do Cliente
CREATE TABLE IF NOT EXISTS public.client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    has_whatsapp BOOLEAN DEFAULT true
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Idempotência para Políticas de Contatos
DROP POLICY IF EXISTS "Allow all users to read client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Allow all users to insert client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Allow all users to update/delete client_contacts" ON public.client_contacts;

CREATE POLICY "Allow all users to read client_contacts" ON public.client_contacts FOR SELECT USING (true);
CREATE POLICY "Allow all users to insert client_contacts" ON public.client_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all users to update/delete client_contacts" ON public.client_contacts FOR ALL USING (true);

-- 5. Tabela de Máquinas do Cliente
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model TEXT,
    serial_number TEXT,
    notes TEXT
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Idempotência para Políticas de Máquinas
DROP POLICY IF EXISTS "Allow all users to read machines" ON public.machines;
DROP POLICY IF EXISTS "Allow all users to insert machines" ON public.machines;
DROP POLICY IF EXISTS "Allow all users to update/delete machines" ON public.machines;

CREATE POLICY "Allow all users to read machines" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Allow all users to insert machines" ON public.machines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all users to update/delete machines" ON public.machines FOR ALL USING (true);

-- Comentários de Versão
COMMENT ON TABLE public.tasks IS 'V6: Inclui suporte a custos de viagem e snapshot de veículos.';
COMMENT ON TABLE public.machines IS 'V6: Cadastro de máquinas vinculadas ao cliente.';
COMMENT ON TABLE public.client_contacts IS 'V6: Lista de contatos humanos vinculados ao cliente.';
