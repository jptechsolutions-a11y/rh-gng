import type { ResumoFeriados } from '@/lib/indicadores/feriados-queries';
import { Users, CalendarOff, Wallet, TrendingUp } from 'lucide-react';

type KpiColor = 'navy' | 'orange' | 'emerald' | 'rose';

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Kpi({
  icon: Icon, label, value, color = 'navy',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; color?: KpiColor;
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
      </div>
    </div>
  );
}

export function CardsResumoFeriados({ r }: { r: ResumoFeriados }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi icon={Users}        label="Colaboradores"      value={r.colaboradores.toLocaleString('pt-BR')}    color="orange" />
      <Kpi icon={CalendarOff}  label="Feriados pendentes" value={r.totalPendencias.toLocaleString('pt-BR')}  color="rose" />
      <Kpi icon={Wallet}       label="Valor total"        value={formatBRL(r.valorTotal)}                    color="emerald" />
      <Kpi icon={TrendingUp}   label="Média por pessoa"   value={r.mediaPorPessoa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} color="navy" />
    </div>
  );
}
