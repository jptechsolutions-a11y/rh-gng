import { Building2 } from 'lucide-react';
import { LogoutButton } from './LogoutButton';

export function TopBar({
  titulo,
  subtitulo,
  badge,
}: {
  titulo: string;
  subtitulo?: string;
  badge?: string;
}) {
  return (
    <header
      className="sticky top-0 z-10 bg-white/85 backdrop-blur px-6 py-4 flex items-center justify-between gap-3"
      style={{
        borderBottom: '1px solid rgba(13, 43, 107, 0.08)',
        boxShadow: '0 1px 12px -4px rgba(13, 43, 107, 0.08)',
      }}
    >
      <div className="min-w-0">
        <h1 className="font-display text-[20px] lg:text-[22px] font-extrabold text-conecta-primary tracking-tight truncate leading-tight">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-[13px] text-conecta-muted truncate mt-0.5">{subtitulo}</p>
        )}
      </div>

      {/* Faixa decorativa fininha azul→laranja */}
      <span
        aria-hidden
        className="hidden md:block absolute bottom-0 left-0 right-0 h-[2px] opacity-70"
        style={{
          background:
            'linear-gradient(90deg, rgba(13,43,107,0) 0%, rgba(13,43,107,0.25) 30%, rgba(232,98,26,0.35) 70%, rgba(232,98,26,0) 100%)',
        }}
      />

      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <div
            className="inline-flex items-center gap-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] text-conecta-primary px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(13, 43, 107, 0.06)',
              border: '1px solid rgba(13, 43, 107, 0.14)',
            }}
          >
            <Building2 className="h-3.5 w-3.5 text-conecta-accent" />
            {badge}
          </div>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
