-- Índice composto para a query mais quente do painel:
--   SELECT * FROM entrevistas
--   WHERE filial_id = $1
--   ORDER BY data_hora DESC
--   LIMIT 500;
-- O índice solto em data_hora não ajudava (planner caía em scan + sort).
-- Mantemos o anterior `entrevistas_data_idx` por enquanto para não invalidar
-- outras queries que filtrem só por data; pode ser dropado depois.

CREATE INDEX IF NOT EXISTS "entrevistas_filial_data_idx"
  ON "entrevistas" USING btree ("filial_id", "data_hora" DESC);
