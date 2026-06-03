import { ArrowUp, ArrowDown, Minus, Sparkles } from 'lucide-react';
import type { Evolucao } from '@/lib/avaliacao/calculos';

export function EvolucaoIndicator({ tipo, delta }: { tipo: Evolucao; delta?: number }) {
  const map = {
    primeira: { Icon: Sparkles, color: 'text-sky-600', label: 'Primeira avaliação' },
    positiva: { Icon: ArrowUp, color: 'text-emerald-600', label: `+${delta?.toFixed(2) ?? ''}` },
    negativa: { Icon: ArrowDown, color: 'text-rose-600', label: delta?.toFixed(2) ?? '' },
    estavel: { Icon: Minus, color: 'text-amber-600', label: 'Estável' },
  } as const;
  const { Icon, color, label } = map[tipo];
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
