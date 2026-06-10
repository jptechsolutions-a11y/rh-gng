-- =====================================================
-- Indicadores — Inconsistências
-- Snapshot único (substituído a cada import) + meta singleton
-- =====================================================

CREATE TABLE IF NOT EXISTS "inconsist_snapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "filial_id" uuid,
  "codfilial_origem" text NOT NULL,
  "chapa" text NOT NULL,
  "nome" text NOT NULL,
  "funcao" text,
  "secao" text,
  "regional" text,
  "bandeira" text,
  "tipo" text NOT NULL,
  "data_ocorrencia" date,
  "codsituacao" text,
  CONSTRAINT "inconsist_snapshot_filial_id_filiais_id_fk"
    FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "inconsist_filial_idx" ON "inconsist_snapshot" ("filial_id");
CREATE INDEX IF NOT EXISTS "inconsist_chapa_idx"  ON "inconsist_snapshot" ("chapa");
CREATE INDEX IF NOT EXISTS "inconsist_secao_idx"  ON "inconsist_snapshot" ("secao");
CREATE INDEX IF NOT EXISTS "inconsist_funcao_idx" ON "inconsist_snapshot" ("funcao");

CREATE TABLE IF NOT EXISTS "inconsist_meta" (
  "id" text PRIMARY KEY NOT NULL,
  "ultima_atualizacao" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_por" uuid,
  "total_linhas" integer DEFAULT 0 NOT NULL,
  "total_filiais" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "inconsist_meta_singleton" CHECK ("id" = 'singleton'),
  CONSTRAINT "inconsist_meta_atualizado_por_admins_id_fk"
    FOREIGN KEY ("atualizado_por") REFERENCES "admins"("id") ON DELETE SET NULL
);
