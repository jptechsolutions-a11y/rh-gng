import Link from 'next/link';
import { Home } from 'lucide-react';

// Botão "Início" — mesmo formato de pílula do LogoutButton ("Sair"). Fica ao lado
// de "Sair" na TopBar (todos os módulos com TopBar) e, na variante onDark, no
// cabeçalho escuro do módulo Escuta. Substitui o antigo item "Voltar ao início"
// que ficava na sidebar.
const VARIANTS = {
  light:
    'text-conecta-muted hover:text-conecta-accent hover:bg-conecta-accent/10 border-slate-200 hover:border-conecta-accent/30',
  onDark:
    'text-white/85 hover:text-white hover:bg-white/10 border-white/25 hover:border-white/45',
} as const;

export function HomeButton({ variant = 'light' }: { variant?: keyof typeof VARIANTS }) {
  return (
    <Link
      href="/inicio"
      title="Início"
      className={`inline-flex items-center gap-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border transition-colors ${VARIANTS[variant]}`}
    >
      <Home className="h-3.5 w-3.5" />
      Início
    </Link>
  );
}
