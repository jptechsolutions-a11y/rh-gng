'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Error boundary do segmento autenticado. Sem isto, qualquer exceção em
// render/Server Action cai no fallback cru do Next.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ponto de integração para Sentry/log estruturado (ver pendências).
    console.error('[app:error]', error);
  }, [error]);

  return (
    <div className="flex-1 grid place-items-center p-8">
      <div className="max-w-md w-full text-center rounded-2xl border border-conecta-primary/10 bg-white p-8 shadow-sm">
        <div className="mx-auto grid place-items-center h-14 w-14 rounded-xl bg-conecta-accent/10 text-conecta-accent">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-xl font-extrabold text-conecta-primary">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-conecta-muted">
          Não foi possível carregar esta tela. Você pode tentar novamente.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-conecta-muted/70 font-mono">ref: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="conecta-btn-primary mt-6 w-full justify-center text-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
