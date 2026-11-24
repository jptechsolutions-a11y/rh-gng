'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Filter, Search, Users, UsersRound, FileSpreadsheet, CalendarDays } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { AtribuirLiderModal } from './AtribuirLiderModal';
import { AtribuirTimeLoteModal, type LiderOpt } from './AtribuirTimeLoteModal';
import { ExportarQuadroModal } from './ExportarQuadroModal';
import { definirEscalaColaboradores } from '@/actions/qlp/escalas';
import { formatarDias } from '@/lib/qlp/escala';

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
  lider_secao: string | null;
  lider_tier: string | null;
  lider_id: string | null;
  escala_id: string | null;
  escala_nome: string | null;
  escala_dias: number[] | null;
}

export interface EscalaOpt {
  id: string;
  nome: string;
  dias: number[];
}

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

export function QuadroTable({
  rows,
  podeEditar,
  lideres = [],
  escalas = [],
}: {
  rows: QuadroRow[];
  podeEditar: boolean;
  lideres?: LiderOpt[];
  escalas?: EscalaOpt[];
}) {
  const [alvo, setAlvo] = useState<QuadroRow | null>(null);
  const [loteOpen, setLoteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [semLider, setSemLider] = useState(false);
  const [tierFiltro, setTierFiltro] = useState<string>('');
  const [filialFiltro, setFilialFiltro] = useState<string>('');
  const [funcaoFiltro, setFuncaoFiltro] = useState<string>('');
  const [secaoFiltro, setSecaoFiltro] = useState<string>('');
  const [escalaFiltro, setEscalaFiltro] = useState<string>('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [escalaLote, setEscalaLote] = useState<string>('');
  const [erroEscala, setErroEscala] = useState<string | null>(null);
  const [okEscala, setOkEscala] = useState<string | null>(null);
  const [pendingEscala, startEscala] = useTransition();

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
      if (escalaFiltro === '__none' && r.escala_id) return false;
      if (escalaFiltro && escalaFiltro !== '__none' && r.escala_id !== escalaFiltro) return false;
      if (q) {
        const blob = `${r.chapa} ${r.nome} ${r.funcao}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, busca, semLider, tierFiltro, filialFiltro, funcaoFiltro, secaoFiltro, escalaFiltro]);

  function limparFiltros() {
    setBusca(''); setTierFiltro(''); setFilialFiltro('');
    setFuncaoFiltro(''); setSecaoFiltro(''); setSemLider(false); setEscalaFiltro('');
  }

  // Escalas que aparecem no filtro: as ativas + qualquer desativada que ainda esteja em uso no quadro.
  const escalasFiltro = useMemo(() => {
    const mapa = new Map<string, string>();
    escalas.forEach((e) => mapa.set(e.id, e.nome));
    rows.forEach((r) => { if (r.escala_id && r.escala_nome) mapa.set(r.escala_id, r.escala_nome); });
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [escalas, rows]);

  const todosFiltradosMarcados =
    filtradas.length > 0 && filtradas.every((r) => selecionados.has(r.id));

  function alternarTodos() {
    setSelecionados(todosFiltradosMarcados ? new Set() : new Set(filtradas.map((r) => r.id)));
  }

  function alternarUm(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function aplicarEscala(ids: string[], escalaId: string | null, aoSucesso?: () => void) {
    setErroEscala(null);
    setOkEscala(null);
    startEscala(async () => {
      try {
        const { alterados } = await definirEscalaColaboradores({ colaboradorIds: ids, escalaId });
        setOkEscala(
          alterados === 0
            ? 'Nenhuma alteração: os colaboradores já estavam nessa escala.'
            : `Escala ${escalaId ? 'definida' : 'removida'} para ${alterados} colaborador${alterados > 1 ? 'es' : ''}.`,
        );
        aoSucesso?.();
      } catch (e) {
        setErroEscala(e instanceof Error ? e.message : 'Não foi possível salvar a escala.');
      }
    });
  }

  function aplicarEmLote() {
    if (!escalaLote) return;
    aplicarEscala(
      Array.from(selecionados),
      escalaLote === '__limpar' ? null : escalaLote,
      () => { setSelecionados(new Set()); setEscalaLote(''); },
    );
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
                  onClick={() => setExportOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-conecta-primary/15 text-conecta-primary px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] hover:bg-slate-50 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Exportar Excel
                </button>
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
            <select
              className={selectClass}
              value={escalaFiltro}
              onChange={(e) => setEscalaFiltro(e.target.value)}
              aria-label="Filtrar por escala"
            >
              <option value="">Escala: todas</option>
              <option value="__none">Escala: não definida</option>
              {escalasFiltro.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
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

        {podeEditar && (selecionados.size > 0 || erroEscala || okEscala) && (
          <div className="mx-5 mt-3 space-y-2">
            {selecionados.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-conecta-accent/30 bg-conecta-accent/5 px-3 py-2">
                <CalendarDays className="h-4 w-4 text-conecta-accent" />
                <span className="text-sm font-display font-semibold text-conecta-primary">
                  {selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}
                </span>
                <select
                  className={selectClass}
                  value={escalaLote}
                  onChange={(e) => setEscalaLote(e.target.value)}
                  aria-label="Escala a aplicar nos selecionados"
                >
                  <option value="">Escolha a escala…</option>
                  {escalas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome} ({formatarDias(e.dias)})</option>
                  ))}
                  <option value="__limpar">— Remover escala —</option>
                </select>
                <button
                  type="button"
                  onClick={aplicarEmLote}
                  disabled={!escalaLote || pendingEscala}
                  className="inline-flex items-center rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 transition disabled:opacity-50"
                >
                  {pendingEscala ? 'Aplicando…' : 'Aplicar escala'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelecionados(new Set())}
                  className="text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
                >
                  Desmarcar
                </button>
              </div>
            )}
            {erroEscala && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{erroEscala}</p>
            )}
            {okEscala && !erroEscala && (
              <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{okEscala}</p>
            )}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="conecta-table">
            <thead>
              <tr>
                {podeEditar && (
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={todosFiltradosMarcados}
                      onChange={alternarTodos}
                      aria-label="Selecionar todos os filtrados"
                      className="accent-conecta-accent"
                    />
                  </th>
                )}
                <th>Chapa</th>
                <th>Nome</th>
                <th>Função</th>
                <th>Seção</th>
                <th>Filial</th>
                <th>Situação</th>
                <th>Escala</th>
                <th>Líder</th>
                {podeEditar && <th className="text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.id}>
                  {podeEditar && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selecionados.has(r.id)}
                        onChange={() => alternarUm(r.id)}
                        aria-label={`Selecionar ${r.nome}`}
                        className="accent-conecta-accent"
                      />
                    </td>
                  )}
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
                    {podeEditar ? (
                      <select
                        className="rounded-md border border-conecta-primary/15 bg-white px-2 py-1 text-[12px] font-display text-conecta-primary focus:outline-none focus:border-conecta-accent disabled:opacity-60"
                        value={r.escala_id ?? ''}
                        disabled={pendingEscala}
                        onChange={(e) => aplicarEscala([r.id], e.target.value || null)}
                        aria-label={`Escala de ${r.nome}`}
                      >
                        <option value="">— Não definida —</option>
                        {escalas.map((e) => (
                          <option key={e.id} value={e.id}>{e.nome}</option>
                        ))}
                        {r.escala_id && !escalas.some((e) => e.id === r.escala_id) && (
                          <option value={r.escala_id}>{r.escala_nome} (desativada)</option>
                        )}
                      </select>
                    ) : r.escala_nome ? (
                      <span className="text-conecta-primary" title={formatarDias(r.escala_dias)}>{r.escala_nome}</span>
                    ) : (
                      <span className="text-conecta-muted">—</span>
                    )}
                  </td>
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
      {exportOpen && (
        <ExportarQuadroModal
          filiais={filiaisList}
          onClose={() => setExportOpen(false)}
        />
      )}
    </>
  );
}
