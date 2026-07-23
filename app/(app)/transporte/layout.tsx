import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { hasModuleAccess } from '@/lib/modules/permissions';

export default async function TransporteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');
  if (!(await hasModuleAccess(s, 'transporte'))) redirect('/inicio');
  return <>{children}</>;
}
