'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BellRing, Building2, CalendarClock, ClipboardCheck, Search, UserCog, Users, X } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { ExpBars, COR_SIT, LABEL_SIT, type ExpBarItem } from './ExpBars';
import { DIAS_ALERTA, type ExpPendencia, type ExpResumoImport, type ExpSituacao } from '@/lib/experiencia/tipos';

type Dim = 'filial' | 'gestor' | 'etapa' | 'situacao';
const DIM_LABEL: Record<Dim, string> = { filial: 'Filial', gestor: 'Gestor', etapa: 'Etapa', situacao: 'Situação' };

const valor: Record<Dim, (p: ExpPendencia) => string> = {
  filial: (p) => p.filial,
  gestor: (p) => p.gestor,
  etapa: (p) => (p.etapa === '35' ? '35 dias' : '70 dias'),
  situacao: (p) => LABEL_SIT[p.situacao],
};

const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

function agrupar(rows: ExpPendencia[], dim: 'filial' | 'gestor', limite?: number): ExpBarItem[] {
  const m = new Map<string, ExpBarItem>();
  for (const p of rows) {
    const k = valor[dim](p);
    const it = m.get(k) ?? { label: k, atrasada: 0, alerta: 0, prazo: 0 };
    it[p.situacao]++;
    m.set(k, it);
  }
  const arr = Array.from(m.values()).sort(
    (a, b) => b.atrasada - a.atrasada || b.alerta - a.alerta || b.prazo - a.prazo || a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  return limite ? arr.slice(0, limite) : arr;
}

function Badge({ p }: { p: ExpPendencia }) {
  const cor = COR_SIT[p.situacao];
  const txt =
    p.situacao === 'atrasada' ? `Atrasada ${Math.abs(p.dias)}d` : p.dias === 0 ? 'Vence hoje' : `Vence em ${p.dias}d`;
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-display font-bold whitespace-nowrap" style={{ background: cor + '1f', color: p.situacao === 'alerta' ? '#8A5A00' : cor }}>
      {txt}
    </span>
  );
}

export function ExpDashboard({
  pendencias, totalColab, hoje, dataRef, imports, atualId, evolucao,
}: {
  pendencias: ExpPendencia[];
  totalColab: number;
  hoje: string;
  dataRef: string | null;
  imports: ExpResumoImport[];
  atualId: string | null;
  evolucao: { dataRef: string; pendencias: number }[];
}) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Partial<Record<Dim, string>>>({});
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(60);

  // Ao trocar a filial, descarta o gestor escolhido se ele não atua nela (e vice-versa).
  const limparIncompativel = (n: Partial<Record<Dim, string>>, mudou: Dim) => {
    const outro: Dim | null = mudou === 'filial' ? 'gestor' : mudou === 'gestor' ? 'filial' : null;
    if (outro && n[outro] && !pendencias.some((p) => valor[mudou](p) === n[mudou] && valor[outro](p) === n[outro])) delete n[outro];
    return n;
  };
  const alternar = (d: Dim, v: string) =>
    setFiltros((f) => {
      const n = { ...f };
      if (n[d] === v) delete n[d]; else n[d] = v;
      return limparIncompativel(n, d);
    });

  const casa = (p: ExpPendencia, ignorar?: Dim) =>
    (Object.keys(filtros) as Dim[]).every((d) => d === ignorar || !filtros[d] || valor[d](p) === filtros[d]);
  const para = (ignorar?: Dim) => pendencias.filter((p) => casa(p, ignorar));
  const filtradas = useMemo(() => para(), [pendencias, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const opcoes = useMemo(() => {
    // Cada lista considera o filtro da outra: filial escolhida → só os gestores dela (e vice-versa).
    const o = (d: Dim) => Array.from(new Set(para(d).map(valor[d]))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return { filial: o('filial'), gestor: o('gestor') };
  }, [pendencias, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => {
    const k: Record<ExpSituacao, number> = { atrasada: 0, alerta: 0, prazo: 0 };
    for (const p of filtradas) k[p.situacao]++;
    return { ...k, total: filtradas.length, colab: new Set(filtradas.map((p) => p.chapa)).size };
  }, [filtradas]);

  const g = useMemo(() => {
    const sit = (['atrasada', 'alerta', 'prazo'] as ExpSituacao[]).map((s) => ({
      label: LABEL_SIT[s], total: para('situacao').filter((p) => p.situacao === s).length,
    }));
    const etapa = ['35 dias', '70 dias'].map((e) => ({ label: e, total: para('etapa').filter((p) => valor.etapa(p) === e).length }));
    return { filial: agrupar(para('filial'), 'filial'), gestor: agrupar(para('gestor'), 'gestor', 30), sit, etapa };
  }, [pendencias, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return filtradas
      .filter((p) => !q || p.nome.toLowerCase().includes(q) || p.chapa.includes(q))
      .sort((a, b) => a.dias - b.dias || a.nome.localeCompare(b.nome));
  }, [filtradas, busca]);

  const filtrosAtivos = (Object.keys(filtros) as Dim[]).filter((d) => filtros[d]);
  const selCls = 'rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary max-w-[240px]';

  if (!atualId) {
    return (
      <ConectaCard>
        <p className="text-center text-sm text-conecta-muted py-10">
          Ainda não há dados. O admin precisa importar o arquivo de avaliações em &ldquo;Importar planilha&rdquo;.
        </p>
      </ConectaCard>
    );
  }

  const totalAlerta = pendencias.filter((p) => p.situacao === 'alerta').length;
  const totalAtrasada = pendencias.filter((p) => p.situacao === 'atrasada').length;
  const anterior = evolucao.length > 1 ? evolucao[evolucao.length - 2] : null;
  const ultimo = evolucao.length > 0 ? evolucao[evolucao.length - 1] : null;

  return (
    <div className="space-y-5">
      {/* Alerta de prazo */}
      {(totalAlerta > 0 || totalAtrasada > 0) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-amber-950">
          <span className="inline-flex items-center gap-2 font-display font-bold">
            <BellRing className="h-4 w-4 text-amber-600" /> Atenção aos prazos
          </span>
          {totalAlerta > 0 && (
            <button type="button" onClick={() => alternar('situacao', LABEL_SIT.alerta)} className="underline-offset-2 hover:underline">
              <strong>{totalAlerta}</strong> avaliações vencem nos próximos {DIAS_ALERTA} dias
            </button>
          )}
          {totalAtrasada > 0 && (
            <button type="button" onClick={() => alternar('situacao', LABEL_SIT.atrasada)} className="underline-offset-2 hover:underline text-rose-800">
              <strong>{totalAtrasada}</strong> já estão atrasadas
            </button>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(['filial', 'gestor'] as const).map((d) => (
          <label key={d} className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">{DIM_LABEL[d]}</span>
            <select
              value={filtros[d] ?? ''}
              onChange={(e) => setFiltros((f) => { const n = { ...f }; if (e.target.value) n[d] = e.target.value; else delete n[d]; return limparIncompativel(n, d); })}
              className={selCls}
            >
              <option value="">Todos</option>
              {opcoes[d].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-conecta-muted">
          {imports.length > 1 ? (
            <label className="flex items-center gap-2">
              Base de
              <select value={atualId} onChange={(e) => router.push(`/experiencia?base=${e.target.value}`)} className={selCls}>
                {imports.map((i) => <option key={i.id} value={i.id}>{fmtData(i.dataRef)}</option>)}
              </select>
            </label>
          ) : (
            <span>Base de {fmtData(dataRef)}</span>
          )}
          <span>· prazos conferidos em {fmtData(hoje)}</span>
        </span>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { l: 'Pendências', v: kpi.total, sub: `${kpi.colab} colaboradores · de ${totalColab} em experiência`, c: '#0D2B6B', icon: ClipboardCheck },
          { l: 'Atrasadas', v: kpi.atrasada, sub: 'passaram do prazo', c: COR_SIT.atrasada, icon: AlertTriangle },
          { l: `Vencem em ≤ ${DIAS_ALERTA} dias`, v: kpi.alerta, sub: 'em alerta', c: '#C98A0E', icon: BellRing },
          { l: 'No prazo', v: kpi.prazo, sub: `mais de ${DIAS_ALERTA} dias`, c: '#0D2B6B', icon: CalendarClock },
          { l: 'Colaboradores', v: kpi.colab, sub: 'com alguma pendência', c: '#E8621A', icon: Users },
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
      {anterior && ultimo && (
        <p className="text-[11px] text-conecta-muted -mt-2">
          Evolução (base inteira): {fmtData(anterior.dataRef)} → {fmtData(ultimo.dataRef)}: {anterior.pendencias} → <strong>{ultimo.pendencias}</strong> pendências
          ({ultimo.pendencias - anterior.pendencias >= 0 ? '+' : ''}{ultimo.pendencias - anterior.pendencias}).
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ExpBars titulo="Pendências por filial" icon={Building2} labelWidthClass="w-16" data={g.filial} selected={filtros.filial ?? null} onSelect={(v) => alternar('filial', v)} />
        <ExpBars titulo="Pendências por gestor (top 30)" icon={UserCog} labelWidthClass="w-44" data={g.gestor} selected={filtros.gestor ?? null} onSelect={(v) => alternar('gestor', v)} />
      </div>

      {/* Detalhe */}
      <ConectaCard noPadding>
        <div className="p-5 pb-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SectionHeader label={`Detalhe das pendências (${lista.length})`} icon={ClipboardCheck} />
            <div className="ml-auto flex items-center gap-2 text-[11px]">
              {g.etapa.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  onClick={() => alternar('etapa', e.label)}
                  className={`rounded-full border px-3 py-1 font-display font-semibold ${
                    filtros.etapa === e.label ? 'bg-conecta-accent text-white border-conecta-accent' : 'border-conecta-primary/15 text-conecta-primary hover:border-conecta-accent/40'
                  }`}
                >
                  {e.label} · {e.total}
                </button>
              ))}
            </div>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
            <input
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setLimite(60); }}
              placeholder="Buscar nome ou matrícula…"
              className="w-full rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-display uppercase tracking-[0.18em] text-conecta-muted border-y border-conecta-primary/10 bg-slate-50">
                <th className="px-5 py-2">Colaborador</th>
                <th className="px-3 py-2">Filial</th>
                <th className="px-3 py-2">Gestor</th>
                <th className="px-3 py-2">Admissão</th>
                <th className="px-3 py-2">Etapa</th>
                <th className="px-3 py-2">Prazo</th>
                <th className="px-3 py-2">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-conecta-primary/8">
              {lista.slice(0, limite).map((p) => (
                <tr key={p.chapa + p.etapa} className="hover:bg-slate-50/70">
                  <td className="px-5 py-2">
                    <div className="font-semibold text-conecta-primary">{p.nome}</div>
                    <div className="text-[11px] text-conecta-muted tabular-nums">{p.chapa}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{p.filial}</td>
                  <td className="px-3 py-2">{p.gestor}</td>
                  <td className="px-3 py-2 tabular-nums">{fmtData(p.admissao)}</td>
                  <td className="px-3 py-2">{p.etapa} dias</td>
                  <td className="px-3 py-2 tabular-nums">{fmtData(p.prazo)}</td>
                  <td className="px-3 py-2"><Badge p={p} /></td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-conecta-muted">Nenhuma pendência com esses filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {lista.length > limite && (
          <div className="p-4 text-center">
            <button type="button" onClick={() => setLimite((l) => l + 100)} className="text-[12px] font-display font-semibold text-conecta-accent hover:underline">
              Mostrar mais ({lista.length - limite} restantes)
            </button>
          </div>
        )}
      </ConectaCard>
    </div>
  );
}
