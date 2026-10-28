import { requireSession } from '@/lib/auth/session';

// Admin, visualizadores e filiais: cada um vê só o escopo de filiais dele (ver buscarIc).
export default async function IcLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
