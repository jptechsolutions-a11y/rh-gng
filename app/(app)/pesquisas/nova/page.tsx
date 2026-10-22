import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { PesquisaBuilder } from '@/components/pesquisas/PesquisaBuilder';

export const dynamic = 'force-dynamic';

export default async function NovaPesquisaPage() {
  await requireSession('admin');
  return (
    <>
      <TopBar titulo="Pesquisas — Nova" subtitulo="Defina as perguntas e gere o link público" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <PesquisaBuilder />
      </div>
    </>
  );
}
