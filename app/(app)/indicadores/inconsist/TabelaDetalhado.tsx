'use client';

import { Fragment, useMemo, useState } from 'react';
import type { DetalhadoInconsistRow } from '@/lib/indicadores/inconsist-queries';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Filter, Search, Users, AlertTriangle } from 'lucide-react';

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function TabelaDetalhadoInconsist({
  rows, funcoes,
}: {
  rows: DetalhadoInconsistRow[];
  funcoes: string[];
}) {
  const [funcao, setFuncao] = useState('');
  const [busca, setBusca] = useState('');
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (funcao && r.funcao !== funcao) return false;
      if (q && !r.nome.toLowerCase().includes(q) && !r.chapa.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, funcao, busca]);

  function toggle(key: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader
          label="Detalhado por colaborador"
          icon={Users}
          action={
            <button
              type="button"
              onClick={() => { setFuncao(''); setBusca(''); setExpandidas(new Set()); }}
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
              <th className="w-8"></th>
              <th>Matrícula</th>
              <th>Colaborador</th>
              <th>Função</th>
              <th className="text-right">Inconsistências</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => {
              const key = `${r.filialId ?? ''}-${r.chapa}`;
              const aberto = expandidas.has(key);
              return (
                <Fragment key={key}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-label={aberto ? 'Recolher' : 'Expandir'}
                        className="grid place-items-center h-7 w-7 rounded-md border border-conecta-primary/15 text-conecta-primary hover:bg-conecta-accent/10 hover:border-conecta-accent hover:text-conecta-accent transition-colors"
                      >
                        {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td>
                      <span className="font-mono text-[12px] text-conecta-primary/80">{r.chapa}</span>
                    </td>
                    <td>
                      <span className="font-display font-semibold text-conecta-primary">{r.nome}</span>
                    </td>
                    <td className="text-conecta-muted">{r.funcao ?? '—'}</td>
                    <td className="text-right">
                      <span className="inline-flex items-center gap-1 font-display font-bold text-conecta-accent tabular-nums">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {r.qtdInconsist}
                      </span>
                    </td>
                  </tr>
                  {aberto && (
                    <tr className="bg-conecta-primary/3">
                      <td></td>
                      <td colSpan={4} className="!py-3">
                        <div className="rounded-lg border border-conecta-primary/10 bg-white p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="h-[2px] w-5 bg-conecta-accent" />
                            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-accent font-semibold">
                              Ocorrências ({r.ocorrencias.length})
                            </span>
                          </div>
                          <ul className="divide-y divide-conecta-primary/8">
                            {r.ocorrencias.map((o, i) => (
                              <li key={i} className="py-2 flex items-start justify-between gap-3">
                                <span className="text-[13px] text-conecta-primary leading-snug">{o.tipo}</span>
                                <span className="font-mono text-[12px] text-conecta-muted shrink-0 tabular-nums">
                                  {formatDate(o.data)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && (
        <p className="py-8 text-center text-sm text-conecta-muted">Nenhum resultado.</p>
      )}
    </ConectaCard>
  );
}
