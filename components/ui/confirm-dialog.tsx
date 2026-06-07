'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';

export type ConfirmOptions = {
  titulo: string;
  descricao?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  perigo?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/** Substitui o `window.confirm()` nativo por um diálogo padronizado e acessível. */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    open: boolean;
    opts: ConfirmOptions;
    resolve?: (v: boolean) => void;
  }>({ open: false, opts: { titulo: '' } });

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => setState({ open: true, opts, resolve }));
  }, []);

  const close = React.useCallback((value: boolean) => {
    setState((s) => {
      s.resolve?.(value);
      return { ...s, open: false, resolve: undefined };
    });
  }, []);

  const { opts } = state;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root open={state.open} onOpenChange={(o) => { if (!o) close(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-conecta-dark/55 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[60] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-elev focus:outline-none data-[state=open]:animate-fade-in"
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${
                  opts.perigo ? 'bg-red-100 text-red-600' : 'bg-conecta-accent/10 text-conecta-accent'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="font-display text-lg font-extrabold text-conecta-primary">
                  {opts.titulo}
                </Dialog.Title>
                {opts.descricao && (
                  <Dialog.Description className="mt-1 text-sm text-conecta-muted">
                    {opts.descricao}
                  </Dialog.Description>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-display font-semibold text-conecta-muted hover:bg-slate-50 transition-colors"
              >
                {opts.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-display font-semibold text-white transition-colors ${
                  opts.perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-conecta-accent hover:bg-conecta-accentLight'
                }`}
              >
                {opts.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}
