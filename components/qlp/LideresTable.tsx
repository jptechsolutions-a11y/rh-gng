'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Filter, Search, ListTree, AlertTriangle, Clock, GraduationCap, CalendarDays } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { LiderActions } from './LiderActions';
import type { LiderDestino } from './TransferirTimeModal';

export interface LiderRow {
  id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  filiais_escopo: string[];
  nome: string;
  funcao: string;
  chapa: string;
  codfilial: number;
  colaborador_filial_id: string | null;
  diretos: number;
  /** Colaborador do líder (para link na tela de detalhe) */
  colaborador_id?: string;
  // ocorrências do time efetivo (recursivo)
  inconsistencias?: number;
  bh_horas?: number;
  bh_valor?: number;
  cursos_pendentes?: number;
  feriados_pendentes?: number;
  total_ocorrencias?: number;
}

type Ordenar = 'nome' | 'diretos' | 'inconsistencias' | 'bh' | 'cursos' | 'feriados' | 'total';

function ThSort({
  campo, atual, onClick, align = 'left', children,
}: {
  campo: Ordenar;
  atual: Ordenar;
  onClick: (c: Ordenar) => void;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  const active = atual === campo;
  return (
    <th className={align === 'right' ? 'text-right' : ''}>
      <button
        type="button"
        onClick={() => onClick(campo)}
        className={`inline-flex items-center gap-1 select-none hover:text-conecta-accent transition-colors ${
          active ? 'text-conecta-accent' : 'text-inherit'
        }`}
      >
        {children}
        <span className={`text-[10px] ${active ? 'opacity-100' : 'opacity-30'}`}>▼</span>
      </button>
    </th>
  );
}

function CelOcorrencia({ value, tone }: { value: number; tone: 'amber' | 'primary' | 'rose' | 'violet' }) {
  if (value === 0) return <span className="text-conecta-muted/40 tabular-nums">—</span>;
  const cls =
    tone === 'amber' ? 'text-amber-700 bg-amber-50'
    : tone === 'rose' ? 'text-rose-700 bg-rose-50'
    : tone === 'violet' ? 'text-violet-700 bg-violet-50'
    : 'text-conecta-primary bg-conecta-primary/8';
  return (
    <span className={`inline-block font-display font-bold tabular-nums px-2 py-0.5 rounded ${cls}`}>
      {value}
    </span>
  );
}

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
  regional: string | null;
}

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

type EscopoFiltro = '' | 'nacional' | 'regional' | 'multi' | 'filial';

export function LideresTable({
  lideres,
  filiais,
  lideresDestino,
}: {
  lideres: LiderRow[];
  filiais: FilialOpt[];
  lideresDestino: LiderDestino[];
}) {
  const [busca, setBusca] = useState('');
  const [tierFiltro, setTierFiltro] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('');
  const [escopoFiltro, setEscopoFiltro] = useState<EscopoFiltro>('');
  const [filialFiltro, setFilialFiltro] = useState('');
  const [semTime, setSemTime] = useState(false);

  // Inferência de escopo (mesma lógica do organograma/quadro):
  // nacional → escopo_nacional=true
  // filial   → 1 única filial no escopo
  // regional → cobre 100% das filiais de 1+ regional sem extras
  // multi    → demais casos (>1 filial sem fechar uma regional inteira)
  const filiaisIndex = useMemo(() => {
    const map = new Map<string, FilialOpt>();
    filiais.forEach((f) => map.set(f.id, f));
    return map;
  }, [filiais]);

  function inferirEscopo(l: LiderRow): EscopoFiltro {
    if (l.escopo_nacional) return 'nacional';
    const esc = l.filiais_escopo ?? [];
    if (esc.length === 1) return 'filial';
    const regs = Array.from(
      new Set(esc.map((id) => filiaisIndex.get(id)?.regional).filter((r): r is string => !!r)),
    );
    if (regs.length > 0) {
      const fDasRegs = filiais.filter((f) => f.regional && regs.includes(f.regional)).map((f) => f.id);
      const cobreTodas = fDasRegs.every((id) => esc.includes(id)) && fDasRegs.length === esc.length;
      if (cobreTodas) return 'regional';
    }
    return 'multi';
  }

  const [ordenarPor, setOrdenarPor] = useState<Ordenar>('total');

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = lideres.filter((l) => {
      if (tierFiltro && l.tier !== tierFiltro) return false;
      if (nivelFiltro && (l.nivel ?? '') !== nivelFiltro) return false;
      if (escopoFiltro && inferirEscopo(l) !== escopoFiltro) return false;
      if (filialFiltro) {
        // Mostra líderes que cobrem a filial filtrada
        if (!l.escopo_nacional && !(l.filiais_escopo ?? []).includes(filialFiltro)) return false;
      }
      if (semTime && l.diretos > 0) return false;
      if (q) {
        const blob = `${l.nome} ${l.funcao} ${l.chapa}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      switch (ordenarPor) {
        case 'nome': return a.nome.localeCompare(b.nome);
        case 'diretos': return (b.diretos ?? 0) - (a.diretos ?? 0);
        case 'inconsistencias': return (b.inconsistencias ?? 0) - (a.inconsistencias ?? 0);
        case 'bh': return (b.bh_horas ?? 0) - (a.bh_horas ?? 0);
        case 'cursos': return (b.cursos_pendentes ?? 0) - (a.cursos_pendentes ?? 0);
        case 'feriados': return (b.feriados_pendentes ?? 0) - (a.feriados_pendentes ?? 0);
        case 'total':
        default:
          return (b.total_ocorrencias ?? 0) - (a.total_ocorrencias ?? 0);
      }
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lideres, busca, tierFiltro, nivelFiltro, escopoFiltro, filialFiltro, semTime, filiaisIndex, ordenarPor]);

  const niveisUnicos = useMemo(() => {
    const set = new Set<string>();
    lideres.forEach((l) => { if (l.nivel) set.add(l.nivel); });
    return Array.from(set).sort();
  }, [lideres]);

  function limpar() {
    setBusca(''); setTierFiltro(''); setNivelFiltro('');
    setEscopoFiltro(''); setFilialFiltro(''); setSemTime(false);
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader
          label={`Líderes (${filtradas.length} / ${lideres.length})`}
          icon={ListTree}
          action={
            <button
              type="button"
              onClick={limpar}
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
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <select className={selectClass} value={tierFiltro} onChange={(e) => setTierFiltro(e.target.value)}>
            <option value="">Tier: todos</option>
            <option value="gerente">Gerente</option>
            <option value="subgerente">Subgerente</option>
            <option value="coord">Coordenador</option>
            <option value="supervisor">Supervisor</option>
            <option value="encarregado">Encarregado</option>
          </select>
          <select className={selectClass} value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
            <option value="">Nível: todos</option>
            {niveisUnicos.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={escopoFiltro}
            onChange={(e) => setEscopoFiltro(e.target.value as EscopoFiltro)}
          >
            <option value="">Escopo: todos</option>
            <option value="nacional">Nacional</option>
            <option value="regional">Regional</option>
            <option value="multi">Multi-filial</option>
            <option value="filial">Filial</option>
          </select>
          <select className={selectClass} value={filialFiltro} onChange={(e) => setFilialFiltro(e.target.value)}>
            <option value="">Filial: todas</option>
            {filiais.map((f) => (
              <option key={f.id} value={f.id}>Filial {f.codigo}</option>
            ))}
          </select>
          <div className="relative md:col-span-2 lg:col-span-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
            <Input
              placeholder="Buscar por nome, função ou chapa"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <label className="inline-flex items-center gap-2 px-3 rounded-lg border border-conecta-primary/15 bg-white text-sm font-display text-conecta-primary cursor-pointer">
            <input
              type="checkbox"
              checked={semTime}
              onChange={(e) => setSemTime(e.target.checked)}
              className="accent-conecta-accent"
            />
            Apenas sem time
          </label>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="conecta-table">
          <thead>
            <tr>
              <ThSort campo="nome" atual={ordenarPor} onClick={setOrdenarPor}>Nome</ThSort>
              <th>Função / Chapa</th>
              <th>Tier / Escopo</th>
              <ThSort campo="diretos" atual={ordenarPor} onClick={setOrdenarPor} align="right">Diretos</ThSort>
              <ThSort campo="inconsistencias" atual={ordenarPor} onClick={setOrdenarPor} align="right">
                <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Inconsist.</span>
              </ThSort>
              <ThSort campo="bh" atual={ordenarPor} onClick={setOrdenarPor} align="right">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> BH</span>
              </ThSort>
              <ThSort campo="cursos" atual={ordenarPor} onClick={setOrdenarPor} align="right">
                <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Cursos</span>
              </ThSort>
              <ThSort campo="feriados" atual={ordenarPor} onClick={setOrdenarPor} align="right">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Feriados</span>
              </ThSort>
              <ThSort campo="total" atual={ordenarPor} onClick={setOrdenarPor} align="right">Total</ThSort>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => {
              const escopo = inferirEscopo(l);
              const total = l.total_ocorrencias ?? 0;
              return (
                <tr key={l.id}>
                  <td>
                    {l.colaborador_id ? (
                      <Link
                        href={`/qlp/${l.colaborador_id}`}
                        className="font-display font-semibold text-conecta-primary hover:text-conecta-accent transition-colors"
                      >
                        {l.nome}
                      </Link>
                    ) : (
                      <span className="font-display font-semibold text-conecta-primary">{l.nome}</span>
                    )}
                  </td>
                  <td>
                    <div className="text-conecta-muted">{l.funcao}</div>
                    <div className="font-mono text-[11px] text-conecta-primary/60 mt-0.5">{l.chapa}</div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                        {l.tier}{l.nivel ? ` · ${l.nivel}` : ''}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded ${
                          escopo === 'nacional'
                            ? 'bg-conecta-accent/15 text-conecta-accent'
                            : escopo === 'regional'
                              ? 'bg-violet-100 text-violet-900'
                              : escopo === 'multi'
                                ? 'bg-amber-50 text-amber-900'
                                : 'bg-conecta-primary/8 text-conecta-primary'
                        }`}
                      >
                        {escopo === 'filial'
                          ? `Filial · ${(l.filiais_escopo ?? []).length}`
                          : escopo === 'multi'
                            ? `Multi · ${(l.filiais_escopo ?? []).length}`
                            : escopo}
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <span className="font-display font-bold text-conecta-primary tabular-nums">{l.diretos}</span>
                  </td>
                  <td className="text-right">
                    <CelOcorrencia value={l.inconsistencias ?? 0} tone="amber" />
                  </td>
                  <td className="text-right">
                    {l.bh_horas && l.bh_horas !== 0 ? (
                      <div className="inline-flex flex-col items-end font-display tabular-nums">
                        <span className="font-bold text-conecta-primary text-sm">
                          {l.bh_horas.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}h
                        </span>
                        <span className="text-[10px] text-conecta-muted">
                          R$ {(l.bh_valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-conecta-muted/40 tabular-nums">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <CelOcorrencia value={l.cursos_pendentes ?? 0} tone="rose" />
                  </td>
                  <td className="text-right">
                    <CelOcorrencia value={l.feriados_pendentes ?? 0} tone="violet" />
                  </td>
                  <td className="text-right">
                    <span
                      className={`font-display font-extrabold tabular-nums px-2 py-0.5 rounded ${
                        total === 0
                          ? 'text-conecta-muted/60'
                          : total >= 20
                            ? 'text-white bg-rose-600'
                            : total >= 5
                              ? 'text-rose-700 bg-rose-100'
                              : 'text-conecta-accent bg-conecta-accent/10'
                      }`}
                    >
                      {total}
                    </span>
                  </td>
                  <td className="text-right">
                    <LiderActions
                      liderId={l.id}
                      nome={l.nome}
                      funcao={l.funcao}
                      tier={l.tier}
                      nivel={l.nivel}
                      escopoNacional={l.escopo_nacional}
                      filiaisEscopo={l.filiais_escopo ?? []}
                      colaboradorFilialId={l.colaborador_filial_id}
                      filiais={filiais}
                      diretos={l.diretos}
                      lideresDestino={lideresDestino}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <p className="py-8 text-center text-sm text-conecta-muted">
            Nenhum líder para os filtros aplicados.
          </p>
        )}
      </div>
    </ConectaCard>
  );
}
