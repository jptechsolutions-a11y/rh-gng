'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, Users, FileText, Settings, LogOut, ShieldCheck, ClipboardList } from 'lucide-react';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { cn } from '@/lib/cn';
import { logoutAction } from '@/actions/auth';

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const FILIAL_NAV: Item[] = [
  { href: '/painel',          label: 'Painel',          icon: LayoutDashboard },
  { href: '/entrevista/nova', label: 'Nova entrevista', icon: ClipboardList },
  { href: '/banco-talentos',  label: 'Banco de talentos', icon: Users },
];
const ADMIN_NAV: Item[] = [
  { href: '/admin',            label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/busca',      label: 'Busca global', icon: Users },
  { href: '/admin/relatorios', label: 'Relatórios',   icon: FileText },
  { href: '/admin/config',     label: 'Configuração', icon: Settings },
  { href: '/admin/seguranca',  label: 'Segurança',    icon: ShieldCheck },
];

export function MobileNav({ perfil, nome, subtitulo }: { perfil: 'filial' | 'admin'; nome: string; subtitulo: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = perfil === 'admin' ? ADMIN_NAV : FILIAL_NAV;

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
        className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-200 bg-white text-perlog-navy"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-perlog-navyDark/60 backdrop-blur-sm animate-fade-in"
          />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col bg-perlog-navy text-white shadow-elev animate-fade-in">
            <div className="px-6 py-6 border-b border-white/10 flex items-start justify-between">
              <div>
                <PerlogLogo className="h-8 w-auto" />
                <div className="mt-3 text-[11px] uppercase tracking-widest text-white/50">RH G&G</div>
                <div className="mt-0.5 text-sm font-semibold truncate">{nome}</div>
                <div className="text-xs text-white/60 truncate">{subtitulo}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {nav.map(({ href, label, icon: Icon }) => {
                const isRoot = href === '/admin' || href === '/painel';
                const active = isRoot ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      active ? 'bg-perlog-orange/15 text-perlog-orange' : 'text-white/75 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <form action={logoutAction} className="p-3 border-t border-white/10">
              <button
                type="submit"
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4" />Sair
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
