'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, Search, Shirt } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { buscarColaboradorUniforme, criarSolicitacaoUniforme } from '@/actions/uniformes';
import type { FilialOpcao } from '@/lib/comite/tipos';
import {
  ITENS_UNIFORME, MOTIVOS_UNIFORME, PRAZO_HORAS, QUANTIDADES_UNIFORME, TAMANHOS_UNIFORME, rotuloStatus,
  type ColaboradorUniforme, type SolicitacaoUniforme,
} from '@/lib/uniformes/tipos';

const inputCls = 'w-full rounded-lg border border-conecta-primary/15 bg-white px-3 py-2.5 text-sm';
const labelCls = 'font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold';

function Info({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className={labelCls}>{l}</div>
      <div className="text-sm font-semibold text-conecta-primary break-words">{v}</div>
    </div>
  );
}

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-lg border px-4 py-2 text-sm font-display font-semibold transition-colors min-w-[3rem] ${
        ativo ? 'border-conecta-accent bg-conecta-accent text-white' : 'border-conecta-primary/15 bg-white text-conecta-primary hover:border-conecta-accent/50'
      }`}
    >
      {children}
    </button>
  );
}

/** Solicitação de uniforme: a matrícula puxa o colaborador e o resto segue como o antigo formulário. */
export function UniformeForm({ filiais, solicitante }: { filiais: FilialOpcao[]; solicitante: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const filialFixa = filiais.length === 1;
  const [filial, setFilial] = useState(filialFixa ? filiais[0]!.codigo : '');
  const [chapa, setChapa] = useState('');
  const [colab, setColab] = useState<ColaboradorUniforme | null>(null);
  const [emAndamento, setEmAndamento] = useState<SolicitacaoUniforme[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [item, setItem] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const filialValida = filiais.some((f) => f.codigo === filial.trim());
  const repetido = !!colab && emAndamento.some((p) => p.item === item);

  async function buscar() {
    setErro(null); setColab(null); setEmAndamento([]);
    if (!filialValida) return setErro('escolha uma filial da lista');
    if (!chapa.trim()) return setErro('digite a matrícula');
    setBuscando(true);
    const r = await buscarColaboradorUniforme(filial.trim(), chapa);
    setBuscando(false);
    if (!r.ok) return setErro(r.erro);
    setColab(r.colaborador);
    setEmAndamento(r.emAndamento);
  }

  function enviar() {
    setErro(null);
    if (!colab) return setErro('busque o colaborador pela matrícula');
    if (!item) return setErro('escolha o item');
    if (!tamanho) return setErro('escolha o tamanho');
    if (!motivo) return setErro('escolha o motivo');
    iniciar(async () => {
      const r = await criarSolicitacaoUniforme({
        filialCodigo: colab.filialCodigo, chapa: colab.chapa, item, tamanho, quantidade, motivo, motivoOutro,
      });
      if (!r.ok) return setErro(r.erro);
      setEnviado(true);
      router.refresh();
    });
  }

  function novaSolicitacao() {
    setColab(null); setChapa(''); setItem(''); setTamanho(''); setQuantidade(1); setMotivo(''); setMotivoOutro('');
    setEmAndamento([]); setEnviado(false); setErro(null);
  }

  if (enviado) {
    return (
      <ConectaCard>
        <div className="py-6 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="font-display text-xl font-extrabold text-conecta-primary">Solicitação enviada</h2>
          <p className="text-sm text-conecta-muted max-w-md mx-auto">
            O Gente e Gestão recebeu o pedido. O prazo para entrega é de <strong>{PRAZO_HORAS} horas</strong> após o envio.
            Acompanhe o andamento em “Acompanhar”.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/uniformes" className="inline-flex items-center rounded-lg bg-conecta-primary text-white px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
              Acompanhar solicitações
            </Link>
            <button type="button" onClick={novaSolicitacao} className="inline-flex items-center rounded-lg bg-conecta-accent text-white px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110">
              Nova solicitação
            </button>
          </div>
        </div>
      </ConectaCard>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-lg border border-conecta-accent/30 bg-conecta-accent/5 px-4 py-3 text-sm text-conecta-primary">
        O prazo para entrega é de <strong>{PRAZO_HORAS} horas</strong> após o envio da solicitação.
      </div>

      <ConectaCard>
        <SectionHeader label="1. Identificar o colaborador" icon={Search} />
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
          <label className="block">
            <span className={labelCls}>Filial</span>
            {filialFixa ? (
              <div className="mt-1 rounded-lg bg-slate-50 border border-conecta-primary/10 px-3 py-2.5 text-sm font-semibold text-conecta-primary">
                {filiais[0]!.codigo} — {filiais[0]!.nome}
              </div>
            ) : (
              <>
                <input
                  list="uniforme-filiais"
                  value={filial}
                  onChange={(e) => { setFilial(e.target.value); setColab(null); }}
                  placeholder="Digite ou selecione"
                  className={`${inputCls} mt-1`}
                />
                <datalist id="uniforme-filiais">
                  {filiais.map((f) => <option key={f.codigo} value={f.codigo}>{f.nome}</option>)}
                </datalist>
              </>
            )}
          </label>
          <label className="block">
            <span className={labelCls}>Matrícula (chapa)</span>
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-conecta-primary text-white px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60"
          >
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </button>
        </div>
        {!colab && erro && <div role="alert" className="mt-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}
      </ConectaCard>

      {colab && (
        <ConectaCard variant="navy">
          <SectionHeader label="Colaborador encontrado" />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-3"><Info l="Nome do colaborador" v={colab.nome} /></div>
            <Info l="Matrícula" v={colab.chapa} />
            <Info l="Filial" v={`${colab.filialCodigo}${colab.filialNome ? ` — ${colab.filialNome}` : ''}`} />
            <Info l="Seção" v={colab.secao ?? '—'} />
            <Info l="Função" v={colab.funcao} />
            <Info l="Gestor solicitante" v={solicitante} />
          </div>
          {emAndamento.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> Esse colaborador já tem pedido em andamento</div>
              <ul className="mt-1 list-disc pl-5">
                {emAndamento.map((p) => <li key={p.id}>{p.item} · {p.tamanho} · {p.quantidade}× — {rotuloStatus(p.status)}</li>)}
              </ul>
            </div>
          )}
        </ConectaCard>
      )}

      {colab && (
        <ConectaCard>
          <SectionHeader label="2. O que precisa" icon={Shirt} />
          <div className="mt-4 space-y-5">
            <label className="block">
              <span className={labelCls}>Qual o item?</span>
              <select value={item} onChange={(e) => setItem(e.target.value)} className={`${inputCls} mt-1`}>
                <option value="">Selecione…</option>
                {ITENS_UNIFORME.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>

            <div>
              <span className={labelCls}>Tamanho</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {TAMANHOS_UNIFORME.map((t) => <Opcao key={t} ativo={tamanho === t} onClick={() => setTamanho(t)}>{t}</Opcao>)}
              </div>
            </div>

            <div>
              <span className={labelCls}>Quantidade (mediante devolução)</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUANTIDADES_UNIFORME.map((q) => <Opcao key={q} ativo={quantidade === q} onClick={() => setQuantidade(q)}>{q}</Opcao>)}
              </div>
            </div>

            <div>
              <span className={labelCls}>Motivo da solicitação</span>
              <div className="mt-2 grid gap-2">
                {MOTIVOS_UNIFORME.map((m) => (
                  <label key={m.valor} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${motivo === m.valor ? 'border-conecta-accent bg-conecta-accent/5' : 'border-conecta-primary/15 bg-white'}`}>
                    <input type="radio" name="motivo" value={m.valor} checked={motivo === m.valor} onChange={() => setMotivo(m.valor)} className="accent-conecta-accent" />
                    <span className="text-conecta-primary font-semibold">{m.rotulo}</span>
                  </label>
                ))}
              </div>
              {motivo === 'outro' && (
                <input
                  value={motivoOutro}
                  onChange={(e) => setMotivoOutro(e.target.value)}
                  maxLength={300}
                  placeholder="Descreva o motivo"
                  className={`${inputCls} mt-2`}
                />
              )}
              {(motivo === 'troca_funcao' || motivo === 'danificado') && (
                <p className="mt-2 text-[12px] text-conecta-muted">O uniforme antigo deve ser devolvido na entrega do novo.</p>
              )}
            </div>
          </div>

          {repetido && <div role="alert" className="mt-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 p-3 text-sm">Já existe um pedido em andamento desse item para esse colaborador.</div>}
          {erro && <div role="alert" className="mt-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enviar}
              disabled={pendente || repetido}
              className="inline-flex items-center gap-2 rounded-lg bg-conecta-accent text-white px-5 py-3 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60"
            >
              {pendente && <Loader2 className="h-4 w-4 animate-spin" />} Enviar solicitação
            </button>
            <Link href="/uniformes" className="text-sm text-conecta-muted hover:text-conecta-accent underline underline-offset-2">Cancelar</Link>
          </div>
        </ConectaCard>
      )}
    </div>
  );
}
