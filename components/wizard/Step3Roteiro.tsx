'use client';
import { useFormContext } from 'react-hook-form';
import type { EntrevistaInput } from '@/lib/validators';

type Item = { id: string; ordem: number; pergunta: string; tipo: string; opcoes?: string[] | null };

function MultiCheckQuestion({ id, opcoes }: { id: string; opcoes: string[] }) {
  const { watch, setValue } = useFormContext<EntrevistaInput>();
  const respostas = (watch('respostasRoteiro') ?? {}) as Record<string, unknown>;
  const valor = respostas[id];
  const selecionadas: string[] = Array.isArray(valor)
    ? valor.filter((v): v is string => typeof v === 'string')
    : [];
  const outrosAtual = selecionadas.find((s) => s.startsWith('Outros: ')) ?? '';
  const outrosTexto = outrosAtual.replace(/^Outros: /, '');
  const semOutros = selecionadas.filter((s) => !s.startsWith('Outros: '));

  function toggle(opt: string) {
    const set = new Set(semOutros);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    const novo = [...Array.from(set), ...(outrosAtual ? [outrosAtual] : [])];
    setValue(`respostasRoteiro.${id}` as const, novo, { shouldDirty: true });
  }

  function alterarOutros(texto: string) {
    const limpo = texto.trim();
    const novo = [...semOutros, ...(limpo ? [`Outros: ${limpo}`] : [])];
    setValue(`respostasRoteiro.${id}` as const, novo, { shouldDirty: true });
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opcoes.map((opt) => {
          const active = semOutros.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                active
                  ? 'bg-perlog-orange/10 border-perlog-orange text-perlog-navy'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(opt)}
                className="h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40"
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-perlog-slate shrink-0">Outros:</span>
        <input
          type="text"
          value={outrosTexto}
          onChange={(e) => alterarOutros(e.target.value)}
          placeholder="Anote outro ponto observado..."
          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60"
        />
      </div>
    </div>
  );
}

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
            <label htmlFor={`q-${q.id}`} className="flex items-baseline gap-2 text-sm font-medium text-perlog-navy">
              <span className="text-perlog-orange tabular-nums">{(i + 1).toString().padStart(2, '0')}.</span>
              <span>{q.pergunta}</span>
            </label>

            {q.tipo === 'texto' && (
              <textarea
                id={`q-${q.id}`}
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

            {q.tipo === 'multi' && q.opcoes && q.opcoes.length > 0 && (
              <MultiCheckQuestion id={q.id} opcoes={q.opcoes} />
            )}

            {q.tipo === 'select' && q.opcoes && q.opcoes.length > 0 && (
              <select
                id={`q-${q.id}`}
                {...register(`respostasRoteiro.${q.id}` as const)}
                className="mt-2 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60"
              >
                <option value="">Selecione...</option>
                {q.opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
