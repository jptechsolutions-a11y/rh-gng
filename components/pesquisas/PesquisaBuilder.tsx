'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, ListPlus, Plus, Trash2, ClipboardPen } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { criarPesquisa, editarPesquisa } from '@/actions/pesquisas/admin';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { TIPO_LABEL, type PerguntaInput, type TipoPergunta } from '@/lib/pesquisas/tipos';

type Item = PerguntaInput & { id?: string };

export interface PesquisaInicial {
  id: string;
  titulo: string;
  descricao: string;
  anonima: boolean;
  temRespostas: boolean;
  perguntas: Item[];
}

const nova = (): Item => ({ texto: '', tipo: 'unica', obrigatoria: true, opcoes: ['', ''] });

export function PesquisaBuilder({ inicial }: { inicial?: PesquisaInicial }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const editando = !!inicial;
  const travaModo = !!inicial?.temRespostas;
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [anonima, setAnonima] = useState(inicial?.anonima ?? false);
  const [perguntas, setPerguntas] = useState<Item[]>(inicial?.perguntas ?? [nova()]);
  const [erro, setErro] = useState<string | null>(null);
  const [criada, setCriada] = useState<{ id: string; slug: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pending, start] = useTransition();

  const link = criada && typeof window !== 'undefined' ? `${window.location.origin}/p/${criada.slug}` : '';

  function set(i: number, patch: Partial<Item>) {
    setPerguntas((l) => l.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function mover(i: number, d: -1 | 1) {
    setPerguntas((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
  }
  async function removerPergunta(i: number) {
    const q = perguntas[i]!;
    if (q.id && inicial?.temRespostas) {
      const ok = await confirmar({
        titulo: 'Remover pergunta',
        descricao: `Remover "${q.texto}" apaga também as respostas já dadas a ela. Continuar?`,
        confirmLabel: 'Remover',
      });
      if (!ok) return;
    }
    setPerguntas((l) => l.filter((_, idx) => idx !== i));
  }
  function setOpcao(i: number, k: number, v: string) {
    set(i, { opcoes: perguntas[i]!.opcoes.map((o, idx) => (idx === k ? v : o)) });
  }

  function salvar() {
    setErro(null);
    start(async () => {
      try {
        if (inicial) {
          await editarPesquisa(inicial.id, { titulo, descricao, anonima, perguntas });
          router.push(`/pesquisas/${inicial.id}`);
          router.refresh();
          return;
        }
        const r = await criarPesquisa({ titulo, descricao, anonima, perguntas });
        setCriada(r);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao criar pesquisa');
      }
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copie o link:', link);
    }
  }

  if (criada) {
    return (
      <ConectaCard>
        <SectionHeader label="Pesquisa criada" icon={Check} />
        <p className="mt-4 text-sm text-conecta-text">
          Compartilhe este link — quem receber responde direto, <strong>sem precisar de login</strong>.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-[260px] rounded-lg border border-conecta-primary/15 bg-slate-50 px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110"
          >
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? 'Copiado' : 'Copiar link'}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-conecta-primary/20 text-conecta-primary px-3 py-2 text-[11px] font-display font-semibold hover:bg-conecta-primary/5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </a>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/pesquisas/${criada.id}`)}
            className="rounded-lg bg-conecta-primary text-white px-4 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110"
          >
            Ver indicadores
          </button>
          <button
            type="button"
            onClick={() => router.push('/pesquisas')}
            className="rounded-lg border border-conecta-primary/20 text-conecta-primary px-4 py-2 text-[11px] font-display font-semibold hover:bg-conecta-primary/5"
          >
            Voltar para pesquisas
          </button>
        </div>
      </ConectaCard>
    );
  }

  const inputCls = 'w-full rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm';

  return (
    <div className="space-y-5 max-w-3xl">
      <ConectaCard>
        <SectionHeader label="Dados da pesquisa" icon={ClipboardPen} />
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] font-display font-semibold uppercase tracking-wide text-conecta-muted">Título</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} placeholder="Ex.: Escala 5x2" />
          </label>
          <label className="block">
            <span className="text-[11px] font-display font-semibold uppercase tracking-wide text-conecta-muted">Descrição (opcional)</span>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className={inputCls} />
          </label>
          {travaModo && (
            <p className="text-[11px] text-amber-800">Já existem respostas: o modo (anônima/identificada) e o tipo das perguntas existentes não podem mudar. Renomear uma opção não altera as respostas antigas.</p>
          )}
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { v: false, t: 'Identificada', d: 'Pede a matrícula e puxa nome, função, seção e filial. Cada matrícula responde uma vez e dá pra ver quem falta.' },
              { v: true, t: 'Anônima', d: 'Não pede identificação. A pessoa escolhe a filial e cada filial aceita respostas até completar o quadro de colaboradores.' },
            ].map((o) => (
              <button
                key={o.t}
                type="button"
                onClick={() => setAnonima(o.v)}
                disabled={travaModo}
                className={`disabled:opacity-60 disabled:cursor-not-allowed text-left rounded-lg border p-3 transition ${
                  anonima === o.v
                    ? 'border-conecta-accent bg-conecta-accent/8 ring-1 ring-conecta-accent/40'
                    : 'border-conecta-primary/15 hover:bg-slate-50'
                }`}
              >
                <div className="font-display font-bold text-conecta-primary text-sm">{o.t}</div>
                <div className="text-[11px] text-conecta-muted mt-0.5">{o.d}</div>
              </button>
            ))}
          </div>
        </div>
      </ConectaCard>

      {perguntas.map((p, i) => {
        const escolha = p.tipo === 'unica' || p.tipo === 'multipla';
        return (
          <ConectaCard key={i}>
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-accent font-semibold">
                Pergunta {i + 1}
              </span>
              <span className="flex-1" />
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1 text-conecta-muted hover:text-conecta-accent disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === perguntas.length - 1} className="p-1 text-conecta-muted hover:text-conecta-accent disabled:opacity-30" aria-label="Descer"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => removerPergunta(i)} disabled={perguntas.length === 1} className="p-1 text-rose-600 hover:bg-rose-50 rounded disabled:opacity-30" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-3">
              <input value={p.texto} onChange={(e) => set(i, { texto: e.target.value })} className={inputCls} placeholder="Texto da pergunta" />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={p.tipo}
                  disabled={!!p.id && travaModo}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoPergunta;
                    set(i, { tipo, opcoes: tipo === 'unica' || tipo === 'multipla' ? (p.opcoes.length >= 2 ? p.opcoes : ['', '']) : [] });
                  }}
                  className="rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm"
                >
                  {(Object.keys(TIPO_LABEL) as TipoPergunta[]).map((t) => (
                    <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-conecta-text">
                  <input type="checkbox" checked={p.obrigatoria} onChange={(e) => set(i, { obrigatoria: e.target.checked })} />
                  Obrigatória
                </label>
              </div>
              {escolha && (
                <div className="space-y-2">
                  {p.opcoes.map((o, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-5 text-right text-[11px] text-conecta-muted tabular-nums">{k + 1}.</span>
                      <input value={o} onChange={(e) => setOpcao(i, k, e.target.value)} className={inputCls} placeholder={`Opção ${k + 1}`} />
                      <button
                        type="button"
                        disabled={p.opcoes.length <= 2}
                        onClick={() => set(i, { opcoes: p.opcoes.filter((_, idx) => idx !== k) })}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded disabled:opacity-30"
                        aria-label="Remover opção"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set(i, { opcoes: [...p.opcoes, ''] })}
                    className="inline-flex items-center gap-1 text-[11px] font-display font-semibold text-conecta-accent hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar opção
                  </button>
                </div>
              )}
            </div>
          </ConectaCard>
        );
      })}

      <button
        type="button"
        onClick={() => setPerguntas((l) => [...l, nova()])}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-conecta-accent/50 text-conecta-accent px-4 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:bg-conecta-accent/5"
      >
        <ListPlus className="h-4 w-4" /> Adicionar pergunta
      </button>

      {erro && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={salvar}
          className="rounded-lg bg-conecta-accent text-white px-5 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60"
        >
          {pending ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar pesquisa e gerar link'}
        </button>
      </div>
    </div>
  );
}
