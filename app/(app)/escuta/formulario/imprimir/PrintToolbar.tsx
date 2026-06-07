'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

export function PrintToolbar() {
  return (
    <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-10">
      <Link
        href="/escuta?tab=formulario"
        className="inline-flex items-center gap-2 text-sm text-conecta-muted hover:text-conecta-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-conecta-muted bg-slate-100">
        Formulário em branco para preenchimento manual
      </span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90"
      >
        <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
      </button>
    </div>
  );
}
