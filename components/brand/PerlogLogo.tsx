import { cn } from '@/lib/cn';

type Props = { className?: string; variant?: 'full' | 'mark' };

export function PerlogLogo({ className, variant = 'full' }: Props) {
  if (variant === 'mark') {
    return (
      <svg viewBox="0 0 64 64" className={cn('h-8 w-8', className)} role="img" aria-label="Perlog">
        <defs>
          <linearGradient id="pl-mark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F37021" />
            <stop offset="100%" stopColor="#FF8A3D" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#pl-mark)" />
        <path
          d="M18 44V20h12c5.5 0 9.5 3.6 9.5 8.8s-4 8.8-9.5 8.8h-6V44h-6Zm6-12h5.4c2.2 0 3.6-1.2 3.6-3.2s-1.4-3.2-3.6-3.2H24v6.4Z"
          fill="#fff"
        />
        <path d="M44 18l8 6-8 6v-4h-6v-4h6v-4Z" fill="#fff" opacity="0.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 56" className={cn('h-9 w-auto', className)} role="img" aria-label="Perlog">
      <defs>
        <linearGradient id="pl-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F37021" />
          <stop offset="100%" stopColor="#FF8A3D" />
        </linearGradient>
      </defs>
      <text
        x="0" y="42"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="44"
        fill="url(#pl-grad)"
        fontStyle="italic"
        letterSpacing="-1"
      >Perlog</text>
      <path
        d="M168 16 l24 12 l-24 12 v-7 h-12 v-10 h12 z"
        fill="url(#pl-grad)"
      />
    </svg>
  );
}
