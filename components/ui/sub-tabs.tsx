'use client';

import type { LucideIcon } from 'lucide-react';

export function SubTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: Array<{ id: T; label: string; icon?: LucideIcon }>;
}) {
  return (
    <div className="border-b border-conecta-primary/10">
      <div className="flex gap-1 -mb-px overflow-x-auto">
        {items.map(({ id, label, icon: Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-display font-semibold border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-conecta-accent text-conecta-accent'
                  : 'border-transparent text-conecta-muted hover:text-conecta-primary'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
