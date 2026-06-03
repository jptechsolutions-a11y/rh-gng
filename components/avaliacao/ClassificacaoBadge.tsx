import { CLASSIFICACAO_CORES, type Classificacao } from '@/lib/avaliacao/calculos';
import { cn } from '@/lib/cn';

export function ClassificacaoBadge({
  value,
  className,
}: {
  value: Classificacao | null | undefined;
  className?: string;
}) {
  if (!value) return <span className="text-xs text-perlog-slate">—</span>;
  const c = CLASSIFICACAO_CORES[value];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        c.bg,
        c.text,
        c.border,
        className,
      )}
    >
      {value}
    </span>
  );
}
