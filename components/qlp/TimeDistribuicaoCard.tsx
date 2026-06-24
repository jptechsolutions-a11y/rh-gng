'use client';

import { useState } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

interface ColabResumo {
  funcao: string;
}

export function TimeDistribuicaoCard({ time }: { time: ColabResumo[] }) {
  const [aberto, setAberto] = useState(false);

  if (time.length === 0) return null;

  const porFuncao = new Map<string, number>();
  for (const c of time) {
    porFuncao.set(c.funcao, (porFuncao.get(c.funcao) ?? 0) + 1);
  }
  const dados = Array.from(porFuncao.entries())
    .map(([funcao, qtd]) => ({ funcao, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  return (
    <ConectaCard noPadding>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
      >
        <SectionHeader label={`Composição do Time — ${dados.length} funções`} icon={BarChart3} />
        <ChevronDown
          className={`h-4 w-4 text-conecta-accent shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto && (
        <div className="overflow-x-auto">
          <table className="conecta-table">
            <thead>
              <tr>
                <th>Função</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {dados.map(({ funcao, qtd }) => (
                <tr key={funcao}>
                  <td className="font-display font-semibold text-conecta-primary">{funcao}</td>
                  <td className="text-right tabular-nums font-display font-bold text-conecta-primary">{qtd}</td>
                  <td className="text-right tabular-nums text-conecta-muted">
                    {((qtd / time.length) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-conecta-primary/15">
                <td className="font-display font-bold text-conecta-primary">Total</td>
                <td className="text-right tabular-nums font-display font-extrabold text-conecta-accent">{time.length}</td>
                <td className="text-right tabular-nums text-conecta-muted">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ConectaCard>
  );
}
