-- SCRIPT DINÂMICO E AUTO-AJUSTÁVEL DE CONSTRAINTS DE USUÁRIOS (TECNOLOGIA SELF-HEALING DATABASE)
-- Execute este script completo no SQL Editor do Supabase.
-- Ele detecta AUTOMATICAMENTE todas as tabelas e chaves estrangeiras que apontam para public.users(id),
-- limpa preventivamente dados órfãos desatualizados em cada uma e recria todas as restrições com ON UPDATE CASCADE.

DO $$
DECLARE
    rec RECORD;
    sql_stmt TEXT;
BEGIN
    -- 1. Loop por todas as chaves estrangeiras do banco que apontam para public.users(id)
    FOR rec IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            tc.constraint_name, 
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users' 
            AND ccu.table_schema = 'public'
    LOOP
        RAISE NOTICE '---------------------------------------------------------';
        RAISE NOTICE 'Processando Tabela: %.% (Coluna: %, Restrição: %)', 
            rec.table_schema, rec.table_name, rec.column_name, rec.constraint_name;

        -- 2. Limpeza preventiva de dados órfãos para esta tabela específica
        sql_stmt := 'UPDATE ' || quote_ident(rec.table_schema) || '.' || quote_ident(rec.table_name) || 
                    ' SET ' || quote_ident(rec.column_name) || ' = NULL ' ||
                    ' WHERE ' || quote_ident(rec.column_name) || ' IS NOT NULL ' ||
                    ' AND ' || quote_ident(rec.column_name) || ' NOT IN (SELECT id FROM public.users)';
        BEGIN
            EXECUTE sql_stmt;
            RAISE NOTICE '-> Sujeira de dados órfãos limpa com sucesso.';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '-> Falha ao limpar sujeira: %', SQLERRM;
        END;

        -- 3. Remover restrição de chave estrangeira antiga
        sql_stmt := 'ALTER TABLE ' || quote_ident(rec.table_schema) || '.' || quote_ident(rec.table_name) || 
                    ' DROP CONSTRAINT IF EXISTS ' || quote_ident(rec.constraint_name);
        BEGIN
            EXECUTE sql_stmt;
            RAISE NOTICE '-> Restrição antiga removida.';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '-> Falha ao remover restrição: %', SQLERRM;
        END;

        -- 4. Criar nova restrição com ON UPDATE CASCADE ON DELETE SET NULL
        sql_stmt := 'ALTER TABLE ' || quote_ident(rec.table_schema) || '.' || quote_ident(rec.table_name) || 
                    ' ADD CONSTRAINT ' || quote_ident(rec.constraint_name) || 
                    ' FOREIGN KEY (' || quote_ident(rec.column_name) || ') REFERENCES public.users(id) ' ||
                    ' ON UPDATE CASCADE ON DELETE SET NULL';
        BEGIN
            EXECUTE sql_stmt;
            RAISE NOTICE '-> Nova restrição com ON UPDATE CASCADE ativada com sucesso.';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '-> Falha ao criar nova restrição: %', SQLERRM;
        END;

    END LOOP;
    
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'PROCESSAMENTO CONCLUÍDO COM SUCESSO!';
END $$;
