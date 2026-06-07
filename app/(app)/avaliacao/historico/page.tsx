import {
  ClipboardList,
  TrendingUp,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listarHistorico, statsHistorico } from '@/actions/avaliacao';
import { HistoricoTable } from './HistoricoTable';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | undefined>;

export default async function Historico({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireSession();
  const sp = (await searchParams) ?? {};
  const [lista, stats] = await Promise.all([
    listarHistorico({
      classificacao: sp.classificacao,
      filialId: sp.filialId,
      dataInicio: sp.dataInicio,
      dataFim: sp.dataFim,
      nomeAvaliado: sp.nomeAvaliado,
      nomeGestor: sp.nomeGestor,
      evolucao: sp.evolucao as
        | 'positiva'
        | 'negativa'
        | 'estavel'
        | 'primeira'
        | ''
        | undefined,
      page: Number(sp.page ?? 1),
    }),
    statsHistorico(),
  ]);
  return (
    <>
      <TopBar titulo="Histórico de avaliações" subtitulo="Avaliação de desempenho" />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKpi icon={ClipboardList} label="Total" value={stats?.total ?? 0} accent />
          <MiniKpi icon={TrendingUp} label="Média" value={stats?.media ?? '—'} />
          <MiniKpi icon={Award} label="Excelentes" value={stats?.excelentes ?? 0} color="emerald" />
          <MiniKpi
            icon={AlertTriangle}
            label="Precisam melhorar"
            value={stats?.precisam_melhorar ?? 0}
            color="rose"
          />
        </div>
        <HistoricoTable lista={lista} filtros={sp} />
      </div>
    </>
  );
}

function MiniKpi({
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
      className="relative overflow-hidden rounded-xl bg-white border border-conecta-primary/8 p-4 flex items-center gap-3"
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
    >
      <span aria-hidden className="absolute top-0 left-0 h-full w-1" style={{ background: bar }} />
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
