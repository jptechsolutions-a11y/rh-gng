'use client';
import { cn } from '@/lib/cn';

export function FatorRatingRow({
  texto,
  ordem,
  value,
  onChange,
}: {
  fatorId: string;
  texto: string;
  ordem: number;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-sm text-perlog-navy">
        <span className="text-perlog-slate">{ordem}.</span> {texto}
      </p>
      <div role="radiogroup" aria-label={texto} className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'h-9 w-9 rounded-md border text-sm font-semibold transition-colors',
              value === n
                ? 'bg-perlog-navy text-white border-perlog-navy'
                : 'bg-white border-slate-200 text-perlog-navy hover:bg-slate-50',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
