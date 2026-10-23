'use client';

import type { LucideIcon } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export const COR_STATUS = {
  regular: '#0D2B6B',
  trocar: '#F2B134',
  sem: '#E8621A',
} as const;

export interface StackItem {
  label: string;
  regular: number;
  trocar: number;
  sem: number;
}

export function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-display font-semibold uppercase tracking-wide text-conecta-muted">
      {[
        ['Regular', COR_STATUS.regular],
        ['Trocar EPI', COR_STATUS.trocar],
        ['Sem empréstimo', COR_STATUS.sem],
      ].map(([l, c]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

/**
 * Barras 100% empilhadas (regular / trocar / sem empréstimo) por categoria.
 * Cada linha é clicável para filtrar o dashboard por aquela categoria.
 */
export function EpiStackedBars({
  titulo,
  icon,
  data,
  labelWidthClass = 'w-14',
  selected = null,
  onSelect,
}: {
  titulo: string;
  icon: LucideIcon;
  data: StackItem[];
  labelWidthClass?: string;
  selected?: string | null;
  onSelect?: (label: string) => void;
}) {
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-2 space-y-2">
        <SectionHeader label={titulo} icon={icon} />
        <Legenda />
      </div>
      {data.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-conecta-muted">Sem dados</p>
      ) : (
        <div className="px-5 pb-5 pt-2 space-y-2">
          {data.map((it) => {
            const total = it.regular + it.trocar + it.sem;
            const pct = (n: number) => (total ? (n / total) * 100 : 0);
            const ativo = selected === it.label;
            return (
              <button
                key={it.label}
                type="button"
                disabled={!onSelect}
                onClick={() => onSelect?.(it.label)}
                aria-pressed={ativo}
                title={`${it.label}: ${it.regular} regular · ${it.trocar} a trocar · ${it.sem} sem empréstimo`}
                className={`flex w-full items-center gap-3 rounded-md text-left transition-opacity ${
                  onSelect ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                } ${selected != null && !ativo ? 'opacity-40' : ''} ${ativo ? 'ring-2 ring-conecta-accent/60 ring-offset-2' : ''}`}
              >
                <span
                  className={`${labelWidthClass} shrink-0 font-display text-[12px] font-semibold text-conecta-primary truncate`}
                >
                  {it.label}
                </span>
                <span className="flex-1 flex h-6 rounded-md overflow-hidden bg-conecta-primary/5">
                  <span style={{ width: `${pct(it.regular)}%`, background: COR_STATUS.regular }} />
                  <span style={{ width: `${pct(it.trocar)}%`, background: COR_STATUS.trocar }} />
                  <span style={{ width: `${pct(it.sem)}%`, background: COR_STATUS.sem }} />
                </span>
                <span className="w-24 shrink-0 text-right font-display text-[12px] font-bold tabular-nums text-conecta-primary">
                  {Math.round(pct(it.regular))}% · {total}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </ConectaCard>
  );
}
