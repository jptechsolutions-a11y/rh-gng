'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { decidirLancamentoComite } from '@/actions/comite/decisao';
import type { ComiteLancamento, Decisao, GestorOpt } from '@/lib/comite/tipos';

/** Decisão em andamento: aguardando escolher quem decidiu (e o motivo, se não aprovado). */
export interface Decidindo {
  id: string;
  decisao: Decisao;
  motivo: string;
  gestores: string[];
  busca: string;
}

/**
 * Estado e ações da decisão do comitê (aprovar / não aprovar / voltar para pendente).
 * Compartilhado entre a apresentação e a aba de lançamentos. `aoIniciar` deixa a tela abrir o item.
 */
export function useDecisaoComite(aoIniciar?: (id: string) => void) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [decidindo, setDecidindo] = useState<Decidindo | null>(null);

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
    aoIniciar?.(id);
    setDecidindo({ id, decisao, motivo: '', gestores: [], busca: '' });
    setErro(null);
  }

  function alternarGestor(gid: string) {
    setDecidindo((d) => (d ? { ...d, gestores: d.gestores.includes(gid) ? d.gestores.filter((x) => x !== gid) : [...d.gestores, gid] } : d));
  }

  return { pendente, iniciar, erro, setErro, decidindo, setDecidindo, decidir, iniciarDecisao, alternarGestor };
}

export type DecisaoComite = ReturnType<typeof useDecisaoComite>;

/** Botões padrão "Aprovar" e "Não aprovar" de um pedido (esconde o que já é a decisão atual). */
export function BotoesDecisao({ l, d }: { l: Pick<ComiteLancamento, 'id' | 'decisao'>; d: DecisaoComite }) {
  return (
    <>
      {l.decisao !== 'aprovado' && (
        <button type="button" disabled={d.pendente} onClick={() => d.iniciarDecisao(l.id, 'aprovado')} className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold disabled:opacity-50">
          <Check className="h-3.5 w-3.5" /> Aprovar
        </button>
      )}
      {l.decisao !== 'nao_aprovado' && (
        <button type="button" disabled={d.pendente} onClick={() => d.iniciarDecisao(l.id, 'nao_aprovado')} className="inline-flex items-center gap-1 text-rose-700 hover:underline font-semibold disabled:opacity-50">
          <X className="h-3.5 w-3.5" /> Não aprovar
        </button>
      )}
    </>
  );
}

/** Painel de confirmação: quem decidiu (gestores) e, se não aprovado, o motivo. */
export function PainelDecisao({ painel, gestores, d }: { painel: Decidindo; gestores: GestorOpt[]; d: DecisaoComite }) {
  const aprovando = painel.decisao === 'aprovado';
  return (
    <div className={`rounded-lg border bg-white p-3 ${aprovando ? 'border-emerald-300' : 'border-rose-300'}`}>
      <div className={`font-display text-[10px] uppercase tracking-[0.22em] font-semibold ${aprovando ? 'text-emerald-700' : 'text-rose-700'}`}>
        {aprovando ? 'Aprovar pedido' : 'Não aprovar pedido'} — quem decidiu (gestor regional ou nacional)
      </div>
      <input
        value={painel.busca}
        onChange={(e) => d.setDecidindo({ ...painel, busca: e.target.value })}
        placeholder="Buscar gestor…"
        className="mt-2 w-full max-w-sm rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm"
      />
      <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-conecta-primary/10 divide-y divide-conecta-primary/8">
        {gestores
          .filter((g) => !painel.busca.trim() || `${g.nome} ${g.funcao}`.toLowerCase().includes(painel.busca.trim().toLowerCase()))
          .map((g) => (
            <label key={g.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={painel.gestores.includes(g.id)} onChange={() => d.alternarGestor(g.id)} className="accent-conecta-accent" />
              <span className="font-semibold text-conecta-primary">{g.nome}</span>
              <span className="text-[12px] text-conecta-muted">{g.funcao}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.escopo === 'Nacional' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'}`}>{g.escopo}</span>
            </label>
          ))}
        {gestores.length === 0 && <p className="px-3 py-3 text-sm text-conecta-muted">Nenhum gestor regional ou nacional encontrado no QLP.</p>}
      </div>
      <p className="mt-1 text-[11px] text-conecta-muted">{painel.gestores.length} selecionado(s) — pode marcar mais de um.</p>

      {!aprovando && (
        <label className="mt-3 block">
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-rose-700 font-semibold">Motivo da não aprovação (obrigatório)</span>
          <textarea
            value={painel.motivo}
            onChange={(e) => d.setDecidindo({ ...painel, motivo: e.target.value })}
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
          disabled={d.pendente || painel.gestores.length === 0 || (!aprovando && painel.motivo.trim().length < 5)}
          onClick={() => d.decidir(painel.id, painel.decisao, painel.motivo, painel.gestores)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] text-white hover:brightness-110 disabled:opacity-50 ${aprovando ? 'bg-emerald-600' : 'bg-rose-600'}`}
        >
          {d.pendente && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {aprovando ? 'Confirmar aprovação' : 'Confirmar não aprovação'}
        </button>
        <button type="button" onClick={() => d.setDecidindo(null)} className="text-sm text-conecta-muted underline underline-offset-2 hover:text-conecta-accent">Cancelar</button>
      </div>
    </div>
  );
}
