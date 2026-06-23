'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Filter, Search, UsersRound, ArrowRight,
  AlertTriangle, Clock, GraduationCap, CalendarDays, Users,
} from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';

export interface GestorCardData {
  liderId: string;
  colaboradorId: string;
  nome: string;
  funcao: string;
  chapa: string;
  tier: string;
  nivel: string | null;
  escopoNacional: boolean;
  filiaisEscopo: string[];
  codfilial: number;
  filialCodigo: string | null;
  filialNome: string | null;
  diretos: number;
  totalTime: number;
  inconsistencias: number;
  bhHoras: number;
  bhValor: number;
  cursosPendentes: number;
  feriadosPendentes: number;
  totalOcorrencias: number;
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
type Ordenar = 'ocorrencias' | 'time' | 'nome' | 'inconsist' | 'bh' | 'cursos' | 'feriados';

const TIER_LABEL: Record<string, string> = {
  gerente: 'Gerente',
  subgerente: 'Subgerente',
  coord: 'Coordenador',
  supervisor: 'Supervisor',
  encarregado: 'Encarregado',
};

export function GestoresGrid({
  gestores,
  filiais,
}: {
  gestores: GestorCardData[];
  filiais: FilialOpt[];
}) {
  const [busca, setBusca] = useState('');
  const [tierFiltro, setTierFiltro] = useState('');
  const [escopoFiltro, setEscopoFiltro] = useState<EscopoFiltro>('');
  const [filialFiltro, setFilialFiltro] = useState('');
  const [somenteComOcorrencia, setSomenteComOcorrencia] = useState(false);
  const [ordenar, setOrdenar] = useState<Ordenar>('ocorrencias');

  const filiaisIndex = useMemo(() => {
    const map = new Map<string, FilialOpt>();
    filiais.forEach((f) => map.set(f.id, f));
    return map;
  }, [filiais]);

  function inferirEscopo(g: GestorCardData): EscopoFiltro {
    if (g.escopoNacional) return 'nacional';
    const esc = g.filiaisEscopo ?? [];
    if (esc.length === 1) return 'filial';
    const regs = Array.from(
      new Set(esc.map((id) => filiaisIndex.get(id)?.regional).filter((r): r is string => !!r)),
    );
    if (regs.length > 0) {
      const fDasRegs = filiais.filter((f) => f.regional && regs.includes(f.regional)).map((f) => f.id);
      const cobre = fDasRegs.every((id) => esc.includes(id)) && fDasRegs.length === esc.length;
      if (cobre) return 'regional';
    }
    return 'multi';
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = gestores.filter((g) => {
      if (tierFiltro && g.tier !== tierFiltro) return false;
      if (escopoFiltro && inferirEscopo(g) !== escopoFiltro) return false;
      if (filialFiltro) {
        if (!g.escopoNacional && !(g.filiaisEscopo ?? []).includes(filialFiltro)) return false;
      }
      if (somenteComOcorrencia && g.totalOcorrencias === 0) return false;
      if (q) {
        const blob = `${g.nome} ${g.funcao} ${g.chapa} ${g.codfilial}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      switch (ordenar) {
        case 'time':       return b.totalTime - a.totalTime;
        case 'nome':       return a.nome.localeCompare(b.nome);
        case 'inconsist':  return b.inconsistencias - a.inconsistencias;
        case 'bh':         return b.bhHoras - a.bhHoras;
        case 'cursos':     return b.cursosPendentes - a.cursosPendentes;
        case 'feriados':   return b.feriadosPendentes - a.feriadosPendentes;
        case 'ocorrencias':
        default:
          return b.totalOcorrencias - a.totalOcorrencias;
      }
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestores, busca, tierFiltro, escopoFiltro, filialFiltro, somenteComOcorrencia, ordenar, filiaisIndex]);

  function limpar() {
    setBusca(''); setTierFiltro(''); setEscopoFiltro('');
    setFilialFiltro(''); setSomenteComOcorrencia(false); setOrdenar('ocorrencias');
  }

  return (
    <>
      <ConectaCard>
        <SectionHeader
          label={`Gestores (${filtrados.length} / ${gestores.length})`}
          icon={UsersRound}
          className="mb-4"
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
          <select className={selectClass} value={ordenar} onChange={(e) => setOrdenar(e.target.value as Ordenar)}>
            <option value="ocorrencias">Ordenar: Total de ocorrências</option>
            <option value="time">Ordenar: Tamanho do time</option>
            <option value="inconsist">Ordenar: Inconsistências</option>
            <option value="bh">Ordenar: BH (horas)</option>
            <option value="cursos">Ordenar: Cursos pendentes</option>
            <option value="feriados">Ordenar: Feriados pendentes</option>
            <option value="nome">Ordenar: Nome (A→Z)</option>
          </select>
          <div className="relative md:col-span-2 lg:col-span-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
            <Input
              placeholder="Buscar por nome, função, chapa ou filial"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <label className="inline-flex items-center gap-2 px-3 rounded-lg border border-conecta-primary/15 bg-white text-sm font-display text-conecta-primary cursor-pointer">
            <input
              type="checkbox"
              checked={somenteComOcorrencia}
              onChange={(e) => setSomenteComOcorrencia(e.target.checked)}
              className="accent-conecta-accent"
            />
            Só com ocorrências
          </label>
        </div>
      </ConectaCard>

      {filtrados.length === 0 ? (
        <ConectaCard>
          <p className="text-sm text-conecta-muted text-center py-6">
            Nenhum gestor encontrado para os filtros aplicados.
          </p>
        </ConectaCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((g) => (
            <GestorCard key={g.liderId} g={g} escopo={inferirEscopo(g)} />
          ))}
        </div>
      )}
    </>
  );
}

function GestorCard({ g, escopo }: { g: GestorCardData; escopo: EscopoFiltro }) {
  const gravidade =
    g.totalOcorrencias === 0 ? 'ok'
    : g.totalOcorrencias >= 20 ? 'critico'
    : g.totalOcorrencias >= 5 ? 'alto'
    : 'medio';

  const stripeColor =
    gravidade === 'ok' ? '#16a34a'
    : gravidade === 'critico' ? '#dc2626'
    : gravidade === 'alto' ? '#E8621A'
    : '#0D2B6B';

  return (
    <Link
      href={`/qlp/${g.colaboradorId}`}
      className="group relative block rounded-xl bg-white border border-conecta-primary/10 overflow-hidden hover:border-conecta-accent/40 hover:shadow-[0_12px_28px_-12px_rgba(13,43,107,0.25)] transition-all"
    >
      <span aria-hidden className="absolute top-0 left-0 right-0 h-1" style={{ background: stripeColor }} />

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-accent/15 text-conecta-accent">
                {TIER_LABEL[g.tier] ?? g.tier}
              </span>
              <span
                className={`text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded ${
                  escopo === 'nacional'
                    ? 'bg-conecta-accent/10 text-conecta-accent'
                    : escopo === 'regional'
                      ? 'bg-violet-100 text-violet-900'
                      : escopo === 'multi'
                        ? 'bg-amber-50 text-amber-900'
                        : 'bg-conecta-primary/8 text-conecta-primary'
                }`}
              >
                {escopo === 'filial'
                  ? `Filial · ${g.filiaisEscopo.length}`
                  : escopo === 'multi'
                    ? `Multi · ${g.filiaisEscopo.length}`
                    : escopo}
              </span>
            </div>
            <h3 className="font-display text-lg font-extrabold text-conecta-primary leading-tight truncate group-hover:text-conecta-accent transition-colors" title={g.nome}>
              {g.nome}
            </h3>
            <div className="text-[12px] text-conecta-muted truncate mt-0.5" title={g.funcao}>
              {g.funcao}
            </div>
            <div className="text-[11px] text-conecta-muted/80 mt-1 tabular-nums">
              {g.chapa} · Filial {g.codfilial}{g.filialNome ? ` · ${g.filialNome}` : ''}
            </div>
          </div>

          {/* Total ocorrências badge */}
          <div
            className={`shrink-0 grid place-items-center rounded-lg px-3 py-2 min-w-[68px] ${
              gravidade === 'ok'
                ? 'bg-emerald-50 text-emerald-700'
                : gravidade === 'critico'
                  ? 'bg-rose-600 text-white'
                  : gravidade === 'alto'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-conecta-accent/10 text-conecta-accent'
            }`}
          >
            <div className="font-display text-2xl font-extrabold tabular-nums leading-none">
              {g.totalOcorrencias}
            </div>
            <div className="text-[9px] uppercase tracking-[0.16em] font-display font-semibold mt-0.5">
              total
            </div>
          </div>
        </div>

        {/* Time */}
        <div className="mt-3 flex items-center gap-2 text-[12px] text-conecta-muted">
          <Users className="h-3.5 w-3.5 text-conecta-accent" />
          <span>
            <span className="font-display font-bold text-conecta-primary tabular-nums">{g.diretos}</span> direto(s)
            {g.totalTime > g.diretos && (
              <>
                {' '}·{' '}
                <span className="font-display font-bold text-conecta-accent tabular-nums">{g.totalTime}</span> total
              </>
            )}
          </span>
        </div>

        {/* Mini KPIs */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <MiniKpi icon={AlertTriangle} label="Inconsist." value={g.inconsistencias.toLocaleString('pt-BR')} tone="amber" />
          <MiniKpi
            icon={Clock}
            label="BH"
            value={g.bhHoras === 0 ? '—' : `${g.bhHoras.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}h`}
            tone="primary"
          />
          <MiniKpi icon={GraduationCap} label="Cursos" value={g.cursosPendentes.toLocaleString('pt-BR')} tone="rose" />
          <MiniKpi icon={CalendarDays} label="Feriados" value={g.feriadosPendentes.toLocaleString('pt-BR')} tone="violet" />
        </div>

        {/* CTA */}
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-accent group-hover:gap-2 transition-all">
          Ver detalhe do gestor
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

function MiniKpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: 'amber' | 'primary' | 'rose' | 'violet';
}) {
  const palette: Record<typeof tone, { bg: string; text: string }> = {
    amber:   { bg: 'bg-amber-50',          text: 'text-amber-700' },
    primary: { bg: 'bg-conecta-primary/5', text: 'text-conecta-primary' },
    rose:    { bg: 'bg-rose-50',           text: 'text-rose-700' },
    violet:  { bg: 'bg-violet-50',         text: 'text-violet-700' },
  };
  const p = palette[tone];
  const isEmpty = value === '—' || value === '0';
  return (
    <div className={`rounded-md px-2 py-1.5 ${p.bg}`}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] font-display font-semibold text-conecta-muted truncate">
        <Icon className={`h-2.5 w-2.5 ${p.text}`} />
        {label}
      </div>
      <div className={`mt-0.5 font-display font-extrabold tabular-nums text-sm leading-tight truncate ${isEmpty ? 'text-conecta-muted/40' : p.text}`} title={value}>
        {value}
      </div>
    </div>
  );
}
