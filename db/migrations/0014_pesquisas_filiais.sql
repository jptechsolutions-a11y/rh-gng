-- Pesquisa válida só para as filiais escolhidas (null = todas).
ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS filiais_alvo jsonb;
