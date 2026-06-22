import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { OrgChartTree, type LiderCard } from '@/components/qlp/OrgChartTree';

export const dynamic = 'force-dynamic';

export default async function OrgPage() {
  await requireSession();

  const lideres = (await db.execute(sql`
    SELECT
      l.id,
      l.colaborador_id,
      l.tier,
      l.nivel,
      l.escopo_nacional,
      jsonb_array_length(l.filiais_escopo) AS filiais_escopo_count,
      c.nome,
      c.funcao,
      c.codfilial,
      (SELECT count(*) FROM qlp_vinculos v WHERE v.lider_id = l.id)::int AS qtd_diretos,
      (
        WITH RECURSIVE descend AS (
          SELECT v.colaborador_id FROM qlp_vinculos v WHERE v.lider_id = l.id
          UNION ALL
          SELECT v2.colaborador_id
          FROM descend d
          JOIN qlp_lideres l2 ON l2.colaborador_id = d.colaborador_id
          JOIN qlp_vinculos v2 ON v2.lider_id = l2.id
        )
        SELECT count(*)::int FROM descend
      ) AS qtd_total
    FROM qlp_lideres l
    JOIN qlp_colaboradores c ON c.id = l.colaborador_id
    WHERE l.ativo
    ORDER BY
      CASE l.tier WHEN 'gerente' THEN 1 WHEN 'subgerente' THEN 2 WHEN 'coord' THEN 3 ELSE 4 END,
      c.nome
  `)) as unknown as LiderCard[];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Organograma</h1>
        <p className="text-sm text-slate-500 mt-1">
          Só líderes; clique em um cartão para ver detalhes e cadeia. O total inclui herança recursiva.
        </p>
      </header>
      {lideres.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhum líder cadastrado ainda. Cadastre na tela <strong>Líderes</strong> (admin).
        </p>
      ) : (
        <OrgChartTree lideres={lideres} />
      )}
    </div>
  );
}
