'use client';

import { useMemo, useState } from 'react';
import { Filter, Search, ListTree } from 'lucide-react';
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

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lideres.filter((l) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lideres, busca, tierFiltro, nivelFiltro, escopoFiltro, filialFiltro, semTime, filiaisIndex]);

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
              <th>Nome</th>
              <th>Função</th>
              <th>Chapa</th>
              <th>Tier</th>
              <th>Nível</th>
              <th>Escopo</th>
              <th className="text-right">Diretos</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => {
              const escopo = inferirEscopo(l);
              return (
                <tr key={l.id}>
                  <td>
                    <span className="font-display font-semibold text-conecta-primary">{l.nome}</span>
                  </td>
                  <td className="text-conecta-muted">{l.funcao}</td>
                  <td>
                    <span className="font-mono text-[12px] text-conecta-primary/80">{l.chapa}</span>
                  </td>
                  <td>
                    <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                      {l.tier}
                    </span>
                  </td>
                  <td className="text-conecta-muted">{l.nivel ?? '—'}</td>
                  <td>
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
                  </td>
                  <td className="text-right">
                    <span className="font-display font-bold text-conecta-accent tabular-nums">
                      {l.diretos}
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
