-- Módulo Uniformes + usuários "gestor" (gerados a partir dos líderes do QLP).
-- Aditiva e idempotente: só cria tabelas novas (não altera nenhuma tabela existente).

-- Marca quais usuários de acesso são gestores do QLP (e a qual colaborador pertencem).
CREATE TABLE IF NOT EXISTS usuarios_gestores (
  usuario_acesso_id uuid PRIMARY KEY REFERENCES usuarios_acesso(id) ON DELETE CASCADE,
  chapa             text NOT NULL UNIQUE,
  colaborador_id    uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Solicitações de uniforme (substitui o Google Forms).
CREATE TABLE IF NOT EXISTS uniformes_solicitacoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- quem pediu
  solicitante_nome    text NOT NULL,
  solicitante_usuario text NOT NULL,
  solicitante_perfil  text NOT NULL,

  -- para quem
  filial_codigo       text NOT NULL,
  chapa               text NOT NULL,
  colaborador_nome    text NOT NULL,
  funcao              text,
  secao               text,

  -- o que
  item                text NOT NULL,
  tamanho             text NOT NULL,
  quantidade          smallint NOT NULL DEFAULT 1,
  motivo              text NOT NULL,          -- 'troca_funcao' | 'danificado' | 'outro'
  motivo_outro        text,

  -- andamento
  status              text NOT NULL DEFAULT 'solicitado', -- solicitado | aprovado | recusado | pronto | entregue
  motivo_recusa       text,
  decidido_por        text,
  decidido_em         timestamptz,
  pronto_em           timestamptz,
  data_entrega        date,
  entregue_por        text,

  -- devolução do uniforme antigo
  exige_devolucao     boolean NOT NULL DEFAULT true,
  devolvido_em        date,
  devolucao_obs       text,

  observacao          text
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uniformes_status_chk') THEN
    ALTER TABLE uniformes_solicitacoes
      ADD CONSTRAINT uniformes_status_chk
      CHECK (status IN ('solicitado', 'aprovado', 'recusado', 'pronto', 'entregue'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS uniformes_status_idx  ON uniformes_solicitacoes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS uniformes_filial_idx  ON uniformes_solicitacoes(filial_codigo);
CREATE INDEX IF NOT EXISTS uniformes_chapa_idx   ON uniformes_solicitacoes(chapa);

ALTER TABLE usuarios_gestores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniformes_solicitacoes   ENABLE ROW LEVEL SECURITY;
