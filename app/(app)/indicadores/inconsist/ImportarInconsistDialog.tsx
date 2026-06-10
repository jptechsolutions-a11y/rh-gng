'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { importarInconsist, type ImportarInconsistResult } from '@/actions/indicadores/inconsist';

export function ImportarInconsistDialog() {
  const [open, setOpen] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ImportarInconsistResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    if (!arquivo) { toast.error('Selecione um arquivo'); return; }
    const fd = new FormData();
    fd.append('arquivo', arquivo);
    start(async () => {
      try {
        const r = await importarInconsist(fd);
        setResultado(r);
        toast.success(`Importado: ${r.inserted} linhas`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao importar');
      }
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) { setArquivo(null); setResultado(null); } }}
    >
      <Dialog.Trigger asChild>
        <Button variant="conecta" size="conecta" className="text-sm">
          <Upload className="h-4 w-4" />
          Importar Inconsistências
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-conecta-primary/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(580px,95vw)] overflow-hidden rounded-xl bg-white border border-conecta-primary/10"
          style={{ boxShadow: '0 20px 60px -16px rgba(13,43,107,0.45)' }}
        >
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: '#E8621A' }}
          />
          <div className="p-6 pt-7">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-6 bg-conecta-accent" />
                <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
                  Inconsistências
                </span>
              </div>
              <Dialog.Close
                className="text-conecta-muted hover:text-conecta-primary transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <Dialog.Title className="font-display text-[20px] font-extrabold text-conecta-primary tracking-tight">
              Importar planilha
            </Dialog.Title>
            <Dialog.Description className="text-[13px] text-conecta-muted mt-1">
              Selecione o arquivo <span className="font-semibold">INCONSISTENCIAS PERLOG</span> (.xls ou .xlsx).
              A tabela atual será substituída integralmente.
            </Dialog.Description>

            <label className="mt-5 block">
              <span className="block font-display text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1.5">
                Arquivo
              </span>
              <input
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-conecta-text file:mr-3 file:rounded-lg file:border-0 file:bg-conecta-primary/8 file:px-3 file:py-2 file:font-display file:font-semibold file:text-conecta-primary file:text-xs file:uppercase file:tracking-[0.14em] hover:file:bg-conecta-accent/15 hover:file:text-conecta-accent transition"
              />
            </label>

            {resultado && (
              <div
                className="mt-5 rounded-lg border border-conecta-primary/10 p-3"
                style={{ background: 'rgba(13,43,107,0.04)' }}
              >
                <div className="font-display text-sm font-semibold text-conecta-primary">
                  <span className="text-conecta-accent">{resultado.inserted}</span> linhas importadas
                </div>
                {resultado.warnings.length > 0 && (
                  <div className="mt-2">
                    <div className="font-display text-[11px] uppercase tracking-[0.14em] text-conecta-muted mb-1">
                      Avisos ({resultado.warnings.length})
                    </div>
                    <ul className="text-xs text-conecta-muted space-y-0.5 max-h-40 overflow-y-auto list-disc pl-5">
                      {resultado.warnings.slice(0, 50).map((w, i) => (
                        <li key={i}>
                          {w.chapa ? `chapa ${w.chapa}: ` : w.linha ? `linha ${w.linha}: ` : ''}
                          {w.motivo}
                        </li>
                      ))}
                      {resultado.warnings.length > 50 && (
                        <li>… (+{resultado.warnings.length - 50} avisos)</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="conecta-outline">Fechar</Button>
              </Dialog.Close>
              <Button
                variant="conecta"
                onClick={submit}
                disabled={pending || !arquivo}
              >
                <Upload className="h-4 w-4" />
                {pending ? 'Importando…' : 'Importar'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
