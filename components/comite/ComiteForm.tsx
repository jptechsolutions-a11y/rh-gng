'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import {
  buscarColaboradorComite, criarLancamentoComite, editarLancamentoComite, excluirLancamentoComite,
} from '@/actions/comite/lancamentos';
import { HistoricoPedidos } from '@/components/comite/HistoricoPedidos';
import {
  fmtTempo, mesAtual, nomeMes, tempoEmpresaMeses, turnoDoHorario,
  type ColaboradorComite, type ComiteLancamento, type FilialOpcao, type PedidoAnterior,
} from '@/lib/comite/tipos';

const fmtData = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');
const inputCls = 'w-full rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm';
const labelCls = 'font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold';

function Info({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div>
      <div className={labelCls}>{l}</div>
      <div className="text-sm font-semibold text-conecta-primary">{v}</div>
    </div>
  );
}

/** Lançamento novo (busca pela matrícula) ou edição de um lançamento existente. */
export function ComiteForm({ filiais, lancamento }: { filiais: FilialOpcao[]; lancamento?: ComiteLancamento }) {
  const router = useRouter();
  const editando = !!lancamento;
  const [pendente, iniciar] = useTransition();
  const [filial, setFilial] = useState(lancamento?.filial ?? (filiais.length === 1 ? filiais[0]!.codigo : ''));
  const [chapa, setChapa] = useState(lancamento?.chapa ?? '');
  const [colab, setColab] = useState<ColaboradorComite | null>(null);
  const [jaLancado, setJaLancado] = useState<{ id: string; mes: string } | null>(null);
  const [historico, setHistorico] = useState<PedidoAnterior[]>(lancamento?.historico ?? []);
  const [buscando, setBuscando] = useState(false);
  const [susp, setSusp] = useState(String(lancamento?.suspensoes ?? 0));
  const [adv, setAdv] = useState(String(lancamento?.advertencias ?? 0));
  const [mes, setMes] = useState(lancamento?.mes ?? mesAtual());
  const [just, setJust] = useState(lancamento?.justificativa ?? '');
  const [idadeManual, setIdadeManual] = useState(lancamento?.idade != null ? String(lancamento.idade) : '');
  const [erro, setErro] = useState<string | null>(null);

  const filialFixa = filiais.length === 1;
  const filialValida = filiais.some((f) => f.codigo === filial.trim());

  async function buscar() {
    setErro(null); setColab(null); setJaLancado(null); setHistorico([]);
    if (!filialValida) return setErro('escolha uma filial da lista');
    if (!chapa.trim()) return setErro('digite a matrícula');
    setBuscando(true);
    const r = await buscarColaboradorComite(filial.trim(), chapa, mes);
    setBuscando(false);
    if (!r.ok) return setErro(r.erro);
    setColab(r.colaborador);
    setJaLancado(r.jaLancado);
    setHistorico(r.historico);
    if (r.colaborador.idade != null) setIdadeManual('');
  }

  // Mudou o mês depois de buscar: reavalia se já existe lançamento.
  async function reverificar(novoMes: string) {
    setMes(novoMes);
    if (!colab || editando) return;
    const r = await buscarColaboradorComite(colab.filialCodigo, colab.chapa, novoMes);
    if (r.ok) { setJaLancado(r.jaLancado); setHistorico(r.historico); }
  }

  const pessoa = editando
    ? { nome: lancamento.nome, chapa: lancamento.chapa, funcao: lancamento.funcao, secao: lancamento.secao, filial: lancamento.filial, admissao: lancamento.admissao, idade: lancamento.idade, horario: lancamento.horario }
    : colab
    ? { nome: colab.nome, chapa: colab.chapa, funcao: colab.funcao, secao: colab.secao ?? 'Sem seção', filial: colab.filialCodigo, admissao: colab.admissao, idade: colab.idade, horario: colab.horario }
    : null;

  function salvar() {
    setErro(null);
    const idade = idadeManual.trim() ? Number(idadeManual) : null;
    iniciar(async () => {
      const base = { suspensoes: Number(susp || 0), advertencias: Number(adv || 0), mes, justificativa: just, idade };
      const r = editando
        ? await editarLancamentoComite(lancamento.id, base)
        : await criarLancamentoComite({ ...base, filialCodigo: colab!.filialCodigo, chapa: colab!.chapa });
      if (!r.ok) return setErro(r.erro);
      router.push(`/comite/lancamentos?mes=${mes}`);
      router.refresh();
    });
  }

  function excluir() {
    if (!editando || !confirm(`Excluir o lançamento de ${lancamento.nome}? Essa ação não pode ser desfeita.`)) return;
    iniciar(async () => {
      const r = await excluirLancamentoComite(lancamento.id);
      if (!r.ok) return setErro(r.erro);
      router.push(`/comite/lancamentos?mes=${lancamento.mes}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {!editando && (
        <ConectaCard>
          <SectionHeader label="1. Identificar o colaborador" icon={Search} />
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
            <label className="block">
              <span className={labelCls}>Filial</span>
              {filialFixa ? (
                <div className="mt-1 rounded-lg bg-slate-50 border border-conecta-primary/10 px-3 py-2 text-sm font-semibold text-conecta-primary">
                  {filiais[0]!.codigo} — {filiais[0]!.nome}
                </div>
              ) : (
                <>
                  <input
                    list="comite-filiais"
                    value={filial}
                    onChange={(e) => { setFilial(e.target.value); setColab(null); }}
                    placeholder="Digite ou selecione"
                    className={`${inputCls} mt-1`}
                  />
                  <datalist id="comite-filiais">
                    {filiais.map((f) => <option key={f.codigo} value={f.codigo}>{f.nome}</option>)}
                  </datalist>
                </>
              )}
            </label>
            <label className="block">
              <span className={labelCls}>Matrícula</span>
              <input
                value={chapa}
                onChange={(e) => { setChapa(e.target.value); setColab(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void buscar(); } }}
                inputMode="numeric"
                placeholder="Ex.: 26401140"
                className={`${inputCls} mt-1`}
              />
            </label>
            <button
              type="button"
              onClick={() => void buscar()}
              disabled={buscando}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-conecta-primary text-white px-4 py-2 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60"
            >
              {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
            </button>
          </div>
        </ConectaCard>
      )}

      {pessoa && (
        <ConectaCard variant="navy">
          <SectionHeader label={editando ? 'Colaborador' : 'Colaborador encontrado'} />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-3"><Info l="Nome completo" v={pessoa.nome} /></div>
            <Info l="Matrícula" v={pessoa.chapa} />
            <Info l="Filial" v={pessoa.filial} />
            <Info l="Função" v={pessoa.funcao} />
            <Info l="Seção" v={pessoa.secao} />
            <Info l="Turno" v={turnoDoHorario(pessoa.horario)} />
            <Info l="Admissão" v={fmtData(pessoa.admissao)} />
            <Info l={`Tempo de empresa (até ${mes.slice(5)}/${mes.slice(0, 4)})`} v={fmtTempo(tempoEmpresaMeses(pessoa.admissao, mes))} />
            <Info l="Idade" v={pessoa.idade != null ? `${pessoa.idade} anos` : 'não consta no QLP'} />
          </div>
          {historico.length > 0 && (
            <div className="mt-4">
              <HistoricoPedidos historico={historico} titulo="Atenção: este colaborador já foi pedido antes e não foi aprovado" />
            </div>
          )}
          {pessoa.idade == null && (
            <label className="mt-4 block max-w-[180px]">
              <span className={labelCls}>Idade (opcional)</span>
              <input value={idadeManual} onChange={(e) => setIdadeManual(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${inputCls} mt-1`} placeholder="anos" />
            </label>
          )}
        </ConectaCard>
      )}

      {pessoa && (
        <ConectaCard>
          <SectionHeader label={editando ? 'Editar lançamento' : '2. Medidas, mês e justificativa'} />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Suspensões</span>
              <input type="number" min={0} max={99} value={susp} onChange={(e) => setSusp(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
            <label className="block">
              <span className={labelCls}>Advertências</span>
              <input type="number" min={0} max={99} value={adv} onChange={(e) => setAdv(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
            <label className="block">
              <span className={labelCls}>Mês de referência do desligamento</span>
              <input type="month" value={mes} onChange={(e) => void reverificar(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
          </div>
          <label className="mt-4 block">
            <span className={labelCls}>Justificativa</span>
            <textarea
              value={just}
              onChange={(e) => setJust(e.target.value)}
              rows={6}
              maxLength={3000}
              placeholder="Explique o motivo da indicação para desligamento…"
              className={`${inputCls} mt-1 resize-y`}
            />
            <span className="text-[11px] text-conecta-muted">{just.length}/3000</span>
          </label>

          {jaLancado && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              Esse colaborador já foi lançado para {nomeMes(jaLancado.mes)}.{' '}
              <Link href={`/comite/${jaLancado.id}/editar`} className="font-semibold underline">Abrir o lançamento para editar</Link>
            </div>
          )}
          {erro && <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={salvar}
              disabled={pendente || (!editando && !!jaLancado)}
              className="inline-flex items-center gap-2 rounded-lg bg-conecta-accent text-white px-5 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60"
            >
              {pendente && <Loader2 className="h-4 w-4 animate-spin" />} {editando ? 'Salvar alterações' : 'Lançar'}
            </button>
            <Link href="/comite/lancamentos" className="text-sm text-conecta-muted hover:text-conecta-accent underline underline-offset-2">Cancelar</Link>
            {editando && (
              <button type="button" onClick={excluir} disabled={pendente} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline">
                <Trash2 className="h-4 w-4" /> Excluir lançamento
              </button>
            )}
          </div>
        </ConectaCard>
      )}
      {!pessoa && erro && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}
    </div>
  );
}
