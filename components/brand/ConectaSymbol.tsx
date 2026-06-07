import { cn } from '@/lib/cn';

/**
 * Símbolo Conecta+ G&G — duas figuras-balão (azul e laranja) e o "+" acima,
 * reproduzindo a marca usada na capa do projeto.
 */
export function ConectaSymbol({ className, id }: { className?: string; id?: string }) {
  return (
    <svg
      id={id}
      viewBox="0 0 220 220"
      className={cn('h-auto w-44', className)}
      role="img"
      aria-label="Conecta+ G&G"
    >
      {/* Figura azul (esquerda) */}
      <g fill="#0D2B6B">
        {/* cabeça */}
        <circle cx="68" cy="46" r="22" />
        {/* corpo balão com cauda para baixo-esquerda */}
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
      <g fill="#E8621A">
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

      {/* "+" laranja flutuante */}
      <g fill="#E8621A">
        <rect x="186" y="6" width="6" height="26" rx="2" />
        <rect x="176" y="16" width="26" height="6" rx="2" />
      </g>
    </svg>
  );
}
