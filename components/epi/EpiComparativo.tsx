'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Building2, GitCompare, HardHat, ListChecks, Minus, X } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { COR_STATUS } from './EpiStackedBars';
import type { AtualizacaoEpi, CdComparado, Contagem, Movimento } from '@/lib/epi/comparar';
import { STATUS_LABEL, type StatusEpi } from '@/lib/epi/tipos';

const fmtData = (iso: string) => iso.split('-').reverse().join('/');
const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);
const f1 = (n: number) => n.toFixed(1).replace('.', ',');

const soma = (cds: CdComparado[], k: 'atual' | 'anterior'): Contagem =>
  cds.reduce(
    (t, c) => ({
      colab: t.colab + c[k].colab, total: t.total + c[k].total,
      regular: t.regular + c[k].regular, trocar: t.trocar + c[k].trocar, sem: t.sem + c[k].sem,
    }),
    { colab: 0, total: 0, regular: 0, trocar: 0, sem: 0 },
  );

type Tom = 'bom' | 'ruim' | 'neutro';
const COR_TOM: Record<Tom, string> = { bom: '#15803D', ruim: '#DC2626', neutro: '#64748B' };

/** Chip de variação. `maisEhBom`: true para Regular (subir é bom), false para Trocar/Sem empréstimo (descer é bom). */
function Delta({ valor, maisEhBom, sufixo = '', dec = false }: { valor: number; maisEhBom: boolean; sufixo?: string; dec?: boolean }) {
  const zero = Math.abs(valor) < (dec ? 0.05 : 0.5);
  const tom: Tom = zero ? 'neutro' : (valor > 0) === maisEhBom ? 'bom' : 'ruim';
  const Icone = zero ? Minus : valor > 0 ? ArrowUpRight : ArrowDownRight;
  const txt = dec ? f1(Math.abs(valor)) : Math.abs(Math.round(valor)).toString();
  return (
    <span className="inline-flex items-center gap-0.5 font-display text-[11px] font-bold tabular-nums" style={{ color: COR_TOM[tom] }}>
      <Icone className="h-3 w-3" />
      {zero ? '=' : `${valor > 0 ? '+' : '−'}${txt}${sufixo}`}
    </span>
  );
}

const MOV_LABEL: Record<string, { label: string; tom: Tom }> = {
  'SEM_EMPRESTIMO>REGULAR': { label: 'Sem empréstimo → Regular', tom: 'bom' },
  'TROCAR>REGULAR': { label: 'Trocado (a trocar → regular)', tom: 'bom' },
  'SEM_EMPRESTIMO>TROCAR': { label: 'Entregue, mas já vencido', tom: 'neutro' },
  'REGULAR>TROCAR': { label: 'Venceu (regular → a trocar)', tom: 'ruim' },
  'REGULAR>SEM_EMPRESTIMO': { label: 'Voltou a sem empréstimo', tom: 'ruim' },
  'TROCAR>SEM_EMPRESTIMO': { label: 'Voltou a sem empréstimo', tom: 'ruim' },
};
function infoMov(m: Movimento): { chave: string; label: string; tom: Tom } {
  if (m.de === 'NOVO') return { chave: 'NOVO', label: 'Novo item exigido', tom: 'neutro' };
  if (m.para === 'REMOVIDO') return { chave: 'REMOVIDO', label: 'Deixou de ser exigido', tom: 'neutro' };
  const k = `${m.de}>${m.para}`;
  const i = MOV_LABEL[k];
  return { chave: k, label: i?.label ?? k, tom: i?.tom ?? 'neutro' };
}
const rotuloStatus = (s: StatusEpi | 'NOVO' | 'REMOVIDO') => (s === 'NOVO' ? 'novo' : s === 'REMOVIDO' ? 'removido' : STATUS_LABEL[s]);

export function EpiComparativo({
  atualizacoes, atual, anterior, cds, movimentos,
}: {
  atualizacoes: AtualizacaoEpi[];
  atual: AtualizacaoEpi | null;
  anterior: AtualizacaoEpi | null;
  cds: CdComparado[];
  movimentos: Movimento[];
}) {
  const router = useRouter();
  const [cdSel, setCdSel] = useState<string | null>(null);
  const [movSel, setMovSel] = useState<string | null>(null);
  const [limite, setLimite] = useState(60);

  const irPara = (a: string, b: string) => router.push(`/epi/comparativo?atual=${a}&anterior=${b}`);
  const selCls = 'rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary';

  const visiveis = useMemo(() => (cdSel ? cds.filter((c) => c.filial === cdSel) : cds), [cds, cdSel]);
  const tAtual = useMemo(() => soma(visiveis, 'atual'), [visiveis]);
  const tAnt = useMemo(() => soma(visiveis, 'anterior'), [visiveis]);

  const movsCd = useMemo(() => (cdSel ? movimentos.filter((m) => m.filial === cdSel) : movimentos), [movimentos, cdSel]);
  const resumoMov = useMemo(() => {
    const m = new Map<string, { label: string; tom: Tom; n: number }>();
    for (const x of movsCd) {
      const i = infoMov(x);
      const e = m.get(i.chave) ?? { label: i.label, tom: i.tom, n: 0 };
      e.n++;
      m.set(i.chave, e);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].n - a[1].n);
  }, [movsCd]);
  const listaMov = useMemo(
    () => movsCd.filter((m) => !movSel || infoMov(m).chave === movSel)
      .sort((a, b) => a.filial.localeCompare(b.filial, undefined, { numeric: true }) || a.nome.localeCompare(b.nome)),
    [movsCd, movSel],
  );

  if (atualizacoes.length < 2 || !atual || !anterior) {
    return (
      <ConectaCard>
        <p className="text-center text-sm text-conecta-muted py-10">
          O comparativo precisa de pelo menos <strong>duas atualizações</strong> do painel. Importe a planilha anterior e a atual em
          &ldquo;Importar planilha&rdquo; (o sistema guarda o histórico).
        </p>
      </ConectaCard>
    );
  }

  const pReg = pct(tAtual.regular, tAtual.total);
  const pRegAnt = pct(tAnt.regular, tAnt.total);
  const maxPct = 100;

  const kpis: { l: string; v: string; ant: string; delta: React.ReactNode; cor: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
    { l: 'Cobertura regular', v: `${f1(pReg)}%`, ant: `${f1(pRegAnt)}%`, delta: <Delta valor={pReg - pRegAnt} maisEhBom sufixo=" p.p." dec />, cor: COR_STATUS.regular, icon: HardHat },
    { l: 'EPIs regulares', v: String(tAtual.regular), ant: String(tAnt.regular), delta: <Delta valor={tAtual.regular - tAnt.regular} maisEhBom />, cor: COR_STATUS.regular, icon: ListChecks },
    { l: 'A trocar', v: String(tAtual.trocar), ant: String(tAnt.trocar), delta: <Delta valor={tAtual.trocar - tAnt.trocar} maisEhBom={false} />, cor: '#C98A0E', icon: ListChecks },
    { l: 'Sem empréstimo', v: String(tAtual.sem), ant: String(tAnt.sem), delta: <Delta valor={tAtual.sem - tAnt.sem} maisEhBom={false} />, cor: COR_STATUS.sem, icon: ListChecks },
    { l: 'EPIs exigidos', v: String(tAtual.total), ant: String(tAnt.total), delta: <Delta valor={tAtual.total - tAnt.total} maisEhBom={false} />, cor: '#0D2B6B', icon: Building2 },
  ];

  return (
    <div className="space-y-5">
      {/* Escolha das atualizações */}
      <div className="flex flex-wrap items-center gap-3">
        <GitCompare className="h-4 w-4 text-conecta-accent" />
        <label className="flex items-center gap-2">
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Atualização atual</span>
          <select value={atual.id} onChange={(e) => irPara(e.target.value, anterior.id)} className={selCls}>
            {atualizacoes.map((a) => <option key={a.id} value={a.id}>{fmtData(a.dataRef)}</option>)}
          </select>
        </label>
        <ArrowRight className="h-4 w-4 text-conecta-muted rotate-180" />
        <label className="flex items-center gap-2">
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Comparar com</span>
          <select value={anterior.id} onChange={(e) => irPara(atual.id, e.target.value)} className={selCls}>
            {atualizacoes.filter((a) => a.id !== atual.id).map((a) => <option key={a.id} value={a.id}>{fmtData(a.dataRef)}</option>)}
          </select>
        </label>
        {cdSel && (
          <button type="button" onClick={() => setCdSel(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-conecta-accent/10 border border-conecta-accent/30 text-conecta-accent px-2.5 py-1 text-[11px] font-display font-semibold hover:bg-conecta-accent/20">
            CD {cdSel} <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* KPIs com variação */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <ConectaCard key={k.l}>
            <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-[0.22em] text-conecta-muted font-semibold">
              <k.icon className="h-3.5 w-3.5" style={{ color: k.cor }} /> {k.l}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold tabular-nums" style={{ color: k.cor }}>{k.v}</span>
              {k.delta}
            </div>
            <div className="text-[11px] text-conecta-muted">antes ({fmtData(anterior.dataRef)}): <strong className="tabular-nums">{k.ant}</strong></div>
          </ConectaCard>
        ))}
      </div>

      {/* Cobertura regular por CD: antes × agora */}
      <ConectaCard noPadding>
        <div className="p-5 pb-2 space-y-2">
          <SectionHeader label="Cobertura regular por CD — antes × agora" icon={Building2} />
          <div className="flex gap-4 text-[10px] font-display font-semibold uppercase tracking-wide text-conecta-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-slate-300" /> {fmtData(anterior.dataRef)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: COR_STATUS.regular }} /> {fmtData(atual.dataRef)}</span>
          </div>
        </div>
        <div className="px-5 pb-5 pt-1 space-y-2.5">
          {[...cds].sort((a, b) => pct(b.atual.regular, b.atual.total) - pct(a.atual.regular, a.atual.total)).map((c) => {
            const a = pct(c.atual.regular, c.atual.total);
            const b = pct(c.anterior.regular, c.anterior.total);
            const ativo = cdSel === c.filial;
            return (
              <button key={c.filial} type="button" onClick={() => setCdSel(ativo ? null : c.filial)} title={c.nome}
                className={`flex w-full items-center gap-3 text-left rounded-md transition-opacity ${cdSel && !ativo ? 'opacity-40' : ''} ${ativo ? 'ring-2 ring-conecta-accent/60 ring-offset-2' : ''}`}>
                <span className="w-16 shrink-0 font-display text-[12px] font-semibold text-conecta-primary">CD {c.filial}</span>
                <span className="flex-1 space-y-1">
                  <span className="block h-2.5 rounded bg-conecta-primary/5 overflow-hidden"><span className="block h-full rounded bg-slate-300" style={{ width: `${(b / maxPct) * 100}%` }} /></span>
                  <span className="block h-3 rounded bg-conecta-primary/5 overflow-hidden"><span className="block h-full rounded" style={{ width: `${(a / maxPct) * 100}%`, background: COR_STATUS.regular }} /></span>
                </span>
                <span className="w-32 shrink-0 text-right font-display text-[12px] font-bold tabular-nums text-conecta-primary">
                  {f1(b)}% → {f1(a)}% <Delta valor={a - b} maisEhBom sufixo=" pp" dec />
                </span>
              </button>
            );
          })}
        </div>
      </ConectaCard>

      {/* Tabela por CD */}
      <ConectaCard noPadding>
        <div className="p-5 pb-3"><SectionHeader label="Comparativo por CD" icon={ListChecks} /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#0D2B6B' }} className="text-white text-[10px] uppercase tracking-[0.14em] font-display">
                <th className="px-3 py-2.5 text-left">CD</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">Colab.</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">Exigidos</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">% regular</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">Regular</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">A trocar</th>
                <th className="px-3 py-2.5 text-center border-l border-white/15">Sem empr.</th>
              </tr>
              <tr aria-hidden><td colSpan={7} className="h-[2px] p-0 bg-conecta-accent" /></tr>
            </thead>
            <tbody>
              {cds.map((c) => {
                const a = pct(c.atual.regular, c.atual.total);
                const b = pct(c.anterior.regular, c.anterior.total);
                const ativo = cdSel === c.filial;
                const cel = 'px-3 py-2 text-center tabular-nums border-l border-conecta-primary/8';
                const par = (ant: number, atu: number, bom: boolean) => (
                  <td className={cel}>
                    <div className="text-conecta-muted text-[11px]">{ant} →</div>
                    <div className="font-bold text-conecta-primary">{atu} <Delta valor={atu - ant} maisEhBom={bom} /></div>
                  </td>
                );
                return (
                  <tr key={c.filial} onClick={() => setCdSel(ativo ? null : c.filial)}
                    className={`cursor-pointer border-t border-conecta-primary/8 hover:bg-slate-50/70 ${ativo ? 'bg-conecta-accent/8' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="font-display font-bold text-conecta-primary">CD {c.filial}</div>
                      <div className="text-[11px] text-conecta-muted">{c.nome}</div>
                    </td>
                    {par(c.anterior.colab, c.atual.colab, false)}
                    {par(c.anterior.total, c.atual.total, false)}
                    <td className={cel}>
                      <div className="text-conecta-muted text-[11px]">{f1(b)}% →</div>
                      <div className="font-bold text-conecta-primary">{f1(a)}% <Delta valor={a - b} maisEhBom sufixo=" pp" dec /></div>
                    </td>
                    {par(c.anterior.regular, c.atual.regular, true)}
                    {par(c.anterior.trocar, c.atual.trocar, false)}
                    {par(c.anterior.sem, c.atual.sem, false)}
                  </tr>
                );
              })}
              <tr style={{ background: '#0D2B6B' }} className="text-white font-display font-bold">
                <td className="px-3 py-2.5 uppercase tracking-[0.12em] text-[12px]">Total{cdSel ? ` · CD ${cdSel}` : ''}</td>
                <td className="px-3 py-2.5 text-center tabular-nums border-l border-white/15">{tAnt.colab} → {tAtual.colab}</td>
                <td className="px-3 py-2.5 text-center tabular-nums border-l border-white/15">{tAnt.total} → {tAtual.total}</td>
                <td className="px-3 py-2.5 text-center tabular-nums border-l border-white/15">{f1(pRegAnt)}% → {f1(pReg)}%</td>
                <td className="px-3 py-2.5 text-center tabular-nums border-l border-white/15">{tAnt.regular} → {tAtual.regular}</td>
                <td className="px-3 py-2.5 text-center tabular-nums border-l border-white/15">{tAnt.trocar} → {tAtual.trocar}</td>
                <td className="px-3 py-2.5 text-center tabular-nums border-l border-white/15">{tAnt.sem} → {tAtual.sem}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ConectaCard>

      {/* O que mudou, item a item */}
      <ConectaCard noPadding>
        <div className="p-5 pb-3 space-y-3">
          <SectionHeader label={`O que mudou (${movsCd.length} itens)${cdSel ? ` · CD ${cdSel}` : ''}`} icon={GitCompare} />
          <div className="flex flex-wrap gap-2">
            {resumoMov.map(([k, v]) => {
              const ativo = movSel === k;
              return (
                <button key={k} type="button" onClick={() => { setMovSel(ativo ? null : k); setLimite(60); }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-display font-semibold transition ${ativo ? 'text-white' : 'bg-white'}`}
                  style={{ borderColor: COR_TOM[v.tom], color: ativo ? '#fff' : COR_TOM[v.tom], background: ativo ? COR_TOM[v.tom] : undefined }}>
                  {v.label} <span className="tabular-nums font-bold">{v.n}</span>
                </button>
              );
            })}
            {resumoMov.length === 0 && <span className="text-sm text-conecta-muted">Nenhuma mudança entre as duas atualizações.</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#0D2B6B' }} className="text-white text-[10px] uppercase tracking-[0.14em] font-display">
                <th className="px-3 py-2.5 text-left">CD</th>
                <th className="px-3 py-2.5 text-left">Colaborador</th>
                <th className="px-3 py-2.5 text-left">EPI</th>
                <th className="px-3 py-2.5 text-left">Mudança</th>
              </tr>
              <tr aria-hidden><td colSpan={4} className="h-[2px] p-0 bg-conecta-accent" /></tr>
            </thead>
            <tbody>
              {listaMov.slice(0, limite).map((m, i) => {
                const info = infoMov(m);
                return (
                  <tr key={i} className="border-t border-conecta-primary/8 hover:bg-slate-50/70">
                    <td className="px-3 py-2 font-mono text-xs">{m.filial}</td>
                    <td className="px-3 py-2">
                      <div className="font-display font-semibold text-conecta-primary">{m.nome}</div>
                      <div className="text-[11px] text-conecta-muted">{m.funcao}</div>
                    </td>
                    <td className="px-3 py-2 text-[13px]">{m.epi}</td>
                    <td className="px-3 py-2 text-[12px] font-display font-semibold" style={{ color: COR_TOM[info.tom] }}>
                      {rotuloStatus(m.de)} → {rotuloStatus(m.para)}
                    </td>
                  </tr>
                );
              })}
              {listaMov.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-conecta-muted">Nada para mostrar.</td></tr>}
            </tbody>
          </table>
        </div>
        {listaMov.length > limite && (
          <div className="p-4 text-center">
            <button type="button" onClick={() => setLimite((l) => l + 120)}
              className="rounded-lg border border-conecta-primary/20 text-conecta-primary px-4 py-1.5 text-[11px] font-display font-semibold hover:bg-conecta-primary/5">
              Mostrar mais ({listaMov.length - limite} restantes)
            </button>
          </div>
        )}
      </ConectaCard>
    </div>
  );
}
