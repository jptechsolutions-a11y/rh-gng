import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, TrendingUp, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { count, eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage() {
  await requireSession('admin');

  // KPIs globais
  const [totalRows, statusAgg, filialAgg, cargoAgg] = await Promise.all([
    db.select({ c: count() }).from(schema.entrevistas),
    db.select({
      status: schema.entrevistas.status,
      c: count(),
    }).from(schema.entrevistas).groupBy(schema.entrevistas.status),
    db.select({
      filialCodigo: schema.filiais.codigo,
      filialNome: schema.filiais.nome,
      total: count(schema.entrevistas.id),
      aprovados: sql<number>`sum(case when ${schema.entrevistas.status} in ('Aprovado','Contratado') then 1 else 0 end)`,
      reprovados: sql<number>`sum(case when ${schema.entrevistas.status} = 'Reprovado' then 1 else 0 end)`,
      pendentes: sql<number>`sum(case when ${schema.entrevistas.status} not in ('Aprovado','Reprovado','Contratado') then 1 else 0 end)`,
    })
      .from(schema.filiais)
      .leftJoin(schema.entrevistas, eq(schema.entrevistas.filialId, schema.filiais.id))
      .groupBy(schema.filiais.codigo, schema.filiais.nome)
      .orderBy(schema.filiais.codigo),
    db.select({
      cargo: schema.entrevistas.cargoPretendido,
      c: count(),
    }).from(schema.entrevistas)
      .where(sql`${schema.entrevistas.cargoPretendido} is not null`)
      .groupBy(schema.entrevistas.cargoPretendido)
      .orderBy(sql`count(*) desc`)
      .limit(10),
  ]);

  const total = totalRows[0]?.c ?? 0;
  const statusMap = Object.fromEntries(statusAgg.map((s) => [s.status, Number(s.c)]));
  const aprovados = (statusMap['Aprovado'] ?? 0) + (statusMap['Contratado'] ?? 0);
  const reprovados = statusMap['Reprovado'] ?? 0;
  const banco = statusMap['Banco de Talentos'] ?? 0;
  const analise = statusMap['Em análise'] ?? 0;
  const taxaAprov = total > 0 ? Math.round((aprovados / total) * 100) : 0;

  return (
    <>
      <TopBar titulo="Relatórios" subtitulo="Indicadores e exportações globais" badge="ADMIN" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={Users} label="Total entrevistas" value={total} />
          <KpiCard icon={CheckCircle2} label="Aprovados/Contratados" value={aprovados} color="emerald" />
          <KpiCard icon={XCircle} label="Reprovados" value={reprovados} color="red" />
          <KpiCard icon={Clock} label="Em análise" value={analise} color="amber" />
          <KpiCard icon={TrendingUp} label="Taxa de aprovação" value={`${taxaAprov}%`} color="navy" />
        </div>

        {/* Export */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid place-items-center h-12 w-12 rounded-lg bg-perlog-orange/10 text-perlog-orange">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-perlog-navy">Exportar todas as entrevistas (CSV)</h3>
              <p className="text-sm text-perlog-slate">Inclui todos os campos e logs de mudança de status.</p>
            </div>
            <Button asChild>
              <a href="/api/export/csv"><Download className="h-4 w-4" />Baixar CSV</a>
            </Button>
          </CardContent>
        </Card>

        {/* Filial breakdown */}
        <Card>
          <CardContent className="p-5">
            <CardDescription className="text-xs uppercase tracking-wider mb-3">Volume por filial</CardDescription>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
                  <th className="py-2 px-2 font-medium">Filial</th>
                  <th className="py-2 px-2 font-medium text-right">Total</th>
                  <th className="py-2 px-2 font-medium text-right text-emerald-700">Aprov.</th>
                  <th className="py-2 px-2 font-medium text-right text-red-700">Reprov.</th>
                  <th className="py-2 px-2 font-medium text-right text-amber-700">Pendentes</th>
                  <th className="py-2 px-2 font-medium text-right">Taxa aprov.</th>
                </tr>
              </thead>
              <tbody>
                {filialAgg.map((f) => {
                  const t = Number(f.total);
                  const a = Number(f.aprovados);
                  const r = Number(f.reprovados);
                  const p = Number(f.pendentes);
                  const taxa = t > 0 ? Math.round((a / t) * 100) : 0;
                  return (
                    <tr key={f.filialCodigo} className="border-b border-slate-50">
                      <td className="py-2 px-2">
                        <span className="font-medium text-perlog-navy">{f.filialCodigo}</span>{' '}
                        <span className="text-perlog-slate">{f.filialNome}</span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{t}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-700">{a}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-red-700">{r}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-amber-700">{p}</td>
                      <td className="py-2 px-2 text-right tabular-nums font-medium">{taxa}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Cargos mais demandados */}
        <Card>
          <CardContent className="p-5">
            <CardDescription className="text-xs uppercase tracking-wider mb-3">Top 10 cargos demandados</CardDescription>
            {cargoAgg.length === 0 ? (
              <p className="text-sm text-perlog-slate">Sem dados.</p>
            ) : (
              <div className="space-y-2">
                {cargoAgg.map((c) => {
                  const v = Number(c.c);
                  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                  return (
                    <div key={c.cargo ?? '—'} className="flex items-center gap-3">
                      <div className="w-48 text-sm text-perlog-navy font-medium truncate">{c.cargo}</div>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-perlog-orange" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-16 text-right text-xs text-perlog-slate tabular-nums">{v} ({pct}%)</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Banco de talentos info */}
        {banco > 0 && (
          <Card>
            <CardContent className="p-5">
              <CardDescription className="text-xs uppercase tracking-wider mb-2">Banco de talentos</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-perlog-navy">{banco} candidato(s) aguardando</CardTitle>
              <p className="text-sm text-perlog-slate mt-1">Visualize por filial em /banco-talentos · candidatos parados há mais de 30 dias ficam destacados.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function KpiCard({ icon: Icon, label, value, color = 'navy' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color?: 'navy' | 'emerald' | 'red' | 'amber';
}) {
  const colorMap = {
    navy: 'bg-perlog-navy/10 text-perlog-navy',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  } as const;
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`grid place-items-center h-10 w-10 rounded-lg shrink-0 ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <CardDescription className="text-[10px] uppercase tracking-wider truncate">{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        </div>
      </CardContent>
    </Card>
  );
}
