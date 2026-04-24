-- Adicionar coluna return_destination à tabela product_returns
ALTER TABLE product_returns 
ADD COLUMN IF NOT EXISTS return_destination TEXT; -- 'REWORK' or 'DISCARD'

-- Comentário para documentação
COMMENT ON COLUMN product_returns.return_destination IS 'Destino da devolução: REWORK (Retrabalho) ou DISCARD (Descarte)';
