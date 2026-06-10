'use client';

import { useMemo, useState } from 'react';
import type { DetalhadoRow } from '@/lib/indicadores/bh-queries';
import { formatBRL, formatHoras } from './variacao';
import { ArrowDownRight, ArrowUpRight, Minus, Search } from 'lucide-react';

function CelulaVariacao({ v }: { v: DetalhadoRow['variacao'] }) {
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
    </span>
  );
}

export function TabelaDetalhado({
  rows, secoes, funcoes,
}: {
  rows: DetalhadoRow[];
  secoes: string[];
  funcoes: string[];
}) {
  const [secao, setSecao] = useState('');
  const [funcao, setFuncao] = useState('');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (secao && r.secao !== secao) return false;
      if (funcao && r.funcao !== funcao) return false;
      if (q && !r.nome.toLowerCase().includes(q) && !r.chapa.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, secao, funcao, busca]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-3 justify-between">
        <h3 className="font-medium">Detalhado por colaborador</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded-md px-2 py-1 text-sm" value={secao} onChange={(e) => setSecao(e.target.value)}>
            <option value="">Todas as seções</option>
            {secoes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border rounded-md px-2 py-1 text-sm" value={funcao} onChange={(e) => setFuncao(e.target.value)}>
            <option value="">Todas as funções</option>
            {funcoes.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="relative">
            <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="border rounded-md pl-7 pr-2 py-1 text-sm w-56"
              placeholder="Nome ou matrícula"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2">Colaborador</th>
              <th className="px-4 py-2">Matrícula</th>
              <th className="px-4 py-2">Função</th>
              <th className="px-4 py-2">Seção</th>
              <th className="px-4 py-2 text-right">Valor a receber</th>
              <th className="px-4 py-2 text-right">Saldo anterior</th>
              <th className="px-4 py-2 text-right">Saldo atual</th>
              <th className="px-4 py-2 text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={`${r.filialId}-${r.chapa}`} className="border-t">
                <td className="px-4 py-2">
                  {r.nome}
                  {r.novo && <span className="ml-2 inline-block text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">novo</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.chapa}</td>
                <td className="px-4 py-2">{r.funcao ?? '—'}</td>
                <td className="px-4 py-2">{r.secao ?? '—'}</td>
                <td className="px-4 py-2 text-right">{formatBRL(r.valorPgto)}</td>
                <td className="px-4 py-2 text-right">{r.saldoAnterior == null ? '—' : formatHoras(r.saldoAnterior)}</td>
                <td className="px-4 py-2 text-right">{formatHoras(r.horasDecimal)}</td>
                <td className="px-4 py-2 text-right"><CelulaVariacao v={r.variacao} /></td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum resultado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
