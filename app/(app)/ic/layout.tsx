import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';

// O IC compara responsáveis entre filiais: acesso para admin e visualizadores (cada um no seu escopo).
export default async function IcLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  if (s.perfil === 'filial') redirect('/inicio');
  return children;
}
