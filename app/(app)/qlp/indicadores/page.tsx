import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { BarChart3, AlertTriangle, Map, Activity } from 'lucide-react';

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

  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar
        titulo="QLP — Indicadores"
        subtitulo="Distribuição e cobertura"
        badge={badge}
      />
      <div className="space-y-5 p-4 lg:p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <ConectaCard>
            <SectionHeader label="Distribuição por tier" icon={BarChart3} className="mb-4" />
            <Bars rows={distTier as unknown as { tier: string; qtd: number }[]} keyField="tier" />
          </ConectaCard>

          <ConectaCard>
            <SectionHeader label="Distribuição por situação" icon={Activity} className="mb-4" />
            <Bars rows={distSituacao as unknown as { situacao: string; qtd: number }[]} keyField="situacao" />
          </ConectaCard>
        </div>

        <ConectaCard>
          <SectionHeader label="Cobertura por filial" icon={Map} className="mb-4" />
          <table className="w-full text-sm">
            <tbody>
              {(cobertura as unknown as { codigo: string; nome: string; total: number; com_lider: number }[]).map(
                (r) => {
                  const pct = r.total > 0 ? Math.round((r.com_lider / r.total) * 100) : 0;
                  return (
                    <tr key={r.codigo} className="border-b border-conecta-primary/5 last:border-b-0">
                      <td className="py-2 pr-3 w-48">
                        <span className="font-mono text-[12px] text-conecta-primary/80 mr-2">{r.codigo}</span>
                        <span className="font-display text-conecta-primary text-[13px]">{r.nome}</span>
                      </td>
                      <td className="py-2">
                        <div className="h-2 bg-conecta-primary/8 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#E8621A' : '#dc2626',
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2 pl-3 text-right text-[12px] tabular-nums w-32">
                        <span className="font-display font-bold text-conecta-accent">{r.com_lider}/{r.total}</span>
                        <span className="text-conecta-muted ml-1">({pct}%)</span>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </ConectaCard>

        <ConectaCard>
          <SectionHeader label="Pendências abertas por tipo" icon={AlertTriangle} className="mb-4" />
          {(pendencias as unknown as { tipo: string; qtd: number }[]).length === 0 ? (
            <p className="text-sm text-conecta-muted">Nenhuma pendência aberta.</p>
          ) : (
            <Bars rows={pendencias as unknown as { tipo: string; qtd: number }[]} keyField="tipo" />
          )}
        </ConectaCard>
      </div>
    </>
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
            <tr key={k} className="border-b border-conecta-primary/5 last:border-b-0">
              <td className="py-2 pr-3 w-44 font-display font-semibold text-conecta-primary text-[13px]">{k}</td>
              <td className="py-2">
                <div className="h-2 bg-conecta-primary/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(v / max) * 100}%`,
                      background: 'linear-gradient(90deg, #0D2B6B 0%, #1A3F8F 100%)',
                    }}
                  />
                </div>
              </td>
              <td className="py-2 pl-3 text-right tabular-nums w-16 font-display font-bold text-conecta-accent">
                {v}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
