import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');

  const nome = s.perfil === 'filial' ? s.filialNome : (s.nome ?? 'Administrador');
  const sub  = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : `@${s.usuario}`;

  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={s.perfil} nome={nome} subtitulo={sub} />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
