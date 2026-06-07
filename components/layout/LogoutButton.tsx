'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/actions/auth';
import { useConfirm } from '@/components/ui/confirm-dialog';

export function LogoutButton() {
  const confirmar = useConfirm();
  const [pending, start] = useTransition();

  const sair = async () => {
    const ok = await confirmar({
      titulo: 'Sair do sistema',
      descricao: 'Será necessário fazer login novamente.',
      confirmLabel: 'Sair',
    });
    if (ok) start(async () => { await logoutAction(); });
  };

  return (
    <button
      type="button"
      onClick={sair}
      disabled={pending}
      title="Sair"
      className="inline-flex items-center gap-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-muted hover:text-conecta-accent hover:bg-conecta-accent/10 px-3 py-1.5 rounded-full border border-slate-200 hover:border-conecta-accent/30 transition-colors disabled:opacity-60"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sair
    </button>
  );
}
