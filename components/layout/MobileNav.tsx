'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { ConectaLogo } from '@/components/brand/ConectaLogo';
import { cn } from '@/lib/cn';
import { logoutAction } from '@/actions/auth';
import { FILIAL_NAV, ADMIN_NAV, VISUALIZADOR_NAV } from './nav-config';

export function MobileNav({ perfil, nome, subtitulo }: { perfil: 'filial' | 'admin' | 'visualizador'; nome: string; subtitulo: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = perfil === 'admin' ? ADMIN_NAV : perfil === 'visualizador' ? VISUALIZADOR_NAV : FILIAL_NAV;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-200 bg-white text-conecta-primary hover:border-conecta-accent/40 hover:text-conecta-accent transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-conecta-dark/55 backdrop-blur-sm animate-fade-in"
          />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col text-white shadow-elev animate-fade-in overflow-hidden">
            {/* Azul Conecta forte e sólido */}
            <div
              className="absolute inset-0 -z-10"
              aria-hidden
              style={{ background: '#0D2B6B' }}
            />
            {/* Linha lateral laranja */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-[2px] z-10"
              style={{
                background:
                  'linear-gradient(180deg, rgba(232,98,26,0) 0%, #E8621A 18%, #E8621A 82%, rgba(232,98,26,0) 100%)',
              }}
            />
            {/* Dashes topo */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5" aria-hidden>
              <span className="block h-[3px] w-10 rounded-full bg-conecta-accent" />
              <span className="block h-[3px] w-6 rounded-full bg-conecta-accent/65" />
              <span className="block h-[3px] w-3 rounded-full bg-conecta-accent/35" />
            </div>

            <div className="relative z-10 px-5 pt-12 pb-5 border-b border-white/10 flex items-start justify-between gap-2">
              <div>
                <ConectaLogo variant="mono" withSubtitle className="scale-90 origin-left" />
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-[2px] w-6 bg-conecta-accent" />
                  <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
                    Conecta G&G
                  </span>
                </div>
                <div className="mt-2 text-sm font-display font-semibold text-white truncate">
                  {nome}
                </div>
                <div className="text-[11px] text-white/55 truncate">{subtitulo}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-white/65 hover:text-conecta-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="relative z-10 flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {nav.map(({ href, label, icon: Icon }) => {
                const isRoot = href === '/admin' || href === '/painel';
                const active = isRoot ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-display transition-colors',
                      active
                        ? 'bg-conecta-accent/22 text-white font-semibold shadow-[inset_0_0_0_1px_rgba(232,98,26,0.3)]'
                        : 'text-white/72 hover:bg-white/[0.07] hover:text-white',
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                        style={{ background: '#E8621A' }}
                      />
                    )}
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors',
                        active ? 'text-conecta-accent' : 'text-white/55 group-hover:text-conecta-accent',
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative z-10 px-5 pb-2">
              <div className="flex items-center gap-2 mb-3 opacity-75">
                <span className="h-[2px] w-5 bg-conecta-accent" />
                <span className="font-display text-[9px] uppercase tracking-[0.3em] text-conecta-muted">
                  Escuta que conecta · Diálogo que transforma
                </span>
              </div>
            </div>

            <form action={logoutAction} className="relative z-10 p-3 border-t border-conecta-primary/10">
              <button
                type="submit"
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-display text-conecta-muted hover:bg-conecta-accent/10 hover:text-conecta-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
