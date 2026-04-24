-- Adicionar novos campos de rastreabilidade financeira à tabela rnc_records
ALTER TABLE rnc_records 
ADD COLUMN IF NOT EXISTS has_return BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_quantity DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS return_destination TEXT, -- 'REWORK' ou 'DISCARD'
ADD COLUMN IF NOT EXISTS final_quantity DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_unit_price DECIMAL DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN rnc_records.has_return IS 'Indica se a RNC envolve devolução de mercadoria';
COMMENT ON COLUMN rnc_records.returned_quantity IS 'Quantidade devolvida pelo cliente';
COMMENT ON COLUMN rnc_records.return_destination IS 'Destino da devolução: REWORK (Retrabalho) ou DISCARD (Descarte)';
COMMENT ON COLUMN rnc_records.final_quantity IS 'Quantidade final após retrabalho ou perdas';
COMMENT ON COLUMN rnc_records.new_unit_price IS 'Novo preço unitário caso haja repasse financeiro após retrabalho';
