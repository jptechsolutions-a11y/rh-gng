import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-perlog-orange/10 text-perlog-orange border border-perlog-orange/20',
        navy:    'bg-perlog-navy/10 text-perlog-navy border border-perlog-navy/20',
        green:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
        red:     'bg-red-50 text-red-700 border border-red-200',
        slate:   'bg-slate-100 text-slate-700 border border-slate-200',
        amber:   'bg-amber-50 text-amber-800 border border-amber-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function statusVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'Aprovado': return 'green';
    case 'Contratado': return 'green';
    case 'Reprovado': return 'red';
    case 'Banco de Talentos': return 'navy';
    case 'Em análise': return 'amber';
    default: return 'slate';
  }
}
