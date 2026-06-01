-- Script para criar o bucket de Storage e as políticas de acesso no Supabase

-- 1. Cria o bucket chamado 'assistec-media' e o marca como Público
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assistec-media', 'assistec-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir que qualquer pessoa (ou usuários autenticados) possa LER (Visualizar) os arquivos
CREATE POLICY "Acesso Publico Leitura" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'assistec-media');

-- 3. Permitir que os usuários possam INSERIR (Fazer upload) novos arquivos
CREATE POLICY "Permitir Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'assistec-media');

-- 4. Permitir que os usuários possam EXCLUIR os arquivos
CREATE POLICY "Permitir Exclusao" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'assistec-media');

-- 5. Permitir que os usuários possam ATUALIZAR os arquivos
CREATE POLICY "Permitir Atualizacao" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'assistec-media');
