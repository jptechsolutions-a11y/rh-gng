import type { ResumoCursos } from '@/lib/indicadores/cursos-queries';
import { Users, GraduationCap, TrendingUp, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

type KpiColor = 'navy' | 'orange' | 'emerald' | 'rose';

function Kpi({
  icon: Icon, label, value, color = 'navy', sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; color?: KpiColor;
  sub?: React.ReactNode;
}) {
  const paleta = {
    navy:    { bg: 'linear-gradient(135deg, #0D2B6B 0%, #1A3F8F 100%)', shadow: '0 10px 22px -8px rgba(13,43,107,0.45)', bar: 'linear-gradient(180deg, #0D2B6B 0%, #1A3F8F 100%)' },
    orange:  { bg: 'linear-gradient(135deg, #E8621A 0%, #FF8C42 100%)', shadow: '0 10px 22px -8px rgba(232,98,26,0.45)', bar: '#E8621A' },
    emerald: { bg: 'linear-gradient(135deg, #047857 0%, #10b981 100%)', shadow: '0 10px 22px -8px rgba(4,120,87,0.4)',   bar: '#047857' },
    rose:    { bg: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)', shadow: '0 10px 22px -8px rgba(190,18,60,0.4)',  bar: '#be123c' },
  }[color];

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-white border border-conecta-primary/8 p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
    >
      <span aria-hidden className="absolute top-0 left-0 h-full w-1" style={{ background: paleta.bar }} />
      <div
        className="grid place-items-center h-10 w-10 rounded-lg shrink-0 text-white"
        style={{ background: paleta.bg, boxShadow: paleta.shadow }}
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
        {sub && <div className="text-[11px] mt-0.5 leading-tight">{sub}</div>}
      </div>
    </div>
  );
}

export function CardsResumoCursos({ r, ant }: { r: ResumoCursos; ant: ResumoCursos }) {
  const delta = r.totalPendencias - ant.totalPendencias;
  const pct = ant.totalPendencias > 0
    ? Math.round((delta / ant.totalPendencias) * 1000) / 10
    : null;
  const Icon = delta < 0 ? ArrowDownRight : delta > 0 ? ArrowUpRight : Minus;
  const tone = delta < 0 ? 'text-emerald-700' : delta > 0 ? 'text-red-700' : 'text-conecta-muted';
  const sinal = delta > 0 ? '+' : '';
  const variacaoSub = ant.totalPendencias > 0 ? (
    <span className={`inline-flex items-center gap-1 font-display font-semibold tabular-nums ${tone}`}>
      <Icon className="h-3 w-3" />
      {sinal}{delta.toLocaleString('pt-BR')}
      {pct != null && <span className="opacity-80">({sinal}{pct}%)</span>}
      <span className="text-conecta-muted font-normal ml-1">vs {ant.totalPendencias.toLocaleString('pt-BR')}</span>
    </span>
  ) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Kpi icon={Users}           label="Colaboradores"          value={r.colaboradores.toLocaleString('pt-BR')} color="orange" />
      <Kpi
        icon={GraduationCap}
        label="Treinamentos pendentes"
        value={r.totalPendencias.toLocaleString('pt-BR')}
        color="rose"
        sub={variacaoSub}
      />
      <Kpi
        icon={TrendingUp}
        label="Média por pessoa"
        value={r.mediaPorPessoa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        color="navy"
      />
    </div>
  );
}
