import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Briefcase,
  BookmarkCheck,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { count, eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage() {
  await requireSession('admin');

  const [totalRows, statusAgg, filialAgg, cargoAgg] = await Promise.all([
    db.select({ c: count() }).from(schema.entrevistas),
    db
      .select({ status: schema.entrevistas.status, c: count() })
      .from(schema.entrevistas)
      .groupBy(schema.entrevistas.status),
    db
      .select({
        filialCodigo: schema.filiais.codigo,
        filialNome: schema.filiais.nome,
        total: count(schema.entrevistas.id),
        aprovados: sql<number>`sum(case when ${schema.entrevistas.status} in ('Aprovado','Contratado') then 1 else 0 end)`,
        reprovados: sql<number>`sum(case when ${schema.entrevistas.status} = 'Reprovado' then 1 else 0 end)`,
        pendentes: sql<number>`sum(case when ${schema.entrevistas.status} not in ('Aprovado','Reprovado','Contratado') then 1 else 0 end)`,
      })
      .from(schema.filiais)
      .leftJoin(
        schema.entrevistas,
        eq(schema.entrevistas.filialId, schema.filiais.id),
      )
      .groupBy(schema.filiais.codigo, schema.filiais.nome)
      .orderBy(schema.filiais.codigo),
    db
      .select({ cargo: schema.entrevistas.cargoPretendido, c: count() })
      .from(schema.entrevistas)
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
      <TopBar
        titulo="Relatórios"
        subtitulo="Indicadores e exportações globais"
        badge="ADMIN"
      />

      <div className="p-6 space-y-5">
        {/* ===== KPIs ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={Users} label="Total entrevistas" value={total} accent />
          <KpiCard icon={CheckCircle2} label="Aprovados / Contratados" value={aprovados} color="emerald" />
          <KpiCard icon={XCircle} label="Reprovados" value={reprovados} color="red" />
          <KpiCard icon={Clock} label="Em análise" value={analise} color="amber" />
          <KpiCard icon={TrendingUp} label="Taxa de aprovação" value={`${taxaAprov}%`} accent />
        </div>

        {/* ===== Export ===== */}
        <ConectaCard>
          <div className="flex items-center gap-4">
            <div
              className="grid place-items-center h-12 w-12 rounded-xl shrink-0 text-white"
              style={{
                background: '#E8621A',
                boxShadow: '0 10px 22px -8px rgba(232,98,26,0.45)',
              }}
            >
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-extrabold text-conecta-primary tracking-tight">
                Exportar todas as entrevistas (CSV)
              </h3>
              <p className="text-sm text-conecta-muted">
                Inclui todos os campos e logs de mudança de status.
              </p>
            </div>
            <Button asChild variant="conecta" size="conecta" className="text-sm shrink-0">
              <a href="/api/export/csv">
                <Download className="h-4 w-4" />
                Baixar CSV
              </a>
            </Button>
          </div>
        </ConectaCard>

        {/* ===== Filial breakdown ===== */}
        <ConectaCard noPadding>
          <div className="p-5 pb-3">
            <SectionHeader label="Volume por filial" icon={Building2} />
          </div>
          <div className="overflow-x-auto">
            <table className="conecta-table">
              <thead>
                <tr>
                  <th>Filial</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Aprov.</th>
                  <th className="text-right">Reprov.</th>
                  <th className="text-right">Pendentes</th>
                  <th className="text-right">Taxa aprov.</th>
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
                    <tr key={f.filialCodigo}>
                      <td>
                        <span className="font-mono text-[11px] text-conecta-muted bg-conecta-primary/5 px-1.5 py-0.5 rounded mr-2">
                          {f.filialCodigo}
                        </span>
                        <span className="font-display font-semibold text-conecta-primary">
                          {f.filialNome}
                        </span>
                      </td>
                      <td className="text-right tabular-nums font-display font-semibold text-conecta-primary">
                        {t}
                      </td>
                      <td className="text-right tabular-nums text-emerald-700">{a}</td>
                      <td className="text-right tabular-nums text-red-700">{r}</td>
                      <td className="text-right tabular-nums text-amber-700">{p}</td>
                      <td className="text-right tabular-nums font-display font-bold text-conecta-accent">
                        {taxa}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ConectaCard>

        {/* ===== Top cargos ===== */}
        <ConectaCard>
          <SectionHeader label="Top 10 cargos demandados" icon={Briefcase} />
          <div className="mt-4">
            {cargoAgg.length === 0 ? (
              <p className="text-sm text-conecta-muted">Sem dados.</p>
            ) : (
              <div className="space-y-2.5">
                {cargoAgg.map((c) => {
                  const v = Number(c.c);
                  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                  return (
                    <div key={c.cargo ?? '—'} className="flex items-center gap-3">
                      <div className="w-48 text-sm font-display font-semibold text-conecta-primary truncate">
                        {c.cargo}
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-conecta-primary/8 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background:
                              'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)',
                          }}
                        />
                      </div>
                      <div className="w-20 text-right text-xs text-conecta-muted tabular-nums">
                        <span className="font-display font-semibold text-conecta-primary">
                          {v}
                        </span>{' '}
                        ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ConectaCard>

        {/* ===== Banco ===== */}
        {banco > 0 && (
          <ConectaCard variant="navy">
            <SectionHeader label="Banco de talentos" icon={BookmarkCheck} />
            <div className="mt-3">
              <div className="font-display text-3xl font-extrabold text-conecta-primary tabular-nums">
                {banco}{' '}
                <span className="text-base font-medium text-conecta-muted">
                  candidato(s) aguardando
                </span>
              </div>
              <p className="text-sm text-conecta-muted mt-1.5">
                Visualize por filial em <strong>/banco-talentos</strong> — candidatos parados
                há mais de 30 dias ficam destacados.
              </p>
            </div>
          </ConectaCard>
        )}
      </div>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color?: 'emerald' | 'red' | 'amber';
  accent?: boolean;
}) {
  let bg = 'linear-gradient(135deg, #0D2B6B 0%, #1A3F8F 100%)';
  let shadow = '0 10px 22px -8px rgba(13,43,107,0.45)';
  let bar = 'linear-gradient(180deg, #0D2B6B 0%, #1A3F8F 100%)';

  if (accent) {
    bg = 'linear-gradient(135deg, #E8621A 0%, #FF8C42 100%)';
    shadow = '0 10px 22px -8px rgba(232,98,26,0.45)';
    bar = '#E8621A';
  } else if (color === 'emerald') {
    bg = 'linear-gradient(135deg, #047857 0%, #10b981 100%)';
    shadow = '0 10px 22px -8px rgba(4,120,87,0.4)';
    bar = '#047857';
  } else if (color === 'red') {
    bg = 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)';
    shadow = '0 10px 22px -8px rgba(185,28,28,0.4)';
    bar = '#b91c1c';
  } else if (color === 'amber') {
    bg = 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)';
    shadow = '0 10px 22px -8px rgba(180,83,9,0.4)';
    bar = '#b45309';
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-white border border-conecta-primary/8 p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-1"
        style={{ background: bar }}
      />
      <div
        className="grid place-items-center h-10 w-10 rounded-lg shrink-0 text-white"
        style={{ background: bg, boxShadow: shadow }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-[10px] uppercase tracking-[0.18em] text-conecta-muted truncate">
          {label}
        </div>
        <div className="font-display text-[22px] font-extrabold text-conecta-primary tabular-nums leading-tight">
          {value}
        </div>
      </div>
    </div>
  );
}
