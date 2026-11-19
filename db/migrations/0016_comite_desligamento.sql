-- Comitê de Desligamento: lançamentos mensais de colaboradores indicados para desligamento.
CREATE TABLE IF NOT EXISTS comite_desligamentos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_codigo     text NOT NULL,
  chapa             text NOT NULL,
  nome              text NOT NULL,
  funcao            text,
  secao             text,
  dt_admissao       date,
  idade             smallint,               -- do QLP; se o QLP não tiver, informada no lançamento
  horario           text,                   -- horário do QLP (de onde sai o turno)
  qtd_suspensoes    integer NOT NULL DEFAULT 0,
  qtd_advertencias  integer NOT NULL DEFAULT 0,
  mes_referencia    date NOT NULL,           -- sempre o dia 1 do mês de referência do desligamento
  justificativa     text NOT NULL,
  criado_por        text NOT NULL,
  atualizado_por    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comite_desl_chapa_mes_uniq UNIQUE (chapa, mes_referencia)
);
CREATE INDEX IF NOT EXISTS comite_desl_mes_idx ON comite_desligamentos(mes_referencia);
CREATE INDEX IF NOT EXISTS comite_desl_filial_idx ON comite_desligamentos(filial_codigo);

ALTER TABLE comite_desligamentos ENABLE ROW LEVEL SECURITY;
