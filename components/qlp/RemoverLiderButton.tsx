'use client';

import { useTransition } from 'react';
import { removerLider } from '@/actions/qlp/lideres';

export function RemoverLiderButton({ liderId, nome }: { liderId: string; nome: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm(`Remover ${nome} da posição de líder? Os vínculos do time dele serão quebrados.`)) return;
    start(async () => {
      await removerLider(liderId);
      location.reload();
    });
  }
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition"
    >
      {pending ? '…' : 'Remover'}
    </button>
  );
}
