import Link from 'next/link';
import {
  Users,
  Network,
  History,
  BarChart3,
  ListTree,
  IdCard,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getKPIs } from '@/db/queries/qlp';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function QlpHome() {
  const s = await requireSession();
  const filialId = s.perfil === 'filial' ? s.filialId : null;
  const k = await getKPIs(filialId);

  const cobertura = k.totalAtivos > 0 ? Math.round((k.comLider / k.totalAtivos) * 100) : 0;
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');
  const subtitulo = s.perfil === 'filial' ? s.filialNome : 'Quadro Perlog · Hierarquia';

  return (
    <>
      <TopBar titulo="QLP & Liderança" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Colaboradores ativos"
            value={k.totalAtivos.toLocaleString('pt-BR')}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Com líder"
            value={`${k.comLider.toLocaleString('pt-BR')} / ${k.totalAtivos.toLocaleString('pt-BR')}`}
            hint={`${cobertura}% de cobertura`}
            tone={cobertura >= 80 ? 'success' : cobertura >= 50 ? 'warn' : 'danger'}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Pendências abertas"
            value={k.pendenciasAbertas.toLocaleString('pt-BR')}
            tone={k.pendenciasAbertas > 0 ? 'warn' : 'neutral'}
          />
          <KpiCard
            icon={Clock}
            label="Último sync"
            value={k.ultimoSync ? k.ultimoSync.toLocaleDateString('pt-BR') : '—'}
            hint={k.ultimoSync ? k.ultimoSync.toLocaleTimeString('pt-BR') : undefined}
          />
        </section>

        {/* Atalhos */}
        <section>
          <h2 className="font-display text-[11px] uppercase tracking-[0.22em] text-conecta-muted mb-3">
            Para onde quer ir
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Atalho href="/qlp/quadro" icon={Users} titulo="Quadro" sub="Lista de colaboradores e atribuição de líderes" />
            <Atalho href="/qlp/organograma" icon={Network} titulo="Organograma" sub="Estrutura visual dos líderes" />
            <Atalho href="/qlp/indicadores" icon={BarChart3} titulo="Indicadores" sub="Cobertura, distribuição e pendências" />
            <Atalho href="/qlp/historico" icon={History} titulo="Histórico" sub="Auditoria das movimentações" />
            {s.perfil === 'admin' && (
              <>
                <Atalho href="/qlp/lideres" icon={ListTree} titulo="Líderes" sub="Espinha: gerentes, subgerentes e coords" admin />
                <Atalho href="/qlp/cargos" icon={IdCard} titulo="Cargos" sub="Revisar classificação das funções" admin />
                <Atalho href="/qlp/importar" icon={Upload} titulo="Importar XLS" sub="Sync do Quadro Perlog" admin />
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warn' | 'danger';
}) {
  const stripe: Record<typeof tone, string> = {
    neutral: '#0D2B6B',
    success: '#16a34a',
    warn: '#E8621A',
    danger: '#dc2626',
  };
  return (
    <div className="relative rounded-2xl bg-white border border-conecta-primary/10 p-4 overflow-hidden">
      <span aria-hidden className="absolute top-0 left-0 h-1 w-full" style={{ background: stripe[tone] }} />
      <div className="flex items-start gap-3">
        <div
          className="grid place-items-center h-10 w-10 rounded-xl text-white shrink-0"
          style={{ background: stripe[tone] }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-muted">
            {label}
          </div>
          <div className="font-display text-[22px] font-extrabold text-conecta-primary leading-tight tabular-nums truncate">
            {value}
          </div>
          {hint && <div className="text-[11px] text-conecta-muted mt-0.5">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

function Atalho({
  href,
  icon: Icon,
  titulo,
  sub,
  admin = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  sub: string;
  admin?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl bg-white border border-conecta-primary/10 p-4 hover:border-conecta-accent/40 hover:shadow-[0_12px_28px_-12px_rgba(13,43,107,0.25)] transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className="grid place-items-center h-10 w-10 rounded-xl text-white shrink-0"
          style={{ background: admin ? '#0D2B6B' : '#E8621A' }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-extrabold text-conecta-primary leading-tight">
              {titulo}
            </h3>
            {admin && (
              <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-conecta-muted bg-conecta-primary/5 px-1.5 py-0.5 rounded">
                admin
              </span>
            )}
          </div>
          <p className="text-[12px] text-conecta-muted mt-0.5 leading-snug">{sub}</p>
          <div className="inline-flex items-center gap-1 text-[12px] font-display font-semibold text-conecta-accent mt-2 group-hover:gap-2 transition-all">
            Acessar <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
