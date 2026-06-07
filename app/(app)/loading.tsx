// Skeleton exibido enquanto a página (force-dynamic) é renderizada no servidor.
// Evita a tela "parada/branca" durante a navegação entre módulos.
export default function Loading() {
  return (
    <div className="flex flex-col flex-1" aria-busy="true" aria-live="polite">
      {/* TopBar fantasma */}
      <div className="sticky top-0 z-10 bg-white/85 px-6 py-4 border-b border-conecta-primary/8">
        <div className="h-5 w-56 rounded bg-slate-200/80 animate-pulse" />
        <div className="mt-2 h-3 w-40 rounded bg-slate-100 animate-pulse" />
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        {/* KPIs fantasma */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-conecta-primary/8 bg-white">
              <div className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-slate-200/80 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
                  <div className="h-6 w-12 rounded bg-slate-200/80 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bloco principal fantasma */}
        <div className="h-72 rounded-xl border border-conecta-primary/8 bg-white animate-pulse" />
      </div>
    </div>
  );
}
