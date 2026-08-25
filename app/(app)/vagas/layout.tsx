import { requireSession } from '@/lib/auth/session';

export default async function VagasLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <>{children}</>;
}
