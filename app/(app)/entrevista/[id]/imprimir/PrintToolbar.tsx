'use client';

import Link from 'next/link';
import { Download, Printer, ArrowLeft, Lock } from 'lucide-react';
import { EditarDecisaoButton } from '@/app/(app)/historico/EditarDecisaoButton';

type EntrevistaResumo = {
  id: string;
  nome: string;
  status: string;
  gestorAprovador: string | null;
  motivoDecisao: string | null;
  dataRetorno: string | Date | null;
  aprovadoPeloGg: boolean | null;
};

export function PrintToolbar({ id, entrevista, podeEditarDecisao = true }: { id: string; entrevista: EntrevistaResumo; podeEditarDecisao?: boolean }) {
  return (
    <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-10">
      <Link href="/historico" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-perlog-slate bg-slate-100">
        <Lock className="h-3 w-3" /> Entrevista bloqueada para edição
      </span>
      <div className="flex-1" />
      {podeEditarDecisao && (
        <EditarDecisaoButton
          entrevistaId={entrevista.id}
          candidatoNome={entrevista.nome}
          status={entrevista.status}
          gestorAprovador={entrevista.gestorAprovador}
          motivoDecisao={entrevista.motivoDecisao}
          dataRetorno={entrevista.dataRetorno}
          aprovadoPeloGg={entrevista.aprovadoPeloGg}
        />
      )}
      <a
        href={`/api/entrevista/${id}/docx`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-slate-200 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" /> Baixar Word (.docx)
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90"
      >
        <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
      </button>
    </div>
  );
}
