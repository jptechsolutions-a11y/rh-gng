'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Settings, LogOut, ShieldCheck, ClipboardList } from 'lucide-react';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { cn } from '@/lib/cn';
import { logoutAction } from '@/actions/auth';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const FILIAL_NAV: NavItem[] = [
  { href: '/painel',          label: 'Painel',          icon: LayoutDashboard },
  { href: '/entrevista/nova', label: 'Nova entrevista', icon: ClipboardList },
  { href: '/banco-talentos',  label: 'Banco de talentos', icon: Users },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin',           label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/admin/busca',     label: 'Busca global',    icon: Users },
  { href: '/admin/relatorios', label: 'Relatórios',     icon: FileText },
  { href: '/admin/config',    label: 'Configuração',    icon: Settings },
  { href: '/admin/seguranca', label: 'Segurança',       icon: ShieldCheck },
];

export function Sidebar({
  perfil, nome, subtitulo,
}: { perfil: 'filial' | 'admin'; nome: string; subtitulo: string }) {
  const pathname = usePathname();
  const nav = perfil === 'admin' ? ADMIN_NAV : FILIAL_NAV;

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-perlog-navy text-white">
      <div className="px-6 py-6 border-b border-white/10">
        <PerlogLogo className="h-8 w-auto" />
        <div className="mt-4 text-[11px] uppercase tracking-widest text-white/50">RH G&G</div>
        <div className="mt-0.5 text-sm font-semibold truncate">{nome}</div>
        <div className="text-xs text-white/60 truncate">{subtitulo}</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-perlog-orange/15 text-perlog-orange'
                  : 'text-white/75 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-perlog-orange" />}
            </Link>
          );
        })}
      </nav>

      <form action={logoutAction} className="p-3 border-t border-white/10">
        <button
          type="submit"
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </aside>
  );
}
