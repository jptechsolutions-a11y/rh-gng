import type { ResumoFilial } from '@/lib/indicadores/bh-queries';
import { formatHoras } from './variacao';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

function CelulaVariacao({ v }: { v: ResumoFilial['variacao'] }) {
  const tone = v.tendencia === 'melhorou' ? 'text-emerald-700'
    : v.tendencia === 'piorou' ? 'text-red-700'
    : 'text-muted-foreground';
  const Icon = v.tendencia === 'melhorou' ? ArrowDownRight
    : v.tendencia === 'piorou' ? ArrowUpRight
    : Minus;
  const sinal = v.delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Icon className="size-4" />
      {sinal}{formatHoras(v.delta)}
      {v.deltaPct != null && <span className="text-xs">({sinal}{v.deltaPct}%)</span>}
    </span>
  );
}

export function TabelaResumoFilial({ rows }: { rows: ResumoFilial[] }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="font-medium">Resumo por filial</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2">Filial</th>
              <th className="px-4 py-2 text-right">Saldo anterior</th>
              <th className="px-4 py-2 text-right">Saldo atual</th>
              <th className="px-4 py-2 text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.filialId ?? r.filialNome ?? Math.random()} className="border-t">
                <td className="px-4 py-2">{r.filialNome ?? '—'}</td>
                <td className="px-4 py-2 text-right">{formatHoras(r.saldoAnterior)}</td>
                <td className="px-4 py-2 text-right">{formatHoras(r.saldoAtual)}</td>
                <td className="px-4 py-2 text-right"><CelulaVariacao v={r.variacao} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Sem dados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
