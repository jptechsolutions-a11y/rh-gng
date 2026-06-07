import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60 focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-perlog-orange text-white hover:bg-perlog-orangeDark shadow-sm',
        navy: 'bg-perlog-navy text-white hover:bg-perlog-navyDark shadow-sm',
        outline: 'border border-slate-200 bg-white text-perlog-navy hover:bg-slate-50',
        ghost: 'text-perlog-slate hover:bg-slate-100 hover:text-perlog-navy',
        destructive: 'bg-destructive text-white hover:bg-red-700',
        link: 'text-perlog-orange underline-offset-4 hover:underline',
        // Conecta+ G&G — CTA principal com gradiente brand. Substitui .conecta-btn-primary.
        conecta:
          'rounded-xl font-display font-semibold tracking-wide text-white bg-[linear-gradient(135deg,#E8621A_0%,#FF8C42_100%)] shadow-[0_8px_22px_-6px_rgba(232,98,26,0.55)] hover:-translate-y-px hover:shadow-[0_14px_30px_-8px_rgba(232,98,26,0.65)]',
        // Conecta+ G&G — versão "access" do CTA com pulse-glow.
        'conecta-access':
          'rounded-xl font-display font-semibold tracking-wide text-white bg-[linear-gradient(135deg,#E8621A_0%,#FF8C42_100%)] shadow-[0_8px_22px_-6px_rgba(232,98,26,0.55)] hover:-translate-y-px hover:shadow-[0_14px_30px_-8px_rgba(232,98,26,0.65)] animate-pulse-glow',
        // Conecta+ G&G — secundário/voltar com borda navy → accent no hover.
        'conecta-outline':
          'rounded-lg font-display border border-conecta-primary/15 bg-white text-conecta-primary hover:border-conecta-accent/40 hover:text-conecta-accent hover:bg-conecta-accent/5',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
        // Tamanho default dos CTAs Conecta (px-6 py-3, sem h fixo).
        conecta: 'px-6 py-3',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { buttonVariants };
