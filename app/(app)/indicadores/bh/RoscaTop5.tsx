'use client';

import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Activity, X } from 'lucide-react';
import { formatHoras, formatBRL } from './variacao';

export function RoscaTop5({
  titulo,
  dados,
  color = 'navy',
  selecionado,
  onSelect,
}: {
  titulo: string;
  dados: Array<{ label: string; valor: number; valorPgto: number }>;
  color?: 'navy' | 'orange';
  selecionado?: string;
  onSelect?: (label: string) => void;
}) {
  const max = dados.reduce((m, it) => Math.max(m, it.valor), 0) || 1;
  const barBg = color === 'orange'
    ? 'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)'
    : 'linear-gradient(90deg, #0D2B6B 0%, #1A3F8F 100%)';
  const labelColor = color === 'orange' ? 'text-conecta-accent' : 'text-conecta-primary';

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader
          label={titulo}
          icon={Activity}
          action={
            selecionado && onSelect ? (
              <button
                type="button"
                onClick={() => onSelect('')}
                className="inline-flex items-center gap-1 text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            ) : null
          }
        />
      </div>
      {dados.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-conecta-muted">Sem dados</p>
      ) : (
        <div className="px-5 pb-5 space-y-3">
          {dados.map((it) => {
            const pct = Math.max(1, Math.round((it.valor / max) * 100));
            const valorInterno = pct >= 55;
            const ativo = selecionado === it.label;
            const dim = selecionado && !ativo;
            const textoBarra = `H ${formatHoras(it.valor)} · ${formatBRL(it.valorPgto)}`;
            return (
              <button
                type="button"
                key={it.label}
                onClick={() => onSelect?.(ativo ? '' : it.label)}
                className={`group block w-full min-w-0 text-left rounded-md transition-opacity ${
                  dim ? 'opacity-45 hover:opacity-100' : 'opacity-100'
                } ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
                title={onSelect ? (ativo ? `Remover filtro: ${it.label}` : `Filtrar por: ${it.label}`) : undefined}
              >
                <div className={`text-[12px] font-display font-semibold truncate ${labelColor} mb-1 flex items-center gap-2`}>
                  <span className="truncate">{it.label}</span>
                  {ativo && (
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded bg-conecta-accent/15 text-conecta-accent">
                      Filtrado
                    </span>
                  )}
                </div>
                <div className={`relative h-7 rounded-md bg-conecta-primary/5 overflow-visible ring-1 transition-shadow ${
                  ativo ? 'ring-conecta-accent' : 'ring-transparent group-hover:ring-conecta-primary/15'
                }`}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-md flex items-center justify-end pr-2.5"
                    style={{ width: `${pct}%`, background: barBg }}
                  >
                    {valorInterno && (
                      <span className="font-display font-bold text-white text-[11px] tabular-nums whitespace-nowrap">
                        {textoBarra}
                      </span>
                    )}
                  </div>
                  {!valorInterno && (
                    <span
                      className={`absolute inset-y-0 flex items-center font-display font-bold text-[11px] tabular-nums whitespace-nowrap ${labelColor}`}
                      style={{ left: `calc(${pct}% + 8px)` }}
                    >
                      {textoBarra}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ConectaCard>
  );
}
