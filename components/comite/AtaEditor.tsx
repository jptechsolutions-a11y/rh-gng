'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileDown, FileSpreadsheet, Loader2, Printer, Save, Users } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { HistoricoPedidos } from '@/components/comite/HistoricoPedidos';
import { salvarAtaComite } from '@/actions/comite/decisao';
import { limparParticipantes, PARTICIPANTES_MAX, type ResumoAta } from '@/lib/comite/ata-util';
import { nomeMes, rotuloDecisao, type ComiteLancamento } from '@/lib/comite/tipos';

const inputCls = 'w-full rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm';
const labelCls = 'font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold';
const COR: Record<string, string> = {
  pendente: 'bg-slate-100 text-conecta-muted',
  aprovado: 'bg-emerald-50 text-emerald-700',
  nao_aprovado: 'bg-rose-50 text-rose-700',
};

/** Ata do comitê: data, participantes, resumo das decisões e exportação (Word e PDF). */
export function AtaEditor({
  mes, meses, dataInicial, participantesIniciais, atualizadoPor, resumo, lancamentos,
}: {
  mes: string;
  meses: string[];
  dataInicial: string | null;
  participantesIniciais: string[];
  atualizadoPor: string | null;
  resumo: ResumoAta;
  lancamentos: ComiteLancamento[];
}) {
  const router = useRouter();
  const [data, setData] = useState(dataInicial ?? '');
  const [texto, setTexto] = useState(participantesIniciais.join('\n'));
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const participantes = limparParticipantes(texto.split(/\r?\n/));
  const opcoes = meses.includes(mes) ? meses : [mes, ...meses];

  /** Salva data e participantes; se der certo, roda `depois` (exportar). */
  function salvar(depois?: () => void) {
    setErro(null); setOk(null);
    iniciar(async () => {
      const r = await salvarAtaComite({ mes, dataComite: data || null, participantes });
      if (!r.ok) return setErro(r.erro);
      setOk('Ata salva.');
      router.refresh();
      depois?.();
    });
  }

  const baixarWord = () => salvar(() => { window.location.href = `/api/comite/ata?mes=${mes}`; });
  const baixarExcel = () => salvar(() => { window.location.href = `/api/comite/ata/excel?mes=${mes}`; });
  const abrirPdf = () => salvar(() => { window.open(`/comite/ata/imprimir?mes=${mes}`, '_blank'); });

  return (
    <div className="space-y-5 max-w-5xl">
      <ConectaCard>
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeader label={`Ata do comitê — ${nomeMes(mes)}`} icon={Users} />
          <select value={mes} onChange={(e) => router.push(`/comite/ata?mes=${e.target.value}`)} className="ml-auto rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm font-semibold text-conecta-primary">
            {opcoes.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="block">
            <span className={labelCls}>Data do comitê</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <label className="block">
            <span className={labelCls}>Participantes (um nome por linha)</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={6}
              placeholder={'Maria Silva\nJoão Souza\n…'}
              className={`${inputCls} mt-1 resize-y`}
            />
            <span className="text-[11px] text-conecta-muted">{participantes.length} participante(s) · máx. {PARTICIPANTES_MAX}</span>
          </label>
        </div>

        {resumo.pendentes > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {resumo.pendentes} pedido(s) ainda sem decisão — vão aparecer como “Pendente” na ata.{' '}
              <Link href={`/comite/lancamentos?mes=${mes}`} className="font-semibold underline">Decidir agora</Link>
            </span>
          </div>
        )}
        {erro && <div role="alert" className="mt-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}
        {ok && !erro && <div role="status" className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-sm">{ok}</div>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => salvar()} disabled={pendente} className="inline-flex items-center gap-2 rounded-lg bg-conecta-accent text-white px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60">
            {pendente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </button>
          <button type="button" onClick={baixarWord} disabled={pendente} className="inline-flex items-center gap-2 rounded-lg border border-conecta-primary/15 text-conecta-primary px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:bg-slate-50 disabled:opacity-60">
            <FileDown className="h-4 w-4" /> Baixar Word
          </button>
          <button type="button" onClick={baixarExcel} disabled={pendente} className="inline-flex items-center gap-2 rounded-lg border border-conecta-primary/15 text-conecta-primary px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:bg-slate-50 disabled:opacity-60">
            <FileSpreadsheet className="h-4 w-4" /> Baixar Excel
          </button>
          <button type="button" onClick={abrirPdf} disabled={pendente} className="inline-flex items-center gap-2 rounded-lg border border-conecta-primary/15 text-conecta-primary px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:bg-slate-50 disabled:opacity-60">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
          <span className="text-[12px] text-conecta-muted">Exportar salva a data e os participantes antes.</span>
          {atualizadoPor && <span className="ml-auto text-[12px] text-conecta-muted">Última edição: {atualizadoPor}</span>}
        </div>
      </ConectaCard>

      <ConectaCard noPadding>
        <div className="p-5 pb-3 space-y-2">
          <SectionHeader label={`Pedidos do mês (${resumo.total})`} />
          <p className="text-[12px] text-conecta-muted">
            {resumo.aprovados} aprovado(s) · {resumo.naoAprovados} não aprovado(s) · {resumo.pendentes} pendente(s)
          </p>
        </div>
        <div className="divide-y divide-conecta-primary/8 border-t border-conecta-primary/10">
          {lancamentos.map((l) => (
            <div key={l.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-conecta-primary">{l.nome}</span>
                <span className="text-[12px] text-conecta-muted tabular-nums">{l.chapa} · filial {l.filial} · {l.funcao}</span>
                <span className={`ml-auto inline-block rounded-full px-2.5 py-0.5 text-[11px] font-display font-semibold ${COR[l.decisao ?? 'pendente']}`}>
                  {rotuloDecisao(l.decisao)}
                </span>
              </div>
              {l.decisao === 'nao_aprovado' && l.decisaoMotivo && (
                <p className="mt-1 text-sm text-rose-900"><span className="font-semibold">Motivo da não aprovação:</span> {l.decisaoMotivo}</p>
              )}
              {l.historico.length > 0 && <div className="mt-2"><HistoricoPedidos historico={l.historico} /></div>}
            </div>
          ))}
          {lancamentos.length === 0 && <p className="px-5 py-8 text-center text-sm text-conecta-muted">Nenhum pedido neste mês.</p>}
        </div>
      </ConectaCard>
    </div>
  );
}
