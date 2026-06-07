import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginExperience } from './LoginExperience';

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect('/inicio');

  return <LoginExperience />;
}
