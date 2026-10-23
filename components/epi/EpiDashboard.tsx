'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Building2, CalendarClock, ChevronDown, ChevronRight, HardHat, LayoutGrid,
  Search, ShieldAlert, UserCog, Users, X, Briefcase,
} from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { VagasRankingBars } from '@/components/vagas/VagasRankingBars';
import { EpiStackedBars, COR_STATUS, type StackItem } from './EpiStackedBars';
import { STATUS_LABEL, type EpiRow, type StatusEpi } from '@/lib/epi/tipos';

type Dim = 'filial' | 'secao' | 'funcao' | 'sit' | 'tst' | 'epi' | 'risco' | 'status' | 'venc';

const DIM_LABEL: Record<Dim, string> = {
  filial: 'Filial', secao: 'Seção', funcao: 'Função', sit: 'Situação', tst: 'TST',
  epi: 'EPI', risco: 'Risco', status: 'Status', venc: 'Vencimento',
};

const BUCKETS = ['Vencido', 'Vence em 0–30 dias', 'Vence em 31–90 dias', 'Vence em +90 dias'] as const;

const valor: Record<Dim, (r: EpiRow) => string | null> = {
  filial: (r) => r.filial,
  secao: (r) => r.secao,
  funcao: (r) => r.funcao,
  sit: (r) => r.sit,
  tst: (r) => r.tst,
  epi: (r) => r.epi,
  risco: (r) => r.risco,
  status: (r) => r.status,
  venc: (r) => {
    if (r.status === 'SEM_EMPRESTIMO' || r.dias == null) return null;
    if (r.dias < 0) return BUCKETS[0];
    if (r.dias <= 30) return BUCKETS[1];
    if (r.dias <= 90) return BUCKETS[2];
    return BUCKETS[3];
  },
};

const SELECTS: Dim[] = ['filial', 'secao', 'funcao', 'sit', 'tst'];

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

function empilhar(rows: EpiRow[], dim: Dim, opts: { limite?: number; ordem?: 'pior' | 'volume' } = {}): StackItem[] {
  const m = new Map<string, StackItem>();
  for (const r of rows) {
    const k = valor[dim](r);
    if (k == null) continue;
    const it = m.get(k) ?? { label: k, regular: 0, trocar: 0, sem: 0 };
    if (r.status === 'REGULAR') it.regular++;
    else if (r.status === 'TROCAR') it.trocar++;
    else it.sem++;
    m.set(k, it);
  }
  const arr = Array.from(m.values());
  const tot = (i: StackItem) => i.regular + i.trocar + i.sem;
  if (opts.ordem === 'pior') {
    arr.sort((a, b) => a.regular / tot(a) - b.regular / tot(b) || tot(b) - tot(a));
  } else {
    arr.sort((a, b) => tot(b) - tot(a) || a.label.localeCompare(b.label));
  }
  return opts.limite ? arr.slice(0, opts.limite) : arr;
}

export function EpiDashboard({ rows, atualizadoEm }: { rows: EpiRow[]; atualizadoEm: string | null }) {
  const [filtros, setFiltros] = useState<Partial<Record<Dim, string>>>({});
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(50);
  const [aberto, setAberto] = useState<Set<string>>(new Set());

  const alternar = (d: Dim, v: string) =>
    setFiltros((f) => {
      const n = { ...f };
      if (n[d] === v) delete n[d]; else n[d] = v;
      return n;
    });

  // Filtro cruzado: cada gráfico considera todos os filtros, menos o da própria dimensão.
  const casa = (r: EpiRow, ignorar?: Dim) =>
    (Object.keys(filtros) as Dim[]).every((d) => d === ignorar || !filtros[d] || valor[d](r) === filtros[d]);
  const para = (ignorar?: Dim) => rows.filter((r) => casa(r, ignorar));

  const filtradas = useMemo(() => para(), [rows, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const opcoes = useMemo(() => {
    const o = {} as Record<Dim, string[]>;
    for (const d of SELECTS) {
      o[d] = Array.from(new Set(rows.map((r) => valor[d](r)!))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return o;
  }, [rows]);

  const kpi = useMemo(() => {
    const k = { total: filtradas.length, regular: 0, trocar: 0, sem: 0 };
    for (const r of filtradas) {
      if (r.status === 'REGULAR') k.regular++;
      else if (r.status === 'TROCAR') k.trocar++;
      else k.sem++;
    }
    return { ...k, colab: new Set(filtradas.map((r) => r.chapa)).size };
  }, [filtradas]);

  const g = useMemo(() => {
    const status = (['REGULAR', 'TROCAR', 'SEM_EMPRESTIMO'] as StatusEpi[]).map((s) => ({
      label: STATUS_LABEL[s],
      total: para('status').filter((r) => r.status === s).length,
    }));
    const naoRegular = (dim: Dim) => {
      const m = new Map<string, number>();
      for (const r of para(dim)) if (r.status !== 'REGULAR') m.set(valor[dim](r)!, (m.get(valor[dim](r)!) ?? 0) + 1);
      return Array.from(m.entries()).map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)).slice(0, 10);
    };
    const baseVenc = para('venc');
    const venc = BUCKETS.map((b) => ({ label: b, total: baseVenc.filter((r) => valor.venc(r) === b).length }));
    return {
      status,
      filial: empilhar(para('filial'), 'filial', { ordem: 'pior' }),
      secao: empilhar(para('secao'), 'secao', { limite: 10 }),
      funcao: empilhar(para('funcao'), 'funcao', { limite: 10 }),
      tst: empilhar(para('tst'), 'tst', { limite: 10 }),
      epi: naoRegular('epi'),
      risco: naoRegular('risco'),
      venc,
    };
  }, [rows, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  // Colaboradores com mais pendências
  const colabs = useMemo(() => {
    const m = new Map<string, { chapa: string; nome: string; filial: string; funcao: string; secao: string; itens: EpiRow[] }>();
    for (const r of filtradas) {
      const c = m.get(r.chapa) ?? { chapa: r.chapa, nome: r.nome, filial: r.filial, funcao: r.funcao, secao: r.secao, itens: [] };
      c.itens.push(r);
      m.set(r.chapa, c);
    }
    const q = busca.trim().toLowerCase();
    return Array.from(m.values())
      .map((c) => ({
        ...c,
        regular: c.itens.filter((i) => i.status === 'REGULAR').length,
        trocar: c.itens.filter((i) => i.status === 'TROCAR').length,
        sem: c.itens.filter((i) => i.status === 'SEM_EMPRESTIMO').length,
      }))
      .filter((c) => !q || `${c.nome} ${c.chapa} ${c.funcao}`.toLowerCase().includes(q))
      .sort((a, b) => b.sem + b.trocar - (a.sem + a.trocar) || a.nome.localeCompare(b.nome));
  }, [filtradas, busca]);

  const filtrosAtivos = (Object.keys(filtros) as Dim[]).filter((d) => filtros[d]);
  const selCls = 'rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary max-w-[220px]';
  const labelStatus = filtros.status ? STATUS_LABEL[filtros.status as StatusEpi] : null;

  if (rows.length === 0) {
    return (
      <ConectaCard>
        <p className="text-center text-sm text-conecta-muted py-10">
          Ainda não há dados de EPI. O admin precisa importar a planilha do painel em &ldquo;Importar planilha&rdquo;.
        </p>
      </ConectaCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {SELECTS.map((d) => (
          <label key={d} className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">{DIM_LABEL[d]}</span>
            <select
              value={filtros[d] ?? ''}
              onChange={(e) => setFiltros((f) => { const n = { ...f }; if (e.target.value) n[d] = e.target.value; else delete n[d]; return n; })}
              className={selCls}
            >
              <option value="">Todas</option>
              {opcoes[d].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
        {atualizadoEm && (
          <span className="ml-auto text-[11px] text-conecta-muted">Base de {new Date(atualizadoEm).toLocaleDateString('pt-BR')}</span>
        )}
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
              {DIM_LABEL[d]}: {d === 'status' ? labelStatus : filtros[d]}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={() => setFiltros({})} className="text-[11px] font-display font-semibold text-conecta-muted hover:text-conecta-accent underline underline-offset-2">
            Limpar tudo
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { l: 'Colaboradores', v: kpi.colab, sub: `${kpi.total} EPIs exigidos`, c: '#0D2B6B', icon: Users },
          { l: 'EPIs regulares', v: kpi.regular, sub: `${pct(kpi.regular, kpi.total)}% do exigido`, c: COR_STATUS.regular, icon: HardHat },
          { l: 'A trocar', v: kpi.trocar, sub: `${pct(kpi.trocar, kpi.total)}% do exigido`, c: '#C98A0E', icon: AlertTriangle },
          { l: 'Sem empréstimo', v: kpi.sem, sub: `${pct(kpi.sem, kpi.total)}% do exigido`, c: COR_STATUS.sem, icon: ShieldAlert },
          { l: 'Cobertura regular', v: `${pct(kpi.regular, kpi.total)}%`, sub: 'regular ÷ exigido', c: '#E8621A', icon: Activity },
        ].map((k) => (
          <ConectaCard key={k.l}>
            <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.22em] text-conecta-muted font-semibold">
              <k.icon className="h-3.5 w-3.5" style={{ color: k.c }} /> {k.l}
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold tabular-nums" style={{ color: k.c }}>{k.v}</div>
            <div className="text-[11px] text-conecta-muted">{k.sub}</div>
          </ConectaCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <VagasRankingBars
          titulo="EPIs por status"
          icon={Activity}
          color="orange"
          labelWidthClass="w-36"
          data={g.status}
          selected={labelStatus}
          onSelect={(label) => {
            const key = (Object.keys(STATUS_LABEL) as StatusEpi[]).find((s) => STATUS_LABEL[s] === label);
            if (key) alternar('status', key);
          }}
        />
        <VagasRankingBars
          titulo="Situação do vencimento (EPIs entregues)"
          icon={CalendarClock}
          labelWidthClass="w-40"
          data={g.venc}
          selected={filtros.venc ?? null}
          onSelect={(v) => alternar('venc', v)}
        />
        <EpiStackedBars titulo="Cobertura por filial (pior primeiro)" icon={Building2} data={g.filial} selected={filtros.filial ?? null} onSelect={(v) => alternar('filial', v)} />
        <EpiStackedBars titulo="Cobertura por TST (top 10)" icon={UserCog} labelWidthClass="w-32" data={g.tst} selected={filtros.tst ?? null} onSelect={(v) => alternar('tst', v)} />
        <EpiStackedBars titulo="Por seção (top 10)" icon={LayoutGrid} labelWidthClass="w-36" data={g.secao} selected={filtros.secao ?? null} onSelect={(v) => alternar('secao', v)} />
        <EpiStackedBars titulo="Por função (top 10)" icon={Briefcase} labelWidthClass="w-36" data={g.funcao} selected={filtros.funcao ?? null} onSelect={(v) => alternar('funcao', v)} />
        <VagasRankingBars titulo="EPIs mais críticos (a trocar + sem empréstimo)" icon={HardHat} color="orange" labelWidthClass="w-48" data={g.epi} selected={filtros.epi ?? null} onSelect={(v) => alternar('epi', v)} />
        <VagasRankingBars titulo="Riscos mais descobertos (top 10)" icon={ShieldAlert} labelWidthClass="w-48" data={g.risco} selected={filtros.risco ?? null} onSelect={(v) => alternar('risco', v)} />
      </div>

      {/* Colaboradores */}
      <ConectaCard noPadding>
        <div className="p-5 pb-3 space-y-3">
          <SectionHeader label={`Colaboradores com pendências (${colabs.length})`} icon={Users} />
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
            <input
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setLimite(50); }}
              placeholder="Buscar nome, matrícula ou função…"
              className="w-full rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm"
            />
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
                <th className="px-3 py-2.5 text-center border-l border-white/15">Regular</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">Trocar</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">Sem empr.</th>
              </tr>
              <tr aria-hidden><td colSpan={7} className="h-[2px] p-0 bg-conecta-accent" /></tr>
            </thead>
            <tbody>
              {colabs.slice(0, limite).map((c) => {
                const open = aberto.has(c.chapa);
                return (
                  <Fragment key={c.chapa}>
                    <tr className="border-t border-conecta-primary/8 hover:bg-slate-50/70">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setAberto((p) => { const n = new Set(p); if (n.has(c.chapa)) n.delete(c.chapa); else n.add(c.chapa); return n; })}
                          aria-label={open ? 'Recolher' : 'Expandir'}
                          className="grid place-items-center h-6 w-6 rounded-md border border-conecta-primary/15 text-conecta-primary hover:text-conecta-accent hover:border-conecta-accent"
                        >
                          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-display font-semibold text-conecta-primary">{c.nome}</div>
                        <div className="text-[11px] text-conecta-muted font-mono">{c.chapa}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{c.filial}</td>
                      <td className="px-3 py-2 text-conecta-muted">{c.funcao}</td>
                      <td className="px-3 py-2 text-center tabular-nums font-bold border-l border-conecta-primary/8" style={{ color: COR_STATUS.regular }}>{c.regular || ''}</td>
                      <td className="px-3 py-2 text-center tabular-nums font-bold border-l border-conecta-primary/8" style={{ color: '#C98A0E' }}>{c.trocar || ''}</td>
                      <td className="px-3 py-2 text-center tabular-nums font-bold border-l border-conecta-primary/8" style={{ color: COR_STATUS.sem }}>{c.sem || ''}</td>
                    </tr>
                    {open && (
                      <tr className="bg-conecta-primary/[0.03]">
                        <td />
                        <td colSpan={6} className="px-3 py-3">
                          <ul className="rounded-lg border border-conecta-primary/10 bg-white divide-y divide-conecta-primary/8">
                            {[...c.itens]
                              .sort((a, b) => (a.status === 'REGULAR' ? 1 : 0) - (b.status === 'REGULAR' ? 1 : 0))
                              .map((i, k) => (
                                <li key={k} className="px-3 py-2 flex flex-wrap items-center gap-3 text-[13px]">
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ background: i.status === 'REGULAR' ? COR_STATUS.regular : i.status === 'TROCAR' ? COR_STATUS.trocar : COR_STATUS.sem }}
                                  />
                                  <span className="flex-1 min-w-[200px] font-display font-semibold text-conecta-primary">{i.epi}</span>
                                  <span className="text-[11px] text-conecta-muted">{i.risco}</span>
                                  <span className="text-[11px] font-display font-semibold">{STATUS_LABEL[i.status]}</span>
                                  <span className="text-[11px] text-conecta-muted tabular-nums">
                                    {i.dtEmp ? `emprestado em ${fmtData(i.dtEmp)}` : 'nunca emprestado'}
                                    {i.dtEmp && i.dias != null ? (i.dias < 0 ? ` · venceu há ${-i.dias}d` : ` · vence em ${i.dias}d`) : ''}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {colabs.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-conecta-muted">Nenhum colaborador encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {colabs.length > limite && (
          <div className="p-4 text-center">
            <button
              type="button"
              onClick={() => setLimite((l) => l + 100)}
              className="rounded-lg border border-conecta-primary/20 text-conecta-primary px-4 py-1.5 text-[11px] font-display font-semibold hover:bg-conecta-primary/5"
            >
              Mostrar mais ({colabs.length - limite} restantes)
            </button>
          </div>
        )}
      </ConectaCard>
    </div>
  );
}
