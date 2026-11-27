'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Loader2, PackageCheck, Plus, Search, Shirt, Truck, Undo2, X,
} from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import {
  aprovarUniforme, definirExigeDevolucaoUniforme, entregarUniforme, marcarProntoUniforme,
  recusarUniforme, registrarDevolucaoUniforme, voltarEtapaUniforme,
} from '@/actions/uniformes';
import {
  COR_STATUS, STATUS_UNIFORME, devolucaoPendente, estaAtrasado, prazoEntrega, rotuloMotivo, rotuloStatus,
  type SolicitacaoUniforme, type StatusUniforme,
} from '@/lib/uniformes/tipos';

const TZ = 'America/Sao_Paulo';
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
const dataBr = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // yyyy-mm-dd

type Filtro = 'todas' | StatusUniforme;
const ETAPAS: StatusUniforme[] = ['solicitado', 'aprovado', 'pronto', 'entregue'];

/** Linha do tempo: Solicitado → Aprovado → Pronto para retirar → Entregue. */
function Etapas({ s }: { s: SolicitacaoUniforme }) {
  if (s.status === 'recusado') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
        <span className="font-semibold">Recusado</span>
        {s.decididoPor && <> por {s.decididoPor}</>}
        {s.decididoEm && <> em {dataHora(s.decididoEm)}</>}
        {s.motivoRecusa && <p className="mt-1 whitespace-pre-wrap"><span className="font-semibold">Motivo:</span> {s.motivoRecusa}</p>}
      </div>
    );
  }
  const atual = ETAPAS.indexOf(s.status);
  const quando: Record<string, string | null> = {
    solicitado: dataHora(s.criadoEm),
    aprovado: s.decididoEm ? dataHora(s.decididoEm) : null,
    pronto: s.prontoEm ? dataHora(s.prontoEm) : null,
    entregue: s.dataEntrega ? dataBr(s.dataEntrega) : null,
  };
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ETAPAS.map((e, i) => {
        const feito = i <= atual;
        return (
          <li key={e} className={`rounded-lg border px-3 py-2 ${feito ? 'border-emerald-200 bg-emerald-50' : 'border-conecta-primary/10 bg-slate-50'}`}>
            <div className={`flex items-center gap-1.5 text-[12px] font-display font-semibold ${feito ? 'text-emerald-800' : 'text-conecta-muted'}`}>
              {feito ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-conecta-muted/50" />}
              {rotuloStatus(e)}
            </div>
            <div className="mt-0.5 text-[11px] text-conecta-muted">{feito ? quando[e] ?? '—' : 'aguardando'}</div>
          </li>
        );
      })}
    </ol>
  );
}

function Cartao({ s, admin, aberto, alternar }: { s: SolicitacaoUniforme; admin: boolean; aberto: boolean; alternar: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [entregando, setEntregando] = useState(false);
  const [dataEntrega, setDataEntrega] = useState(hoje());
  const [dataDevolucao, setDataDevolucao] = useState(hoje());

  function rodar(fn: () => Promise<{ ok: true } | { ok: false; erro: string }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setErro(r.erro);
      depois?.();
      router.refresh();
    });
  }

  const atrasado = estaAtrasado(s);
  const devPendente = devolucaoPendente(s);
  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] disabled:opacity-50';

  return (
    <li className="rounded-xl border border-conecta-primary/10 bg-white overflow-hidden">
      <button type="button" onClick={alternar} aria-expanded={aberto} className="flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50/70">
        {aberto ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-conecta-accent" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-conecta-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-conecta-primary">{s.colaboradorNome}</span>
            <span className="text-[11px] text-conecta-muted tabular-nums">{s.chapa} · Filial {s.filial}</span>
          </div>
          <div className="mt-0.5 text-sm text-conecta-primary">
            {s.item} · <strong>{s.tamanho}</strong> · {s.quantidade}×
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-display font-semibold ring-1 ${COR_STATUS[s.status]}`}>{rotuloStatus(s.status)}</span>
            {atrasado && (
              <span title={`Prazo era ${dataHora(prazoEntrega(s.criadoEm).toISOString())}`} className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                <AlertTriangle className="h-3 w-3" /> passou de 48h
              </span>
            )}
            {devPendente && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800 ring-1 ring-orange-200">devolução pendente</span>}
            {s.exigeDevolucao && s.devolvidoEm && s.status !== 'recusado' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">devolvido</span>}
          </div>
        </div>
        <div className="hidden sm:block shrink-0 text-right text-[11px] text-conecta-muted">
          {dataHora(s.criadoEm)}
          <div>por {s.solicitanteNome}</div>
        </div>
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-conecta-primary/10 bg-slate-50/60 p-4">
          <Etapas s={s} />

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ['Função', s.funcao ?? '—'], ['Seção', s.secao ?? '—'],
              ['Motivo', rotuloMotivo(s.motivo, s.motivoOutro)], ['Solicitado por', s.solicitanteNome],
              ['Solicitado em', dataHora(s.criadoEm)], ['Prazo (48h)', dataHora(prazoEntrega(s.criadoEm).toISOString())],
              ...(s.dataEntrega ? [['Entregue em', `${dataBr(s.dataEntrega)}${s.entreguePor ? ` · ${s.entreguePor}` : ''}`]] : []),
            ].map(([r, v]) => (
              <div key={r} className="min-w-0">
                <div className="font-display text-[10px] uppercase tracking-[0.2em] text-conecta-muted font-semibold">{r}</div>
                <div className="font-semibold text-conecta-primary break-words">{v}</div>
              </div>
            ))}
          </div>

          {/* Devolução do uniforme antigo */}
          {s.status !== 'recusado' && (
            <div className="rounded-lg border border-conecta-primary/10 bg-white p-3 text-sm">
              <div className="font-display text-[10px] uppercase tracking-[0.2em] text-conecta-muted font-semibold">Devolução do uniforme antigo</div>
              {!s.exigeDevolucao ? (
                <p className="mt-1 text-conecta-muted">Não exigida para este pedido.</p>
              ) : s.devolvidoEm ? (
                <p className="mt-1 font-semibold text-emerald-800">
                  Devolvido em {dataBr(s.devolvidoEm)}{s.devolucaoObs ? ` — ${s.devolucaoObs}` : ''}
                </p>
              ) : (
                <p className="mt-1 font-semibold text-orange-800">Pendente — o uniforme antigo ainda não foi devolvido.</p>
              )}
              {admin && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-[13px] text-conecta-primary">
                    <input
                      type="checkbox"
                      checked={s.exigeDevolucao}
                      disabled={pendente}
                      onChange={(e) => rodar(() => definirExigeDevolucaoUniforme(s.id, e.target.checked))}
                      className="accent-conecta-accent"
                    />
                    Exige devolução
                  </label>
                  {s.exigeDevolucao && !s.devolvidoEm && (
                    <>
                      <input type="date" value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-2 py-1.5 text-sm" />
                      <button type="button" disabled={pendente} onClick={() => rodar(() => registrarDevolucaoUniforme(s.id, dataDevolucao))} className={`${btn} bg-conecta-primary text-white hover:brightness-110`}>
                        <PackageCheck className="h-3.5 w-3.5" /> Registrar devolução
                      </button>
                    </>
                  )}
                  {s.exigeDevolucao && s.devolvidoEm && (
                    <button type="button" disabled={pendente} onClick={() => rodar(() => registrarDevolucaoUniforme(s.id, null))} className="text-[12px] font-semibold text-conecta-muted underline">
                      Desfazer devolução
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ações do Gente e Gestão */}
          {admin && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {s.status === 'solicitado' && !recusando && (
                  <>
                    <button type="button" disabled={pendente} onClick={() => rodar(() => aprovarUniforme(s.id))} className={`${btn} bg-emerald-600 text-white hover:brightness-110`}>
                      <Check className="h-3.5 w-3.5" /> Aprovar
                    </button>
                    <button type="button" disabled={pendente} onClick={() => setRecusando(true)} className={`${btn} border border-rose-300 text-rose-700 hover:bg-rose-50`}>
                      <X className="h-3.5 w-3.5" /> Recusar
                    </button>
                  </>
                )}
                {s.status === 'aprovado' && (
                  <button type="button" disabled={pendente} onClick={() => rodar(() => marcarProntoUniforme(s.id))} className={`${btn} bg-violet-600 text-white hover:brightness-110`}>
                    <Truck className="h-3.5 w-3.5" /> Pronto para retirar
                  </button>
                )}
                {(s.status === 'aprovado' || s.status === 'pronto') && !entregando && (
                  <button type="button" disabled={pendente} onClick={() => setEntregando(true)} className={`${btn} bg-conecta-accent text-white hover:brightness-110`}>
                    <PackageCheck className="h-3.5 w-3.5" /> Registrar entrega
                  </button>
                )}
                {s.status !== 'solicitado' && (
                  <button type="button" disabled={pendente} onClick={() => rodar(() => voltarEtapaUniforme(s.id))} className="inline-flex items-center gap-1 text-[12px] font-semibold text-conecta-muted underline disabled:opacity-50">
                    <Undo2 className="h-3.5 w-3.5" /> Voltar etapa
                  </button>
                )}
              </div>

              {recusando && (
                <div className="rounded-lg border border-rose-300 bg-white p-3">
                  <label className="block">
                    <span className="font-display text-[10px] uppercase tracking-[0.22em] text-rose-700 font-semibold">Motivo da recusa (obrigatório)</span>
                    <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full resize-y rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm" />
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" disabled={pendente || motivo.trim().length < 3} onClick={() => rodar(() => recusarUniforme(s.id, motivo), () => { setRecusando(false); setMotivo(''); })} className={`${btn} bg-rose-600 text-white hover:brightness-110`}>
                      Confirmar recusa
                    </button>
                    <button type="button" onClick={() => setRecusando(false)} className="text-sm text-conecta-muted underline">Cancelar</button>
                  </div>
                </div>
              )}

              {entregando && (
                <div className="rounded-lg border border-conecta-accent/40 bg-white p-3">
                  <label className="block">
                    <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Data da entrega</span>
                    <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className="mt-1 block rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm" />
                  </label>
                  {devPendente && <p className="mt-2 text-[12px] text-orange-800">A devolução do uniforme antigo ainda não foi registrada.</p>}
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" disabled={pendente || !dataEntrega} onClick={() => rodar(() => entregarUniforme(s.id, dataEntrega), () => setEntregando(false))} className={`${btn} bg-conecta-accent text-white hover:brightness-110`}>
                      {pendente && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirmar entrega
                    </button>
                    <button type="button" onClick={() => setEntregando(false)} className="text-sm text-conecta-muted underline">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {erro && <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-sm">{erro}</div>}
        </div>
      )}
    </li>
  );
}

/** Solicitações de uniforme: filtro por etapa, busca e (para o Gente e Gestão) as ações de cada etapa. */
export function UniformeLista({ solicitacoes, admin }: { solicitacoes: SolicitacaoUniforme[]; admin: boolean }) {
  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: solicitacoes.length };
    for (const s of solicitacoes) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [solicitacoes]);
  // O Gente e Gestão abre direto nas novas; os demais veem tudo.
  const [filtro, setFiltro] = useState<Filtro>(admin && (contagem.solicitado ?? 0) > 0 ? 'solicitado' : 'todas');
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return solicitacoes.filter(
      (s) =>
        (filtro === 'todas' || s.status === filtro) &&
        (!q || s.colaboradorNome.toLowerCase().includes(q) || s.chapa.includes(q) || s.filial.includes(q) || s.item.toLowerCase().includes(q)),
    );
  }, [solicitacoes, filtro, busca]);

  const alternar = (id: string) =>
    setAbertos((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const atrasadas = solicitacoes.filter((s) => estaAtrasado(s)).length;
  const devolucoes = solicitacoes.filter((s) => devolucaoPendente(s) && s.status === 'entregue').length;

  const chips: { valor: Filtro; rotulo: string }[] = [{ valor: 'todas', rotulo: 'Todas' }, ...STATUS_UNIFORME];

  return (
    <ConectaCard noPadding>
      <div className="space-y-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeader label={admin ? 'Solicitações de uniforme' : 'Acompanhar solicitações'} icon={Shirt} />
          <Link href="/uniformes/solicitar" className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3.5 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
            <Plus className="h-3.5 w-3.5" /> Nova solicitação
          </Link>
        </div>

        {(atrasadas > 0 || devolucoes > 0) && (
          <div className="flex flex-wrap gap-2 text-[12px]">
            {atrasadas > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-800"><AlertTriangle className="h-3.5 w-3.5" /> {atrasadas} {atrasadas === 1 ? 'pedido passou' : 'pedidos passaram'} de 48h</span>}
            {devolucoes > 0 && <span className="rounded-full bg-orange-50 px-3 py-1 font-semibold text-orange-800 ring-1 ring-orange-200">{devolucoes} {devolucoes === 1 ? 'entregue' : 'entregues'} com devolução pendente</span>}
          </div>
        )}

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {chips.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setFiltro(c.valor)}
              aria-pressed={filtro === c.valor}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-display font-semibold transition-colors ${
                filtro === c.valor ? 'border-conecta-primary bg-conecta-primary text-white' : 'border-conecta-primary/15 bg-white text-conecta-primary hover:border-conecta-accent/50'
              }`}
            >
              {c.rotulo} <span className="tabular-nums opacity-80">({contagem[c.valor] ?? 0})</span>
            </button>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-conecta-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, matrícula, filial ou item…" className="w-full rounded-lg border border-conecta-primary/15 py-2 pl-8 pr-3 text-sm" />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3 p-4 pt-1 sm:p-5 sm:pt-1">
        {lista.map((s) => (
          <Cartao key={s.id} s={s} admin={admin} aberto={abertos.has(s.id)} alternar={() => alternar(s.id)} />
        ))}
        {lista.length === 0 && <li className="py-10 text-center text-sm text-conecta-muted">Nenhuma solicitação {filtro === 'todas' ? '' : `“${rotuloStatus(filtro)}” `}por aqui.</li>}
      </ul>
    </ConectaCard>
  );
}
