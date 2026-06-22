import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
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
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Cargos &amp; Hierarquia</h1>
        <p className="text-sm text-slate-500 mt-1">
          Revise a classificação automática de cada função. Mudar o tier propaga para todos os colaboradores com aquela função.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhuma função classificada ainda. Faça o import do XLS primeiro.</p>
      ) : (
        <CargoEditor rows={rows} />
      )}
    </div>
  );
}
