CREATE TABLE IF NOT EXISTS epi_imports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome        text NOT NULL,
  importado_por_nome  text NOT NULL,
  total_linhas        integer NOT NULL DEFAULT 0,
  concluida           boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS epi_linhas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id       uuid NOT NULL REFERENCES epi_imports(id) ON DELETE CASCADE,
  filial_id       uuid REFERENCES filiais(id) ON DELETE SET NULL,
  filial_codigo   text NOT NULL,
  regional        text,
  bandeira        text,
  secao           text,
  chapa           text NOT NULL,
  nome            text NOT NULL,
  funcao          text,
  data_admissao   date,
  codsituacao     text,
  item_risco      text,
  cod_epi         text,
  epi             text NOT NULL,
  durabilidade    integer,
  dias_a_vencer   integer,
  data_emprestimo date,
  status          text NOT NULL,
  tst             text
);
CREATE INDEX IF NOT EXISTS epi_linhas_import_idx ON epi_linhas(import_id);
CREATE INDEX IF NOT EXISTS epi_linhas_filial_idx ON epi_linhas(filial_id);
CREATE INDEX IF NOT EXISTS epi_linhas_chapa_idx ON epi_linhas(chapa);

ALTER TABLE epi_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE epi_linhas ENABLE ROW LEVEL SECURITY;
