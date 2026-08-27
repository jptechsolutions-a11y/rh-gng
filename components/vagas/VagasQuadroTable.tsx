'use client';

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
import { Users, Search, ChevronDown, ChevronRight, ListChecks } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { atualizarStatusVaga } from '@/actions/vagas/vagas';
import { AtualizarStatusEmLoteModal } from './AtualizarStatusEmLoteModal';
import type { VagaStatus } from '@/db/schema';

export interface VagaRow {
  id: string;
  filialCodigo: string;
  filialNome: string;
  funcao: string;
  secao: string | null;
  statusId: string;
  statusNome: string;
  statusAtualizadoEm: string;
  statusAtualizadoPorNome: string | null;
  limite: number;
  potencial: number;
  alocados: number;
  afastados: number;
}

interface GrupoLinha {
  chave: string;
  filialCodigo: string;
  funcao: string;
  secao: string | null;
  limite: number;
  alocados: number;
  vagas: VagaRow[];
}

function chaveGrupo(r: VagaRow): string {
  return `${r.filialCodigo}::${r.funcao}::${r.secao ?? ''}`;
}

export function VagasQuadroTable({
  rows,
  statusOptions,
  podeEditar,
}: {
  rows: VagaRow[];
  statusOptions: VagaStatus[];
  podeEditar: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [filialFiltro, setFilialFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [localRows, setLocalRows] = useState(rows);
  const [pending, start] = useTransition();
  const [erroId, setErroId] = useState<string | null>(null);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [loteOpen, setLoteOpen] = useState(false);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const filiaisList = useMemo(() => {
    const set = new Set(localRows.map((r) => r.filialCodigo));
    return Array.from(set).sort();
  }, [localRows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return localRows.filter((r) => {
      if (filialFiltro && r.filialCodigo !== filialFiltro) return false;
      if (statusFiltro && r.statusId !== statusFiltro) return false;
      if (q && !`${r.funcao} ${r.secao ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [localRows, busca, filialFiltro, statusFiltro]);

  // Uma vaga é aberta a cada "EM ABERTO" de uma combinação filial+função+seção
  // — aqui agrupamos de volta numa única linha (limite/alocados são iguais
  // para todas as vagas do grupo), e cada vaga individual só aparece expandida.
  const grupos = useMemo<GrupoLinha[]>(() => {
    const map = new Map<string, GrupoLinha>();
    for (const r of filtradas) {
      const chave = chaveGrupo(r);
      let g = map.get(chave);
      if (!g) {
        g = { chave, filialCodigo: r.filialCodigo, funcao: r.funcao, secao: r.secao, limite: r.limite, alocados: r.alocados, vagas: [] };
        map.set(chave, g);
      }
      g.vagas.push(r);
    }
    return Array.from(map.values()).sort(
      (a, b) => a.filialCodigo.localeCompare(b.filialCodigo) || a.funcao.localeCompare(b.funcao),
    );
  }, [filtradas]);

  function toggle(chave: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave); else next.add(chave);
      return next;
    });
  }

  function onAplicadoEmLote(vagaIds: string[], statusId: string) {
    const status = statusOptions.find((s) => s.id === statusId);
    const idsSet = new Set(vagaIds);
    setLocalRows((l) =>
      l.map((r) => (idsSet.has(r.id) ? { ...r, statusId, statusNome: status?.nome ?? r.statusNome } : r)),
    );
  }

  function onMudarStatus(vagaId: string, statusId: string) {
    setErroId(null);
    const anterior = localRows;
    const status = statusOptions.find((s) => s.id === statusId);
    setLocalRows((l) =>
      l.map((r) => (r.id === vagaId ? { ...r, statusId, statusNome: status?.nome ?? r.statusNome } : r)),
    );
    start(async () => {
      try {
        await atualizarStatusVaga(vagaId, statusId);
      } catch (e) {
        setLocalRows(anterior);
        setErroId(e instanceof Error ? e.message : 'erro ao atualizar status');
      }
    });
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3 space-y-3">
        <SectionHeader
          label="Vagas em aberto"
          icon={Users}
          action={
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-display font-semibold tabular-nums text-conecta-muted">
                {filtradas.length} / {localRows.length}
              </span>
              {podeEditar && (
                <button
                  type="button"
                  onClick={() => setLoteOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 transition"
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Status em lote
                </button>
              )}
            </div>
          }
        />
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar função/seção…"
              className="rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
          <select value={filialFiltro} onChange={(e) => setFilialFiltro(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm">
            <option value="">Todas as filiais</option>
            {filiaisList.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm">
            <option value="">Todos os status</option>
            {statusOptions.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {erroId && (
        <div className="mx-5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-xs">{erroId}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-conecta-muted border-t border-conecta-primary/8">
              <th className="px-5 py-2 w-8"></th>
              <th className="px-5 py-2">Filial</th>
              <th className="px-5 py-2">Função</th>
              <th className="px-5 py-2">Seção</th>
              <th className="px-5 py-2">Limite/Alocados</th>
              <th className="px-5 py-2">Vagas em aberto</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const aberto = expandidas.has(g.chave);
              return (
                <Fragment key={g.chave}>
                  <tr className="border-t border-conecta-primary/6 hover:bg-slate-50/60">
                    <td className="px-5 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggle(g.chave)}
                        aria-label={aberto ? 'Recolher' : 'Expandir'}
                        className="grid place-items-center h-7 w-7 rounded-md border border-conecta-primary/15 text-conecta-primary hover:bg-conecta-accent/10 hover:border-conecta-accent hover:text-conecta-accent transition-colors"
                      >
                        {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">{g.filialCodigo}</td>
                    <td className="px-5 py-2.5 font-display font-semibold text-conecta-primary">{g.funcao}</td>
                    <td className="px-5 py-2.5 text-conecta-muted">{g.secao ?? '—'}</td>
                    <td className="px-5 py-2.5 tabular-nums text-conecta-muted">{g.limite} / {g.alocados}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-1 font-display font-bold text-conecta-primary tabular-nums">
                        {g.vagas.length}
                      </span>
                    </td>
                  </tr>
                  {aberto && (
                    <tr className="bg-conecta-primary/3">
                      <td></td>
                      <td colSpan={5} className="!py-3 px-5">
                        <div className="rounded-lg border border-conecta-primary/10 bg-white p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="h-[2px] w-5 bg-conecta-accent" />
                            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-accent font-semibold">
                              Vagas ({g.vagas.length})
                            </span>
                          </div>
                          <ul className="divide-y divide-conecta-primary/8">
                            {g.vagas.map((r, i) => (
                              <li key={r.id} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                                <span className="text-[12px] text-conecta-muted font-mono shrink-0">Vaga {i + 1}</span>
                                {podeEditar ? (
                                  <select
                                    value={r.statusId}
                                    disabled={pending}
                                    onChange={(e) => onMudarStatus(r.id, e.target.value)}
                                    className="rounded-lg border border-conecta-primary/15 px-2 py-1 text-xs"
                                  >
                                    {statusOptions.map((s) => (
                                      <option key={s.id} value={s.id}>{s.nome}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs font-display font-semibold text-conecta-primary">{r.statusNome}</span>
                                )}
                                <span className="text-[11px] text-conecta-muted tabular-nums">
                                  {new Date(r.statusAtualizadoEm).toLocaleDateString('pt-BR')}
                                  {r.statusAtualizadoPorNome ? ` · ${r.statusAtualizadoPorNome}` : ''}
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
            {grupos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-conecta-muted text-sm">
                  Nenhuma vaga encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loteOpen && (
        <AtualizarStatusEmLoteModal
          vagas={filtradas}
          statusOptions={statusOptions}
          onClose={() => setLoteOpen(false)}
          onAplicado={onAplicadoEmLote}
        />
      )}
    </ConectaCard>
  );
}
