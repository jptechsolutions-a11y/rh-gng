-- Passa a guardar várias atualizações do painel de EPI (para comparar com a anterior).
ALTER TABLE epi_imports ADD COLUMN IF NOT EXISTS data_ref date;

-- Preenche a data do painel das importações já existentes a partir do nome do arquivo ("... 03-11-2026.xlsm").
UPDATE epi_imports
SET data_ref = to_date(substring(arquivo_nome FROM '(\d{2}-\d{2}-\d{4})'), 'DD-MM-YYYY')
WHERE data_ref IS NULL AND arquivo_nome ~ '\d{2}-\d{2}-\d{4}';

UPDATE epi_imports SET data_ref = created_at::date WHERE data_ref IS NULL;
