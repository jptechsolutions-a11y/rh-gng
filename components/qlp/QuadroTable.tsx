'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Filter, Search, Users, UsersRound } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { AtribuirLiderModal } from './AtribuirLiderModal';
import { AtribuirTimeLoteModal, type LiderOpt } from './AtribuirTimeLoteModal';

export interface QuadroRow {
  id: string;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  situacao: string | null;
  tier_resolvido: string | null;
  filial_id: string | null;
  filial_codigo: string | null;
  lider_nome: string | null;
  lider_tier: string | null;
  lider_id: string | null;
}

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

export function QuadroTable({
  rows,
  podeEditar,
  lideres = [],
}: {
  rows: QuadroRow[];
  podeEditar: boolean;
  lideres?: LiderOpt[];
}) {
  const [alvo, setAlvo] = useState<QuadroRow | null>(null);
  const [loteOpen, setLoteOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [semLider, setSemLider] = useState(false);
  const [tierFiltro, setTierFiltro] = useState<string>('');
  const [filialFiltro, setFilialFiltro] = useState<string>('');
  const [funcaoFiltro, setFuncaoFiltro] = useState<string>('');
  const [secaoFiltro, setSecaoFiltro] = useState<string>('');

  const filiaisList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.filial_codigo) set.add(r.filial_codigo); });
    return Array.from(set).sort();
  }, [rows]);

  const funcoesList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.funcao) set.add(r.funcao); });
    return Array.from(set).sort();
  }, [rows]);

  const secoesList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.secao) set.add(r.secao); });
    return Array.from(set).sort();
  }, [rows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (semLider && r.lider_id) return false;
      if (tierFiltro && r.tier_resolvido !== tierFiltro) return false;
      if (filialFiltro && r.filial_codigo !== filialFiltro) return false;
      if (funcaoFiltro && r.funcao !== funcaoFiltro) return false;
      if (secaoFiltro && r.secao !== secaoFiltro) return false;
      if (q) {
        const blob = `${r.chapa} ${r.nome} ${r.funcao}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, busca, semLider, tierFiltro, filialFiltro, funcaoFiltro, secaoFiltro]);

  function limparFiltros() {
    setBusca(''); setTierFiltro(''); setFilialFiltro('');
    setFuncaoFiltro(''); setSecaoFiltro(''); setSemLider(false);
  }

  return (
    <>
      <ConectaCard noPadding>
        <div className="p-5 pb-3">
          <SectionHeader
            label="Colaboradores"
            icon={Users}
            action={
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-display font-semibold tabular-nums text-conecta-muted">
                  {filtradas.length} / {rows.length}
                </span>
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => setLoteOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 transition"
                  >
                    <UsersRound className="h-3.5 w-3.5" />
                    Atribuir em lote
                  </button>
                )}
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
                >
                  Limpar
                </button>
              </div>
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
            <select
              className={selectClass}
              value={tierFiltro}
              onChange={(e) => setTierFiltro(e.target.value)}
            >
              <option value="">Tier: todos</option>
              <option value="gerente">Gerente</option>
              <option value="subgerente">Subgerente</option>
              <option value="coord">Coordenador</option>
              <option value="supervisor">Supervisor</option>
              <option value="encarregado">Encarregado</option>
              <option value="base">Base</option>
            </select>
            <select
              className={selectClass}
              value={filialFiltro}
              onChange={(e) => setFilialFiltro(e.target.value)}
            >
              <option value="">Filial: todas</option>
              {filiaisList.map((f) => (
                <option key={f} value={f}>Filial {f}</option>
              ))}
            </select>
            <select
              className={selectClass}
              value={funcaoFiltro}
              onChange={(e) => setFuncaoFiltro(e.target.value)}
            >
              <option value="">Função: todas</option>
              {funcoesList.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              className={selectClass}
              value={secaoFiltro}
              onChange={(e) => setSecaoFiltro(e.target.value)}
            >
              <option value="">Seção: todas</option>
              {secoesList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="relative md:col-span-2 lg:col-span-3">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
              <Input
                placeholder="Buscar por chapa, nome ou função"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <label className="inline-flex items-center gap-2 px-3 rounded-lg border border-conecta-primary/15 bg-white text-sm font-display text-conecta-primary cursor-pointer">
              <input
                type="checkbox"
                checked={semLider}
                onChange={(e) => setSemLider(e.target.checked)}
                className="accent-conecta-accent"
              />
              Apenas sem líder
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="conecta-table">
            <thead>
              <tr>
                <th>Chapa</th>
                <th>Nome</th>
                <th>Função</th>
                <th>Seção</th>
                <th>Filial</th>
                <th>Situação</th>
                <th>Líder</th>
                {podeEditar && <th className="text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="font-mono text-[12px] text-conecta-primary/80">{r.chapa}</span>
                  </td>
                  <td>
                    <Link href={`/qlp/${r.id}`} className="font-display font-semibold text-conecta-primary hover:text-conecta-accent transition-colors">
                      {r.nome}
                    </Link>
                  </td>
                  <td className="text-conecta-muted">{r.funcao}</td>
                  <td className="text-conecta-muted">{r.secao ?? '—'}</td>
                  <td className="text-conecta-muted tabular-nums">{r.filial_codigo ?? '—'}</td>
                  <td className="text-conecta-muted">{r.situacao ?? '—'}</td>
                  <td>
                    {r.lider_nome ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                          {r.lider_tier}
                        </span>
                        <span className="text-conecta-primary">{r.lider_nome}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-rose-600">
                        — sem líder —
                      </span>
                    )}
                  </td>
                  {podeEditar && (
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setAlvo(r)}
                        className="inline-flex items-center rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 transition"
                      >
                        {r.lider_id ? 'Mover' : 'Atribuir líder'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtradas.length === 0 && (
          <p className="py-8 text-center text-sm text-conecta-muted">
            Nenhum colaborador para os filtros aplicados.
          </p>
        )}
      </ConectaCard>

      {alvo && <AtribuirLiderModal colaborador={alvo} onClose={() => setAlvo(null)} />}
      {loteOpen && (
        <AtribuirTimeLoteModal
          lideres={lideres}
          colaboradores={rows}
          onClose={() => setLoteOpen(false)}
        />
      )}
    </>
  );
}
