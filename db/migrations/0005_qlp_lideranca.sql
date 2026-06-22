-- QLP & Liderança — espelho do quadro Perlog + hierarquia de líderes + auditoria
-- Aplicada via MCP Supabase em 2026-06-21 (project: vewueqdplyyuzpfcybzh / rh-gng)

CREATE TABLE qlp_colaboradores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapa           text UNIQUE NOT NULL,
  nome            text NOT NULL,
  regional        text,
  bandeira        text,
  codfilial       integer NOT NULL,
  filial_id       uuid REFERENCES filiais(id),
  funcao          text NOT NULL,
  secao           text,
  horario         text,
  nacionalidade   text,
  dt_admissao     date,
  mes_nasc        smallint,
  idade           smallint,
  situacao        text,
  ativo           boolean NOT NULL DEFAULT true,
  tier_resolvido  text,
  nivel_resolvido text,
  trilha_resolvida text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qlp_colab_filial_idx ON qlp_colaboradores(filial_id) WHERE ativo;
CREATE INDEX qlp_colab_tier_idx   ON qlp_colaboradores(tier_resolvido) WHERE ativo;
CREATE INDEX qlp_colab_funcao_idx ON qlp_colaboradores(funcao);

CREATE TABLE qlp_funcoes_cargo (
  funcao               text PRIMARY KEY,
  tier                 text NOT NULL,
  nivel                text,
  trilha               text,
  classificada_em      timestamptz NOT NULL DEFAULT now(),
  confirmada_por_admin boolean NOT NULL DEFAULT false
);

CREATE TABLE qlp_lideres (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  uuid UNIQUE NOT NULL REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  tier            text NOT NULL,
  nivel           text,
  escopo_nacional boolean NOT NULL DEFAULT false,
  filiais_escopo  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE qlp_vinculos (
  colaborador_id  uuid PRIMARY KEY REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  lider_id        uuid NOT NULL REFERENCES qlp_lideres(id) ON DELETE CASCADE,
  origem          text NOT NULL,
  criado_por      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qlp_vinc_lider_idx ON qlp_vinculos(lider_id);

CREATE TABLE qlp_imports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo       text,
  executado_por text NOT NULL,
  executado_em  timestamptz NOT NULL DEFAULT now(),
  total_linhas  integer,
  novos         integer,
  atualizados   integer,
  desligados    integer,
  mudanca_tier  jsonb,
  pendencias    jsonb
);

CREATE TABLE qlp_pendencias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           text NOT NULL,
  colaborador_id uuid REFERENCES qlp_colaboradores(id) ON DELETE CASCADE,
  descricao      text,
  criada_em      timestamptz NOT NULL DEFAULT now(),
  resolvida      boolean NOT NULL DEFAULT false,
  resolvida_em   timestamptz,
  resolvida_por  text
);
CREATE INDEX qlp_pend_aberta_idx ON qlp_pendencias(tipo) WHERE NOT resolvida;

CREATE TABLE qlp_historico (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento             text NOT NULL,
  colaborador_id     uuid,
  lider_id_antigo    uuid,
  lider_id_novo      uuid,
  detalhes           jsonb,
  ator_tipo          text NOT NULL,
  ator_id            uuid,
  ator_nome          text,
  filial_contexto_id uuid,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qlp_hist_colab_idx  ON qlp_historico(colaborador_id, created_at DESC);
CREATE INDEX qlp_hist_data_idx   ON qlp_historico(created_at DESC);
CREATE INDEX qlp_hist_filial_idx ON qlp_historico(filial_contexto_id);

-- Defesa em profundidade: bloquear acesso anon/authenticated; só service-role server-side
ALTER TABLE qlp_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE qlp_funcoes_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE qlp_lideres        ENABLE ROW LEVEL SECURITY;
ALTER TABLE qlp_vinculos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE qlp_imports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE qlp_pendencias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE qlp_historico      ENABLE ROW LEVEL SECURITY;
