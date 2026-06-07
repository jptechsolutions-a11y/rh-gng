import { LayoutDashboard, TrendingUp, Users, BarChart3, Building2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { dashboardStats } from '@/actions/admin';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireSession('admin');
  const stats = await dashboardStats();

  return (
    <>
      <TopBar
        titulo="Dashboard administrativo"
        subtitulo="Visão consolidada das 9 filiais"
        badge="ADMIN"
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* ===== KPIs ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={LayoutDashboard} label="Total geral" value={stats.total} accent />
          <StatCard icon={TrendingUp} label="Últimos 7 dias" value={stats.semana} />
          <StatCard
            icon={Users}
            label="Em análise"
            value={Number(stats.porStatus.find((s) => s.status === 'Em análise')?.n ?? 0)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ===== Por status ===== */}
          <ConectaCard>
            <SectionHeader icon={BarChart3} label="Por status" />
            <div className="space-y-3 mt-4">
              {stats.porStatus.length === 0 && (
                <p className="text-sm text-conecta-muted">Nenhum dado ainda.</p>
              )}
              {stats.porStatus.map((s) => {
                const pct = stats.total > 0 ? Math.round((Number(s.n) / stats.total) * 100) : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                      <span className="text-sm tabular-nums font-display text-conecta-primary">
                        {Number(s.n)}{' '}
                        <span className="text-xs text-conecta-muted">({pct}%)</span>
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-conecta-primary/8 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${s.status}: ${pct}%`}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background:
                            'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ConectaCard>

          {/* ===== Por filial ===== */}
          <ConectaCard>
            <SectionHeader icon={Building2} label="Por filial" />
            <div className="space-y-1 mt-4">
              {stats.porFilial.length === 0 && (
                <p className="text-sm text-conecta-muted">Nenhuma filial cadastrada.</p>
              )}
              {stats.porFilial.map((f) => (
                <div
                  key={f.codigo}
                  className="flex items-center justify-between py-2 border-b border-conecta-primary/8 last:border-0 group hover:bg-conecta-accent/5 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-conecta-muted bg-conecta-primary/5 px-1.5 py-0.5 rounded w-12 text-center">
                      {f.codigo}
                    </span>
                    <span className="text-sm font-display font-semibold text-conecta-primary">
                      {f.nome}
                    </span>
                  </div>
                  <span className="text-sm tabular-nums font-display font-extrabold text-conecta-accent">
                    {Number(f.n)}
                  </span>
                </div>
              ))}
            </div>
          </ConectaCard>
        </div>
      </div>
    </>
  );
}

/* ============ Subcomponentes do padrão Conecta ============ */

function ConectaCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`relative overflow-hidden border-conecta-primary/8 ${className}`}
      style={{ boxShadow: '0 4px 24px -8px rgba(13,43,107,0.10)' }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)' }}
      />
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-[2px] w-6 bg-conecta-accent" />
      <Icon className="h-3.5 w-3.5 text-conecta-accent" />
      <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
        {label}
      </span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card
      className="relative overflow-hidden border-conecta-primary/8 hover:-translate-y-0.5 transition-transform"
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-1"
        style={{
          background: accent
            ? 'linear-gradient(180deg, #E8621A 0%, #FF8C42 100%)'
            : 'linear-gradient(180deg, #0D2B6B 0%, #1A3F8F 100%)',
        }}
      />
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className="grid place-items-center h-12 w-12 rounded-xl shrink-0 text-white"
          style={{
            background: accent
              ? 'linear-gradient(135deg, #E8621A 0%, #FF8C42 100%)'
              : 'linear-gradient(135deg, #0D2B6B 0%, #1A3F8F 100%)',
            boxShadow: accent
              ? '0 10px 22px -8px rgba(232,98,26,0.45)'
              : '0 10px 22px -8px rgba(13,43,107,0.45)',
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted">
            {label}
          </div>
          <div className="font-display text-[28px] font-extrabold text-conecta-primary tabular-nums leading-tight">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
