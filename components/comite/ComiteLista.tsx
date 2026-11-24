'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, FileText, History, Loader2, Pencil, Plus, Search, Trash2, Undo2, X } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { excluirLancamentoComite } from '@/actions/comite/lancamentos';
import { decidirLancamentoComite } from '@/actions/comite/decisao';
import { HistoricoPedidos } from '@/components/comite/HistoricoPedidos';
import { fmtTempo, nomeMes, rotuloDecisao, type ComiteLancamento, type Decisao, type GestorOpt } from '@/lib/comite/tipos';

/** Decisão em andamento: aguardando escolher quem decidiu (e o motivo, se não aprovado). */
interface Decidindo {
  id: string;
  decisao: Decisao;
  motivo: string;
  gestores: string[];
  busca: string;
}

const dataHoraBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : null;

const COR_STATUS: Record<'pendente' | Decisao, string> = {
  pendente: 'bg-slate-100 text-conecta-muted',
  aprovado: 'bg-emerald-50 text-emerald-700',
  nao_aprovado: 'bg-rose-50 text-rose-700',
};

/** Lançamentos do mês: status, decisão do comitê (só admin), detalhes e editar/excluir. */
export function ComiteLista({
  lancamentos, mes, meses, podeDecidir, gestores = [],
}: { lancamentos: ComiteLancamento[]; mes: string; meses: string[]; podeDecidir: boolean; gestores?: GestorOpt[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [decidindo, setDecidindo] = useState<Decidindo | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lancamentos.filter((l) => !q || l.nome.toLowerCase().includes(q) || l.chapa.includes(q) || l.filial.includes(q));
  }, [lancamentos, busca]);

  function alternar(id: string) {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function excluir(l: ComiteLancamento) {
    if (!confirm(`Excluir o lançamento de ${l.nome}? Essa ação não pode ser desfeita.`)) return;
    iniciar(async () => {
      const r = await excluirLancamentoComite(l.id);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  function decidir(id: string, decisao: Decisao | null, motivo?: string, gestorIds: string[] = []) {
    setErro(null);
    iniciar(async () => {
      const r = await decidirLancamentoComite(id, decisao, motivo, gestorIds);
      if (!r.ok) return setErro(r.erro);
      setDecidindo(null);
      router.refresh();
    });
  }

  function iniciarDecisao(id: string, decisao: Decisao) {
    setAbertos((prev) => new Set(prev).add(id));
    setDecidindo({ id, decisao, motivo: '', gestores: [], busca: '' });
    setErro(null);
  }

  function alternarGestor(gid: string) {
    setDecidindo((d) => (d ? { ...d, gestores: d.gestores.includes(gid) ? d.gestores.filter((x) => x !== gid) : [...d.gestores, gid] } : d));
  }

  const opcoes = meses.includes(mes) ? meses : [mes, ...meses];
  const colunas = 9;

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeader label={`Lançamentos de ${nomeMes(mes)} (${lista.length})`} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select value={mes} onChange={(e) => router.push(`/comite/lancamentos?mes=${e.target.value}`)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm font-semibold text-conecta-primary">
              {opcoes.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
            </select>
            {podeDecidir && (
              <Link href={`/comite/ata?mes=${mes}`} className="inline-flex items-center gap-1.5 rounded-lg border border-conecta-primary/15 text-conecta-primary px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:bg-slate-50">
                <FileText className="h-3.5 w-3.5" /> Gerar ata
              </Link>
            )}
            <Link href="/comite/lancar" className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
              <Plus className="h-3.5 w-3.5" /> Novo lançamento
            </Link>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-conecta-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, matrícula ou filial…" className="w-full rounded-lg border border-conecta-primary/15 pl-8 pr-3 py-1.5 text-sm" />
        </div>
        {erro && <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-sm">{erro}</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-display uppercase tracking-[0.18em] text-conecta-muted border-y border-conecta-primary/10 bg-slate-50">
              <th className="px-5 py-2">Colaborador</th>
              <th className="px-3 py-2">Filial</th>
              <th className="px-3 py-2">Função</th>
              <th className="px-3 py-2 text-center">Susp.</th>
              <th className="px-3 py-2 text-center">Adv.</th>
              <th className="px-3 py-2">Tempo de empresa</th>
              <th className="px-3 py-2">Decisão</th>
              <th className="px-3 py-2">Lançado por</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-conecta-primary/8">
            {lista.map((l) => {
              const aberto = abertos.has(l.id);
              const status = l.decisao ?? 'pendente';
              const painel = decidindo?.id === l.id ? decidindo : null;
              return (
                <Fragment key={l.id}>
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-2">
                      <button type="button" onClick={() => alternar(l.id)} aria-expanded={aberto} className="flex items-start gap-1.5 text-left">
                        {aberto ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-conecta-accent" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-conecta-muted" />}
                        <span>
                          <span className="block font-semibold text-conecta-primary">{l.nome}</span>
                          <span className="block text-[11px] text-conecta-muted tabular-nums">{l.chapa}</span>
                        </span>
                      </button>
                      {l.historico.length > 0 && (
                        <span title="Já foi pedido antes e não aprovado — veja os detalhes" className="ml-5 mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          <History className="h-3 w-3" /> já pedido antes ({l.historico.length})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{l.filial}</td>
                    <td className="px-3 py-2">{l.funcao}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{l.suspensoes}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{l.advertencias}</td>
                    <td className="px-3 py-2">{fmtTempo(l.tempoMeses)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-display font-semibold ${COR_STATUS[status]}`}>
                        {rotuloDecisao(l.decisao)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-conecta-muted">{l.criadoPor}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {podeDecidir && (
                        <>
                          {l.decisao !== 'aprovado' && (
                            <button type="button" disabled={pendente} onClick={() => iniciarDecisao(l.id, 'aprovado')} className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold mr-3 disabled:opacity-50">
                              <Check className="h-3.5 w-3.5" /> Aprovar
                            </button>
                          )}
                          {l.decisao !== 'nao_aprovado' && (
                            <button type="button" disabled={pendente} onClick={() => iniciarDecisao(l.id, 'nao_aprovado')} className="inline-flex items-center gap-1 text-rose-700 hover:underline font-semibold mr-3 disabled:opacity-50">
                              <X className="h-3.5 w-3.5" /> Não aprovar
                            </button>
                          )}
                        </>
                      )}
                      <Link href={`/comite/${l.id}/editar`} className="inline-flex items-center gap-1 text-conecta-primary hover:text-conecta-accent font-semibold mr-3">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Link>
                      <button type="button" onClick={() => excluir(l)} className="inline-flex items-center gap-1 text-rose-700 hover:underline font-semibold">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </td>
                  </tr>
                  {aberto && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={colunas} className="px-5 py-4">
                        <div className="max-w-4xl space-y-3">
                          <div>
                            <div className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Justificativa do pedido</div>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-conecta-primary">{l.justificativa}</p>
                          </div>

                          {l.decisao && (
                            <div className={`rounded-lg border p-3 text-sm ${l.decisao === 'aprovado' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
                              <span className="font-semibold">{rotuloDecisao(l.decisao)}</span>
                              {l.decididoPor && <> por {l.decididoPor}</>}
                              {dataHoraBr(l.decididoEm) && <> em {dataHoraBr(l.decididoEm)}</>}
                              {l.decisao === 'nao_aprovado' && l.decisaoMotivo && (
                                <p className="mt-1 whitespace-pre-wrap"><span className="font-semibold">Motivo:</span> {l.decisaoMotivo}</p>
                              )}
                              {podeDecidir && (
                                <button type="button" disabled={pendente} onClick={() => decidir(l.id, null)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold underline disabled:opacity-50">
                                  <Undo2 className="h-3.5 w-3.5" /> Voltar para pendente
                                </button>
                              )}
                            </div>
                          )}

                          {painel && (
                            <div className={`rounded-lg border bg-white p-3 ${painel.decisao === 'aprovado' ? 'border-emerald-300' : 'border-rose-300'}`}>
                              <div className={`font-display text-[10px] uppercase tracking-[0.22em] font-semibold ${painel.decisao === 'aprovado' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {painel.decisao === 'aprovado' ? 'Aprovar pedido' : 'Não aprovar pedido'} — quem decidiu (gestor regional ou nacional)
                              </div>
                              <input
                                value={painel.busca}
                                onChange={(e) => setDecidindo({ ...painel, busca: e.target.value })}
                                placeholder="Buscar gestor…"
                                className="mt-2 w-full max-w-sm rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm"
                              />
                              <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-conecta-primary/10 divide-y divide-conecta-primary/8">
                                {gestores
                                  .filter((g) => !painel.busca.trim() || `${g.nome} ${g.funcao}`.toLowerCase().includes(painel.busca.trim().toLowerCase()))
                                  .map((g) => (
                                    <label key={g.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
                                      <input type="checkbox" checked={painel.gestores.includes(g.id)} onChange={() => alternarGestor(g.id)} className="accent-conecta-accent" />
                                      <span className="font-semibold text-conecta-primary">{g.nome}</span>
                                      <span className="text-[12px] text-conecta-muted">{g.funcao}</span>
                                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.escopo === 'Nacional' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'}`}>{g.escopo}</span>
                                    </label>
                                  ))}
                                {gestores.length === 0 && <p className="px-3 py-3 text-sm text-conecta-muted">Nenhum gestor regional ou nacional encontrado no QLP.</p>}
                              </div>
                              <p className="mt-1 text-[11px] text-conecta-muted">{painel.gestores.length} selecionado(s) — pode marcar mais de um.</p>

                              {painel.decisao === 'nao_aprovado' && (
                                <label className="mt-3 block">
                                  <span className="font-display text-[10px] uppercase tracking-[0.22em] text-rose-700 font-semibold">Motivo da não aprovação (obrigatório)</span>
                                  <textarea
                                    value={painel.motivo}
                                    onChange={(e) => setDecidindo({ ...painel, motivo: e.target.value })}
                                    rows={3}
                                    maxLength={3000}
                                    placeholder="Explique por que o comitê não aprovou o desligamento…"
                                    className="mt-1 w-full resize-y rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm"
                                  />
                                </label>
                              )}
                              <div className="mt-3 flex items-center gap-3">
                                <button
                                  type="button"
                                  disabled={pendente || painel.gestores.length === 0 || (painel.decisao === 'nao_aprovado' && painel.motivo.trim().length < 5)}
                                  onClick={() => decidir(l.id, painel.decisao, painel.motivo, painel.gestores)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] text-white hover:brightness-110 disabled:opacity-50 ${painel.decisao === 'aprovado' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                                >
                                  {pendente && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {painel.decisao === 'aprovado' ? 'Confirmar aprovação' : 'Confirmar não aprovação'}
                                </button>
                                <button type="button" onClick={() => setDecidindo(null)} className="text-sm text-conecta-muted underline underline-offset-2 hover:text-conecta-accent">Cancelar</button>
                              </div>
                            </div>
                          )}

                          <HistoricoPedidos historico={l.historico} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {lista.length === 0 && (
              <tr><td colSpan={colunas} className="px-5 py-10 text-center text-conecta-muted">Nenhum lançamento neste mês.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </ConectaCard>
  );
}
