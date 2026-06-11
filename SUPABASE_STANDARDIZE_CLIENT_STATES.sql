-- =========================================================================================
-- MIGRATION: PADRONIZAR ESTADOS DOS CLIENTES PARA SIGLAS DE 2 LETRAS (UF)
-- =========================================================================================
-- Instruções:
-- 1. Acesse o painel do seu projeto no Supabase (SQL Editor).
-- 2. Cole este código e clique em "Run".
-- =========================================================================================

-- 1. Atualizar registros existentes removendo acentos, espaços extras e convertendo para sigla
UPDATE public.clients
SET state = CASE 
    WHEN TRIM(UPPER(state)) IN ('ACRE') THEN 'AC'
    WHEN TRIM(UPPER(state)) IN ('ALAGOAS') THEN 'AL'
    WHEN TRIM(UPPER(state)) IN ('AMAPÁ', 'AMAPA') THEN 'AP'
    WHEN TRIM(UPPER(state)) IN ('AMAZONAS') THEN 'AM'
    WHEN TRIM(UPPER(state)) IN ('BAHIA') THEN 'BA'
    WHEN TRIM(UPPER(state)) IN ('CEARÁ', 'CEARA') THEN 'CE'
    WHEN TRIM(UPPER(state)) IN ('DISTRITO FEDERAL') THEN 'DF'
    WHEN TRIM(UPPER(state)) IN ('ESPÍRITO SANTO', 'ESPIRITO SANTO') THEN 'ES'
    WHEN TRIM(UPPER(state)) IN ('GOIÁS', 'GOIAS') THEN 'GO'
    WHEN TRIM(UPPER(state)) IN ('MARANHÃO', 'MARANHAO') THEN 'MA'
    WHEN TRIM(UPPER(state)) IN ('MATO GROSSO') THEN 'MT'
    WHEN TRIM(UPPER(state)) IN ('MATO GROSSO DO SUL') THEN 'MS'
    WHEN TRIM(UPPER(state)) IN ('MINAS GERAIS') THEN 'MG'
    WHEN TRIM(UPPER(state)) IN ('PARÁ', 'PARA') THEN 'PA'
    WHEN TRIM(UPPER(state)) IN ('PARAÍBA', 'PARAIBA') THEN 'PB'
    WHEN TRIM(UPPER(state)) IN ('PARANÁ', 'PARANA') THEN 'PR'
    WHEN TRIM(UPPER(state)) IN ('PERNAMBUCO') THEN 'PE'
    WHEN TRIM(UPPER(state)) IN ('PIAUÍ', 'PIAUI') THEN 'PI'
    WHEN TRIM(UPPER(state)) IN ('RIO DE JANEIRO') THEN 'RJ'
    WHEN TRIM(UPPER(state)) IN ('RIO GRANDE DO NORTE') THEN 'RN'
    WHEN TRIM(UPPER(state)) IN ('RIO GRANDE DO SUL') THEN 'RS'
    WHEN TRIM(UPPER(state)) IN ('RONDÔNIA', 'RONDONIA') THEN 'RO'
    WHEN TRIM(UPPER(state)) IN ('RORAIMA') THEN 'RR'
    WHEN TRIM(UPPER(state)) IN ('SANTA CATARINA') THEN 'SC'
    WHEN TRIM(UPPER(state)) IN ('SÃO PAULO', 'SAO PAULO') THEN 'SP'
    WHEN TRIM(UPPER(state)) IN ('SERGIPE') THEN 'SE'
    WHEN TRIM(UPPER(state)) IN ('TOCANTINS') THEN 'TO'
    ELSE TRIM(UPPER(state)) -- Mantém em maiúsculas se já estiver limpo ou se for internacional
END
WHERE state IS NOT NULL AND state <> '';

-- 2. Limpar qualquer espaço extra em branco e forçar maiúsculas nos já abreviados
UPDATE public.clients
SET state = TRIM(UPPER(state))
WHERE state IS NOT NULL AND state <> '';

-- 3. Notificar recarga de schema
NOTIFY pgrst, 'reload schema';

SELECT 'Padronização dos estados finalizada com sucesso!' AS Sucesso;
