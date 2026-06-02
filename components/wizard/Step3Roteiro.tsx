'use client';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { EntrevistaInput } from '@/lib/validators';

type Item = { id: string; ordem: number; pergunta: string; tipo: string };

export function Step3Roteiro({ roteiro }: { roteiro: Item[] }) {
  const { register, watch, setValue } = useFormContext<EntrevistaInput>();
  const respostas = watch('respostasRoteiro') ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Roteiro de perguntas</h3>
        <p className="text-sm text-perlog-slate">Conduza a entrevista com o roteiro configurado.</p>
      </div>

      {roteiro.length === 0 && <p className="text-sm text-perlog-slate">Nenhuma pergunta configurada para este cargo.</p>}

      <div className="space-y-4">
        {roteiro.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
            <Label className="flex items-baseline gap-2">
              <span className="text-perlog-orange tabular-nums">{(i + 1).toString().padStart(2, '0')}.</span>
              <span>{q.pergunta}</span>
            </Label>

            {q.tipo === 'texto' && (
              <textarea
                rows={3}
                {...register(`respostasRoteiro.${q.id}` as const)}
                className="mt-2 flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60"
              />
            )}

            {q.tipo === 'sim-nao' && (
              <div className="mt-2 flex gap-2">
                {['Sim', 'Não'].map((v) => {
                  const active = respostas[q.id] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValue(`respostasRoteiro.${q.id}` as const, v, { shouldDirty: true })}
                      className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                        active
                          ? 'bg-perlog-orange text-white border-perlog-orange'
                          : 'bg-white text-perlog-slate border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            )}

            {q.tipo === 'escala' && (
              <div className="mt-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = Number(respostas[q.id]) === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setValue(`respostasRoteiro.${q.id}` as const, n, { shouldDirty: true })}
                        className={`h-10 w-10 rounded-md text-sm font-semibold border transition-colors ${
                          active
                            ? 'bg-perlog-orange text-white border-perlog-orange'
                            : 'bg-white text-perlog-slate border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <Input type="hidden" {...register(`respostasRoteiro.${q.id}` as const)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
