import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { PesquisaBuilder } from '@/components/pesquisas/PesquisaBuilder';
import { filiaisDisponiveisPesquisa } from '@/lib/pesquisas/filiais';

export const dynamic = 'force-dynamic';

export default async function NovaPesquisaPage() {
  await requireSession('admin');
  const filiaisDisponiveis = await filiaisDisponiveisPesquisa();
  return (
    <>
      <TopBar titulo="Pesquisas — Nova" subtitulo="Defina as perguntas e gere o link público" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <PesquisaBuilder filiaisDisponiveis={filiaisDisponiveis} />
      </div>
    </>
  );
}
