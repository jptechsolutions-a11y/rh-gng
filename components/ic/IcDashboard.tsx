'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Building2, CalendarDays, ChevronDown, ChevronRight, FileWarning, LayoutGrid, ListTree,
  Search, TrendingDown, TrendingUp, Users, X, Minus,
} from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { VagasRankingBars } from '@/components/vagas/VagasRankingBars';
import { IcCorrida, pctQuadro, type MetricaIc, type Raia } from './IcCorrida';
import { SEM_RESP, type IcUfPorFilial, type IcEvolucaoPonto, type IcResponsavelView, type IcRow, type IcSemana } from '@/lib/ic/tipos';

type Dim = 'resp' | 'filial' | 'categoria' | 'tipo' | 'funcao' | 'secao';
const DIM_LABEL: Record<Dim, string> = {
  resp: 'Responsável', filial: 'Filial', categoria: 'Pendência', tipo: 'Tipo', funcao: 'Função', secao: 'Seção',
};
const valor: Record<Dim, (r: IcRow) => string> = {
  resp: (r) => r.resp, filial: (r) => r.filial, categoria: (r) => r.categoria,
  tipo: (r) => r.tipo, funcao: (r) => r.funcao, secao: (r) => r.secao,
};
const SELECTS: Dim[] = ['resp', 'filial', 'categoria', 'funcao'];

const fmtSemana = (iso: string) => iso.split('-').reverse().join('/');
const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

function ranking(rows: IcRow[], dim: Dim, limite = 10) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(valor[dim](r), (m.get(valor[dim](r)) ?? 0) + 1);
  return Array.from(m.entries()).map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, undefined, { numeric: true })).slice(0, limite);
}

export function IcDashboard({
  rows, headcount, responsaveis, semanas, semanaAtual, evolucao, ufPorFilial,
}: {
  rows: IcRow[];
  headcount: Record<string, number>;
  responsaveis: IcResponsavelView[];
  semanas: IcSemana[];
  semanaAtual: string | null;
  evolucao: IcEvolucaoPonto[];
  ufPorFilial: IcUfPorFilial;
}) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Partial<Record<Dim, string>>>({});
  const [busca, setBusca] = useState('');
  const [modo, setModo] = useState<'filial' | 'resp'>('filial');
  const [metrica, setMetrica] = useState<MetricaIc>('pct');
  const [limite, setLimite] = useState(40);
  const [aberto, setAberto] = useState<Set<string>>(new Set());

  const alternar = (d: Dim, v: string) =>
    setFiltros((f) => { const n = { ...f }; if (n[d] === v) delete n[d]; else n[d] = v; return n; });

  // Filtro cruzado: cada gráfico considera todos os filtros, menos o da própria dimensão.
  const casa = (r: IcRow, ignorar?: Dim) =>
    (Object.keys(filtros) as Dim[]).every((d) => d === ignorar || !filtros[d] || valor[d](r) === filtros[d]);
  const para = (ignorar?: Dim) => rows.filter((r) => casa(r, ignorar));
  const filtradas = useMemo(() => para(), [rows, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const semana = semanas.find((w) => w.id === semanaAtual) ?? null;
  const idxSem = semanas.findIndex((w) => w.id === semanaAtual);
  const semanaAnterior = idxSem >= 0 ? semanas[idxSem + 1] ?? null : null; // semanas vêm da mais nova p/ a mais velha
  const pontoAnterior = semanaAnterior ? evolucao.find((e) => e.semanaRef === semanaAnterior.semanaRef) ?? null : null;

  // Raias da corrida: contam pendências sob os demais filtros (menos o da própria dimensão da raia).
  const raias: Raia[] = useMemo(() => {
    const respDe = new Map<string, IcResponsavelView>();
    for (const r of responsaveis) for (const f of r.filiais) respDe.set(f, r);

    const posicoes = (valores: { chave: string; p: number }[]) => {
      const arr = [...valores].sort((x, y) => x.p - y.p);
      const m = new Map<string, number>();
      let pos = 0;
      arr.forEach((x, i) => { if (i === 0 || x.p !== arr[i - 1]!.p) pos = i + 1; m.set(x.chave, pos); });
      return m;
    };

    if (modo === 'filial') {
      const base = para('filial');
      const cont = new Map<string, number>();
      for (const r of base) cont.set(r.filial, (cont.get(r.filial) ?? 0) + 1);
      // Todas as filiais que têm responsável cadastrado e estão no escopo (mesmo com 0 pendências) correm.
      const filiais = new Set<string>();
      const permitida = (f: string) =>
        (!filtros.resp || respDe.get(f)?.nome === filtros.resp) && (!filtros.filial || f === filtros.filial);
      for (const f of Object.keys(headcount)) if (respDe.has(f) && permitida(f)) filiais.add(f);
      for (const f of cont.keys()) if (respDe.has(f) && permitida(f)) filiais.add(f);
      const ant = pontoAnterior ? posicoes(Array.from(filiais).map((f) => ({ chave: f, p: metrica === 'pct' ? pctQuadro(pontoAnterior.porFilial[f] ?? 0, headcount[f] ?? 0) : pontoAnterior.porFilial[f] ?? 0 }))) : null;
      const semFiltroAnterior = !filtros.categoria && !filtros.funcao && !filtros.resp;
      return Array.from(filiais).map((f) => {
        const r = respDe.get(f)!;
        return {
          chave: f, titulo: `Filial ${f}`, sub: r.nome, cor: r.cor, imagem: r.imagem, uf: ufPorFilial[f] ?? null,
          pend: cont.get(f) ?? 0, quadro: headcount[f] ?? 0, posAnterior: ant && semFiltroAnterior ? ant.get(f) ?? null : null,
        };
      });
    }

    const base = para('resp');
    const cont = new Map<string, number>();
    for (const r of base) cont.set(r.resp, (cont.get(r.resp) ?? 0) + 1);
    const quadroDe = (r: IcResponsavelView) => r.filiais.reduce((t, f) => t + (headcount[f] ?? 0), 0);
    const ant = pontoAnterior ? posicoes(responsaveis.map((r) => ({ chave: r.nome, p: metrica === 'pct' ? pctQuadro(pontoAnterior.porResp[r.nome] ?? 0, quadroDe(r)) : pontoAnterior.porResp[r.nome] ?? 0 }))) : null;
    const semFiltroAnterior = !filtros.categoria && !filtros.filial && !filtros.funcao;
    return responsaveis
      .filter((r) => (!filtros.resp || r.nome === filtros.resp) && (!filtros.filial || r.filiais.includes(filtros.filial)))
      .filter((r) => r.filiais.some((f) => f in headcount) || (cont.get(r.nome) ?? 0) > 0)
      .map((r) => ({
        chave: r.nome, titulo: r.nome, sub: `filiais ${r.filiais.join(' · ') || '—'}`, cor: r.cor, imagem: r.imagem,
        uf: r.filiais.map((f) => ufPorFilial[f]).find(Boolean) ?? null,
        pend: cont.get(r.nome) ?? 0, quadro: quadroDe(r), posAnterior: ant && semFiltroAnterior ? ant.get(r.nome) ?? null : null,
      }));
  }, [rows, filtros, responsaveis, headcount, pontoAnterior, modo, ufPorFilial, metrica]); // eslint-disable-line react-hooks/exhaustive-deps

  const semResp = useMemo(() => para('resp').filter((r) => r.resp === SEM_RESP), [rows, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const semRespFiliais = Array.from(new Set(semResp.map((r) => r.filial))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const kpi = useMemo(() => {
    const chapas = new Set(filtradas.map((r) => r.chapa));
    const filiaisNoFiltro = filtros.filial
      ? [filtros.filial]
      : filtros.resp
        ? responsaveis.find((x) => x.nome === filtros.resp)?.filiais ?? []
        : Object.keys(headcount);
    const func = filiaisNoFiltro.reduce((s, f) => s + (headcount[f] ?? 0), 0);
    return {
      pend: filtradas.length, colabs: chapas.size, func,
      pct: func ? Math.round((filtradas.length / func) * 100) : null,
      media: chapas.size ? (filtradas.length / chapas.size).toFixed(1) : '0',
    };
  }, [filtradas, filtros, headcount, responsaveis]);

  const totalAnterior = semanaAnterior?.total ?? null;
  const deltaTotal = totalAnterior != null && semana ? semana.total - totalAnterior : null;

  const opcoes = useMemo(() => {
    const o = {} as Record<Dim, string[]>;
    for (const d of SELECTS) o[d] = Array.from(new Set(rows.map((r) => valor[d](r)))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return o;
  }, [rows]);

  const colabs = useMemo(() => {
    const m = new Map<string, { chapa: string; nome: string; filial: string; funcao: string; resp: string; itens: IcRow[] }>();
    for (const r of filtradas) {
      if (r.restrito) continue; // detalhe de pessoas só nas filiais do escopo da sessão
      const c = m.get(r.chapa) ?? { chapa: r.chapa, nome: r.nome, filial: r.filial, funcao: r.funcao, resp: r.resp, itens: [] };
      c.itens.push(r);
      m.set(r.chapa, c);
    }
    const q = busca.trim().toLowerCase();
    return Array.from(m.values())
      .filter((c) => !q || `${c.nome} ${c.chapa} ${c.funcao}`.toLowerCase().includes(q))
      .sort((a, b) => b.itens.length - a.itens.length || a.nome.localeCompare(b.nome));
  }, [filtradas, busca]);

  const restritasNoFiltro = filtradas.filter((r) => r.restrito).length;
  const filtrosAtivos = (Object.keys(filtros) as Dim[]).filter((d) => filtros[d]);
  const selCls = 'rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary max-w-[240px]';

  if (!semana) {
    return (
      <ConectaCard>
        <p className="text-center text-sm text-conecta-muted py-10">
          Ainda não há dados do IC. O admin precisa importar a planilha semanal em &ldquo;Importar semana&rdquo;.
        </p>
      </ConectaCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* Semana + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-conecta-accent" />
          <select
            value={semanaAtual ?? ''}
            onChange={(e) => router.push(`/ic?semana=${e.target.value}`)}
            className={selCls}
          >
            {semanas.map((w) => <option key={w.id} value={w.id}>Semana de {fmtSemana(w.semanaRef)}</option>)}
          </select>
        </label>
        {SELECTS.map((d) => (
          <label key={d} className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">{DIM_LABEL[d]}</span>
            <select
              value={filtros[d] ?? ''}
              onChange={(e) => setFiltros((f) => { const n = { ...f }; if (e.target.value) n[d] = e.target.value; else delete n[d]; return n; })}
              className={selCls}
            >
              <option value="">Todos</option>
              {opcoes[d].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
      </div>
      {filtrosAtivos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filtrosAtivos.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => alternar(d, filtros[d]!)}
              title="Remover filtro"
              className="inline-flex items-center gap-1.5 rounded-full bg-conecta-accent/10 border border-conecta-accent/30 text-conecta-accent px-2.5 py-1 text-[11px] font-display font-semibold hover:bg-conecta-accent/20"
            >
              {DIM_LABEL[d]}: {filtros[d]}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={() => setFiltros({})} className="text-[11px] font-display font-semibold text-conecta-muted hover:text-conecta-accent underline underline-offset-2">
            Limpar tudo
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ConectaCard>
          <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.22em] text-conecta-muted font-semibold">
            <FileWarning className="h-3.5 w-3.5 text-conecta-accent" /> Pendências
          </div>
          <div className="mt-1 font-display text-3xl font-extrabold tabular-nums text-conecta-accent">{kpi.pend}</div>
          <div className="text-[11px] text-conecta-muted flex items-center gap-1">
            {deltaTotal == null || temFiltro(filtrosAtivos) ? 'documentos/regularizações abertas' : (
              <>
                {deltaTotal < 0 ? <TrendingDown className="h-3.5 w-3.5 text-emerald-600" /> : deltaTotal > 0 ? <TrendingUp className="h-3.5 w-3.5 text-rose-600" /> : <Minus className="h-3.5 w-3.5" />}
                <span className={deltaTotal < 0 ? 'text-emerald-700 font-semibold' : deltaTotal > 0 ? 'text-rose-700 font-semibold' : ''}>
                  {deltaTotal > 0 ? '+' : ''}{deltaTotal} vs semana anterior
                </span>
              </>
            )}
          </div>
        </ConectaCard>
        <ConectaCard>
          <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.22em] text-conecta-muted font-semibold">
            <Users className="h-3.5 w-3.5 text-conecta-primary" /> Colaboradores com pendência
          </div>
          <div className="mt-1 font-display text-3xl font-extrabold tabular-nums text-conecta-primary">{kpi.colabs}</div>
          <div className="text-[11px] text-conecta-muted">média de {kpi.media} pendências cada</div>
        </ConectaCard>
        <ConectaCard>
          <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.22em] text-conecta-muted font-semibold">
            <Users className="h-3.5 w-3.5 text-conecta-primary" /> Funcionários cadastrados
          </div>
          <div className="mt-1 font-display text-3xl font-extrabold tabular-nums text-conecta-primary">{kpi.func}</div>
          <div className="text-[11px] text-conecta-muted">base do cálculo do %</div>
        </ConectaCard>
        <ConectaCard>
          <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.22em] text-conecta-muted font-semibold">
            <Users className="h-3.5 w-3.5 text-conecta-accent" /> % pendências do quadro
          </div>
          <div className="mt-1 font-display text-3xl font-extrabold tabular-nums text-conecta-accent">{kpi.pct == null ? '—' : `${kpi.pct}%`}</div>
          <div className="text-[11px] text-conecta-muted">pendências ÷ funcionários cadastrados (quadro)</div>
        </ConectaCard>
      </div>

      {/* Corrida */}
      <div className="flex items-center gap-2">
        <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Corrida por</span>
        {([['filial', 'Filial'], ['resp', 'Responsável']] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setModo(k)}
            aria-pressed={modo === k}
            className={`rounded-full border px-3 py-1 text-[11px] font-display font-semibold transition ${
              modo === k ? 'bg-conecta-primary text-white border-conecta-primary' : 'border-conecta-primary/20 text-conecta-primary hover:bg-conecta-primary/5'
            }`}
          >
            {l}
          </button>
        ))}
              <span className="mx-2 h-4 w-px bg-conecta-primary/20" aria-hidden />
        <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Ranking por</span>
        {([['total', 'Total de pendências'], ['pct', '% do quadro']] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMetrica(k)}
            aria-pressed={metrica === k}
            className={`rounded-full border px-3 py-1 text-[11px] font-display font-semibold transition ${
              metrica === k ? 'bg-conecta-accent text-white border-conecta-accent' : 'border-conecta-primary/20 text-conecta-primary hover:bg-conecta-primary/5'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <IcCorrida
        metrica={metrica}
        raias={raias}
        selecionado={modo === 'filial' ? filtros.filial ?? null : filtros.resp ?? null}
        onSelect={(chave) => alternar(modo === 'filial' ? 'filial' : 'resp', chave)}
        semanaLabel={fmtSemana(semana.semanaRef)}
      />

      {semResp.length > 0 && (
        <div className="rounded-xl border border-dashed border-conecta-primary/25 bg-slate-50 p-3 text-[12px] text-conecta-muted flex flex-wrap items-center gap-2">
          <span className="font-display font-semibold text-conecta-primary">Fora da corrida — sem responsável:</span>
          {semRespFiliais.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltros((x) => ({ ...x, resp: SEM_RESP, filial: f }))}
              className="rounded-full border border-conecta-primary/20 bg-white px-2 py-0.5 font-mono text-[11px] hover:border-conecta-accent hover:text-conecta-accent"
            >
              {f} · {semResp.filter((r) => r.filial === f).length}
            </button>
          ))}
          <span>({semResp.length} pendências — atribua em &ldquo;Responsáveis&rdquo;)</span>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <VagasRankingBars titulo="Pendências por tipo de regularização" icon={FileWarning} color="orange" labelWidthClass="w-52"
          data={ranking(para('categoria'), 'categoria', 12)} selected={filtros.categoria ?? null} onSelect={(v) => alternar('categoria', v)} />
        <VagasRankingBars titulo="Pendências por filial" icon={Building2} labelWidthClass="w-12"
          data={ranking(para('filial'), 'filial', 20)} selected={filtros.filial ?? null} onSelect={(v) => alternar('filial', v)} />
        <VagasRankingBars titulo="Por função (top 10)" icon={Briefcase} labelWidthClass="w-44"
          data={ranking(para('funcao'), 'funcao')} selected={filtros.funcao ?? null} onSelect={(v) => alternar('funcao', v)} />
        <VagasRankingBars titulo="Por seção (top 10)" icon={LayoutGrid} color="orange" labelWidthClass="w-44"
          data={ranking(para('secao'), 'secao')} selected={filtros.secao ?? null} onSelect={(v) => alternar('secao', v)} />
        <VagasRankingBars titulo="Detalhe do tipo (top 10)" icon={ListTree} labelWidthClass="w-52"
          data={ranking(para('tipo'), 'tipo')} selected={filtros.tipo ?? null} onSelect={(v) => alternar('tipo', v)} />
        <Evolucao evolucao={evolucao} responsaveis={responsaveis} />
      </div>

      {/* Colaboradores */}
      <ConectaCard noPadding>
        <div className="p-5 pb-3 space-y-3">
          <SectionHeader label={`Colaboradores com pendências (${colabs.length})`} icon={Users} />
          {restritasNoFiltro > 0 && (
            <p className="text-[11px] text-conecta-muted">
              {restritasNoFiltro} pendência(s) de outras filiais entram nos números e no ranking, mas os nomes só aparecem para as filiais do seu acesso.
            </p>
          )}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(40); }} placeholder="Buscar nome, matrícula ou função…"
              className="w-full rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#0D2B6B' }} className="text-white text-[10px] uppercase tracking-[0.14em] font-display">
                <th className="px-3 py-2.5 w-8" />
                <th className="px-3 py-2.5 text-left">Colaborador</th>
                <th className="px-3 py-2.5 text-left">Filial</th>
                <th className="px-3 py-2.5 text-left">Função</th>
                <th className="px-3 py-2.5 text-left">Responsável</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">Pendências</th>
              </tr>
              <tr aria-hidden><td colSpan={6} className="h-[2px] p-0 bg-conecta-accent" /></tr>
            </thead>
            <tbody>
              {colabs.slice(0, limite).map((c) => {
                const open = aberto.has(c.chapa);
                return (
                  <Fragment key={c.chapa}>
                    <tr className="border-t border-conecta-primary/8 hover:bg-slate-50/70">
                      <td className="px-3 py-2">
                        <button type="button" aria-label={open ? 'Recolher' : 'Expandir'}
                          onClick={() => setAberto((p) => { const n = new Set(p); if (n.has(c.chapa)) n.delete(c.chapa); else n.add(c.chapa); return n; })}
                          className="grid place-items-center h-6 w-6 rounded-md border border-conecta-primary/15 text-conecta-primary hover:text-conecta-accent hover:border-conecta-accent">
                          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-display font-semibold text-conecta-primary">{c.nome}</div>
                        <div className="text-[11px] text-conecta-muted font-mono">{c.chapa}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{c.filial}</td>
                      <td className="px-3 py-2 text-conecta-muted">{c.funcao}</td>
                      <td className="px-3 py-2 text-[12px] text-conecta-muted">{c.resp}</td>
                      <td className="px-3 py-2 text-center tabular-nums font-bold text-conecta-accent border-l border-conecta-primary/8">{c.itens.length}</td>
                    </tr>
                    {open && (
                      <tr className="bg-conecta-primary/[0.03]">
                        <td />
                        <td colSpan={5} className="px-3 py-3">
                          <ul className="rounded-lg border border-conecta-primary/10 bg-white divide-y divide-conecta-primary/8">
                            {c.itens.map((i, k) => (
                              <li key={k} className="px-3 py-2 flex flex-wrap items-center gap-3 text-[13px]">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-conecta-accent" />
                                <span className="flex-1 min-w-[220px] font-display font-semibold text-conecta-primary">{i.tipo}</span>
                                <span className="text-[11px] text-conecta-muted">{i.categoria}</span>
                                <span className="text-[11px] text-conecta-muted tabular-nums">{fmtData(i.data)}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {colabs.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-conecta-muted">Nenhum colaborador encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
        {colabs.length > limite && (
          <div className="p-4 text-center">
            <button type="button" onClick={() => setLimite((l) => l + 80)}
              className="rounded-lg border border-conecta-primary/20 text-conecta-primary px-4 py-1.5 text-[11px] font-display font-semibold hover:bg-conecta-primary/5">
              Mostrar mais ({colabs.length - limite} restantes)
            </button>
          </div>
        )}
      </ConectaCard>
    </div>
  );
}

const temFiltro = (f: string[]) => f.length > 0;

/** Linhas simples (SVG) com as pendências de cada responsável ao longo das semanas. */
function Evolucao({ evolucao, responsaveis }: { evolucao: IcEvolucaoPonto[]; responsaveis: IcResponsavelView[] }) {
  const W = 520, H = 220, PL = 36, PR = 12, PT = 12, PB = 30;
  const max = Math.max(1, ...evolucao.flatMap((p) => Object.values(p.porResp)));
  const x = (i: number) => PL + (evolucao.length <= 1 ? (W - PL - PR) / 2 : (i / (evolucao.length - 1)) * (W - PL - PR));
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-2"><SectionHeader label="Evolução semanal por responsável" icon={TrendingDown} /></div>
      {evolucao.length < 2 ? (
        <p className="px-5 pb-8 pt-4 text-sm text-conecta-muted">
          A evolução aparece a partir da 2ª semana importada. Importe a planilha toda semana para acompanhar quem avança.
        </p>
      ) : (
        <div className="px-3 pb-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Pendências por semana">
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line x1={PL} x2={W - PR} y1={y(max * t)} y2={y(max * t)} stroke="#0D2B6B" strokeOpacity=".1" />
                <text x={PL - 6} y={y(max * t) + 3} fontSize="9" textAnchor="end" fill="#64748b">{Math.round(max * t)}</text>
              </g>
            ))}
            {evolucao.map((p, i) => (
              <text key={p.semanaRef} x={x(i)} y={H - 10} fontSize="9" textAnchor="middle" fill="#64748b">{p.semanaRef.slice(8)}/{p.semanaRef.slice(5, 7)}</text>
            ))}
            {responsaveis.map((r, ri) => {
              const pts = evolucao.map((p, i) => [x(i), y(p.porResp[r.nome] ?? 0)] as const);
              return (
                <g key={r.id}>
                  <polyline fill="none" stroke={r.cor} strokeWidth="2" strokeOpacity=".85" strokeDasharray={["", "6 3", "2 3"][ri % 3]} points={pts.map((q) => q.join(',')).join(' ')} />
                  {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r="2.6" fill={r.cor} />)}
                </g>
              );
            })}
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-2">
            {responsaveis.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1.5 text-[10px] text-conecta-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: r.cor }} /> {r.nome}
              </span>
            ))}
          </div>
        </div>
      )}
    </ConectaCard>
  );
}
