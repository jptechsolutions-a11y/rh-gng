import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { QuadroTable, type QuadroRow } from '@/components/qlp/QuadroTable';

export const dynamic = 'force-dynamic';

export default async function QuadroPage() {
  const s = await requireSession();
  const filialFilter = s.perfil === 'filial' ? s.filialId : null;

  const rows = (await db.execute(sql`
    SELECT
      c.id, c.chapa, c.nome, c.funcao, c.secao, c.situacao,
      c.tier_resolvido,
      f.codigo AS filial_codigo,
      cl.nome AS lider_nome,
      l.tier  AS lider_tier,
      l.id    AS lider_id
    FROM qlp_colaboradores c
    LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
    LEFT JOIN qlp_lideres l ON l.id = v.lider_id
    LEFT JOIN qlp_colaboradores cl ON cl.id = l.colaborador_id
    LEFT JOIN filiais f ON f.id = c.filial_id
    WHERE c.ativo
      AND (${filialFilter}::uuid IS NULL OR c.filial_id = ${filialFilter}::uuid)
    ORDER BY c.nome
  `)) as unknown as QuadroRow[];

  const podeEditar = s.perfil === 'admin' || s.perfil === 'filial';
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');
  const subtitulo =
    s.perfil === 'filial'
      ? `${s.filialNome} · ${rows.length} colaboradores`
      : `${rows.length} colaboradores ativos`;

  return (
    <>
      <TopBar titulo="QLP — Quadro" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
        <QuadroTable rows={rows} podeEditar={podeEditar} />
      </div>
    </>
  );
}
