'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

/** Barra de ações da ata impressa (some na impressão). */
export function PrintBar({ mes }: { mes: string }) {
  return (
    <div className="print:hidden sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
      <Link href={`/comite/ata?mes=${mes}`} className="inline-flex items-center gap-1.5 text-sm text-conecta-muted hover:text-conecta-accent">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <button type="button" onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-conecta-accent px-4 py-2 text-[12px] font-display font-semibold uppercase tracking-[0.14em] text-white hover:brightness-110">
        <Printer className="h-4 w-4" /> Imprimir / salvar como PDF
      </button>
    </div>
  );
}
