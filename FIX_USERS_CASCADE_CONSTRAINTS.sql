-- SCRIPT DE CORREÇÃO DE CONSTRAINTS PARA SINCRONIZAÇÃO DE USUÁRIOS
-- Execute este script completo no SQL Editor do Supabase para habilitar a atualização de IDs em cascata.
-- Isso permite que usuários antigos se registrem no Supabase Auth nativo sem erros de integridade.

-- 1. AJUSTES NA TABELA TASKS
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_last_modified_by_fkey;
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_last_modified_by_fkey 
  FOREIGN KEY (last_modified_by) REFERENCES public.users(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 2. AJUSTES NA TABELA CLIENTS
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;
ALTER TABLE public.clients 
  ADD CONSTRAINT clients_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 3. AJUSTES NA TABELA TASK_REPORTS
ALTER TABLE public.task_reports DROP CONSTRAINT IF EXISTS task_reports_user_id_fkey;
ALTER TABLE public.task_reports 
  ADD CONSTRAINT task_reports_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.task_reports DROP CONSTRAINT IF EXISTS task_reports_last_edited_by_fkey;
ALTER TABLE public.task_reports 
  ADD CONSTRAINT task_reports_last_edited_by_fkey 
  FOREIGN KEY (last_edited_by) REFERENCES public.users(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 4. AJUSTES NA TABELA VEHICLES
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_created_by_fkey;
ALTER TABLE public.vehicles 
  ADD CONSTRAINT vehicles_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;
