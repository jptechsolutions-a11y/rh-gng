import { ConectaSymbol } from '@/components/brand/ConectaSymbol';
import { HomeButton } from '@/components/layout/HomeButton';

export function EscutaHeader({
  subtitulo = 'Gente e Gestão · Perlog',
}: { subtitulo?: string }) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-conecta-primary text-white px-6 py-5">
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)' }}
      />
      <div className="flex items-center gap-4">
        <ConectaSymbol className="w-10 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
            Escuta <span className="text-conecta-accent">G&amp;G</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-[2px] w-6 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-white/75">
              {subtitulo}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <HomeButton variant="onDark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/perlog-logo.png"
            alt=""
            className="h-8 w-auto opacity-90 hidden sm:block"
          />
        </div>
      </div>
    </header>
  );
}
