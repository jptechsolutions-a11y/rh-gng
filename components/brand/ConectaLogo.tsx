import { cn } from '@/lib/cn';

type Props = {
  className?: string;
  variant?: 'full' | 'compact' | 'mark' | 'mono';
  withSubtitle?: boolean;
};

/**
 * Marca Conecta G&G — usa o MESMO símbolo de duas figuras-balão
 * (azul + laranja) da capa do projeto (idêntico ao <ConectaSymbol />),
 * em escala compacta para uso em sidebar / topbar.
 */
export function ConectaLogo({ className, variant = 'full', withSubtitle = true }: Props) {
  if (variant === 'mark') {
    return <Mark className={cn('h-10 w-10', className)} mono={false} />;
  }

  const txtPrimary = variant === 'mono' ? '#FFFFFF' : '#0D2B6B';
  const txtAccent = variant === 'mono' ? '#FF8C42' : '#E8621A';
  const subtitleColor =
    variant === 'mono' ? 'rgba(255,255,255,0.65)' : 'rgba(13,43,107,0.55)';

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <Mark className="h-10 w-10 shrink-0" mono={variant === 'mono'} />
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1 font-display font-extrabold tracking-tight">
          <span className="text-[22px]" style={{ color: txtPrimary }}>Conecta</span>
          <span className="text-[22px]" style={{ color: txtAccent }}>G&amp;G</span>
          <span className="text-[18px] -ml-0.5" style={{ color: txtAccent }}>+</span>
        </div>
        {withSubtitle && (
          <span
            className="mt-1 text-[10px] uppercase tracking-[0.32em]"
            style={{ color: subtitleColor }}
          >
            Perlog · Gente &amp; Gestão
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Símbolo compacto: duas figuras-balão (mesma geometria do ConectaSymbol).
 * No mono=true, a figura "azul" usa branco para contrastar em fundos escuros.
 */
function Mark({ className, mono }: { className?: string; mono: boolean }) {
  const blue = mono ? '#FFFFFF' : '#0D2B6B';
  const orange = mono ? '#FF8C42' : '#E8621A';
  return (
    <svg viewBox="0 0 220 220" className={className} role="img" aria-label="Conecta+ G&G">
      {/* Figura azul/branco (esquerda) */}
      <g fill={blue}>
        <circle cx="68" cy="46" r="22" />
        <path
          d="M30 86
             C30 76 38 68 48 68
             H100
             C110 68 118 76 118 86
             V148
             C118 158 110 166 100 166
             H78
             L60 188
             L62 166
             H48
             C38 166 30 158 30 148
             Z"
        />
      </g>
      {/* Figura laranja (direita) */}
      <g fill={orange}>
        <circle cx="152" cy="46" r="22" />
        <path
          d="M122 86
             C122 76 130 68 140 68
             H192
             C202 68 210 76 210 86
             V148
             C210 158 202 166 192 166
             H178
             L180 188
             L162 166
             H140
             C130 166 122 158 122 148
             Z"
        />
      </g>
      {/* "+" laranja */}
      <g fill={orange}>
        <rect x="186" y="6" width="6" height="26" rx="2" />
        <rect x="176" y="16" width="26" height="6" rx="2" />
      </g>
    </svg>
  );
}
