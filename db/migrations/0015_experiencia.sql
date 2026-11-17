-- Avaliação de Experiência (35 e 70 dias): foto por data de extração; reimportar a mesma data substitui.
CREATE TABLE IF NOT EXISTS exp_imports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_ref            date NOT NULL,
  arquivo_nome        text NOT NULL,
  importado_por_nome  text NOT NULL,
  total_colaboradores integer NOT NULL DEFAULT 0,
  concluida           boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Uma linha por colaborador em experiência, com a situação das duas etapas (linha-resumo do arquivo).
CREATE TABLE IF NOT EXISTS exp_linhas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id         uuid NOT NULL REFERENCES exp_imports(id) ON DELETE CASCADE,
  filial_codigo     text NOT NULL,
  chapa             text NOT NULL,
  nome              text NOT NULL,
  dt_admissao       date,
  avaliador_arquivo text,            -- avaliador das linhas individuais (fallback quando o QLP não tem líder)
  prev_35           date,
  status_35         text,            -- PFP | PDP | RDP | RFP ...
  prev_70           date,
  status_70         text
);
CREATE INDEX IF NOT EXISTS exp_linhas_import_idx ON exp_linhas(import_id);
CREATE INDEX IF NOT EXISTS exp_linhas_filial_idx ON exp_linhas(filial_codigo);

ALTER TABLE exp_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE exp_linhas ENABLE ROW LEVEL SECURITY;
