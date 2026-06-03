'use client';

import { LogOut } from 'lucide-react';
import { logoutAction } from '@/actions/auth';

export function LogoutButton() {
  return (
    <form
      action={logoutAction}
      onSubmit={(e) => {
        if (!confirm('Deseja realmente sair? Será necessário fazer login novamente.')) e.preventDefault();
      }}
    >
      <button
        type="submit"
        title="Sair"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-perlog-slate hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-red-200 transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sair
      </button>
    </form>
  );
}
