'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { ConectaLogo } from '@/components/brand/ConectaLogo';
import { ConectaSymbol } from '@/components/brand/ConectaSymbol';
import { cn } from '@/lib/cn';
import { logoutAction } from '@/actions/auth';
import {
  FILIAL_NAV, ADMIN_NAV, AVALIACAO_NAV_BASE, AVALIACAO_NAV_ADMIN_EXTRAS,
  ESCUTA_NAV_BASE, ESCUTA_NAV_ADMIN_EXTRAS,
  INDICADORES_NAV_BASE,
} from './nav-config';
import { useConfirm } from '@/components/ui/confirm-dialog';

const STORAGE_KEY = 'sidebar:collapsed';

export function Sidebar({
  perfil, nome, subtitulo,
}: { perfil: 'filial' | 'admin'; nome: string; subtitulo: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const inAvaliacao =
    pathname === '/avaliacao' ||
    pathname.startsWith('/avaliacao/') ||
    pathname.startsWith('/admin/config/pessoas') ||
    pathname.startsWith('/admin/config/competencias');
  const inEscuta =
    pathname === '/escuta' ||
    pathname.startsWith('/escuta/') ||
    pathname.startsWith('/admin/config/escuta');
  const inIndicadores =
    pathname === '/indicadores' ||
    pathname.startsWith('/indicadores/');
  const nav = inIndicadores
    ? INDICADORES_NAV_BASE
    : inEscuta
      ? perfil === 'admin'
        ? [...ESCUTA_NAV_BASE, ...ESCUTA_NAV_ADMIN_EXTRAS]
        : ESCUTA_NAV_BASE
      : inAvaliacao
        ? perfil === 'admin'
          ? [...AVALIACAO_NAV_BASE, ...AVALIACAO_NAV_ADMIN_EXTRAS]
          : AVALIACAO_NAV_BASE
        : perfil === 'admin'
          ? ADMIN_NAV
          : FILIAL_NAV;
  const moduleLabel = inIndicadores
    ? 'Indicadores'
    : inEscuta
      ? 'Escuta G&G'
      : inAvaliacao
        ? 'Avaliação de Desempenho'
        : 'Conecta G&G';
  const [collapsed, setCollapsed] = useState(false);
  const confirmar = useConfirm();
  const [saindo, startSair] = useTransition();

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

  const sair = async () => {
    const ok = await confirmar({
      titulo: 'Sair do sistema',
      descricao: 'Será necessário fazer login novamente.',
      confirmLabel: 'Sair',
    });
    if (ok) startSair(async () => { await logoutAction(); });
  };

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col text-white transition-[width] duration-200 ease-out shrink-0 relative overflow-hidden',
        collapsed ? 'w-16' : 'w-64 lg:w-72',
      )}
    >
      {/* Azul Conecta forte e sólido — sem gradient/animação */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{ background: '#0D2B6B' }}
      />

      {/* Linha vertical laranja na borda direita */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[2px] z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(232,98,26,0) 0%, #E8621A 18%, #E8621A 82%, rgba(232,98,26,0) 100%)',
        }}
      />

      {/* Dashes decorativos no topo */}
      {!collapsed && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5" aria-hidden>
          <span className="block h-[3px] w-10 rounded-full bg-conecta-accent" />
          <span className="block h-[3px] w-6 rounded-full bg-conecta-accent/65" />
          <span className="block h-[3px] w-3 rounded-full bg-conecta-accent/35" />
        </div>
      )}

      {/* ===== Cabeçalho ===== */}
      <div className={cn('relative z-10 border-b border-white/10', collapsed ? 'px-2 py-4' : 'px-5 pt-12 pb-5')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          {collapsed ? (
            <ConectaSymbol className="w-8 h-auto" />
          ) : (
            <ConectaLogo variant="mono" withSubtitle className="scale-90 origin-left" />
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir' : 'Recolher'}
            className="grid place-items-center h-8 w-8 rounded-md text-white/70 hover:text-conecta-accent hover:bg-white/10 transition-colors shrink-0"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-5 flex items-center gap-2">
            <span className="h-[2px] w-6 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
              {moduleLabel}
            </span>
          </div>
        )}

        {!collapsed && (
          <>
            <div className="mt-3 text-sm font-display font-semibold text-white truncate">
              {nome}
            </div>
            <div className="text-[11px] text-white/55 truncate">{subtitulo}</div>
          </>
        )}
      </div>

      {/* ===== Navegação ===== */}
      <nav className={cn('relative z-10 flex-1 py-4 space-y-0.5 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
        {nav.map(({ href, label, icon: Icon }) => {
          const isRoot = href === '/admin' || href === '/painel' || href === '/avaliacao';
          const [hrefPath, hrefQuery] = href.split('?');
          const defaultTab = hrefPath === '/indicadores' ? 'banco-horas' : 'roteiro';
          let active: boolean;
          if (hrefQuery) {
            // Item da sidebar usa query (?tab=...): ativo só se a tab atual bate.
            const tabValue = new URLSearchParams(hrefQuery).get('tab');
            active = pathname === hrefPath && (currentTab ?? defaultTab) === tabValue;
          } else if (isRoot) {
            active = pathname === hrefPath;
          } else if (hrefPath === '/escuta') {
            // /escuta sem query nunca aparece na nav atual, mas mantemos o caso por segurança.
            active = pathname === '/escuta' && !currentTab;
          } else {
            active = pathname === hrefPath || pathname.startsWith(hrefPath + '/');
          }
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center rounded-lg text-sm font-display transition-all duration-200',
                collapsed ? 'justify-center px-0 py-2 h-10' : 'gap-3 px-3 py-2.5',
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
                  active
                    ? 'text-conecta-accent'
                    : 'text-white/55 group-hover:text-conecta-accent',
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-conecta-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ===== Tagline ===== */}
      {!collapsed && (
        <div className="relative z-10 px-5 pb-2">
          <div className="flex items-center gap-2 mb-3 opacity-80">
            <span className="h-[2px] w-5 bg-conecta-accent" />
            <span className="font-display text-[9px] uppercase tracking-[0.3em] text-white/60">
              Escuta que conecta · Diálogo que transforma
            </span>
          </div>
        </div>
      )}

      {/* ===== Sair ===== */}
      {!inAvaliacao && (
        <div className={cn('relative z-10 border-t border-white/10', collapsed ? 'p-2' : 'p-3')}>
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            title={collapsed ? 'Sair' : undefined}
            className={cn(
              'w-full flex items-center rounded-lg text-sm font-display text-white/70 hover:bg-conecta-accent/15 hover:text-conecta-accent transition-colors disabled:opacity-60',
              collapsed ? 'justify-center px-0 py-2 h-10' : 'gap-3 px-3 py-2',
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
