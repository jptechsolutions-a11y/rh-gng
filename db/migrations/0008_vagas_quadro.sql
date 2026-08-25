-- Quadro de Vagas — quadro (limite/potencial/alocados/em aberto), vagas
-- individuais explodidas a partir de EM ABERTO, e catálogo de status.

CREATE TABLE vagas_status (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  ordem      integer NOT NULL DEFAULT 0,
  sistema    boolean NOT NULL DEFAULT false,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vagas_quadro_imports (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome           text NOT NULL,
  importado_por_nome     text NOT NULL,
  total_linhas           integer NOT NULL,
  vagas_criadas          integer NOT NULL DEFAULT 0,
  vagas_fechadas         integer NOT NULL DEFAULT 0,
  filiais_desconhecidas  jsonb NOT NULL DEFAULT '[]',
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vagas_quadro_linhas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id           uuid NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  regional            text,
  bandeira            text,
  funcao              text NOT NULL,
  secao               text,
  limite              integer NOT NULL DEFAULT 0,
  potencial           integer NOT NULL DEFAULT 0,
  alocados            integer NOT NULL DEFAULT 0,
  afastados           integer NOT NULL DEFAULT 0,
  em_aberto_importado integer NOT NULL DEFAULT 0,
  ultima_import_id    uuid REFERENCES vagas_quadro_imports(id),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vagas_quadro_linhas_unq ON vagas_quadro_linhas(filial_id, funcao, secao);
CREATE INDEX vagas_quadro_linhas_filial_idx ON vagas_quadro_linhas(filial_id);

CREATE TABLE vagas (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id                  uuid NOT NULL REFERENCES vagas_quadro_linhas(id) ON DELETE CASCADE,
  filial_id                 uuid NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  funcao                    text NOT NULL,
  secao                     text,
  status_id                 uuid NOT NULL REFERENCES vagas_status(id) ON DELETE RESTRICT,
  status_atualizado_em      timestamptz NOT NULL DEFAULT now(),
  status_atualizado_por_nome text,
  ativa                     boolean NOT NULL DEFAULT true,
  motivo_fechamento         text,
  origem_import_id          uuid REFERENCES vagas_quadro_imports(id),
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vagas_linha_idx ON vagas(linha_id);
CREATE INDEX vagas_filial_idx ON vagas(filial_id);
CREATE INDEX vagas_status_idx ON vagas(status_id);
CREATE INDEX vagas_ativa_idx ON vagas(ativa);

-- Seed do catálogo de status — "Em aberto" é o status inicial obrigatório
-- de toda vaga nova (sistema=true, protegido contra exclusão/renomeação).
INSERT INTO vagas_status (nome, ordem, sistema, ativo) VALUES
  ('Em aberto', 0, true, true),
  ('Em processo de documentação', 1, false, true),
  ('Entrevista agendada', 2, false, true),
  ('Aguardando aprovação', 3, false, true),
  ('Preenchida', 4, false, true)
ON CONFLICT (nome) DO NOTHING;
