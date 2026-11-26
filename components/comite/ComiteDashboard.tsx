'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Building2, CheckCircle2, Clock, Eye, Gavel, History, Hourglass,
  Pencil, Repeat, Search, Undo2, UserRound, Users, X, XCircle,
} from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { VagasRankingBars } from '@/components/vagas/VagasRankingBars';
import { RoscaCard } from '@/components/comite/RoscaCard';
import { HistoricoPedidos } from '@/components/comite/HistoricoPedidos';
import { BotoesDecisao, PainelDecisao, useDecisaoComite } from '@/components/comite/DecisaoPainel';
import {
  FAIXAS_IDADE, TURNOS, faixaIdade, fmtTempo, nomeMes, type ComiteLancamento, type GestorOpt,
} from '@/lib/comite/tipos';

type Dim = 'filial' | 'funcao' | 'turno' | 'idade' | 'status';
const DIM_LABEL: Record<Dim, string> = { filial: 'Filial', funcao: 'Função', turno: 'Turno', idade: 'Idade', status: 'Decisão' };

const STATUS = ['Aprovado', 'Não aprovado', 'Aguardando'] as const;
const statusDe = (l: ComiteLancamento): (typeof STATUS)[number] =>
  l.decisao === 'aprovado' ? 'Aprovado' : l.decisao === 'nao_aprovado' ? 'Não aprovado' : 'Aguardando';

const COR_STATUS_HEX: Record<string, string> = { Aprovado: '#16a34a', 'Não aprovado': '#dc2626', Aguardando: '#f59e0b' };
const BADGE_STATUS: Record<string, string> = {
  Aprovado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Não aprovado': 'bg-rose-50 text-rose-700 ring-rose-200',
  Aguardando: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const valor: Record<Dim, (l: ComiteLancamento) => string> = {
  filial: (l) => l.filial,
  funcao: (l) => l.funcao,
  turno: (l) => l.turno,
  idade: (l) => faixaIdade(l.idade),
  status: statusDe,
};

const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');
const dataHoraBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : null;
const media = (ns: number[]) => (ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : null);
const pct = (p: number, t: number) => (t > 0 ? `${Math.round((p / t) * 100)}%` : '—');

function contar(rows: ComiteLancamento[], dim: Dim, ordem?: readonly string[], limite?: number) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(valor[dim](r), (m.get(valor[dim](r)) ?? 0) + 1);
  let arr = Array.from(m.entries()).map(([label, total]) => ({ label, total }));
  if (ordem) arr = ordem.map((label) => ({ label, total: m.get(label) ?? 0 }));
  else arr.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, undefined, { numeric: true }));
  return limite ? arr.slice(0, limite) : arr;
}

function Kpi({
  rotulo, valor: v, sub, cor, icon: Icon,
}: { rotulo: string; valor: string | number; sub: string; cor: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <ConectaCard>
      <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.18em] text-conecta-muted font-semibold">
        <Icon className="h-4 w-4" style={{ color: cor }} /> {rotulo}
      </div>
      <div className="mt-2 font-display text-4xl font-extrabold tabular-nums leading-none" style={{ color: cor }}>{v}</div>
      <div className="mt-1.5 text-[12px] text-conecta-muted">{sub}</div>
    </ConectaCard>
  );
}

const selectCls = 'rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary';
const labelCls = 'font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold';

export function ComiteDashboard({
  lancamentos, mes, meses, anteriorPorFilial, podeDecidir = false, gestores = [],
}: {
  lancamentos: ComiteLancamento[];
  mes: string;
  meses: string[];
  anteriorPorFilial: Record<string, number>;
  podeDecidir?: boolean;
  gestores?: GestorOpt[];
}) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Partial<Record<Dim, string>>>({});
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const d = useDecisaoComite((id) => setAbertoId(id));
  const aberto = lancamentos.find((l) => l.id === abertoId) ?? null;
  const fechar = () => { setAbertoId(null); d.setDecidindo(null); };
  useEffect(() => {
    if (!abertoId) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abertoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const definir = (d: Dim, v: string) =>
    setFiltros((f) => { const n = { ...f }; if (!v) delete n[d]; else n[d] = v; return n; });
  const alternar = (d: Dim, v: string) => definir(d, filtros[d] === v ? '' : v);
  const casa = (l: ComiteLancamento, ignorar?: Dim) =>
    (Object.keys(filtros) as Dim[]).every((d) => d === ignorar || !filtros[d] || valor[d](l) === filtros[d]);
  const para = (ignorar?: Dim) => lancamentos.filter((l) => casa(l, ignorar));
  const filtradas = useMemo(() => para(), [lancamentos, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const filiaisLista = useMemo(
    () => Array.from(new Set(lancamentos.map((l) => l.filial))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [lancamentos],
  );

  const kpi = useMemo(() => {
    const total = filtradas.length;
    const s = (nome: string) => filtradas.filter((l) => statusDe(l) === nome).length;
    return {
      total,
      filiais: new Set(filtradas.map((l) => l.filial)).size,
      aprovados: s('Aprovado'),
      naoAprovados: s('Não aprovado'),
      aguardando: s('Aguardando'),
      reincidentes: filtradas.filter((l) => l.historico.length > 0).length,
      tempo: media(filtradas.flatMap((l) => (l.tempoMeses != null ? [l.tempoMeses] : []))),
    };
  }, [filtradas]);

  // Mês anterior só é comparável quando o único filtro ativo (se houver) é a filial.
  const outrosFiltros = (Object.keys(filtros) as Dim[]).some((d) => d !== 'filial' && filtros[d]);
  const anterior = outrosFiltros
    ? null
    : filtros.filial
      ? anteriorPorFilial[filtros.filial] ?? 0
      : Object.values(anteriorPorFilial).reduce((s, n) => s + n, 0);

  const g = useMemo(() => ({
    filial: contar(para('filial'), 'filial'),
    funcao: contar(para('funcao'), 'funcao', undefined, 10),
    turno: contar(para('turno'), 'turno', TURNOS),
    idade: contar(para('idade'), 'idade', FAIXAS_IDADE),
    status: contar(para('status'), 'status', STATUS),
  }), [lancamentos, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return filtradas
      .filter((l) => !q || l.nome.toLowerCase().includes(q) || l.chapa.includes(q))
      .sort((a, b) => a.filial.localeCompare(b.filial, undefined, { numeric: true }) || a.nome.localeCompare(b.nome));
  }, [filtradas, busca]);

  const porFilial = useMemo(() => {
    const m = new Map<string, ComiteLancamento[]>();
    for (const l of lista) m.set(l.filial, [...(m.get(l.filial) ?? []), l]);
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [lista]);

  const filtrosAtivos = (Object.keys(filtros) as Dim[]).filter((d) => filtros[d]);
  const opcoesMes = meses.includes(mes) ? meses : [mes, ...meses];

  return (
    <div className="space-y-6">
      {/* Mês e filial */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2">
          <span className={labelCls}>Mês de referência</span>
          <select value={mes} onChange={(e) => router.push(`/comite?mes=${e.target.value}`)} className={`${selectCls} capitalize`}>
            {opcoesMes.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className={labelCls}>Filial</span>
          <select value={filtros.filial ?? ''} onChange={(e) => definir('filial', e.target.value)} className={`${selectCls} min-w-[170px]`} aria-label="Filtrar por filial">
            <option value="">Todas as filiais</option>
            {filiaisLista.map((f) => <option key={f} value={f}>Filial {f}</option>)}
          </select>
        </label>
        <Link href="/comite/lancar" className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3.5 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
          Novo lançamento
        </Link>
      </div>

      {lancamentos.length === 0 ? (
        <ConectaCard>
          <p className="text-center text-sm text-conecta-muted py-10">Nenhum colaborador lançado para {nomeMes(mes)}.</p>
        </ConectaCard>
      ) : (
        <>
          {filtrosAtivos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {filtrosAtivos.map((d) => (
                <button key={d} type="button" onClick={() => definir(d, '')} className="inline-flex items-center gap-1.5 rounded-full bg-conecta-accent/10 border border-conecta-accent/30 text-conecta-accent px-2.5 py-1 text-[11px] font-display font-semibold hover:bg-conecta-accent/20">
                  {DIM_LABEL[d]}: {filtros[d]} <X className="h-3 w-3" />
                </button>
              ))}
              <button type="button" onClick={() => setFiltros({})} className="text-[11px] font-display font-semibold text-conecta-muted hover:text-conecta-accent underline underline-offset-2">Limpar tudo</button>
            </div>
          )}

          {/* Indicadores principais */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi
              rotulo="Lançados" valor={kpi.total} cor="#0D2B6B" icon={Users}
              sub={`em ${kpi.filiais} ${kpi.filiais === 1 ? 'filial' : 'filiais'}${anterior != null ? ` · mês anterior: ${anterior}` : ''}`}
            />
            <Kpi rotulo="Aprovados" valor={kpi.aprovados} cor="#16a34a" icon={CheckCircle2} sub={`${pct(kpi.aprovados, kpi.total)} dos lançados`} />
            <Kpi rotulo="Não aprovados" valor={kpi.naoAprovados} cor="#dc2626" icon={XCircle} sub={`${pct(kpi.naoAprovados, kpi.total)} dos lançados`} />
            <Kpi rotulo="Aguardando" valor={kpi.aguardando} cor="#f59e0b" icon={Hourglass} sub="sem decisão do comitê" />
            <Kpi rotulo="Já pedidos antes" valor={kpi.reincidentes} cor="#7c3aed" icon={Repeat} sub="com pedido anterior não aprovado" />
            <Kpi rotulo="Tempo médio de casa" valor={kpi.tempo == null ? '—' : fmtTempo(Math.round(kpi.tempo))} cor="#E8621A" icon={Gavel} sub="até o mês de referência" />
          </div>

          {/* Roscas */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <RoscaCard titulo="Decisão do comitê" icon={CheckCircle2} data={g.status} cores={COR_STATUS_HEX} selected={filtros.status ?? null} onSelect={(v) => alternar('status', v)} />
            <RoscaCard titulo="Por turno" icon={Clock} data={g.turno} selected={filtros.turno ?? null} onSelect={(v) => alternar('turno', v)} />
            <RoscaCard titulo="Por faixa de idade" icon={UserRound} data={g.idade} selected={filtros.idade ?? null} onSelect={(v) => alternar('idade', v)} />
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <VagasRankingBars titulo="Lançados por filial" icon={Building2} labelWidthClass="w-14" data={g.filial} selected={filtros.filial ?? null} onSelect={(v) => alternar('filial', v)} />
            <VagasRankingBars titulo="Por função (top 10)" icon={Briefcase} color="orange" labelWidthClass="w-44" data={g.funcao} selected={filtros.funcao ?? null} onSelect={(v) => alternar('funcao', v)} />
          </div>

          {/* Colaboradores por filial */}
          <ConectaCard noPadding>
            <div className="p-5 pb-3 space-y-3">
              <SectionHeader label="Colaboradores por filial — clique no olho para ver os detalhes" icon={Building2} />
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou matrícula…" className="w-full rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm" />
              </div>
              {d.erro && <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-sm">{d.erro}</div>}
            </div>
            <div className="px-5 pb-5 grid grid-cols-1 gap-4">
              {porFilial.map(([filial, itens]) => (
                <div key={filial} className="w-full rounded-xl border border-conecta-primary/10 overflow-hidden">
                  <div className="flex items-center justify-between bg-conecta-primary/5 px-4 py-2.5">
                    <span className="font-display text-[12px] uppercase tracking-[0.18em] font-bold text-conecta-primary">Filial {filial}</span>
                    <span className="font-display text-lg font-extrabold tabular-nums text-conecta-accent">{itens.length}</span>
                  </div>
                  <ul className="divide-y divide-conecta-primary/8">
                    {itens.map((l) => {
                      const st = statusDe(l);
                      return (
                        <li key={l.id} className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button type="button" onClick={() => setAbertoId(l.id)} title="Ver detalhes" aria-label={`Ver detalhes de ${l.nome}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-conecta-primary/15 text-conecta-primary hover:border-conecta-accent hover:text-conecta-accent hover:bg-conecta-accent/5">
                            <Eye className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-semibold text-conecta-primary">{l.nome}</span>
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-display font-semibold ring-1 ${BADGE_STATUS[st]}`}>{st}</span>
                          {l.historico.length > 0 && (
                            <span title="Já foi pedido antes e não aprovado" className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              <History className="h-3 w-3" /> já pedido antes
                            </span>
                          )}
                          {podeDecidir && (
                            <span className="inline-flex items-center gap-3 text-[12px]">
                              <BotoesDecisao l={l} d={d} />
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-conecta-muted text-right">{l.funcao} · {fmtTempo(l.tempoMeses)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {porFilial.length === 0 && <p className="col-span-full py-8 text-center text-sm text-conecta-muted">Nada com esses filtros.</p>}
            </div>
          </ConectaCard>
        </>
      )}

      {/* Detalhes do pedido (modal) */}
      {aberto && (() => {
        const l = aberto;
        const st = statusDe(l);
        return (
          <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-4 bg-black/40" onClick={fechar} role="dialog" aria-modal="true" aria-label={`Detalhes de ${l.nome}`}>
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="h-1 bg-conecta-accent" />
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-extrabold text-conecta-primary leading-tight">{l.nome}</h3>
                    <p className="text-[12px] text-conecta-muted tabular-nums">Matrícula {l.chapa} · Filial {l.filial}</p>
                    <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-display font-semibold ring-1 ${BADGE_STATUS[st]}`}>{st}</span>
                  </div>
                  <button type="button" onClick={fechar} aria-label="Fechar" className="ml-auto rounded-md p-1 text-conecta-muted hover:bg-slate-100"><X className="h-5 w-5" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  {[
                    ['Função', l.funcao], ['Seção', l.secao], ['Turno', l.turno],
                    ['Idade', l.idade != null ? `${l.idade} anos` : '—'],
                    ['Admissão', fmtData(l.admissao)], ['Tempo de empresa', fmtTempo(l.tempoMeses)],
                    ['Suspensões', String(l.suspensoes)], ['Advertências', String(l.advertencias)],
                  ].map(([r, v]) => (
                    <div key={r}>
                      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-conecta-muted font-semibold">{r}</div>
                      <div className="font-semibold text-conecta-primary break-words">{v}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="font-display text-[10px] uppercase tracking-[0.2em] text-conecta-muted font-semibold mb-1">Justificativa</div>
                  <p className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-conecta-primary/10 p-3 text-sm text-conecta-primary">{l.justificativa}</p>
                </div>

                <HistoricoPedidos historico={l.historico} />

                <div className={`rounded-lg border p-3 text-sm ${l.decisao === 'aprovado' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : l.decisao === 'nao_aprovado' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  {l.decisao ? (
                    <>
                      <span className="font-semibold">{st}</span>
                      {l.decididoPor && <> por {l.decididoPor}</>}
                      {dataHoraBr(l.decididoEm) && <> em {dataHoraBr(l.decididoEm)}</>}
                      {l.decisao === 'nao_aprovado' && l.decisaoMotivo && (
                        <p className="mt-1 whitespace-pre-wrap"><span className="font-semibold">Motivo:</span> {l.decisaoMotivo}</p>
                      )}
                    </>
                  ) : (
                    <span className="font-semibold">Aguardando decisão do comitê.</span>
                  )}
                  {podeDecidir && l.decisao && (
                    <button type="button" disabled={d.pendente} onClick={() => d.decidir(l.id, null)} className="mt-2 flex items-center gap-1 text-[12px] font-semibold underline disabled:opacity-50">
                      <Undo2 className="h-3.5 w-3.5" /> Voltar para pendente
                    </button>
                  )}
                </div>

                {podeDecidir && d.decidindo?.id === l.id ? (
                  <PainelDecisao painel={d.decidindo} gestores={gestores} d={d} />
                ) : podeDecidir ? (
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <BotoesDecisao l={l} d={d} />
                  </div>
                ) : null}
                {d.erro && <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-sm">{d.erro}</div>}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <p className="text-[11px] text-conecta-muted">Lançado por {l.criadoPor} em {new Date(l.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                  <Link href={`/comite/${l.id}/editar`} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-conecta-primary text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
                    <Pencil className="h-3 w-3" /> Editar / excluir
                  </Link>
                  <button type="button" onClick={fechar} className="text-sm text-conecta-muted hover:text-conecta-accent underline underline-offset-2">Fechar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
