'use client';

import type { LucideIcon } from 'lucide-react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export interface RoscaItem {
  label: string;
  total: number;
}

const PALETA = ['#0D2B6B', '#E8621A', '#1A3F8F', '#FF8C42', '#5B7DB8', '#F4B183', '#9DB4DD'];

const TAMANHO = 190;

/**
 * Gráfico de rosca com legenda clicável (clicar numa fatia ou na legenda filtra, como nas barras).
 * Só desenha as fatias com valor; o total aparece no centro.
 */
export function RoscaCard({
  titulo,
  icon,
  data,
  cores,
  selected = null,
  onSelect,
  vazio = 'Sem dados',
}: {
  titulo: string;
  icon: LucideIcon;
  data: RoscaItem[];
  /** Cor fixa por rótulo (ex.: status); o que não estiver aqui usa a paleta. */
  cores?: Record<string, string>;
  selected?: string | null;
  onSelect?: (label: string) => void;
  vazio?: string;
}) {
  const itens = data.filter((d) => d.total > 0);
  const total = itens.reduce((s, d) => s + d.total, 0);
  const cor = (label: string, i: number) => cores?.[label] ?? PALETA[i % PALETA.length]!;

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-2">
        <SectionHeader label={titulo} icon={icon} />
      </div>
      {total === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-conecta-muted">{vazio}</p>
      ) : (
        <div className="px-5 pb-5">
          <div className="relative mx-auto" style={{ width: TAMANHO, height: TAMANHO }}>
            <PieChart width={TAMANHO} height={TAMANHO}>
              <Pie
                data={itens}
                dataKey="total"
                nameKey="label"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={itens.length > 1 ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
                onClick={(_, i) => onSelect?.(itens[i]!.label)}
                style={{ cursor: onSelect ? 'pointer' : 'default', outline: 'none' }}
              >
                {itens.map((d, i) => (
                  <Cell key={d.label} fill={cor(d.label, i)} opacity={selected && selected !== d.label ? 0.3 : 1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, _n, p) => [`${v} (${Math.round((Number(v) / total) * 100)}%)`, (p as { payload?: RoscaItem }).payload?.label]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-extrabold tabular-nums text-conecta-primary">{total}</span>
              <span className="text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted">lançados</span>
            </div>
          </div>

          <ul className="mt-3 space-y-1">
            {itens.map((d, i) => {
              const ativo = selected === d.label;
              return (
                <li key={d.label}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(d.label)}
                    disabled={!onSelect}
                    aria-pressed={ativo}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition ${onSelect ? 'hover:bg-slate-50' : ''} ${selected && !ativo ? 'opacity-40' : ''} ${ativo ? 'bg-conecta-accent/10 ring-1 ring-conecta-accent/40' : ''}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor(d.label, i) }} />
                    <span className="truncate font-display font-semibold text-conecta-primary">{d.label}</span>
                    <span className="ml-auto tabular-nums font-display font-bold text-conecta-primary">{d.total}</span>
                    <span className="w-10 text-right tabular-nums text-[11px] text-conecta-muted">{Math.round((d.total / total) * 100)}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ConectaCard>
  );
}
