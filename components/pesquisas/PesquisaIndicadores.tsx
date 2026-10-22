'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { X, Pencil, BarChart3, Building2, Users, UserCheck, UserX, ListTree, MessageSquareText, Star, ExternalLink } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { SubTabs } from '@/components/ui/sub-tabs';
import { VagasRankingBars } from '@/components/vagas/VagasRankingBars';
import type { AlvoColab, RespostaRow, CotaFilial } from '@/lib/pesquisas/dados';

interface Pergunta {
  id: string;
  texto: string;
  tipo: 'unica' | 'multipla' | 'texto' | 'nota';
  opcoes: string[];
}

type Aba = 'indicadores' | 'participacao';
type Dim = 'filial' | 'funcao' | 'secao';
const DIM_LABEL: Record<Dim, string> = { filial: 'Filial', funcao: 'Função', secao: 'Seção' };

const dimDe = (r: { filialCodigo: string | null; funcao: string | null; secao: string | null }, d: Dim) =>
  (d === 'filial' ? r.filialCodigo : d === 'funcao' ? r.funcao : r.secao) ?? '—';

function opcoesDaResposta(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (v == null) return [];
  return [String(v)];
}

export function PesquisaIndicadores({
  pesquisa,
  perguntas,
  respostas,
  alvo,
  cotas,
}: {
  pesquisa: { id: string; slug: string; titulo: string; anonima: boolean; status: string };
  perguntas: Pergunta[];
  respostas: RespostaRow[];
  alvo: AlvoColab[];
  cotas: CotaFilial[];
}) {
  const [aba, setAba] = useState<Aba>('indicadores');
  const [filtro, setFiltro] = useState<Partial<Record<Dim, string>>>({});
  const [cruzP, setCruzP] = useState<string>(perguntas.find((p) => p.tipo === 'unica' || p.tipo === 'multipla')?.id ?? '');
  const [cruzDim, setCruzDim] = useState<Dim>('filial');
  const [busca, setBusca] = useState('');
  // Filtros por resposta: clicar numa opção de um gráfico filtra os respondentes que a escolheram.
  const [fResp, setFResp] = useState<Record<string, string>>({});

  const passa = (r: { filialCodigo: string | null; funcao: string | null; secao: string | null }, ignorar?: Dim) =>
    (Object.keys(filtro) as Dim[]).every((d) => d === ignorar || !filtro[d] || dimDe(r, d) === filtro[d]);
  const casaResp = (r: RespostaRow, ignorarP?: string) =>
    Object.entries(fResp).every(([pid, op]) => pid === ignorarP || opcoesDaResposta(r.valores[pid]).includes(op));

  // Filtro cruzado (estilo Power BI): cada gráfico considera todos os filtros, menos o próprio.
  const respF = useMemo(() => respostas.filter((r) => passa(r) && casaResp(r)), [respostas, filtro, fResp]); // eslint-disable-line react-hooks/exhaustive-deps
  const alternarResp = (pid: string, op: string) =>
    setFResp((f) => {
      const n = { ...f };
      if (n[pid] === op) delete n[pid]; else n[pid] = op;
      return n;
    });
  const alternarDim = (d: Dim, v: string) => setFiltro((f) => ({ ...f, [d]: f[d] === v ? undefined : v }));
  const rankingDim = (d: Dim) => {
    const m = new Map<string, number>();
    for (const r of respostas) if (passa(r, d) && casaResp(r)) m.set(dimDe(r, d), (m.get(dimDe(r, d)) ?? 0) + 1);
    return Array.from(m.entries()).map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)).slice(0, 10);
  };
  const alvoF = useMemo(() => alvo.filter((a) => passa(a)), [alvo, filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const anonima = pesquisa.anonima;
  const cotasF = useMemo(
    () => cotas.filter((c) => !filtro.filial || c.filialCodigo === filtro.filial),
    [cotas, filtro.filial],
  );
  const publico = anonima ? cotasF.reduce((s, c) => s + c.cota, 0) : alvoF.length;
  const pct = publico > 0 ? Math.round((respF.length / publico) * 100) : 0;

  const opcoesFiltro = useMemo(() => {
    const base = anonima ? [] : alvo;
    const uniq = (d: Dim) =>
      Array.from(new Set([...base.map((r) => dimDe(r, d)), ...respostas.map((r) => dimDe(r, d))])).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
    return {
      filial: anonima ? Array.from(new Set(cotas.map((c) => c.filialCodigo))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : uniq('filial'),
      funcao: anonima ? [] : uniq('funcao'),
      secao: anonima ? [] : uniq('secao'),
    } as Record<Dim, string[]>;
  }, [alvo, respostas, cotas, anonima]);

  // Adesão por filial
  const adesao = useMemo(() => {
    const m = new Map<string, { resp: number; alvo: number }>();
    const get = (k: string) => m.get(k) ?? (m.set(k, { resp: 0, alvo: 0 }), m.get(k)!);
    if (anonima) for (const c of cotas) get(c.filialCodigo).alvo = c.cota;
    else for (const a of alvo) get(a.filialCodigo).alvo++;
    for (const r of respostas) get(r.filialCodigo ?? '—').resp++;
    return Array.from(m.entries())
      .map(([filial, v]) => ({ filial, ...v, pct: v.alvo > 0 ? Math.round((v.resp / v.alvo) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct || a.filial.localeCompare(b.filial, undefined, { numeric: true }));
  }, [alvo, respostas, cotas, anonima]);

  // Quem respondeu / falta
  const chapasResp = useMemo(() => new Set(respostas.map((r) => r.chapa).filter(Boolean) as string[]), [respostas]);
  const faltam = useMemo(() => alvoF.filter((a) => !chapasResp.has(a.chapa)), [alvoF, chapasResp]);
  const q = busca.trim().toLowerCase();
  const casaBusca = (r: { nome: string | null; chapa: string | null; funcao: string | null }) =>
    !q || `${r.nome ?? ''} ${r.chapa ?? ''} ${r.funcao ?? ''}`.toLowerCase().includes(q);

  const link = typeof window !== 'undefined' ? `${window.location.origin}/p/${pesquisa.slug}` : `/p/${pesquisa.slug}`;

  const temFiltro = (Object.keys(filtro) as Dim[]).some((d) => filtro[d]) || Object.keys(fResp).length > 0;
  const dimsDisponiveis: Dim[] = anonima ? ['filial'] : ['filial', 'funcao', 'secao'];

  const cruzPergunta = perguntas.find((p) => p.id === cruzP);
  const cruzado = useMemo(() => {
    if (!cruzPergunta) return null;
    const linhas = new Map<string, Map<string, number>>();
    for (const r of respF) {
      const v = r.valores[cruzPergunta.id];
      if (v == null) continue;
      const k = dimDe(r, cruzDim);
      const l = linhas.get(k) ?? new Map<string, number>();
      for (const o of opcoesDaResposta(v)) l.set(o, (l.get(o) ?? 0) + 1);
      linhas.set(k, l);
    }
    const cols = cruzPergunta.tipo === 'nota' ? ['1', '2', '3', '4', '5'] : cruzPergunta.opcoes;
    const rows = Array.from(linhas.entries())
      .map(([k, l]) => ({ k, l, total: Array.from(l.values()).reduce((s, n) => s + n, 0) }))
      .sort((a, b) => b.total - a.total || a.k.localeCompare(b.k, undefined, { numeric: true }));
    return { cols, rows };
  }, [respF, cruzPergunta, cruzDim]);

  const selCls = 'rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SubTabs<Aba>
          value={aba}
          onChange={setAba}
          items={[
            { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
            ...(!anonima ? [{ id: 'participacao' as const, label: 'Quem respondeu / falta', icon: Users }] : []),
          ]}
        />
        <span className="flex-1" />
        <Link
          href={`/pesquisas/${pesquisa.id}/editar`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-conecta-primary/20 text-conecta-primary px-3 py-1.5 text-[11px] font-display font-semibold hover:bg-conecta-primary/5"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar perguntas
        </Link>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ir para pesquisa
        </a>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {dimsDisponiveis.map((d) => (
          <label key={d} className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">{DIM_LABEL[d]}</span>
            <select
              value={filtro[d] ?? ''}
              onChange={(e) => setFiltro((f) => ({ ...f, [d]: e.target.value || undefined }))}
              className={selCls}
            >
              <option value="">Todas</option>
              {opcoesFiltro[d].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
        {Object.entries(fResp).map(([pid, op]) => (
          <button
            key={pid}
            type="button"
            onClick={() => alternarResp(pid, op)}
            title="Remover filtro"
            className="inline-flex items-center gap-1.5 rounded-full bg-conecta-accent/10 border border-conecta-accent/30 text-conecta-accent px-2.5 py-1 text-[11px] font-display font-semibold hover:bg-conecta-accent/20"
          >
            {perguntas.findIndex((q) => q.id === pid) + 1}. {op}
            <X className="h-3 w-3" />
          </button>
        ))}
        {temFiltro && (
          <button type="button" onClick={() => { setFiltro({}); setFResp({}); }} className="text-[11px] font-display font-semibold text-conecta-muted hover:text-conecta-accent underline underline-offset-2">
            Limpar filtros
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: 'Responderam', v: respF.length, c: 'text-conecta-primary' },
          { l: anonima ? 'Quadro (cota)' : 'Público-alvo', v: publico, c: 'text-conecta-primary' },
          { l: '% de adesão', v: `${pct}%`, c: 'text-conecta-accent' },
          { l: anonima ? 'Faltam (cota)' : 'Ainda faltam', v: Math.max(0, publico - respF.length), c: 'text-conecta-primary' },
        ].map((k) => (
          <ConectaCard key={k.l}>
            <div className="text-[10px] font-display uppercase tracking-[0.22em] text-conecta-muted font-semibold">{k.l}</div>
            <div className={`mt-1 font-display text-3xl font-extrabold tabular-nums ${k.c}`}>{k.v}</div>
          </ConectaCard>
        ))}
      </div>

      {aba === 'indicadores' ? (
        <>
          {/* Respostas por pergunta */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {perguntas.map((p, i) => {
              if (p.tipo === 'texto') {
                const textos = respF.filter((r) => typeof r.valores[p.id] === 'string' && String(r.valores[p.id]).trim());
                return (
                  <ConectaCard key={p.id} noPadding className="lg:col-span-2">
                    <div className="p-5 pb-3"><SectionHeader label={`${i + 1}. ${p.texto}`} icon={MessageSquareText} /></div>
                    <ul className="px-5 pb-5 space-y-2 max-h-80 overflow-y-auto">
                      {textos.length === 0 && <li className="text-sm text-conecta-muted">Sem respostas.</li>}
                      {textos.map((r) => (
                        <li key={r.id} className="rounded-lg border border-conecta-primary/10 p-3 text-sm">
                          <div>{String(r.valores[p.id])}</div>
                          {!anonima && <div className="mt-1 text-[11px] text-conecta-muted">{r.nome} · {r.funcao} · filial {r.filialCodigo}</div>}
                        </li>
                      ))}
                    </ul>
                  </ConectaCard>
                );
              }
              const cont = new Map<string, number>();
              let soma = 0, n = 0;
              for (const r of respostas) {
                if (!passa(r) || !casaResp(r, p.id)) continue;
                const v = r.valores[p.id];
                if (v == null) continue;
                for (const o of opcoesDaResposta(v)) cont.set(o, (cont.get(o) ?? 0) + 1);
                if (p.tipo === 'nota') { soma += Number(v); n++; }
              }
              const ordem = p.tipo === 'nota' ? ['1', '2', '3', '4', '5'] : p.opcoes;
              const data = ordem.map((o) => ({ label: o, total: cont.get(o) ?? 0 }));
              return (
                <VagasRankingBars
                  key={p.id}
                  titulo={`${i + 1}. ${p.texto}${p.tipo === 'nota' && n ? ` — média ${(soma / n).toFixed(2)}` : ''}`}
                  icon={p.tipo === 'nota' ? Star : ListTree}
                  color={i % 2 === 0 ? 'orange' : 'navy'}
                  labelWidthClass="w-40"
                  data={data}
                  selected={fResp[p.id] ?? null}
                  onSelect={(o) => alternarResp(p.id, o)}
                />
              );
            })}
          </div>

          {!anonima && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <VagasRankingBars
                titulo="Respostas por função (top 10)"
                icon={Users}
                labelWidthClass="w-40"
                data={rankingDim('funcao')}
                selected={filtro.funcao ?? null}
                onSelect={(v) => alternarDim('funcao', v)}
              />
              <VagasRankingBars
                titulo="Respostas por seção (top 10)"
                icon={ListTree}
                labelWidthClass="w-40"
                data={rankingDim('secao')}
                selected={filtro.secao ?? null}
                onSelect={(v) => alternarDim('secao', v)}
              />
            </div>
          )}

          {/* Adesão por filial */}
          <ConectaCard noPadding>
            <div className="p-5 pb-3"><SectionHeader label="Adesão por filial" icon={Building2} /></div>
            <div className="px-5 pb-5 space-y-2">
              {adesao.map((a) => (
                <button
                  type="button"
                  key={a.filial}
                  onClick={() => setFiltro((f) => ({ ...f, filial: f.filial === a.filial ? undefined : a.filial }))}
                  className={`flex w-full items-center gap-3 rounded-md text-left ${filtro.filial && filtro.filial !== a.filial ? 'opacity-40' : ''}`}
                >
                  <span className="w-12 shrink-0 font-display text-[12px] font-semibold text-conecta-primary">{a.filial}</span>
                  <span className="flex-1 h-6 rounded-md bg-conecta-primary/5 relative overflow-hidden">
                    <span className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${Math.min(100, a.pct)}%`, background: 'linear-gradient(90deg, #0D2B6B 0%, #1A3F8F 100%)' }} />
                  </span>
                  <span className="w-28 shrink-0 text-right font-display text-[12px] font-bold tabular-nums text-conecta-primary">
                    {a.resp}/{a.alvo} · {a.pct}%
                  </span>
                </button>
              ))}
            </div>
          </ConectaCard>

          {/* Cruzamento */}
          {cruzPergunta && (
            <ConectaCard noPadding>
              <div className="p-5 pb-3 space-y-3">
                <SectionHeader label="Respostas por perfil" icon={Users} />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={cruzP} onChange={(e) => setCruzP(e.target.value)} className={selCls}>
                    {perguntas.filter((p) => p.tipo !== 'texto').map((p) => (
                      <option key={p.id} value={p.id}>{p.texto}</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-conecta-muted">por</span>
                  <select value={cruzDim} onChange={(e) => setCruzDim(e.target.value as Dim)} className={selCls}>
                    {dimsDisponiveis.map((d) => <option key={d} value={d}>{DIM_LABEL[d]}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: '#0D2B6B' }} className="text-white">
                      <th className="px-3 py-2.5 text-left font-display text-[10px] uppercase tracking-[0.14em]">{DIM_LABEL[cruzDim]}</th>
                      <th className="px-3 py-2.5 text-center font-display text-[10px] uppercase tracking-[0.14em] border-l border-white/15">Total</th>
                      {cruzado?.cols.map((c) => (
                        <th key={c} className="px-3 py-2.5 text-center font-display text-[10px] uppercase tracking-[0.14em] border-l border-white/15 min-w-[110px]">{c}</th>
                      ))}
                    </tr>
                    <tr aria-hidden><td colSpan={2 + (cruzado?.cols.length ?? 0)} className="h-[2px] p-0 bg-conecta-accent" /></tr>
                  </thead>
                  <tbody>
                    {cruzado?.rows.map((r) => (
                      <tr key={r.k} className="border-t border-conecta-primary/8 hover:bg-slate-50/70">
                        <td className="px-3 py-2 font-display font-semibold text-conecta-primary">{r.k}</td>
                        <td className="px-3 py-2 text-center font-bold tabular-nums text-conecta-primary border-l border-conecta-primary/8">{r.total}</td>
                        {cruzado.cols.map((c) => {
                          const n = r.l.get(c) ?? 0;
                          return (
                            <td key={c} className="px-3 py-2 text-center tabular-nums border-l border-conecta-primary/8">
                              {n ? (<>{n} <span className="text-[10px] text-conecta-muted">({Math.round((n / r.total) * 100)}%)</span></>) : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {cruzado?.rows.length === 0 && (
                      <tr><td colSpan={2 + cruzado.cols.length} className="px-5 py-8 text-center text-conecta-muted">Sem respostas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ConectaCard>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome, matrícula ou função…"
            className="xl:col-span-2 rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm"
          />
          <ConectaCard noPadding>
            <div className="p-5 pb-3"><SectionHeader label={`Responderam (${respF.filter(casaBusca).length})`} icon={UserCheck} /></div>
            <ul className="px-5 pb-5 max-h-[520px] overflow-y-auto divide-y divide-conecta-primary/8">
              {respF.filter(casaBusca).map((r) => (
                <li key={r.id} className="py-2 text-sm">
                  <div className="font-display font-semibold text-conecta-primary">{r.nome}</div>
                  <div className="text-[11px] text-conecta-muted">{r.chapa} · {r.funcao} · filial {r.filialCodigo} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}</div>
                </li>
              ))}
            </ul>
          </ConectaCard>
          <ConectaCard noPadding>
            <div className="p-5 pb-3"><SectionHeader label={`Faltam (${faltam.filter(casaBusca).length})`} icon={UserX} /></div>
            <ul className="px-5 pb-5 max-h-[520px] overflow-y-auto divide-y divide-conecta-primary/8">
              {faltam.filter(casaBusca).map((a) => (
                <li key={a.chapa} className="py-2 text-sm">
                  <div className="font-display font-semibold text-conecta-primary">{a.nome}</div>
                  <div className="text-[11px] text-conecta-muted">{a.chapa} · {a.funcao} · filial {a.filialCodigo}</div>
                </li>
              ))}
            </ul>
          </ConectaCard>
        </div>
      )}
    </div>
  );
}
