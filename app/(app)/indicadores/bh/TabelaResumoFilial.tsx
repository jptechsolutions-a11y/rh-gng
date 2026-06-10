import type { ResumoFilial } from '@/lib/indicadores/bh-queries';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { formatHoras } from './variacao';
import { ArrowDownRight, ArrowUpRight, Building2, Minus } from 'lucide-react';

function CelulaVariacao({ v }: { v: ResumoFilial['variacao'] }) {
  const tone = v.tendencia === 'melhorou' ? 'text-emerald-700'
    : v.tendencia === 'piorou' ? 'text-red-700'
    : 'text-conecta-muted';
  const Icon = v.tendencia === 'melhorou' ? ArrowDownRight
    : v.tendencia === 'piorou' ? ArrowUpRight
    : Minus;
  const sinal = v.delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 font-display font-semibold tabular-nums ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {sinal}{formatHoras(v.delta)}
      {v.deltaPct != null && (
        <span className="text-[11px] opacity-80">({sinal}{v.deltaPct}%)</span>
      )}
    </span>
  );
}

export function TabelaResumoFilial({ rows }: { rows: ResumoFilial[] }) {
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader label="Resumo por filial" icon={Building2} />
      </div>
      <div className="overflow-x-auto">
        <table className="conecta-table">
          <thead>
            <tr>
              <th>Filial</th>
              <th className="text-right">Saldo anterior</th>
              <th className="text-right">Saldo atual</th>
              <th className="text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.filialId ?? r.filialNome ?? Math.random()}>
                <td>
                  <span className="font-display font-semibold text-conecta-primary">
                    {r.filialNome ?? '—'}
                  </span>
                </td>
                <td className="text-right text-conecta-muted tabular-nums">
                  {formatHoras(r.saldoAnterior)}
                </td>
                <td className="text-right">
                  <span className="font-display font-bold text-conecta-accent tabular-nums">
                    {formatHoras(r.saldoAtual)}
                  </span>
                </td>
                <td className="text-right">
                  <CelulaVariacao v={r.variacao} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-conecta-muted">Sem dados.</p>
      )}
    </ConectaCard>
  );
}
