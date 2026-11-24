-- Comitê de Desligamento: decisão do comitê sobre cada pedido + ata mensal.
-- Aditiva e idempotente: só adiciona colunas (todas nulas) e uma tabela nova.

ALTER TABLE comite_desligamentos
  ADD COLUMN IF NOT EXISTS decisao        text,         -- NULL = pendente | 'aprovado' | 'nao_aprovado'
  ADD COLUMN IF NOT EXISTS decisao_motivo text,         -- obrigatório quando 'nao_aprovado'
  ADD COLUMN IF NOT EXISTS decidido_por   text,
  ADD COLUMN IF NOT EXISTS decidido_em    timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comite_desl_decisao_chk') THEN
    ALTER TABLE comite_desligamentos
      ADD CONSTRAINT comite_desl_decisao_chk
      CHECK (decisao IS NULL OR decisao IN ('aprovado', 'nao_aprovado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS comite_desl_chapa_idx ON comite_desligamentos(chapa);

-- Ata do comitê de um mês: data da reunião e quem participou.
CREATE TABLE IF NOT EXISTS comite_atas (
  mes_referencia  date PRIMARY KEY,                    -- dia 1 do mês, igual a comite_desligamentos.mes_referencia
  data_comite     date,
  participantes   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- lista de nomes
  atualizado_por  text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comite_atas ENABLE ROW LEVEL SECURITY;
