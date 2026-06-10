'use client';

import { useMemo, useState } from 'react';
import type { DetalhadoRow } from '@/lib/indicadores/bh-queries';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { formatBRL, formatHoras } from './variacao';
import { ArrowDownRight, ArrowUpRight, Filter, Minus, Search, Users } from 'lucide-react';

function CelulaVariacao({ v }: { v: DetalhadoRow['variacao'] }) {
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
    </span>
  );
}

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

export function TabelaDetalhado({
  rows, funcoes,
}: {
  rows: DetalhadoRow[];
  secoes: string[];
  funcoes: string[];
}) {
  const [funcao, setFuncao] = useState('');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (funcao && r.funcao !== funcao) return false;
      if (q && !r.nome.toLowerCase().includes(q) && !r.chapa.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, funcao, busca]);

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader
          label="Detalhado por colaborador"
          icon={Users}
          action={
            <button
              type="button"
              onClick={() => { setFuncao(''); setBusca(''); }}
              className="text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
            >
              Limpar
            </button>
          }
        />
      </div>

      <div className="px-5 pb-1">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-3.5 w-3.5 text-conecta-accent" />
          <span className="font-display text-[10px] uppercase tracking-[0.18em] text-conecta-muted">
            Filtros
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <select
            className={selectClass}
            value={funcao}
            onChange={(e) => setFuncao(e.target.value)}
          >
            <option value="">Função: todas</option>
            {funcoes.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="relative md:col-span-1 lg:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou matrícula"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="conecta-table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Colaborador</th>
              <th>Função</th>
              <th className="text-right">Valor a receber</th>
              <th className="text-right">Saldo anterior</th>
              <th className="text-right">Saldo atual</th>
              <th className="text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={`${r.filialId}-${r.chapa}`}>
                <td>
                  <span className="font-mono text-[12px] text-conecta-primary/80">{r.chapa}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-conecta-primary">{r.nome}</span>
                    {r.novo && (
                      <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Novo
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-conecta-muted">{r.funcao ?? '—'}</td>
                <td className="text-right">
                  <span className="font-display font-bold text-conecta-accent tabular-nums">
                    {formatBRL(r.valorPgto)}
                  </span>
                </td>
                <td className="text-right text-conecta-muted tabular-nums">
                  {r.saldoAnterior == null ? '—' : formatHoras(r.saldoAnterior)}
                </td>
                <td className="text-right">
                  <span className="font-display font-semibold text-conecta-primary tabular-nums">
                    {formatHoras(r.horasDecimal)}
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

      {filtrados.length === 0 && (
        <p className="py-8 text-center text-sm text-conecta-muted">Nenhum resultado.</p>
      )}
    </ConectaCard>
  );
}
