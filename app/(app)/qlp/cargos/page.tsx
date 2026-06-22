import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { CargoEditor, type CargoRow } from '@/components/qlp/CargoEditor';

export const dynamic = 'force-dynamic';

export default async function CargosPage() {
  await requireSession('admin');

  const rows = (await db.execute(sql`
    SELECT
      fc.funcao,
      fc.tier,
      fc.nivel,
      fc.trilha,
      fc.confirmada_por_admin,
      (SELECT count(*) FROM qlp_colaboradores c WHERE c.funcao = fc.funcao AND c.ativo)::int AS qtd
    FROM qlp_funcoes_cargo fc
    ORDER BY
      CASE fc.tier
        WHEN 'gerente' THEN 1
        WHEN 'subgerente' THEN 2
        WHEN 'coord' THEN 3
        WHEN 'supervisor' THEN 4
        ELSE 5
      END,
      fc.funcao
  `)) as unknown as CargoRow[];

  return (
    <>
      <TopBar
        titulo="QLP — Cargos & Hierarquia"
        subtitulo="Revise a classificação das funções · mudar o tier propaga para os colaboradores"
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-white border border-conecta-primary/10 p-6 text-sm text-conecta-muted">
            Nenhuma função classificada ainda. Faça o import do XLS primeiro.
          </p>
        ) : (
          <CargoEditor rows={rows} />
        )}
      </div>
    </>
  );
}
