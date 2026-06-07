import { cn } from '@/lib/cn';

/**
 * Padrão visual Conecta — card branco com tarja superior laranja sólida,
 * sombra azul sutil e bordas suaves. Use para englobar tabelas, formulários,
 * gráficos e qualquer painel interno do sistema.
 */
export function ConectaCard({
  children,
  className,
  noPadding = false,
  variant = 'orange',
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  /** Cor da tarja superior: laranja (padrão) ou azul. */
  variant?: 'orange' | 'navy';
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-white border border-conecta-primary/8',
        className,
      )}
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: variant === 'orange' ? '#E8621A' : '#0D2B6B',
        }}
      />
      <div className={noPadding ? '' : 'p-5 sm:p-6'}>{children}</div>
    </div>
  );
}

/**
 * Header de seção no padrão Conecta —
 *   ─── ÍCONE  TÍTULO em Poppins uppercase tracking
 * Aceita ação opcional à direita.
 */
export function SectionHeader({
  label,
  icon: Icon,
  action,
  className,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="h-[2px] w-8 bg-conecta-accent" />
      {Icon && <Icon className="h-3.5 w-3.5 text-conecta-accent shrink-0" />}
      <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
        {label}
      </span>
      <span className="flex-1 h-px bg-conecta-primary/8" />
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Page header padrão — substitui o `TopBar` quando a página quer um título
 * dentro do `ConectaCard` (ou abaixo do TopBar como subsection).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-[2px] w-6 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
              {eyebrow}
            </span>
          </div>
        )}
        <h1 className="font-display text-2xl lg:text-[28px] font-extrabold text-conecta-primary leading-tight tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-conecta-muted mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
