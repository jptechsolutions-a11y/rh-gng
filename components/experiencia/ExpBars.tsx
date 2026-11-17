'use client';

import type { LucideIcon } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export const COR_SIT = { atrasada: '#C62828', alerta: '#F2B134', prazo: '#0D2B6B' } as const;
export const LABEL_SIT = { atrasada: 'Atrasadas', alerta: 'Vencem em ≤ 5 dias', prazo: 'No prazo' } as const;

export interface ExpBarItem {
  label: string;
  atrasada: number;
  alerta: number;
  prazo: number;
}

export function LegendaSit() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-display font-semibold uppercase tracking-wide text-conecta-muted">
      {(Object.keys(COR_SIT) as Array<keyof typeof COR_SIT>).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_SIT[k] }} />
          {LABEL_SIT[k]}
        </span>
      ))}
    </div>
  );
}

/** Barras empilhadas (atrasadas / alerta / no prazo), clicáveis para filtrar o dashboard. */
export function ExpBars({
  titulo, icon, data, labelWidthClass = 'w-24', selected = null, onSelect,
}: {
  titulo: string;
  icon: LucideIcon;
  data: ExpBarItem[];
  labelWidthClass?: string;
  selected?: string | null;
  onSelect?: (label: string) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.atrasada + d.alerta + d.prazo));
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-2 space-y-2">
        <SectionHeader label={titulo} icon={icon} />
        <LegendaSit />
      </div>
      {data.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-conecta-muted">Sem pendências</p>
      ) : (
        <div className="px-5 pb-5 pt-2 space-y-2 max-h-[440px] overflow-y-auto">
          {data.map((it) => {
            const total = it.atrasada + it.alerta + it.prazo;
            const w = (n: number) => `${(n / max) * 100}%`;
            const ativo = selected === it.label;
            return (
              <button
                key={it.label}
                type="button"
                onClick={() => onSelect?.(it.label)}
                aria-pressed={ativo}
                title={`${it.label}: ${it.atrasada} atrasadas · ${it.alerta} em alerta · ${it.prazo} no prazo`}
                className={`flex w-full items-center gap-3 rounded-md text-left transition-opacity cursor-pointer hover:opacity-90 ${
                  selected != null && !ativo ? 'opacity-40' : ''
                } ${ativo ? 'ring-2 ring-conecta-accent/60 ring-offset-2' : ''}`}
              >
                <span className={`${labelWidthClass} shrink-0 font-display text-[12px] font-semibold text-conecta-primary truncate`}>
                  {it.label}
                </span>
                <span className="flex-1 flex h-6 rounded-md overflow-hidden bg-conecta-primary/5">
                  <span style={{ width: w(it.atrasada), background: COR_SIT.atrasada }} />
                  <span style={{ width: w(it.alerta), background: COR_SIT.alerta }} />
                  <span style={{ width: w(it.prazo), background: COR_SIT.prazo }} />
                </span>
                <span className="w-24 shrink-0 text-right font-display text-[12px] font-bold tabular-nums text-conecta-primary">
                  {total}
                  {it.atrasada > 0 && <span className="ml-1 text-[10px]" style={{ color: COR_SIT.atrasada }}>({it.atrasada} atr.)</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </ConectaCard>
  );
}
