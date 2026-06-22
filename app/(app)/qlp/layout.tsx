import { requireSession } from '@/lib/auth/session';

export default async function QlpLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <div className="p-6">{children}</div>;
}
