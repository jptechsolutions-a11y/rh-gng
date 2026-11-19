import { requireSession } from '@/lib/auth/session';

// Todos os perfis acessam; cada um enxerga/lança só nas filiais do seu escopo (ver filiaisPermitidas).
export default async function ComiteLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
