'use client';

import type { LucideIcon } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export interface RankingBarItem {
  label: string;
  total: number;
}

/**
 * Ranking horizontal genérico — mesmo padrão visual do "Ranking Banco de
 * Horas" em app/(app)/indicadores/inicio/RankingBars.tsx (barra em gradiente
 * navy, valor dentro/fora da barra conforme o espaço). Usado pelos 3 rankings
 * de "vagas em aberto" (por filial, por seção, por função).
 */
export function VagasRankingBars({
  titulo,
  icon,
  data,
  labelWidthClass = 'w-12',
}: {
  titulo: string;
  icon: LucideIcon;
  data: RankingBarItem[];
  /** Largura da coluna do rótulo — maior para rótulos textuais (seção/função) do que para código de filial. */
  labelWidthClass?: string;
}) {
  const max = data.reduce((m, it) => Math.max(m, it.total), 0) || 1;

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader label={titulo} icon={icon} />
      </div>
      {data.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-conecta-muted">Sem dados</p>
      ) : (
        <div className="px-5 pb-5 space-y-2.5">
          {data.map((it) => {
            const pct = Math.max(1, Math.round((it.total / max) * 100));
            const valorInterno = pct >= 28;
            return (
              <div key={it.label} className="flex items-center gap-3">
                <div
                  className={`${labelWidthClass} shrink-0 font-display text-[12px] font-semibold text-conecta-primary truncate`}
                  title={it.label}
                >
                  {it.label}
                </div>
                <div className="flex-1 relative h-7 rounded-md bg-conecta-primary/5 overflow-visible">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md flex items-center justify-end pr-2.5"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #0D2B6B 0%, #1A3F8F 100%)',
                    }}
                  >
                    {valorInterno && (
                      <span className="font-display font-bold text-white text-[12px] tabular-nums whitespace-nowrap">
                        {it.total}
                      </span>
                    )}
                  </div>
                  {!valorInterno && (
                    <span
                      className="absolute inset-y-0 flex items-center font-display font-bold text-[12px] tabular-nums whitespace-nowrap text-conecta-primary"
                      style={{ left: `calc(${pct}% + 8px)` }}
                    >
                      {it.total}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ConectaCard>
  );
}
