import Link from 'next/link';
import {
  Plus,
  Search,
  Users,
  ClipboardList,
  TrendingUp,
  History,
  BookmarkCheck,
  ArrowRight,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilialSlim } from '@/actions/entrevistas';
import { PainelRecentesBusca, WeeklyChart } from './PainelClient';

export const dynamic = 'force-dynamic';

export default async function PainelPage() {
  const s = await requireSession('filial');
  const entrevistas = await listarEntrevistasFilialSlim();

  const total = entrevistas.length;
  const ultimaSemana = entrevistas.filter((e) => e.dataHora.getTime() > Date.now() - 7 * 86400000).length;
  const aprovados = entrevistas.filter((e) => e.status === 'Aprovado' || e.status === 'Contratado').length;
  const bancoTalentos = entrevistas.filter((e) => e.status === 'Banco de Talentos').length;

  // Gráfico — entrevistas por semana (últimas 8)
  const chartData: Array<{ label: string; value: number; date: string }> = [];
  const now = Date.now();
  const fmtDM = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
  for (let i = 7; i >= 0; i--) {
    const inicio = now - (i + 1) * 7 * 86400000;
    const fim = now - i * 7 * 86400000;
    const count = entrevistas.filter((e) => e.dataHora.getTime() >= inicio && e.dataHora.getTime() < fim).length;
    const semanaLabel = i === 0 ? 'esta' : `−${i}s`;
    const ini = fmtDM.format(new Date(inicio));
    const f = fmtDM.format(new Date(fim - 86400000));
    chartData.push({ label: semanaLabel, value: count, date: `${ini}–${f}` });
  }

  return (
    <>
      <TopBar
        titulo={`Painel — ${s.filialNome}`}
        subtitulo="Visão geral das entrevistas da sua filial"
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* ===== KPIs ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} label="Total de entrevistas" value={total} accent />
          <StatCard icon={TrendingUp} label="Últimos 7 dias" value={ultimaSemana} />
          <StatCard icon={Users} label="Aprovados / Contratados" value={aprovados} />
          <StatCard icon={BookmarkCheck} label="Banco de talentos" value={bancoTalentos} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ===== Gráfico ===== */}
          <ConectaCard className="lg:col-span-2">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-6 bg-conecta-accent" />
                  <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
                    Entrevistas por semana
                  </span>
                </div>
                <h3 className="font-display text-xl font-extrabold text-conecta-primary mt-1.5">
                  Tendência das últimas 8 semanas
                </h3>
              </div>
            </div>
            <WeeklyChart data={chartData} />
          </ConectaCard>

          {/* ===== Atalhos ===== */}
          <ConectaCard>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-[2px] w-6 bg-conecta-accent" />
              <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
                Atalhos
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Shortcut href="/entrevista/nova" icon={Plus} label="Nova entrevista" primary />
              <Shortcut href="/historico" icon={History} label="Histórico" />
              <Shortcut href="/banco-talentos" icon={Search} label="Banco de talentos" />
              <Shortcut href="/agenda" icon={BookmarkCheck} label="Agenda de retornos" />
            </div>
          </ConectaCard>
        </div>

        {/* ===== Recentes ===== */}
        <div className="flex items-center gap-3">
          <span className="h-[2px] w-8 bg-conecta-accent" />
          <h2 className="font-display text-[11px] uppercase tracking-[0.32em] text-conecta-primary font-semibold">
            Entrevistas recentes
          </h2>
          <span className="flex-1 h-px bg-conecta-primary/8" />
        </div>

        <ConectaCard noPadding>
          <div className="p-4 space-y-3">
            {entrevistas.length === 0 ? (
              <div className="p-12 text-center text-conecta-muted">
                <ClipboardList className="mx-auto h-10 w-10 text-conecta-primary/20 mb-3" />
                <p className="font-display font-semibold text-conecta-primary">
                  Nenhuma entrevista ainda
                </p>
                <p className="text-sm mt-1">
                  Clique em &ldquo;Nova entrevista&rdquo; para começar.
                </p>
              </div>
            ) : (
              <PainelRecentesBusca entrevistas={entrevistas} />
            )}
          </div>
        </ConectaCard>
      </div>
    </>
  );
}

/* ============ Componentes do padrão visual Conecta ============ */

function ConectaCard({
  children,
  className = '',
  noPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <Card
      className={`relative overflow-hidden border-conecta-primary/8 ${className}`}
      style={{ boxShadow: '0 4px 24px -8px rgba(13,43,107,0.10)' }}
    >
      {/* Tarja superior gradiente laranja (assinatura do padrão Conecta) */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)',
        }}
      />
      <CardContent className={noPadding ? 'p-0' : 'p-6'}>{children}</CardContent>
    </Card>
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
      className="relative overflow-hidden border-conecta-primary/8 group hover:-translate-y-0.5 transition-transform"
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
          className="grid place-items-center h-12 w-12 rounded-xl shrink-0 text-white shadow-md"
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

function Shortcut({
  href,
  icon: Icon,
  label,
  primary = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <Link
        href={href}
        className="group conecta-btn-primary justify-between w-full text-sm"
      >
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-conecta-primary/10 bg-white px-3 py-2 text-sm font-display text-conecta-primary hover:border-conecta-accent/40 hover:bg-conecta-accent/5 transition-colors"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-conecta-accent" />
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-conecta-muted group-hover:text-conecta-accent group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
