import { requireSession } from '@/lib/auth/session';

// Admin, visualizadores e filiais: cada um vê só o escopo de filiais dele (ver buscarExperiencia).
export default async function ExperienciaLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
