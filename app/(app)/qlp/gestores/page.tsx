import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { GestoresGrid, type GestorCardData } from '@/components/qlp/GestoresGrid';
import { getOcorrenciasPorLideres } from '@/db/queries/qlp-ocorrencias';

export const dynamic = 'force-dynamic';

interface LiderRow {
  id: string;
  colaborador_id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  filiais_escopo: string[];
  nome: string;
  funcao: string;
  chapa: string;
  codfilial: number;
  filial_codigo: string | null;
  filial_nome: string | null;
  diretos: number;
}

interface FilialRow {
  id: string;
  codigo: string;
  nome: string;
  regional: string | null;
}

export default async function GestoresPage() {
  const s = await requireSession();
  const filialFilter = s.perfil === 'filial' ? s.filialId : null;

  const [lideresRaw, filiaisRaw] = await Promise.all([
    db.execute(sql`
      SELECT
        l.id,
        c.id   AS colaborador_id,
        l.tier, l.nivel, l.escopo_nacional, l.filiais_escopo,
        c.nome, c.funcao, c.chapa, c.codfilial,
        f.codigo AS filial_codigo,
        f.nome   AS filial_nome,
        (SELECT count(*) FROM qlp_vinculos v WHERE v.lider_id = l.id)::int AS diretos
      FROM qlp_lideres l
      JOIN qlp_colaboradores c ON c.id = l.colaborador_id
      LEFT JOIN filiais f ON f.id = c.filial_id
      WHERE l.ativo
        AND (${filialFilter}::uuid IS NULL OR c.filial_id = ${filialFilter}::uuid)
      ORDER BY
        CASE l.tier
          WHEN 'gerente' THEN 1 WHEN 'subgerente' THEN 2 WHEN 'coord' THEN 3
          WHEN 'supervisor' THEN 4 WHEN 'encarregado' THEN 5 ELSE 6
        END,
        l.nivel NULLS LAST,
        c.nome
    `),
    db.execute(sql`
      SELECT id, codigo, nome, regional FROM filiais WHERE ativa ORDER BY codigo
    `),
  ]);

  const lideres = lideresRaw as unknown as LiderRow[];
  const filiais = filiaisRaw as unknown as FilialRow[];

  const ocorrenciasMap = await getOcorrenciasPorLideres(lideres.map((l) => l.id));

  const gestores: GestorCardData[] = lideres.map((l) => {
    const o = ocorrenciasMap.get(l.id);
    const bhHoras = o?.bhHoras ?? 0;
    const inconsist = o?.inconsistencias ?? 0;
    const cursos = o?.cursosPendentes ?? 0;
    const feriados = o?.feriadosPendentes ?? 0;
    return {
      liderId: l.id,
      colaboradorId: l.colaborador_id,
      nome: l.nome,
      funcao: l.funcao,
      chapa: l.chapa,
      tier: l.tier,
      nivel: l.nivel,
      escopoNacional: l.escopo_nacional,
      filiaisEscopo: l.filiais_escopo ?? [],
      codfilial: l.codfilial,
      filialCodigo: l.filial_codigo,
      filialNome: l.filial_nome,
      diretos: l.diretos,
      totalTime: o?.totalTime ?? l.diretos,
      inconsistencias: inconsist,
      bhHoras,
      bhValor: o?.bhValor ?? 0,
      cursosPendentes: cursos,
      feriadosPendentes: feriados,
      totalOcorrencias: inconsist + cursos + feriados + (bhHoras !== 0 ? 1 : 0),
    };
  });

  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');
  const subtitulo =
    s.perfil === 'filial'
      ? `${s.filialNome} · ${gestores.length} gestores`
      : `${gestores.length} gestores ativos`;

  return (
    <>
      <TopBar titulo="QLP — Gestores" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
        <GestoresGrid gestores={gestores} filiais={filiais} />
      </div>
    </>
  );
}
