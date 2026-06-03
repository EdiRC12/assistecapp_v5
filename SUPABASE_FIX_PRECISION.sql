-- Este script altera a coluna quantity da tabela ee_inventory para suportar 3 casas decimais (ex: 0.575)
-- sem arredondar para 0.58.

ALTER TABLE ee_inventory 
ALTER COLUMN quantity TYPE NUMERIC(10,3);

-- Caso exista a coluna qty_produced ou outras que também precisem de 3 casas, pode rodar o comando abaixo:
-- ALTER TABLE ee_inventory ALTER COLUMN qty_produced TYPE NUMERIC(10,3);
-- ALTER TABLE tech_tests ALTER COLUMN produced_quantity TYPE NUMERIC(10,3);
