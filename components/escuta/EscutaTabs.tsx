'use client';
import Link from 'next/link';
import { BookOpen, Printer, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

type TabKey = 'roteiro' | 'formulario' | 'percepcao';

const TABS: { key: TabKey; label: string; Icon: typeof BookOpen }[] = [
  { key: 'roteiro',    label: 'Roteiro',    Icon: BookOpen },
  { key: 'formulario', label: 'Formulário', Icon: Printer },
  { key: 'percepcao',  label: 'Percepção',  Icon: ClipboardCheck },
];

export function EscutaTabs({ active }: { active: TabKey }) {
  return (
    <nav
      role="tablist"
      aria-label="Abas Escuta G&G"
      className="flex gap-1 border-b border-conecta-primary/10 print:hidden"
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={`/escuta?tab=${key}`}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-display font-semibold transition-colors',
              'border-b-2 -mb-px',
              isActive
                ? 'text-conecta-primary border-conecta-accent'
                : 'text-conecta-muted hover:text-conecta-primary border-transparent',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function parseTab(value: string | undefined | null): TabKey {
  if (value === 'formulario' || value === 'percepcao') return value;
  return 'roteiro';
}
