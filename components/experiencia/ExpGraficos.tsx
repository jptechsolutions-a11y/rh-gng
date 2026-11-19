'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { COR_SIT } from './ExpBars';
import type { ExpEvolucao } from '@/lib/experiencia/tipos';

const fmt = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');

/** Cartões por CD/filial: pendências, atrasadas, alerta e % de colaboradores com alguma pendência. Clicável. */
export interface CdCard {
  filial: string;
  total: number;
  atrasada: number;
  alerta: number;
  colabPend: number;
  colab: number;
}
export function ExpCardsCd({ data, selected, onSelect }: { data: CdCard[]; selected: string | null; onSelect: (f: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {data.map((c) => {
        const pct = c.colab ? Math.round((c.colabPend / c.colab) * 100) : 0;
        const ativo = selected === c.filial;
        return (
          <button
            key={c.filial}
            type="button"
            onClick={() => onSelect(c.filial)}
            aria-pressed={ativo}
            className={`text-left rounded-xl border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md ${
              ativo ? 'ring-2 ring-conecta-accent/60 border-conecta-accent' : 'border-conecta-primary/10'
            } ${selected && !ativo ? 'opacity-45' : ''}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-conecta-muted font-semibold">CD {c.filial}</span>
              <span className="font-display text-2xl font-extrabold tabular-nums text-conecta-primary">{c.total}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-conecta-primary/10 overflow-hidden flex">
              <span style={{ width: `${c.total ? (c.atrasada / c.total) * 100 : 0}%`, background: COR_SIT.atrasada }} />
              <span style={{ width: `${c.total ? (c.alerta / c.total) * 100 : 0}%`, background: COR_SIT.alerta }} />
              <span style={{ width: `${c.total ? ((c.total - c.atrasada - c.alerta) / c.total) * 100 : 0}%`, background: COR_SIT.prazo }} />
            </div>
            <div className="mt-2 text-[11px] text-conecta-muted leading-snug">
              <span style={{ color: COR_SIT.atrasada }} className="font-semibold">{c.atrasada} atrasadas</span> · <span className="font-semibold text-amber-700">{c.alerta} alerta</span>
              <br />
              {c.colabPend} de {c.colab} colab. ({pct}%)
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Comparativo 35 dias × 70 dias por filial (barras lado a lado). */
export function ExpDupla({
  titulo, icon, data, selected, onSelect,
}: {
  titulo: string; icon: LucideIcon;
  data: { label: string; a: number; b: number }[];
  selected: string | null; onSelect: (l: string) => void;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-2 space-y-2">
        <SectionHeader label={titulo} icon={icon} />
        <div className="flex gap-4 text-[10px] font-display font-semibold uppercase tracking-wide text-conecta-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-conecta-primary" />35 dias</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-conecta-accent" />70 dias</span>
        </div>
      </div>
      <div className="px-5 pb-5 pt-2 space-y-2.5 max-h-[440px] overflow-y-auto">
        {data.length === 0 && <p className="py-10 text-center text-sm text-conecta-muted">Sem pendências</p>}
        {data.map((d) => (
          <button
            key={d.label}
            type="button"
            onClick={() => onSelect(d.label)}
            className={`flex w-full items-center gap-3 text-left rounded-md ${selected && selected !== d.label ? 'opacity-40' : ''} ${selected === d.label ? 'ring-2 ring-conecta-accent/60 ring-offset-2' : ''}`}
          >
            <span className="w-14 shrink-0 font-display text-[12px] font-semibold text-conecta-primary">{d.label}</span>
            <span className="flex-1 space-y-1">
              <span className="flex items-center gap-2">
                <span className="h-3 rounded bg-conecta-primary" style={{ width: `${(d.a / max) * 100}%`, minWidth: d.a ? 2 : 0 }} />
                <span className="text-[11px] font-bold tabular-nums text-conecta-primary">{d.a}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 rounded bg-conecta-accent" style={{ width: `${(d.b / max) * 100}%`, minWidth: d.b ? 2 : 0 }} />
                <span className="text-[11px] font-bold tabular-nums text-conecta-accent">{d.b}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </ConectaCard>
  );
}

/** Agenda dos próximos dias: colunas com vencimentos por dia (as de alerta em amarelo, atrasadas acumuladas à esquerda). */
export function ExpAgenda({
  titulo, icon, dias, atrasadas, selected, onSelect,
}: {
  titulo: string; icon: LucideIcon;
  dias: { iso: string; n: number; alerta: boolean }[];
  atrasadas: number;
  selected: string | null; onSelect: (iso: string) => void;
}) {
  const max = Math.max(1, atrasadas, ...dias.map((d) => d.n));
  const Col = ({ label, n, cor, ativo, onClick }: { label: string; n: number; cor: string; ativo?: boolean; onClick?: () => void }) => (
    <button type="button" onClick={onClick} className={`flex flex-col items-center justify-end gap-1 flex-1 min-w-[26px] ${selected && !ativo ? 'opacity-45' : ''}`} title={`${label}: ${n}`}>
      <span className="text-[10px] font-bold tabular-nums text-conecta-primary">{n || ''}</span>
      <span className="w-full rounded-t" style={{ height: `${Math.max(n ? 4 : 1, (n / max) * 110)}px`, background: cor, outline: ativo ? '2px solid #E8621A' : undefined }} />
      <span className="text-[9px] text-conecta-muted tabular-nums">{label}</span>
    </button>
  );
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-2"><SectionHeader label={titulo} icon={icon} /></div>
      <div className="px-5 pb-5 pt-3 flex items-end gap-1 overflow-x-auto">
        <Col label="Atras." n={atrasadas} cor={COR_SIT.atrasada} />
        <span className="self-stretch w-px bg-conecta-primary/15 mx-1" />
        {dias.map((d) => (
          <Col key={d.iso} label={fmt(d.iso)} n={d.n} cor={d.alerta ? COR_SIT.alerta : COR_SIT.prazo} ativo={selected === d.iso} onClick={() => onSelect(d.iso)} />
        ))}
      </div>
    </ConectaCard>
  );
}

/** Comparativo entre bases importadas: pendências por filial em cada extração e variação da última vs. anterior. */
export function ExpComparativoBases({ evolucao }: { evolucao: ExpEvolucao[] }) {
  const bases = evolucao.slice(-4);
  const filiais = Array.from(new Set(bases.flatMap((b) => Object.keys(b.porFilial)))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const tot = (b: ExpEvolucao) => Object.values(b.porFilial).reduce((s, n) => s + n, 0);
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3"><SectionHeader label="Comparativo entre bases (pendências por CD)" /></div>
      {bases.length < 2 ? (
        <p className="px-5 pb-6 text-sm text-conecta-muted">
          Há apenas uma base importada. Importe a próxima extração em &ldquo;Importar planilha&rdquo; para ver aqui a evolução de cada CD.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-display uppercase tracking-[0.18em] text-conecta-muted border-y border-conecta-primary/10 bg-slate-50">
                <th className="px-5 py-2">CD</th>
                {bases.map((b) => <th key={b.dataRef} className="px-3 py-2 text-right">{fmt(b.dataRef)}</th>)}
                <th className="px-3 py-2 text-right">Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-conecta-primary/8">
              {[...filiais.map((f) => ({ f, v: bases.map((b) => b.porFilial[f] ?? 0) })), { f: 'Total', v: bases.map(tot) }].map(({ f, v }) => {
                const d = v[v.length - 1]! - v[v.length - 2]!;
                const Ic = d < 0 ? ArrowDownRight : d > 0 ? ArrowUpRight : Minus;
                return (
                  <tr key={f} className={f === 'Total' ? 'font-bold bg-slate-50' : ''}>
                    <td className="px-5 py-2 tabular-nums">{f === 'Total' ? 'Total' : `CD ${f}`}</td>
                    {v.map((n, i) => <td key={i} className="px-3 py-2 text-right tabular-nums">{n}</td>)}
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${d < 0 ? 'text-emerald-700' : d > 0 ? 'text-rose-700' : 'text-conecta-muted'}`}>
                      <Ic className="inline h-3.5 w-3.5 -mt-0.5" /> {d > 0 ? '+' : ''}{d}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ConectaCard>
  );
}
