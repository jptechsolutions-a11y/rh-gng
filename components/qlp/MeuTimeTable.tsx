'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Search, Filter, AlertTriangle, Clock,
  GraduationCap, CalendarDays,
} from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';

export interface TimeColab {
  colaboradorId: string;
  chapa: string;
  nome: string;
  funcao: string;
  tier: string | null;
  filialCodigo: string | null;
  inconsistencias: number;
  bhHoras: number;
  bhValor: number;
  cursosPendentes: number;
  feriadosPendentes: number;
}

type Ordenar = 'nome' | 'funcao' | 'inconsist' | 'bh' | 'cursos' | 'feriados';

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

export function MeuTimeTable({ time }: { time: TimeColab[] }) {
  const [busca, setBusca] = useState('');
  const [funcaoFiltro, setFuncaoFiltro] = useState('');
  const [tierFiltro, setTierFiltro] = useState('');
  const [filialFiltro, setFilialFiltro] = useState('');
  const [ordenar, setOrdenar] = useState<Ordenar>('nome');

  const funcoes = useMemo(() => Array.from(new Set(time.map((c) => c.funcao))).sort(), [time]);
  const tiers = useMemo(() => Array.from(new Set(time.map((c) => c.tier).filter(Boolean) as string[])).sort(), [time]);
  const filiais = useMemo(() => Array.from(new Set(time.map((c) => c.filialCodigo).filter(Boolean) as string[])).sort(), [time]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = time.filter((c) => {
      if (funcaoFiltro && c.funcao !== funcaoFiltro) return false;
      if (tierFiltro && c.tier !== tierFiltro) return false;
      if (filialFiltro && c.filialCodigo !== filialFiltro) return false;
      if (q) {
        const blob = `${c.nome} ${c.funcao} ${c.chapa} ${c.filialCodigo ?? ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      switch (ordenar) {
        case 'funcao':     return a.funcao.localeCompare(b.funcao);
        case 'inconsist':  return b.inconsistencias - a.inconsistencias;
        case 'bh':         return b.bhHoras - a.bhHoras;
        case 'cursos':     return b.cursosPendentes - a.cursosPendentes;
        case 'feriados':   return b.feriadosPendentes - a.feriadosPendentes;
        case 'nome':
        default:           return a.nome.localeCompare(b.nome);
      }
    });
    return arr;
  }, [time, busca, funcaoFiltro, tierFiltro, filialFiltro, ordenar]);

  const temFiltro = busca || funcaoFiltro || tierFiltro || filialFiltro;

  function limpar() {
    setBusca(''); setFuncaoFiltro(''); setTierFiltro(''); setFilialFiltro(''); setOrdenar('nome');
  }

  if (time.length === 0) {
    return (
      <ConectaCard>
        <SectionHeader label="Meu time" icon={Users} />
        <p className="mt-3 text-sm text-conecta-muted">
          Nenhum subordinado vinculado ainda. Use a tela{' '}
          <Link href="/qlp/quadro" className="text-conecta-accent font-display font-semibold hover:underline">
            Quadro
          </Link>{' '}
          para atribuir colaboradores a este líder.
        </p>
      </ConectaCard>
    );
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3 space-y-3">
        <SectionHeader
          label={`Meu time (${filtrados.length}${temFiltro ? ` / ${time.length}` : ''})`}
          icon={Users}
          action={
            temFiltro ? (
              <button
                type="button"
                onClick={limpar}
                className="text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
              >
                Limpar
              </button>
            ) : undefined
          }
        />

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-1">
          <Filter className="h-3.5 w-3.5 text-conecta-accent" />
          <span className="font-display text-[10px] uppercase tracking-[0.18em] text-conecta-muted">
            Filtros
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
            <Input
              placeholder="Buscar por nome, função, chapa ou filial..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <select className={selectClass} value={funcaoFiltro} onChange={(e) => setFuncaoFiltro(e.target.value)}>
            <option value="">Função: todas</option>
            {funcoes.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className={selectClass} value={tierFiltro} onChange={(e) => setTierFiltro(e.target.value)}>
            <option value="">Tier: todos</option>
            {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={selectClass} value={filialFiltro} onChange={(e) => setFilialFiltro(e.target.value)}>
            <option value="">Filial: todas</option>
            {filiais.map((f) => <option key={f} value={f}>Filial {f}</option>)}
          </select>
          <select className={selectClass} value={ordenar} onChange={(e) => setOrdenar(e.target.value as Ordenar)}>
            <option value="nome">Ordenar: Nome (A→Z)</option>
            <option value="funcao">Ordenar: Função</option>
            <option value="inconsist">Ordenar: Inconsistências</option>
            <option value="bh">Ordenar: Banco de Horas</option>
            <option value="cursos">Ordenar: Cursos</option>
            <option value="feriados">Ordenar: Feriados</option>
          </select>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-conecta-muted">
          Nenhum colaborador encontrado para os filtros aplicados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="conecta-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Função</th>
                <th>Tier</th>
                <th>Filial</th>
                <th className="text-right">
                  <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Inconsist.</span>
                </th>
                <th className="text-right">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> BH</span>
                </th>
                <th className="text-right">
                  <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Cursos</span>
                </th>
                <th className="text-right">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Feriados</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.colaboradorId}>
                  <td>
                    <Link
                      href={`/qlp/${c.colaboradorId}`}
                      className="font-display font-semibold text-conecta-primary hover:text-conecta-accent transition-colors"
                    >
                      {c.nome}
                    </Link>
                    <div className="font-mono text-[11px] text-conecta-primary/60 mt-0.5">{c.chapa}</div>
                  </td>
                  <td className="text-conecta-muted">{c.funcao}</td>
                  <td>
                    <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                      {c.tier ?? '—'}
                    </span>
                  </td>
                  <td className="text-conecta-muted tabular-nums">{c.filialCodigo ?? '—'}</td>
                  <td className="text-right">
                    <CelN value={c.inconsistencias} tone="amber" />
                  </td>
                  <td className="text-right">
                    {c.bhHoras !== 0 ? (
                      <div className="inline-flex flex-col items-end font-display tabular-nums">
                        <span className="font-bold text-conecta-primary text-sm">
                          {c.bhHoras.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}h
                        </span>
                        <span className="text-[10px] text-conecta-muted">
                          R$ {c.bhValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-conecta-muted/40 tabular-nums">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <CelN value={c.cursosPendentes} tone="rose" />
                  </td>
                  <td className="text-right">
                    <CelN value={c.feriadosPendentes} tone="violet" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ConectaCard>
  );
}

function CelN({ value, tone }: { value: number; tone: 'amber' | 'rose' | 'violet' }) {
  if (value === 0) return <span className="text-conecta-muted/40 tabular-nums">—</span>;
  const cls =
    tone === 'amber' ? 'text-amber-700 bg-amber-50'
    : tone === 'rose' ? 'text-rose-700 bg-rose-50'
    : 'text-violet-700 bg-violet-50';
  return (
    <span className={`inline-block font-display font-bold tabular-nums px-2 py-0.5 rounded ${cls}`}>
      {value}
    </span>
  );
}
