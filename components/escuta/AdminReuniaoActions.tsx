'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { excluirReuniao } from '@/actions/escuta';

type Props = {
  reuniaoId: string;
  /** Para onde voltar após excluir. */
  redirectApos?: string;
  /** Variante compacta usada em linhas de tabela. */
  compact?: boolean;
};

export function AdminReuniaoActions({ reuniaoId, redirectApos, compact = false }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function excluir() {
    if (!confirmando) {
      setConfirmando(true);
      window.setTimeout(() => setConfirmando(false), 4000);
      return;
    }
    start(async () => {
      try {
        await excluirReuniao(reuniaoId);
        toast.success('Reunião excluída');
        if (redirectApos) router.push(redirectApos);
        else router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
      }
    });
  }

  const baseCls = compact
    ? 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors'
    : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors';

  return (
    <div className={`inline-flex gap-1.5 ${compact ? '' : 'flex-wrap'}`}>
      <Link
        href={`/escuta/${reuniaoId}/editar`}
        title="Editar reunião"
        className={`${baseCls} border-conecta-primary/15 text-conecta-primary bg-white hover:border-conecta-accent/40 hover:text-conecta-accent`}
      >
        <Pencil className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {compact ? '' : 'Editar'}
      </Link>
      <button
        type="button"
        onClick={excluir}
        disabled={pending}
        title={confirmando ? 'Clique novamente para confirmar' : 'Excluir reunião'}
        className={`${baseCls} ${
          confirmando
            ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
            : 'border-red-200 text-red-700 bg-white hover:bg-red-50'
        } disabled:opacity-60`}
      >
        {pending ? (
          <Loader2 className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} animate-spin`} />
        ) : (
          <Trash2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        )}
        {compact ? '' : (confirmando ? 'Confirmar?' : 'Excluir')}
      </button>
    </div>
  );
}
