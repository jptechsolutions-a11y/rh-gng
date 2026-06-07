'use client';

// Captura erros que ocorrem no próprio root layout (raro). Precisa renderizar
// <html>/<body> porque substitui o layout raiz.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0D2B6B' }}>Erro inesperado</h1>
          <p style={{ marginTop: 8, color: '#6B7280', fontSize: 14 }}>
            A aplicação encontrou um problema. Recarregue a página.
          </p>
          {error.digest && (
            <p style={{ marginTop: 8, color: '#9aa3b2', fontSize: 11, fontFamily: 'monospace' }}>
              ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, background: '#E8621A', color: '#fff', border: 0, borderRadius: 12, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
