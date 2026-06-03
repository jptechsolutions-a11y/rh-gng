-- Habilita RLS nas 5 tabelas do módulo Avaliação de Desempenho.
-- Server actions usam service_role, então criamos policies amplas para essa role.
-- Aplicado em produção via Supabase MCP em 2026-06-03 (vewueqdplyyuzpfcybzh).

ALTER TABLE pessoas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatores_avaliacao     ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_detalhes   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY service_all_pessoas ON pessoas FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_all_competencias ON competencias FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_all_fatores_avaliacao ON fatores_avaliacao FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_all_avaliacoes_desempenho ON avaliacoes_desempenho FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_all_avaliacoes_detalhes ON avaliacoes_detalhes FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
