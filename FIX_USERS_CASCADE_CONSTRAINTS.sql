-- SCRIPT DE CORREÇÃO DE CONSTRAINTS PARA SINCRONIZAÇÃO DE USUÁRIOS (VERSÃO SUPER SEGURA E RESILIENTE)
-- Execute este script completo no SQL Editor do Supabase para habilitar a atualização de IDs em cascata.
-- Nota: Removemos colunas opcionais de extensões para garantir compatibilidade 100% com o seu banco de dados atual.

-- 0. LIMPEZA PREVENTIVA DE DADOS ÓRFÃOS (Define referências inexistentes como NULL)
UPDATE public.clients SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
UPDATE public.tasks SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
UPDATE public.tasks SET last_modified_by = NULL WHERE last_modified_by IS NOT NULL AND last_modified_by NOT IN (SELECT id FROM public.users);
UPDATE public.task_reports SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);

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
