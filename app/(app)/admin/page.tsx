import { LayoutDashboard, TrendingUp, Users, BarChart3, Building2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
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

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={LayoutDashboard} label="Total geral" value={stats.total} />
          <StatCard icon={TrendingUp} label="Últimos 7 dias" value={stats.semana} />
          <StatCard
            icon={Users}
            label="Em análise"
            value={Number(stats.porStatus.find((s) => s.status === 'Em análise')?.n ?? 0)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-perlog-orange" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-perlog-slate">Por status</h3>
              </div>
              <div className="space-y-3">
                {stats.porStatus.length === 0 && <p className="text-sm text-perlog-slate">Nenhum dado ainda.</p>}
                {stats.porStatus.map((s) => {
                  const pct = stats.total > 0 ? Math.round((Number(s.n) / stats.total) * 100) : 0;
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                        <span className="text-sm tabular-nums text-perlog-slate">{Number(s.n)} <span className="text-xs">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-perlog-orange rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-perlog-orange" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-perlog-slate">Por filial</h3>
              </div>
              <div className="space-y-2">
                {stats.porFilial.length === 0 && <p className="text-sm text-perlog-slate">Nenhuma filial cadastrada.</p>}
                {stats.porFilial.map((f) => (
                  <div key={f.codigo} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-perlog-slate w-10">{f.codigo}</span>
                      <span className="text-sm font-medium text-perlog-navy">{f.nome}</span>
                    </div>
                    <span className="text-sm tabular-nums font-semibold text-perlog-orange">{Number(f.n)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="grid place-items-center h-12 w-12 rounded-lg bg-perlog-orange/10 text-perlog-orange shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardDescription className="text-xs uppercase tracking-wider">{label}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        </div>
      </CardContent>
    </Card>
  );
}
