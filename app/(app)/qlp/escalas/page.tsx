import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { EscalasEditor, type EscalaRow } from '@/components/qlp/EscalasEditor';

export const dynamic = 'force-dynamic';

export default async function EscalasPage() {
  await requireSession('admin');

  const rows = (await db.execute(sql`
    SELECT
      e.id, e.nome, e.dias, e.ativo,
      (SELECT count(*) FROM qlp_colaboradores c WHERE c.escala_id = e.id AND c.ativo)::int AS qtd
    FROM qlp_escalas e
    ORDER BY e.ativo DESC, lower(e.nome)
  `)) as unknown as EscalaRow[];

  return (
    <>
      <TopBar
        titulo="QLP — Escalas"
        subtitulo="Crie e personalize as escalas de trabalho · a atribuição é feita no Quadro"
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <EscalasEditor escalas={rows.map((r) => ({ ...r, qtd: Number(r.qtd) }))} />
      </div>
    </>
  );
}
