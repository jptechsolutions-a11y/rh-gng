'use client';

import { Fragment, useMemo, useState } from 'react';
import type { DetalhadoInconsistRow } from '@/lib/indicadores/inconsist-queries';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Filter, Search, Users, AlertTriangle } from 'lucide-react';

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

type OrdenarDir = 'desc' | 'asc';
type OrdenarPor = 'chapa' | 'nome' | 'filial' | 'funcao' | 'qtd';

function ThSort({
  campo, atual, dir, onClick, align = 'left', children,
}: {
  campo: OrdenarPor;
  atual: OrdenarPor;
  dir: OrdenarDir;
  onClick: (c: OrdenarPor) => void;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  const active = atual === campo;
  const Icon = active ? (dir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown;
  return (
    <th className={align === 'right' ? 'text-right' : ''}>
      <button
        type="button"
        onClick={() => onClick(campo)}
        className={`inline-flex items-center gap-1 select-none hover:text-conecta-accent transition-colors ${
          active ? 'text-conecta-accent' : 'text-inherit'
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        <span>{children}</span>
        <Icon className={`h-3.5 w-3.5 ${active ? 'opacity-100' : 'opacity-40'}`} />
      </button>
    </th>
  );
}

export function TabelaDetalhadoInconsist({
  rows, funcoes, secoes = [], filiais = [],
  funcao: funcaoProp, setFuncao: setFuncaoProp,
  secao: secaoProp, setSecao: setSecaoProp,
  filialId: filialIdProp, setFilialId: setFilialIdProp,
  mostrarFilialFiltro = false,
}: {
  rows: DetalhadoInconsistRow[];
  funcoes: string[];
  secoes?: string[];
  filiais?: Array<{ id: string; nome: string }>;
  funcao?: string;
  setFuncao?: (v: string) => void;
  secao?: string;
  setSecao?: (v: string) => void;
  filialId?: string;
  setFilialId?: (v: string) => void;
  mostrarFilialFiltro?: boolean;
}) {
  const [funcaoLocal, setFuncaoLocal] = useState('');
  const [secaoLocal, setSecaoLocal] = useState('');
  const [filialIdLocal, setFilialIdLocal] = useState('');
  const funcao = funcaoProp ?? funcaoLocal;
  const setFuncao = setFuncaoProp ?? setFuncaoLocal;
  const secao = secaoProp ?? secaoLocal;
  const setSecao = setSecaoProp ?? setSecaoLocal;
  const filialId = filialIdProp ?? filialIdLocal;
  const setFilialId = setFilialIdProp ?? setFilialIdLocal;
  const [busca, setBusca] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('qtd');
  const [ordenarDir, setOrdenarDir] = useState<OrdenarDir>('desc');
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  function handleSort(campo: OrdenarPor) {
    if (ordenarPor === campo) {
      setOrdenarDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setOrdenarPor(campo);
      setOrdenarDir(campo === 'qtd' ? 'desc' : 'asc');
    }
  }

  const filiaisMap = useMemo(() => new Map(filiais.map((f) => [f.id, f.nome])), [filiais]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = rows.filter((r) => {
      if (funcao && r.funcao !== funcao) return false;
      if (secao && r.secao !== secao) return false;
      if (filialId && r.filialId !== filialId) return false;
      if (q && !r.nome.toLowerCase().includes(q) && !r.chapa.toLowerCase().includes(q)) return false;
      return true;
    });
    const mult = ordenarDir === 'asc' ? 1 : -1;
    const cmpStr = (a: string | null | undefined, b: string | null | undefined) =>
      (a ?? '').localeCompare(b ?? '') * mult;
    arr.sort((a, b) => {
      switch (ordenarPor) {
        case 'chapa':  return cmpStr(a.chapa, b.chapa);
        case 'nome':   return cmpStr(a.nome, b.nome);
        case 'filial': {
          const an = a.filialId ? (filiaisMap.get(a.filialId) ?? '') : '';
          const bn = b.filialId ? (filiaisMap.get(b.filialId) ?? '') : '';
          return cmpStr(an, bn);
        }
        case 'funcao': return cmpStr(a.funcao, b.funcao);
        case 'qtd':    return (a.qtdInconsist - b.qtdInconsist) * mult;
      }
    });
    return arr;
  }, [rows, funcao, secao, filialId, busca, ordenarPor, ordenarDir, filiaisMap]);

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
              onClick={() => { setFuncao(''); setSecao(''); setBusca(''); setFilialId(''); setExpandidas(new Set()); }}
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
          {mostrarFilialFiltro && (
            <select
              className={selectClass}
              value={filialId}
              onChange={(e) => setFilialId(e.target.value)}
            >
              <option value="">Filial: todas</option>
              {filiais.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          )}
          <select
            className={selectClass}
            value={funcao}
            onChange={(e) => setFuncao(e.target.value)}
          >
            <option value="">Função: todas</option>
            {funcoes.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            className={selectClass}
            value={secao}
            onChange={(e) => setSecao(e.target.value)}
          >
            <option value="">Seção: todas</option>
            {secoes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative md:col-span-2 lg:col-span-3">
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
              <ThSort campo="chapa"  atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Matrícula</ThSort>
              <ThSort campo="nome"   atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Colaborador</ThSort>
              {mostrarFilialFiltro && (
                <ThSort campo="filial" atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Filial</ThSort>
              )}
              <ThSort campo="funcao" atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Função</ThSort>
              <ThSort campo="qtd"    atual={ordenarPor} dir={ordenarDir} onClick={handleSort} align="right">Inconsistências</ThSort>
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
                    {mostrarFilialFiltro && (
                      <td className="text-conecta-muted text-[12px]">
                        {r.filialId ? (filiaisMap.get(r.filialId) ?? '—') : '—'}
                      </td>
                    )}
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
                      <td colSpan={mostrarFilialFiltro ? 5 : 4} className="!py-3">
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
