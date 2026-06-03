'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Settings, LogOut, ShieldCheck, ClipboardList, History, CalendarClock,
  PanelLeftClose, PanelLeftOpen, Home, Target, Plus, BarChart3, UserCog, ArrowLeft,
} from 'lucide-react';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { cn } from '@/lib/cn';
import { logoutAction } from '@/actions/auth';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const FILIAL_NAV: NavItem[] = [
  { href: '/inicio',          label: 'Início',          icon: Home },
  { href: '/painel',          label: 'Painel',          icon: LayoutDashboard },
  { href: '/entrevista/nova', label: 'Nova entrevista', icon: ClipboardList },
  { href: '/historico',       label: 'Histórico',       icon: History },
  { href: '/agenda',          label: 'Agenda',          icon: CalendarClock },
  { href: '/banco-talentos',  label: 'Banco de talentos', icon: Users },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/inicio',          label: 'Início',          icon: Home },
  { href: '/admin',           label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/admin/busca',     label: 'Busca global',    icon: Users },
  { href: '/admin/relatorios', label: 'Relatórios',     icon: FileText },
  { href: '/admin/config',    label: 'Configuração',    icon: Settings },
  { href: '/admin/seguranca', label: 'Segurança',       icon: ShieldCheck },
];

const AVALIACAO_NAV_BASE: NavItem[] = [
  { href: '/inicio',                 label: 'Voltar ao início',       icon: ArrowLeft },
  { href: '/avaliacao',              label: 'Visão geral',            icon: LayoutDashboard },
  { href: '/avaliacao/nova',         label: 'Nova avaliação',         icon: Plus },
  { href: '/avaliacao/historico',    label: 'Histórico',              icon: History },
  { href: '/avaliacao/relatorios',   label: 'Relatórios',             icon: BarChart3 },
];
const AVALIACAO_NAV_ADMIN_EXTRAS: NavItem[] = [
  { href: '/admin/config/pessoas',       label: 'Pessoas',                icon: UserCog },
  { href: '/admin/config/competencias',  label: 'Competências e fatores', icon: Target },
];

const STORAGE_KEY = 'sidebar:collapsed';

export function Sidebar({
  perfil, nome, subtitulo,
}: { perfil: 'filial' | 'admin'; nome: string; subtitulo: string }) {
  const pathname = usePathname();
  const inAvaliacao =
    pathname === '/avaliacao' ||
    pathname.startsWith('/avaliacao/') ||
    pathname.startsWith('/admin/config/pessoas') ||
    pathname.startsWith('/admin/config/competencias');
  const nav = inAvaliacao
    ? perfil === 'admin'
      ? [...AVALIACAO_NAV_BASE, ...AVALIACAO_NAV_ADMIN_EXTRAS]
      : AVALIACAO_NAV_BASE
    : perfil === 'admin'
      ? ADMIN_NAV
      : FILIAL_NAV;
  const moduleLabel = inAvaliacao ? 'Avaliação de desempenho' : 'RH G&G';
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === '1') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col bg-perlog-navy text-white transition-[width] duration-200 ease-out shrink-0',
        collapsed ? 'w-16' : 'w-64 lg:w-72',
      )}
    >
      <div className={cn('border-b border-white/10', collapsed ? 'px-2 py-4' : 'px-6 py-6')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <PerlogLogo className="h-8 w-auto" />}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir' : 'Recolher'}
            className="grid place-items-center h-8 w-8 rounded-md text-white/70 hover:text-white hover:bg-white/10"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        {!collapsed && (
          <>
            <div className="mt-4 text-[11px] uppercase tracking-widest text-white/50">{moduleLabel}</div>
            <div className="mt-0.5 text-sm font-semibold truncate">{nome}</div>
            <div className="text-xs text-white/60 truncate">{subtitulo}</div>
          </>
        )}
      </div>

      <nav className={cn('flex-1 py-4 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {nav.map(({ href, label, icon: Icon }) => {
          const isRoot = href === '/admin' || href === '/painel' || href === '/avaliacao' || href === '/inicio';
          const active = isRoot ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm transition-colors',
                collapsed ? 'justify-center px-0 py-2 h-10' : 'gap-3 px-3 py-2',
                active
                  ? 'bg-perlog-orange/15 text-perlog-orange'
                  : 'text-white/75 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-perlog-orange" />}
            </Link>
          );
        })}
      </nav>

      <form
        action={logoutAction}
        onSubmit={(e) => { if (!confirm('Deseja realmente sair? Será necessário fazer login novamente.')) e.preventDefault(); }}
        className={cn('border-t border-white/10', collapsed ? 'p-2' : 'p-3')}
      >
        <button
          type="submit"
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'w-full flex items-center rounded-lg text-sm text-white/75 hover:bg-white/5 hover:text-white transition-colors',
            collapsed ? 'justify-center px-0 py-2 h-10' : 'gap-3 px-3 py-2',
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </button>
      </form>
    </aside>
  );
}
