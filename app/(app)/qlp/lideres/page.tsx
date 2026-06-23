import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard } from '@/components/ui/conecta-card';
import { NovoLiderForm, type CandidatoColab } from '@/components/qlp/NovoLiderForm';
import { LideresTable, type LiderRow } from '@/components/qlp/LideresTable';
import { getOcorrenciasPorLideres } from '@/db/queries/qlp-ocorrencias';

export const dynamic = 'force-dynamic';

interface FilialRow {
  id: string;
  codigo: string;
  nome: string;
  regional: string | null;
}

export default async function LideresPage() {
  await requireSession('admin');

  const [lideresRaw, filiaisRaw, candidatosRaw] = await Promise.all([
    db.execute(sql`
      SELECT
        l.id, l.tier, l.nivel, l.escopo_nacional, l.filiais_escopo,
        c.id AS colaborador_id,
        c.nome, c.funcao, c.chapa, c.codfilial,
        c.filial_id AS colaborador_filial_id,
        (SELECT count(*) FROM qlp_vinculos v WHERE v.lider_id = l.id)::int AS diretos
      FROM qlp_lideres l
      JOIN qlp_colaboradores c ON c.id = l.colaborador_id
      WHERE l.ativo
      ORDER BY
        CASE l.tier WHEN 'gerente' THEN 1 WHEN 'subgerente' THEN 2 WHEN 'coord' THEN 3 ELSE 4 END,
        l.nivel NULLS LAST,
        c.nome
    `),
    db.execute(sql`
      SELECT id, codigo, nome, regional FROM filiais WHERE ativa ORDER BY codigo
    `),
    db.execute(sql`
      SELECT c.id, c.chapa, c.nome, c.funcao, c.codfilial, c.filial_id,
             c.tier_resolvido, c.nivel_resolvido
      FROM qlp_colaboradores c
      WHERE c.ativo
        AND NOT EXISTS (
          SELECT 1 FROM qlp_lideres l
          WHERE l.colaborador_id = c.id AND l.ativo
        )
      ORDER BY c.nome
    `),
  ]);

  const lideres = lideresRaw as unknown as LiderRow[];
  const filiais = filiaisRaw as unknown as FilialRow[];
  const candidatos = candidatosRaw as unknown as CandidatoColab[];

  const lideresDestino = lideres.map((l) => ({
    id: l.id,
    tier: l.tier,
    nivel: l.nivel,
    escopo_nacional: l.escopo_nacional,
    nome: l.nome,
    funcao: l.funcao,
    codfilial: l.codfilial,
  }));

  const ocorrenciasMap = await getOcorrenciasPorLideres(lideres.map((l) => l.id));
  const lideresComOcorrencias = lideres.map((l) => {
    const o = ocorrenciasMap.get(l.id);
    const bhHoras = o?.bhHoras ?? 0;
    return {
      ...l,
      inconsistencias: o?.inconsistencias ?? 0,
      bh_horas: bhHoras,
      bh_valor: o?.bhValor ?? 0,
      cursos_pendentes: o?.cursosPendentes ?? 0,
      feriados_pendentes: o?.feriadosPendentes ?? 0,
      total_ocorrencias:
        (o?.inconsistencias ?? 0) +
        (bhHoras !== 0 ? 1 : 0) +
        (o?.cursosPendentes ?? 0) +
        (o?.feriadosPendentes ?? 0),
    };
  });

  return (
    <>
      <TopBar
        titulo="QLP — Líderes"
        subtitulo={`${lideres.length} líderes cadastrados · ${candidatos.length} colaboradores ativos no quadro`}
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <ConectaCard>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <NovoLiderForm filiais={filiais} candidatos={candidatos} />
          </div>
        </ConectaCard>

        {lideres.length === 0 ? (
          <ConectaCard>
            <div className="text-sm text-conecta-muted space-y-2">
              <p>Nenhum líder cadastrado ainda.</p>
              <p>
                Use o botão <strong className="text-conecta-primary">Novo líder</strong> para cadastrar
                manualmente os gerentes, coordenadores, supervisores ou encarregados.
              </p>
            </div>
          </ConectaCard>
        ) : (
          <LideresTable
            lideres={lideresComOcorrencias}
            filiais={filiais}
            lideresDestino={lideresDestino}
          />
        )}
      </div>
    </>
  );
}
