'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Pencil, Copy, Check, ExternalLink, Lock, UserRound, Power, Trash2 } from 'lucide-react';
import { ConectaCard } from '@/components/ui/conecta-card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { alterarStatusPesquisa, excluirPesquisa } from '@/actions/pesquisas/admin';

export interface PesquisaCardData {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  anonima: boolean;
  status: string;
  respondidas: number;
  alvo: number;
  criadaPorNome: string;
  createdAt: string;
}

export function PesquisaCard({ p }: { p: PesquisaCardData }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [copiado, setCopiado] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const pct = p.alvo > 0 ? Math.min(100, Math.round((p.respondidas / p.alvo) * 100)) : 0;
  const aberta = p.status === 'aberta';

  async function copiar() {
    const url = `${window.location.origin}/p/${p.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copie o link:', url);
    }
  }

  function alternar() {
    setErro(null);
    start(async () => {
      try {
        await alterarStatusPesquisa(p.id, aberta ? 'encerrada' : 'aberta');
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao alterar status');
      }
    });
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: 'Excluir pesquisa',
      descricao: `Excluir "${p.titulo}" e todas as ${p.respondidas} respostas? Isso não pode ser desfeito.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    start(async () => {
      try {
        await excluirPesquisa(p.id);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao excluir');
      }
    });
  }

  return (
    <ConectaCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[17px] font-extrabold text-conecta-primary leading-tight">{p.titulo}</h3>
          {p.descricao && <p className="text-[12px] text-conecta-muted mt-1">{p.descricao}</p>}
          <p className="text-[11px] text-conecta-muted mt-1">
            por {p.criadaPorNome} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-wide ${
            p.anonima
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-conecta-primary/5 border-conecta-primary/20 text-conecta-primary'
          }`}
        >
          {p.anonima ? <Lock className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
          {p.anonima ? 'Anônima' : 'Identificada'}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="font-display font-semibold text-conecta-primary tabular-nums">
            {p.respondidas} de {p.alvo} responderam
          </span>
          <span className="font-display font-bold text-conecta-accent tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 h-2.5 rounded-full bg-conecta-primary/8 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)' }}
          />
        </div>
      </div>

      {erro && <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-2 text-xs">{erro}</div>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/pesquisas/${p.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-primary text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110 transition"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Indicadores
        </Link>
        <a
          href={`/p/${p.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:brightness-110 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ir para pesquisa
        </a>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-conecta-primary/20 text-conecta-primary px-3 py-1.5 text-[11px] font-display font-semibold hover:bg-conecta-primary/5 transition"
        >
          {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copiado ? 'Link copiado' : 'Copiar link'}
        </button>
        <Link
          href={`/pesquisas/${p.id}/editar`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-conecta-primary/20 text-conecta-primary px-3 py-1.5 text-[11px] font-display font-semibold hover:bg-conecta-primary/5 transition"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
        <span className="flex-1" />
        <button
          type="button"
          disabled={pending}
          onClick={alternar}
          title={aberta ? 'Encerrar: o link para de aceitar respostas' : 'Reabrir pesquisa'}
          className="inline-flex items-center gap-1 rounded-lg border border-conecta-primary/15 text-conecta-muted px-2 py-1.5 text-[11px] font-display font-semibold hover:text-conecta-accent hover:border-conecta-accent/40 disabled:opacity-50 transition"
        >
          <Power className="h-3.5 w-3.5" />
          {aberta ? 'Encerrar' : 'Reabrir'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={excluir}
          title="Excluir pesquisa"
          className="inline-flex items-center rounded-lg border border-rose-200 text-rose-700 p-1.5 hover:bg-rose-50 disabled:opacity-50 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </ConectaCard>
  );
}
