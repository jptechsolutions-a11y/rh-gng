import { cn } from '@/lib/cn';

const base = 'h-6 w-6';

export function IconAcolher({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="17" r="5" />
      <circle cx="12" cy="20" r="3.5" />
      <circle cx="36" cy="20" r="3.5" />
      <path d="M14 35c0-5 4.5-9 10-9s10 4 10 9" />
      <path d="M4 36c0-3.5 3-6.5 8-6.5" />
      <path d="M44 36c0-3.5-3-6.5-8-6.5" />
    </svg>
  );
}

export function IconOuvir({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 16c0-3.5 2.5-6 6-6h18c3.5 0 6 2.5 6 6v14c0 3.5-2.5 6-6 6h-9l-8 6 2-6h-3c-3.5 0-6-2.5-6-6z" />
      <circle cx="18" cy="23" r="1.6" fill="currentColor" />
      <circle cx="24" cy="23" r="1.6" fill="currentColor" />
      <circle cx="30" cy="23" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function IconIdentificar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 7c-7 0-12 5-12 11 0 4 2 6.5 4 9 1.5 2 2 3 2 5v2h12v-2c0-2 .5-3 2-5 2-2.5 4-5 4-9 0-6-5-11-12-11z" />
      <path d="M20 38h8" />
      <path d="M22 42h4" />
      <path d="M24 13v6" />
      <path d="M24 23v3" />
    </svg>
  );
}

export function IconAgir({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="17" cy="13" r="4" />
      <circle cx="32" cy="13" r="4" />
      <path d="M11 35V25c0-3 2-5 5-5h2c3 0 5 2 5 5v10" />
      <path d="M26 35V25c0-3 2-5 5-5h2c3 0 5 2 5 5v10" />
      <path d="M8 40h32" />
    </svg>
  );
}
