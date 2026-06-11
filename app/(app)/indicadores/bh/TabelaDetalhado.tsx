'use client';

import { useMemo, useState } from 'react';
import type { DetalhadoRow } from '@/lib/indicadores/bh-queries';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { formatBRL, formatHoras } from './variacao';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp, ChevronsUpDown, Filter, Minus, Search, Users } from 'lucide-react';

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

type OrdenarPor = 'chapa' | 'nome' | 'filial' | 'funcao' | 'valor' | 'saldoAnterior' | 'horas' | 'variacao';
type OrdenarDir = 'desc' | 'asc';

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

export function TabelaDetalhado({
  rows, funcoes, secoes, filiais: filiaisProp,
  funcao: funcaoProp, setFuncao: setFuncaoProp,
  secao: secaoProp, setSecao: setSecaoProp,
  filialId: filialIdProp, setFilialId: setFilialIdProp,
  mostrarFilialFiltro = false,
}: {
  rows: DetalhadoRow[];
  secoes: string[];
  funcoes: string[];
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
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('horas');
  const [ordenarDir, setOrdenarDir] = useState<OrdenarDir>('desc');

  function handleSort(campo: OrdenarPor) {
    if (ordenarPor === campo) {
      setOrdenarDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setOrdenarPor(campo);
      setOrdenarDir(campo === 'chapa' || campo === 'nome' || campo === 'filial' || campo === 'funcao' ? 'asc' : 'desc');
    }
  }

  const filiais = useMemo(() => {
    if (filiaisProp) return filiaisProp;
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.filialId) m.set(r.filialId, r.filialCodigo ?? r.filialNome ?? r.filialId);
    }
    return [...m.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rows, filiaisProp]);

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
        case 'chapa':         return cmpStr(a.chapa, b.chapa);
        case 'nome':          return cmpStr(a.nome, b.nome);
        case 'filial':        return cmpStr(a.filialCodigo ?? a.filialNome, b.filialCodigo ?? b.filialNome);
        case 'funcao':        return cmpStr(a.funcao, b.funcao);
        case 'valor':         return (a.valorPgto - b.valorPgto) * mult;
        case 'saldoAnterior': return ((a.saldoAnterior ?? 0) - (b.saldoAnterior ?? 0)) * mult;
        case 'horas':         return (a.horasDecimal - b.horasDecimal) * mult;
        case 'variacao':      return (a.variacao.delta - b.variacao.delta) * mult;
      }
    });
    return arr;
  }, [rows, funcao, secao, filialId, busca, ordenarPor, ordenarDir]);

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader
          label="Detalhado por colaborador"
          icon={Users}
          action={
            <button
              type="button"
              onClick={() => { setFuncao(''); setSecao(''); setBusca(''); setFilialId(''); }}
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
          <div className={`relative ${mostrarFilialFiltro ? 'md:col-span-2 lg:col-span-3' : 'md:col-span-2 lg:col-span-3'}`}>
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
              <ThSort campo="chapa"  atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Matrícula</ThSort>
              <ThSort campo="nome"   atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Colaborador</ThSort>
              {mostrarFilialFiltro && (
                <ThSort campo="filial" atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Filial</ThSort>
              )}
              <ThSort campo="funcao" atual={ordenarPor} dir={ordenarDir} onClick={handleSort}>Função</ThSort>
              <ThSort campo="valor"  atual={ordenarPor} dir={ordenarDir} onClick={handleSort} align="right">Valor a receber</ThSort>
              <ThSort campo="saldoAnterior" atual={ordenarPor} dir={ordenarDir} onClick={handleSort} align="right">Saldo anterior</ThSort>
              <ThSort campo="horas"  atual={ordenarPor} dir={ordenarDir} onClick={handleSort} align="right">Saldo atual</ThSort>
              <ThSort campo="variacao" atual={ordenarPor} dir={ordenarDir} onClick={handleSort} align="right">Variação</ThSort>
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
                {mostrarFilialFiltro && (
                  <td className="text-conecta-muted text-[12px]">{r.filialCodigo ?? r.filialNome ?? '—'}</td>
                )}
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
