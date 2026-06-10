import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import type { LucideIcon } from 'lucide-react';
import type { RankingItem } from '@/actions/indicadores/rankings';

export function RankingBars({
  titulo, icon, items, format, color = 'navy',
}: {
  titulo: string;
  icon: LucideIcon;
  items: RankingItem[];
  format: (n: number) => string;
  color?: 'navy' | 'orange';
}) {
  const max = items.reduce((m, it) => Math.max(m, it.valor), 0) || 1;
  const barBg = color === 'orange'
    ? 'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)'
    : 'linear-gradient(90deg, #0D2B6B 0%, #1A3F8F 100%)';
  const labelColor = color === 'orange' ? 'text-conecta-accent' : 'text-conecta-primary';

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader label={titulo} icon={icon} />
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-conecta-muted">Sem dados</p>
      ) : (
        <div className="px-5 pb-5 space-y-2.5">
          {items.map((it) => {
            const pct = Math.max(1, Math.round((it.valor / max) * 100));
            const valorInterno = pct >= 28;
            return (
              <div key={`${it.filialCodigo}-${it.filialNome}`} className="flex items-center gap-3">
                <div className={`w-12 shrink-0 font-mono text-[12px] tabular-nums font-semibold ${labelColor}`}>
                  {it.filialCodigo ?? '—'}
                </div>
                <div className="flex-1 relative h-7 rounded-md bg-conecta-primary/5 overflow-visible">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md flex items-center justify-end pr-2.5"
                    style={{ width: `${pct}%`, background: barBg }}
                  >
                    {valorInterno && (
                      <span className="font-display font-bold text-white text-[12px] tabular-nums whitespace-nowrap">
                        {format(it.valor)}
                      </span>
                    )}
                  </div>
                  {!valorInterno && (
                    <span
                      className={`absolute inset-y-0 flex items-center font-display font-bold text-[12px] tabular-nums whitespace-nowrap ${labelColor}`}
                      style={{ left: `calc(${pct}% + 8px)` }}
                    >
                      {format(it.valor)}
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
