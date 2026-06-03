export function ProgressoAvaliacao({ feito, total }: { feito: number; total: number }) {
  const pct = total > 0 ? Math.round((feito / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-perlog-slate">
        <span>
          {feito} de {total} fatores avaliados
        </span>
        <span>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-perlog-orange transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
