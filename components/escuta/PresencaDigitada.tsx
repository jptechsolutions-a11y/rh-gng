'use client';
import { Plus, Trash2 } from 'lucide-react';
import type { EscutaPresencaItem } from '@/db/schema';
import { cn } from '@/lib/cn';

export function PresencaDigitada({
  rows, onChange,
}: {
  rows: EscutaPresencaItem[];
  onChange: (next: EscutaPresencaItem[]) => void;
}) {
  const update = (i: number, patch: Partial<EscutaPresencaItem>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { nome: '', funcao: '', presente: true }]);

  const presentes = rows.filter((r) => r.presente).length;
  const ausentes = rows.length - presentes;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-conecta-primary/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-conecta-light text-conecta-primary text-[11px] uppercase tracking-[0.14em]">
            <tr>
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Função</th>
              <th className="px-3 py-2 text-center w-44">Presença</th>
              <th className="px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-conecta-muted text-sm">
                  Adicione pessoas à lista usando o botão abaixo.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-conecta-primary/5">
                <td className="px-3 py-2 text-conecta-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.nome}
                    onChange={(e) => update(i, { nome: e.target.value })}
                    placeholder="Nome"
                    className="w-full bg-transparent border-b border-slate-300 focus:border-conecta-accent outline-none py-1"
                    maxLength={120}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.funcao}
                    onChange={(e) => update(i, { funcao: e.target.value })}
                    placeholder="Função"
                    className="w-full bg-transparent border-b border-slate-300 focus:border-conecta-accent outline-none py-1"
                    maxLength={120}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="inline-flex rounded-lg overflow-hidden border border-slate-300 text-xs">
                    <button
                      type="button"
                      onClick={() => update(i, { presente: true })}
                      className={cn(
                        'px-3 py-1 font-semibold',
                        r.presente
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-conecta-muted hover:text-conecta-primary',
                      )}
                    >
                      SIM
                    </button>
                    <button
                      type="button"
                      onClick={() => update(i, { presente: false })}
                      className={cn(
                        'px-3 py-1 font-semibold border-l border-slate-300',
                        !r.presente
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-conecta-muted hover:text-conecta-primary',
                      )}
                    >
                      NÃO
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label="Remover linha"
                    className="text-conecta-muted hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-2 text-sm font-semibold text-conecta-accent hover:text-conecta-primary"
        >
          <Plus className="h-4 w-4" />
          Adicionar pessoa
        </button>
        <div className="text-xs text-conecta-muted">
          Presentes: <strong className="text-emerald-700">{presentes}</strong>
          {' · '}
          Ausentes: <strong className="text-red-700">{ausentes}</strong>
        </div>
      </div>
    </div>
  );
}
