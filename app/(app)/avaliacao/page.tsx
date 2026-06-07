import Link from 'next/link';
import {
  ClipboardList,
  History,
  BarChart3,
  Plus,
  TrendingUp,
  Award,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listarHistorico, statsHistorico } from '@/actions/avaliacao';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import type { Classificacao } from '@/lib/avaliacao/calculos';

export const dynamic = 'force-dynamic';

export default async function AvaliacaoHome() {
  await requireSession();
  const [stats, ultimas] = await Promise.all([
    statsHistorico(),
    listarHistorico({ perPage: 5 }),
  ]);
  return (
    <>
      <TopBar titulo="Avaliação de desempenho" subtitulo="Visão geral" />

      <div className="space-y-5 p-6">
        <div className="flex justify-end">
          <Button asChild variant="conecta" size="conecta" className="text-sm">
            <Link href="/avaliacao/nova">
              <Plus className="h-4 w-4" />
              Nova avaliação
            </Link>
          </Button>
        </div>

        {/* ===== KPIs ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={ClipboardList} label="Total de avaliações" value={stats?.total ?? 0} accent />
          <KpiCard icon={TrendingUp} label="Média geral" value={stats?.media ?? '—'} />
          <KpiCard icon={Award} label="Excelentes" value={stats?.excelentes ?? 0} color="emerald" />
          <KpiCard
            icon={AlertTriangle}
            label="Precisam melhorar"
            value={stats?.precisam_melhorar ?? 0}
            color="rose"
          />
        </div>

        {/* ===== Atalhos ===== */}
        <div className="grid gap-4 md:grid-cols-3">
          <Atalho
            href="/avaliacao/nova"
            icon={ClipboardList}
            title="Nova avaliação"
            description="Wizard com as 6 competências"
          />
          <Atalho
            href="/avaliacao/historico"
            icon={History}
            title="Histórico"
            description="Filtros + evolução"
          />
          <Atalho
            href="/avaliacao/relatorios"
            icon={BarChart3}
            title="Relatórios"
            description="Agregados por filial e competência"
          />
        </div>

        {/* ===== Últimas avaliações ===== */}
        <ConectaCard noPadding>
          <div className="p-5 pb-3">
            <SectionHeader label="Últimas avaliações" icon={History} />
          </div>
          {ultimas.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-conecta-primary/20 mb-3" />
              <p className="font-display font-semibold text-conecta-primary">
                Nenhuma avaliação ainda
              </p>
              <p className="text-sm text-conecta-muted mt-1">
                <Link
                  className="text-conecta-accent font-semibold hover:underline"
                  href="/avaliacao/nova"
                >
                  Crie a primeira →
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="conecta-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Avaliado</th>
                    <th>Pontuação</th>
                    <th>Classificação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ultimas.map((r) => (
                    <tr key={r.id}>
                      <td className="text-conecta-muted text-xs">{r.data_avaliacao}</td>
                      <td>
                        <span className="font-display font-semibold text-conecta-primary">
                          {r.avaliado_nome}
                        </span>
                      </td>
                      <td>
                        <span className="font-display font-bold text-conecta-accent tabular-nums">
                          {Number(r.pontuacao_final ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <ClassificacaoBadge
                          value={(r.classificacao ?? 'PRECISA MELHORAR') as Classificacao}
                        />
                      </td>
                      <td className="text-right">
                        <Link
                          className="inline-flex items-center gap-1 text-conecta-accent font-display font-semibold text-xs hover:underline"
                          href={`/avaliacao/${r.id}`}
                        >
                          Ver
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ConectaCard>
      </div>
    </>
  );
}

function Atalho({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl bg-white border border-conecta-primary/8 p-5 transition-all hover:-translate-y-0.5 hover:border-conecta-accent/30 hover:shadow-[0_20px_44px_-12px_rgba(13,43,107,0.18)]"
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: '#E8621A' }}
      />
      <div className="flex items-start gap-3">
        <div
          className="grid place-items-center h-10 w-10 rounded-xl text-white shrink-0"
          style={{
            background: '#E8621A',
            boxShadow: '0 10px 22px -8px rgba(232,98,26,0.45)',
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-extrabold text-conecta-primary tracking-tight flex items-center gap-1.5">
            {title}
            <ArrowRight className="h-3.5 w-3.5 text-conecta-accent opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </h3>
          <p className="text-[13px] text-conecta-muted leading-snug mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
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
  color?: 'emerald' | 'rose';
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
  } else if (color === 'rose') {
    bg = 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)';
    shadow = '0 10px 22px -8px rgba(190,18,60,0.4)';
    bar = '#be123c';
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
