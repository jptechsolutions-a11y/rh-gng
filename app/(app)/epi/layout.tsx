import { requireSession } from '@/lib/auth/session';

export default async function EpiLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
