'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { importarBH, type ImportarBHResult } from '@/actions/indicadores/bh';

export function ImportarBHDialog() {
  const [open, setOpen] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ImportarBHResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    if (!arquivo) { toast.error('Selecione um arquivo'); return; }
    const fd = new FormData();
    fd.append('arquivo', arquivo);
    start(async () => {
      try {
        const r = await importarBH(fd);
        setResultado(r);
        toast.success(`Importado: ${r.inserted} colaboradores`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao importar');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setArquivo(null); setResultado(null); } }}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700">
          <Upload className="size-4" /> Importar BH
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border rounded-lg w-[min(560px,95vw)] p-5 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Importar Banco de Horas</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            Selecione a planilha (.xls ou .xlsx) no formato BH PERLOG. O snapshot atual virará o anterior.
          </Dialog.Description>

          <input
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

          {resultado && (
            <div className="mt-4 max-h-48 overflow-y-auto text-sm space-y-1 border rounded-md p-2">
              <div><b>{resultado.inserted}</b> linhas importadas.</div>
              {resultado.warnings.length > 0 && (
                <>
                  <div className="font-medium mt-2">Avisos ({resultado.warnings.length}):</div>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                    {resultado.warnings.slice(0, 50).map((w, i) => (
                      <li key={i}>{w.chapa ? `chapa ${w.chapa}: ` : w.linha ? `linha ${w.linha}: ` : ''}{w.motivo}</li>
                    ))}
                    {resultado.warnings.length > 50 && <li>… (+{resultado.warnings.length - 50} avisos)</li>}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-md border px-3 py-2 text-sm">Fechar</button>
            </Dialog.Close>
            <button
              onClick={submit}
              disabled={pending || !arquivo}
              className="rounded-md bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? 'Importando…' : 'Importar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
