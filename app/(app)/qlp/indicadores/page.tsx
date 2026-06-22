import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function IndicadoresPage() {
  const s = await requireSession();
  const filialFilter = s.perfil === 'filial' ? s.filialId : null;

  const [distTier, cobertura, pendencias, distSituacao] = await Promise.all([
    db.execute(sql`
      SELECT tier_resolvido AS tier, count(*)::int AS qtd
      FROM qlp_colaboradores
      WHERE ativo AND (${filialFilter}::uuid IS NULL OR filial_id = ${filialFilter}::uuid)
      GROUP BY tier_resolvido
      ORDER BY
        CASE tier_resolvido
          WHEN 'gerente' THEN 1 WHEN 'subgerente' THEN 2 WHEN 'coord' THEN 3
          WHEN 'supervisor' THEN 4 WHEN 'base' THEN 5 ELSE 6
        END
    `),
    db.execute(sql`
      SELECT
        f.codigo,
        f.nome,
        count(c.id)::int AS total,
        count(v.colaborador_id)::int AS com_lider
      FROM filiais f
      LEFT JOIN qlp_colaboradores c ON c.filial_id = f.id AND c.ativo
      LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
      WHERE (${filialFilter}::uuid IS NULL OR f.id = ${filialFilter}::uuid)
      GROUP BY f.id, f.codigo, f.nome
      ORDER BY f.codigo
    `),
    db.execute(sql`
      SELECT tipo, count(*)::int AS qtd
      FROM qlp_pendencias
      WHERE NOT resolvida
      GROUP BY tipo
      ORDER BY count(*) DESC
    `),
    db.execute(sql`
      SELECT situacao, count(*)::int AS qtd
      FROM qlp_colaboradores
      WHERE ativo AND (${filialFilter}::uuid IS NULL OR filial_id = ${filialFilter}::uuid)
      GROUP BY situacao
      ORDER BY count(*) DESC
    `),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Indicadores</h1>
      </header>

      <Section title="Distribuição por tier">
        <Bars rows={distTier as unknown as { tier: string; qtd: number }[]} keyField="tier" />
      </Section>

      <Section title="Distribuição por situação">
        <Bars rows={distSituacao as unknown as { situacao: string; qtd: number }[]} keyField="situacao" />
      </Section>

      <Section title="Cobertura por filial">
        <table className="w-full text-sm">
          <tbody>
            {(cobertura as unknown as { codigo: string; nome: string; total: number; com_lider: number }[]).map((r) => {
              const pct = r.total > 0 ? Math.round((r.com_lider / r.total) * 100) : 0;
              return (
                <tr key={r.codigo} className="border-b border-slate-100">
                  <td className="p-2 w-32 text-slate-700">
                    <span className="font-mono text-xs text-slate-500 mr-1">{r.codigo}</span>
                    {r.nome}
                  </td>
                  <td className="p-2">
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="p-2 text-right text-sm tabular-nums w-32">
                    {r.com_lider}/{r.total} ({pct}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      <Section title="Pendências abertas por tipo">
        {(pendencias as unknown as { tipo: string; qtd: number }[]).length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma pendência aberta. 🎉</p>
        ) : (
          <Bars rows={pendencias as unknown as { tipo: string; qtd: number }[]} keyField="tipo" />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 mb-2">{title}</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">{children}</div>
    </section>
  );
}

function Bars<T extends Record<string, unknown>>({
  rows,
  keyField,
}: {
  rows: T[];
  keyField: keyof T;
}) {
  const max = Math.max(1, ...rows.map((r) => Number((r as Record<string, unknown>)['qtd'])));
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => {
          const k = String(r[keyField] ?? '—');
          const v = Number((r as Record<string, unknown>)['qtd']);
          return (
            <tr key={k} className="border-b border-slate-100">
              <td className="p-2 w-40 text-slate-700">{k}</td>
              <td className="p-2">
                <div className="h-2 bg-slate-100 rounded overflow-hidden">
                  <div className="h-full bg-slate-700" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </td>
              <td className="p-2 text-right tabular-nums w-16 text-slate-700">{v}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
