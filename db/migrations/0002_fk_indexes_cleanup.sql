-- Índices de cobertura para FKs apontados pelo Supabase performance advisor.
-- Impacto hoje é baixo (tabelas pequenas), mas evita seq scan em cascade/joins
-- conforme os dados crescem, e silencia os lints 0001_unindexed_foreign_keys.
CREATE INDEX IF NOT EXISTS "sessoes_filial_id_idx"        ON "sessoes" ("filial_id");
CREATE INDEX IF NOT EXISTS "sessoes_admin_id_idx"         ON "sessoes" ("admin_id");
CREATE INDEX IF NOT EXISTS "aval_desemp_gestor_id_idx"    ON "avaliacoes_desempenho" ("gestor_id");
CREATE INDEX IF NOT EXISTS "aval_det_competencia_id_idx"  ON "avaliacoes_detalhes" ("competencia_id");
CREATE INDEX IF NOT EXISTS "aval_det_fator_id_idx"        ON "avaliacoes_detalhes" ("fator_id");

-- Remove índice redundante: já coberto pelo composto entrevistas_filial_data_idx
-- (lint 0005_unused_index). Os *_trgm_idx NÃO são removidos: servem ao ILIKE
-- da buscaGlobal; aparecem "unused" apenas porque a base ainda é pequena.
DROP INDEX IF EXISTS "entrevistas_data_idx";
