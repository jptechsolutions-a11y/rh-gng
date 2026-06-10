-- =====================================================
-- Indicadores — Banco de Horas
-- Snapshot atual, snapshot anterior e meta (singleton)
-- =====================================================

CREATE TABLE IF NOT EXISTS "bh_snapshot_atual" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "filial_id" uuid,
  "codfilial_origem" text NOT NULL,
  "chapa" text NOT NULL,
  "nome" text NOT NULL,
  "funcao" text,
  "secao" text,
  "regional" text,
  "bandeira" text,
  "horas_decimal" numeric(10, 2) NOT NULL,
  "valor_pgto" numeric(12, 2) DEFAULT '0' NOT NULL,
  "situacao" text,
  CONSTRAINT "bh_snapshot_atual_filial_id_filiais_id_fk"
    FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "bh_atual_filial_idx" ON "bh_snapshot_atual" ("filial_id");
CREATE INDEX IF NOT EXISTS "bh_atual_chapa_idx"  ON "bh_snapshot_atual" ("chapa");
CREATE INDEX IF NOT EXISTS "bh_atual_secao_idx"  ON "bh_snapshot_atual" ("secao");
CREATE INDEX IF NOT EXISTS "bh_atual_funcao_idx" ON "bh_snapshot_atual" ("funcao");

CREATE TABLE IF NOT EXISTS "bh_snapshot_anterior" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "filial_id" uuid,
  "codfilial_origem" text NOT NULL,
  "chapa" text NOT NULL,
  "nome" text NOT NULL,
  "funcao" text,
  "secao" text,
  "regional" text,
  "bandeira" text,
  "horas_decimal" numeric(10, 2) NOT NULL,
  "valor_pgto" numeric(12, 2) DEFAULT '0' NOT NULL,
  "situacao" text,
  CONSTRAINT "bh_snapshot_anterior_filial_id_filiais_id_fk"
    FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "bh_anterior_chapa_idx" ON "bh_snapshot_anterior" ("chapa");

CREATE TABLE IF NOT EXISTS "bh_meta" (
  "id" text PRIMARY KEY NOT NULL,
  "ultima_atualizacao" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_por" uuid,
  "total_linhas" integer DEFAULT 0 NOT NULL,
  "total_filiais" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "bh_meta_singleton" CHECK ("id" = 'singleton'),
  CONSTRAINT "bh_meta_atualizado_por_admins_id_fk"
    FOREIGN KEY ("atualizado_por") REFERENCES "admins"("id") ON DELETE SET NULL
);
