'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Clock, Gavel, Hourglass, Search, UserRound, Users, X } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { VagasRankingBars } from '@/components/vagas/VagasRankingBars';
import {
  FAIXAS_IDADE, FAIXAS_TEMPO, TURNOS, faixaIdade, faixaTempo, fmtTempo, nomeMes, type ComiteLancamento,
} from '@/lib/comite/tipos';

type Dim = 'filial' | 'funcao' | 'turno' | 'idade' | 'tempo' | 'medidas';
const DIM_LABEL: Record<Dim, string> = { filial: 'Filial', funcao: 'Função', turno: 'Turno', idade: 'Idade', tempo: 'Tempo de empresa', medidas: 'Medidas' };

const MEDIDAS = ['Sem medidas', '1 medida', '2 medidas', '3 ou mais medidas'] as const;
const faixaMedidas = (l: ComiteLancamento) => {
  const n = l.suspensoes + l.advertencias;
  return n === 0 ? MEDIDAS[0] : n === 1 ? MEDIDAS[1] : n === 2 ? MEDIDAS[2] : MEDIDAS[3];
};

const valor: Record<Dim, (l: ComiteLancamento) => string> = {
  filial: (l) => l.filial,
  funcao: (l) => l.funcao,
  turno: (l) => l.turno,
  idade: (l) => faixaIdade(l.idade),
  tempo: (l) => faixaTempo(l.tempoMeses),
  medidas: faixaMedidas,
};

const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');
const media = (ns: number[]) => (ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : null);
const dec = (n: number | null, d = 1) => (n == null ? '—' : n.toFixed(d).replace('.', ','));

function contar(rows: ComiteLancamento[], dim: Dim, ordem?: readonly string[], limite?: number) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(valor[dim](r), (m.get(valor[dim](r)) ?? 0) + 1);
  let arr = Array.from(m.entries()).map(([label, total]) => ({ label, total }));
  if (ordem) arr = ordem.map((label) => ({ label, total: m.get(label) ?? 0 }));
  else arr.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, undefined, { numeric: true }));
  return limite ? arr.slice(0, limite) : arr;
}

export function ComiteDashboard({
  lancamentos, mes, meses, anteriorPorFilial,
}: {
  lancamentos: ComiteLancamento[];
  mes: string;
  meses: string[];
  anteriorPorFilial: Record<string, number>;
}) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Partial<Record<Dim, string>>>({});
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<ComiteLancamento | null>(null);

  const alternar = (d: Dim, v: string) =>
    setFiltros((f) => { const n = { ...f }; if (n[d] === v) delete n[d]; else n[d] = v; return n; });
  const casa = (l: ComiteLancamento, ignorar?: Dim) =>
    (Object.keys(filtros) as Dim[]).every((d) => d === ignorar || !filtros[d] || valor[d](l) === filtros[d]);
  const para = (ignorar?: Dim) => lancamentos.filter((l) => casa(l, ignorar));
  const filtradas = useMemo(() => para(), [lancamentos, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => ({
    total: filtradas.length,
    filiais: new Set(filtradas.map((l) => l.filial)).size,
    susp: filtradas.reduce((s, l) => s + l.suspensoes, 0),
    adv: filtradas.reduce((s, l) => s + l.advertencias, 0),
    tempo: media(filtradas.flatMap((l) => (l.tempoMeses != null ? [l.tempoMeses] : []))),
    idade: media(filtradas.flatMap((l) => (l.idade != null ? [l.idade] : []))),
  }), [filtradas]);

  const g = useMemo(() => {
    // Comparativo com o mês anterior (por filial)
    const atual = new Map<string, number>();
    for (const l of para('filial')) atual.set(l.filial, (atual.get(l.filial) ?? 0) + 1);
    const filiaisCmp = Array.from(new Set([...atual.keys(), ...Object.keys(anteriorPorFilial)]))
      .map((f) => ({ f, a: atual.get(f) ?? 0, p: anteriorPorFilial[f] ?? 0 }))
      .sort((x, y) => y.a - x.a || y.p - x.p || x.f.localeCompare(y.f, undefined, { numeric: true }));
    return {
      filial: contar(para('filial'), 'filial'),
      funcao: contar(para('funcao'), 'funcao', undefined, 10),
      turno: contar(para('turno'), 'turno', TURNOS),
      idade: contar(para('idade'), 'idade', FAIXAS_IDADE),
      tempo: contar(para('tempo'), 'tempo', FAIXAS_TEMPO),
      medidas: contar(para('medidas'), 'medidas', MEDIDAS),
      filiaisCmp,
    };
  }, [lancamentos, filtros, anteriorPorFilial]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="space-y-5">
      {/* Mês */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Mês de referência</span>
          <select
            value={mes}
            onChange={(e) => router.push(`/comite?mes=${e.target.value}`)}
            className="rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary capitalize"
          >
            {opcoesMes.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </label>
        <Link href="/comite/lancar" className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
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
                <button key={d} type="button" onClick={() => alternar(d, filtros[d]!)} className="inline-flex items-center gap-1.5 rounded-full bg-conecta-accent/10 border border-conecta-accent/30 text-conecta-accent px-2.5 py-1 text-[11px] font-display font-semibold hover:bg-conecta-accent/20">
                  {DIM_LABEL[d]}: {filtros[d]} <X className="h-3 w-3" />
                </button>
              ))}
              <button type="button" onClick={() => setFiltros({})} className="text-[11px] font-display font-semibold text-conecta-muted hover:text-conecta-accent underline underline-offset-2">Limpar tudo</button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { l: 'Lançados', v: kpi.total, sub: `em ${kpi.filiais} filiais`, c: '#0D2B6B', icon: Users },
              { l: 'Tempo médio de casa', v: kpi.tempo == null ? '—' : fmtTempo(Math.round(kpi.tempo)), sub: 'até o mês de referência', c: '#E8621A', icon: Hourglass },
            ].map((k) => (
              <ConectaCard key={k.l}>
                <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.18em] text-conecta-muted font-semibold">
                  <k.icon className="h-3.5 w-3.5" style={{ color: k.c }} /> {k.l}
                </div>
                <div className="mt-1 font-display text-2xl font-extrabold tabular-nums" style={{ color: k.c }}>{k.v}</div>
                <div className="text-[11px] text-conecta-muted">{k.sub}</div>
              </ConectaCard>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <VagasRankingBars titulo="Lançados por filial" icon={Building2} labelWidthClass="w-14" data={g.filial} selected={filtros.filial ?? null} onSelect={(v) => alternar('filial', v)} />
            <VagasRankingBars titulo="Por função (top 10)" icon={Briefcase} color="orange" labelWidthClass="w-44" data={g.funcao} selected={filtros.funcao ?? null} onSelect={(v) => alternar('funcao', v)} />
            <VagasRankingBars titulo="Por faixa de idade" icon={UserRound} labelWidthClass="w-32" data={g.idade} selected={filtros.idade ?? null} onSelect={(v) => alternar('idade', v)} />
            <VagasRankingBars titulo="Por turno" icon={Clock} color="orange" labelWidthClass="w-32" data={g.turno} selected={filtros.turno ?? null} onSelect={(v) => alternar('turno', v)} />
          </div>

          {/* Por filial */}
          <ConectaCard noPadding>
            <div className="p-5 pb-3 space-y-3">
              <SectionHeader label="Por filial — clique no nome para ver a justificativa" icon={Building2} />
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou matrícula…" className="w-full rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {porFilial.map(([filial, itens]) => (
                <div key={filial} className="rounded-xl border border-conecta-primary/10 overflow-hidden">
                  <div className="flex items-center justify-between bg-conecta-primary/5 px-4 py-2">
                    <span className="font-display text-[12px] uppercase tracking-[0.18em] font-bold text-conecta-primary">Filial {filial}</span>
                    <span className="font-display text-lg font-extrabold tabular-nums text-conecta-accent">{itens.length}</span>
                  </div>
                  <ul className="divide-y divide-conecta-primary/8">
                    {itens.map((l) => (
                      <li key={l.id} className="px-4 py-2 flex items-baseline gap-3">
                        <button type="button" onClick={() => setAberto(l)} className="text-left text-sm font-semibold text-conecta-primary hover:text-conecta-accent hover:underline underline-offset-2">{l.nome}</button>
                        <span className="ml-auto text-[11px] text-conecta-muted text-right">{l.funcao} · {fmtTempo(l.tempoMeses)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {porFilial.length === 0 && <p className="col-span-full py-8 text-center text-sm text-conecta-muted">Nada com esses filtros.</p>}
            </div>
          </ConectaCard>
        </>
      )}

      {/* Justificativa */}
      {aberto && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onClick={() => setAberto(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 bg-conecta-accent" />
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-extrabold text-conecta-primary leading-tight">{aberto.nome}</h3>
                  <p className="text-[12px] text-conecta-muted tabular-nums">Matrícula {aberto.chapa} · Filial {aberto.filial}</p>
                </div>
                <button type="button" onClick={() => setAberto(null)} aria-label="Fechar" className="ml-auto rounded-md p-1 text-conecta-muted hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Função', aberto.funcao], ['Seção', aberto.secao], ['Turno', aberto.turno],
                  ['Idade', aberto.idade != null ? `${aberto.idade} anos` : '—'],
                  ['Admissão', fmtData(aberto.admissao)], ['Tempo de empresa', fmtTempo(aberto.tempoMeses)],
                  ['Suspensões', String(aberto.suspensoes)], ['Advertências', String(aberto.advertencias)],
                ].map(([l, v]) => (
                  <div key={l}><div className="font-display text-[10px] uppercase tracking-[0.2em] text-conecta-muted font-semibold">{l}</div><div className="font-semibold text-conecta-primary">{v}</div></div>
                ))}
              </div>
              <div>
                <div className="font-display text-[10px] uppercase tracking-[0.2em] text-conecta-muted font-semibold mb-1">Justificativa</div>
                <p className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-conecta-primary/10 p-3 text-sm text-conecta-text">{aberto.justificativa}</p>
              </div>
              <p className="text-[11px] text-conecta-muted">Lançado por {aberto.criadoPor} em {new Date(aberto.criadoEm).toLocaleString('pt-BR')}</p>
              <div className="flex gap-3 pt-1">
                <Link href={`/comite/${aberto.id}/editar`} className="inline-flex items-center rounded-lg bg-conecta-primary text-white px-4 py-2 text-[12px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">Editar / excluir</Link>
                <button type="button" onClick={() => setAberto(null)} className="text-sm text-conecta-muted hover:text-conecta-accent underline underline-offset-2">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
