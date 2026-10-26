'use client';

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
import { Search, ListChecks, X, Table2 } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { atualizarStatusVaga, fecharVagaExcedente } from '@/actions/vagas/vagas';
import { AtualizarStatusEmLoteModal } from './AtualizarStatusEmLoteModal';
import type { VagaRow } from './VagasQuadroTable';
import type { VagaStatus } from '@/db/schema';

const ORDEM_AREA = ['APOIO', 'EXPANSÃO', 'OPERAÇÃO', 'TRANSPORTE'];
const TOTAL_KEY = '*';

interface Coluna { id: string; nome: string }
interface SecaoLinha {
  secao: string;
  total: number;
  porStatus: Map<string, number>;
}
interface AreaBloco {
  area: string;
  total: number;
  porStatus: Map<string, number>;
  secoes: SecaoLinha[];
}

function somar(m: Map<string, number>, k: string, n = 1) {
  m.set(k, (m.get(k) ?? 0) + n);
}

type FiltroKey = 'area' | 'secao' | 'funcao' | 'unidade';
const FILTROS: FiltroKey[] = ['area', 'secao', 'funcao', 'unidade'];
const FILTRO_LABEL: Record<FiltroKey, string> = {
  area: 'Área',
  secao: 'Seção',
  funcao: 'Função',
  unidade: 'Unidade',
};
const FILTRO_TODOS: Record<FiltroKey, string> = {
  area: 'Todas as áreas',
  secao: 'Todas as seções',
  funcao: 'Todas as funções',
  unidade: 'Todas as unidades',
};
const valorFiltro: Record<FiltroKey, (r: VagaRow) => string> = {
  area: (r) => r.area,
  secao: (r) => r.secao ?? 'Sem seção',
  funcao: (r) => r.funcao,
  unidade: (r) => r.filialCodigo,
};

/**
 * Detalhado em formato de tabela dinâmica: ÁREA › FUNÇÃO nas linhas, um status
 * por coluna. Clicar numa contagem abre as vagas individuais daquela
 * função/status logo abaixo — dali dá pra mudar o status ou fechar cada vaga.
 */
export function VagasPivotTable({
  rows,
  statusOptions,
  podeEditar,
}: {
  rows: VagaRow[];
  statusOptions: VagaStatus[];
  podeEditar: boolean;
}) {
  const confirmar = useConfirm();
  const [busca, setBusca] = useState('');
  const [localRows, setLocalRows] = useState(rows);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null); // `${area}::${funcao}::${statusId|*}`
  const [loteOpen, setLoteOpen] = useState(false);

  useEffect(() => { setLocalRows(rows); }, [rows]);

  const [filtros, setFiltros] = useState<Partial<Record<FiltroKey, string>>>({});

  const casaFiltros = (r: VagaRow, ignorar?: FiltroKey) =>
    FILTROS.every((k) => k === ignorar || !filtros[k] || valorFiltro[k](r) === filtros[k]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return localRows.filter(
      (r) =>
        casaFiltros(r) &&
        (!q || `${r.funcao} ${r.secao ?? ''} ${r.filialCodigo}`.toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRows, busca, filtros]);

  // Opções em cascata: cada filtro lista só o que existe considerando os
  // OUTROS três (o valor já selecionado nunca some da lista).
  const opcoes = useMemo(() => {
    const out = {} as Record<FiltroKey, string[]>;
    for (const k of FILTROS) {
      const set = new Set<string>();
      for (const r of localRows) if (casaFiltros(r, k)) set.add(valorFiltro[k](r));
      const sel = filtros[k];
      if (sel) set.add(sel);
      const arr = Array.from(set);
      if (k === 'area') {
        arr.sort((a, b) => {
          const ia = ORDEM_AREA.indexOf(a); const ib = ORDEM_AREA.indexOf(b);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
        });
      } else if (k === 'unidade') {
        arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      } else {
        arr.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      }
      out[k] = arr;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRows, filtros]);

  const nomeUnidade = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of localRows) m.set(r.filialCodigo, r.filialNome);
    return m;
  }, [localRows]);

  const filtrosAtivos = FILTROS.some((k) => filtros[k]);

  function setFiltro(k: FiltroKey, v: string) {
    setAberta(null);
    setFiltros((f) => {
      const n = { ...f };
      if (v) n[k] = v; else delete n[k];
      return n;
    });
  }

  // Colunas = status do catálogo (na ordem configurada) + qualquer status
  // inativo que ainda tenha vaga; colunas sem nenhuma vaga ficam de fora.
  const colunas = useMemo<Coluna[]>(() => {
    const usados = new Map<string, string>();
    for (const r of filtradas) usados.set(r.statusId, r.statusNome);
    const cols: Coluna[] = [];
    for (const s of statusOptions) if (usados.has(s.id)) { cols.push({ id: s.id, nome: s.nome }); usados.delete(s.id); }
    for (const [id, nome] of usados) cols.push({ id, nome });
    return cols;
  }, [filtradas, statusOptions]);

  const { blocos, totalGeral } = useMemo(() => {
    const areas = new Map<string, AreaBloco>();
    const geral = new Map<string, number>();
    for (const r of filtradas) {
      const secaoNome = r.funcao; // linha do pivô = FUNÇÃO (o campo mantém o nome 'secao' por histórico)
      let a = areas.get(r.area);
      if (!a) { a = { area: r.area, total: 0, porStatus: new Map(), secoes: [] }; areas.set(r.area, a); }
      let s = a.secoes.find((x) => x.secao === secaoNome);
      if (!s) { s = { secao: secaoNome, total: 0, porStatus: new Map() }; a.secoes.push(s); }
      s.total++; somar(s.porStatus, r.statusId);
      a.total++; somar(a.porStatus, r.statusId);
      somar(geral, r.statusId);
    }
    const lista = Array.from(areas.values()).sort((x, y) => {
      const ix = ORDEM_AREA.indexOf(x.area); const iy = ORDEM_AREA.indexOf(y.area);
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || x.area.localeCompare(y.area);
    });
    for (const a of lista) a.secoes.sort((x, y) => y.total - x.total || x.secao.localeCompare(y.secao));
    return { blocos: lista, totalGeral: { total: filtradas.length, porStatus: geral } };
  }, [filtradas]);

  function vagasDa(area: string, secao: string, statusId: string) {
    return filtradas
      .filter((r) => r.area === area && r.funcao === secao && (statusId === TOTAL_KEY || r.statusId === statusId))
      .sort((a, b) => a.filialCodigo.localeCompare(b.filialCodigo) || (a.secao ?? '').localeCompare(b.secao ?? ''));
  }

  function toggleCelula(chave: string) {
    setAberta((cur) => (cur === chave ? null : chave));
  }

  function onMudarStatus(vagaId: string, statusId: string) {
    setErro(null);
    const anterior = localRows;
    const status = statusOptions.find((s) => s.id === statusId);
    setLocalRows((l) => l.map((r) => (r.id === vagaId ? { ...r, statusId, statusNome: status?.nome ?? r.statusNome } : r)));
    start(async () => {
      try { await atualizarStatusVaga(vagaId, statusId); }
      catch (e) { setLocalRows(anterior); setErro(e instanceof Error ? e.message : 'erro ao atualizar status'); }
    });
  }

  async function onFechar(vagaId: string, funcao: string, filial: string) {
    const ok = await confirmar({
      titulo: 'Fechar vaga',
      descricao: `Fechar a vaga de "${funcao}" da filial ${filial}? Ela sai da lista de vagas ativas — use quando a posição já foi preenchida ou não é mais necessária.`,
      confirmLabel: 'Fechar vaga',
    });
    if (!ok) return;
    setErro(null);
    const anterior = localRows;
    setLocalRows((l) => l.filter((r) => r.id !== vagaId));
    start(async () => {
      try { await fecharVagaExcedente(vagaId); }
      catch (e) {
        setLocalRows(anterior);
        setErro(e instanceof Error ? e.message : 'erro ao fechar vaga');
      }
    });
  }

  function onAplicadoEmLote(vagaIds: string[], statusId: string) {
    const status = statusOptions.find((s) => s.id === statusId);
    const ids = new Set(vagaIds);
    setLocalRows((l) => l.map((r) => (ids.has(r.id) ? { ...r, statusId, statusNome: status?.nome ?? r.statusNome } : r)));
  }

  const nCols = 3 + colunas.length;
  const thBase = 'px-3 py-2.5 text-center font-display text-[10px] uppercase tracking-[0.14em] font-semibold text-white border-l border-white/15';

  function celula(n: number, chave: string, key?: string) {
    if (!n) return <td key={key} className="px-3 py-2 text-center border-l border-conecta-primary/8" />;
    const ativa = aberta === chave;
    return (
      <td key={key} className="px-3 py-2 text-center border-l border-conecta-primary/8">
        <button
          type="button"
          onClick={() => toggleCelula(chave)}
          title="Ver e administrar estas vagas"
          className={`min-w-[2rem] rounded-md px-2 py-0.5 font-display font-bold tabular-nums transition-colors ${
            ativa
              ? 'bg-conecta-accent text-white'
              : 'text-conecta-primary hover:bg-conecta-accent/12 hover:text-conecta-accent'
          }`}
        >
          {n}
        </button>
      </td>
    );
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3 space-y-3">
        <SectionHeader
          label="Vagas por área e seção"
          icon={Table2}
          action={
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-display font-semibold tabular-nums text-conecta-muted">
                {filtradas.length} vagas
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar função/seção…"
              className="rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
          <p className="text-[11px] text-conecta-muted">Clique num número para ver as vagas e alterar o status ou fechar.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {FILTROS.map((k) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">
                {FILTRO_LABEL[k]}
              </span>
              <select
                value={filtros[k] ?? ''}
                onChange={(e) => setFiltro(k, e.target.value)}
                className={`max-w-[240px] rounded-lg border bg-white px-3 py-1.5 text-sm font-display font-semibold ${
                  filtros[k]
                    ? 'border-conecta-accent/50 text-conecta-accent'
                    : 'border-conecta-primary/15 text-conecta-primary'
                }`}
              >
                <option value="">{FILTRO_TODOS[k]}</option>
                {opcoes[k].map((v) => (
                  <option key={v} value={v}>
                    {k === 'unidade' && nomeUnidade.get(v) ? `${v} · ${nomeUnidade.get(v)}` : v}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {filtrosAtivos && (
            <button
              type="button"
              onClick={() => { setAberta(null); setFiltros({}); }}
              className="inline-flex items-center gap-1 pb-2 text-[11px] font-display font-semibold text-conecta-muted hover:text-conecta-accent underline underline-offset-2"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {erro && <div className="mx-5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-xs">{erro}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: '#0D2B6B' }}>
              <th className={`${thBase} text-left border-l-0`}>Área</th>
              <th className={`${thBase} text-left`}>Função</th>
              <th className={thBase}>Total</th>
              {colunas.map((c) => (
                <th key={c.id} className={`${thBase} min-w-[96px]`}>{c.nome}</th>
              ))}
            </tr>
            <tr aria-hidden><td colSpan={nCols} className="h-[2px] p-0 bg-conecta-accent" /></tr>
          </thead>
          <tbody>
            {blocos.map((b) => (
              <Fragment key={b.area}>
                {b.secoes.map((s, i) => {
                  const chaveTotal = `${b.area}::${s.secao}::${TOTAL_KEY}`;
                  const abertaAqui = aberta?.startsWith(`${b.area}::${s.secao}::`) ?? false;
                  const statusSel = abertaAqui ? aberta!.split('::')[2]! : null;
                  return (
                    <Fragment key={s.secao}>
                      <tr className="border-t border-conecta-primary/8 hover:bg-slate-50/70">
                        {i === 0 && (
                          <td
                            rowSpan={b.secoes.length}
                            className="px-3 py-2 align-top font-display font-bold text-conecta-primary bg-conecta-primary/[0.03] border-r border-conecta-primary/10"
                          >
                            {b.area}
                          </td>
                        )}
                        <td className="px-3 py-2 font-display font-semibold text-conecta-primary">{s.secao}</td>
                        {celula(s.total, chaveTotal)}
                        {colunas.map((c) => (
                          celula(s.porStatus.get(c.id) ?? 0, `${b.area}::${s.secao}::${c.id}`, c.id)
                        ))}
                      </tr>
                      {abertaAqui && statusSel && (
                        <tr className="bg-conecta-primary/[0.03]">
                          <td colSpan={nCols - 1} className="!py-3 px-5">
                            <div className="rounded-lg border border-conecta-primary/10 bg-white p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="h-[2px] w-5 bg-conecta-accent" />
                                <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-accent font-semibold">
                                  {s.secao}
                                  {statusSel !== TOTAL_KEY && ` · ${colunas.find((c) => c.id === statusSel)?.nome ?? ''}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAberta(null)}
                                  className="ml-auto text-conecta-muted hover:text-conecta-accent"
                                  aria-label="Fechar detalhe"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <ul className="divide-y divide-conecta-primary/8">
                                {vagasDa(b.area, s.secao, statusSel).map((r) => (
                                  <li key={r.id} className="py-2 flex items-center gap-3 flex-wrap">
                                    <span className="font-mono text-xs text-conecta-muted w-10 shrink-0">{r.filialCodigo}</span>
                                    <span className="font-display font-semibold text-conecta-primary text-[13px] flex-1 min-w-[160px]">{r.secao ?? 'Sem seção'}</span>
                                    {podeEditar ? (
                                      <select
                                        value={r.statusId}
                                        disabled={pending}
                                        onChange={(e) => onMudarStatus(r.id, e.target.value)}
                                        className="rounded-lg border border-conecta-primary/15 px-2 py-1 text-xs"
                                      >
                                        {statusOptions.map((st) => <option key={st.id} value={st.id}>{st.nome}</option>)}
                                      </select>
                                    ) : (
                                      <span className="text-xs font-display font-semibold text-conecta-primary">{r.statusNome}</span>
                                    )}
                                    <span className="text-[11px] text-conecta-muted tabular-nums">
                                      {new Date(r.statusAtualizadoEm).toLocaleDateString('pt-BR')}
                                      {r.statusAtualizadoPorNome ? ` · ${r.statusAtualizadoPorNome}` : ''}
                                    </span>
                                    {podeEditar && (
                                      <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => onFechar(r.id, r.funcao, r.filialCodigo)}
                                        title="Fechar esta vaga (posição preenchida ou não é mais necessária)"
                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-700 px-2 py-1 text-[11px] font-display font-semibold hover:bg-rose-50 disabled:opacity-50 transition"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        Fechar
                                      </button>
                                    )}
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
                <tr className="border-t border-conecta-primary/15 bg-conecta-primary/[0.06]">
                  <td colSpan={2} className="px-3 py-2 font-display font-bold text-conecta-primary">{b.area} Total</td>
                  <td className="px-3 py-2 text-center font-display font-bold tabular-nums text-conecta-primary border-l border-conecta-primary/8">{b.total}</td>
                  {colunas.map((c) => (
                    <td key={c.id} className="px-3 py-2 text-center font-display font-bold tabular-nums text-conecta-primary border-l border-conecta-primary/8">
                      {b.porStatus.get(c.id) ?? ''}
                    </td>
                  ))}
                </tr>
              </Fragment>
            ))}
            {blocos.length > 0 && (
              <tr style={{ background: '#0D2B6B' }} className="text-white">
                <td colSpan={2} className="px-3 py-2.5 font-display font-bold uppercase tracking-[0.14em] text-[12px]">Total geral</td>
                <td className="px-3 py-2.5 text-center font-display font-bold tabular-nums border-l border-white/15">{totalGeral.total}</td>
                {colunas.map((c) => (
                  <td key={c.id} className="px-3 py-2.5 text-center font-display font-bold tabular-nums border-l border-white/15">
                    {totalGeral.porStatus.get(c.id) ?? ''}
                  </td>
                ))}
              </tr>
            )}
            {blocos.length === 0 && (
              <tr>
                <td colSpan={nCols} className="px-5 py-8 text-center text-conecta-muted text-sm">Nenhuma vaga encontrada.</td>
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
