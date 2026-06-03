'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

const STATUS = ['Todos', 'Em análise', 'Aprovado', 'Reprovado', 'Banco de Talentos', 'Contratado'];
const RETORNO = ['Todos', 'Pendente', 'Aprovado', 'Reprovado'];
const PERIODO = [
  { value: '', label: 'Período: todos' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '365', label: 'Último ano' },
];

export function FiltrosHistorico({ initial, cargos }: {
  initial: { status?: string; retorno?: string; q?: string; cargo?: string; periodo?: string };
  cargos: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(initial.q ?? '');

  const apply = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v && v !== 'Todos' && v !== '') next.set(k, v);
      else next.delete(k);
    }
    start(() => router.push(`/historico?${next.toString()}`));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-perlog-slate" />
        <input
          type="text"
          placeholder="Buscar nome, CPF ou e-mail"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ q }); }}
          className="pl-8 pr-8 h-9 w-64 rounded-md border border-slate-200 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); apply({ q: '' }); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-perlog-slate hover:text-perlog-navy"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <select
        value={initial.status ?? 'Todos'}
        onChange={(e) => apply({ status: e.target.value })}
        className="h-9 rounded-md border border-slate-200 bg-white text-sm px-2"
      >
        {STATUS.map((s) => <option key={s} value={s}>{s === 'Todos' ? 'Status: todos' : s}</option>)}
      </select>

      <select
        value={initial.retorno ?? 'Todos'}
        onChange={(e) => apply({ retorno: e.target.value })}
        className="h-9 rounded-md border border-slate-200 bg-white text-sm px-2"
      >
        {RETORNO.map((s) => <option key={s} value={s}>{s === 'Todos' ? 'Retorno: todos' : s}</option>)}
      </select>

      <select
        value={initial.cargo ?? ''}
        onChange={(e) => apply({ cargo: e.target.value })}
        className="h-9 rounded-md border border-slate-200 bg-white text-sm px-2 max-w-[200px]"
      >
        <option value="">Cargo: todos</option>
        {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        value={initial.periodo ?? ''}
        onChange={(e) => apply({ periodo: e.target.value })}
        className="h-9 rounded-md border border-slate-200 bg-white text-sm px-2"
      >
        {PERIODO.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      {pending && <span className="text-xs text-perlog-slate">aplicando…</span>}
    </div>
  );
}
