import { requireSession } from '@/lib/auth/session';
import { carregarFormularioNovaAvaliacao } from '@/actions/avaliacao';
import { NovaAvaliacaoWizard } from './NovaAvaliacaoWizard';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function NovaAvaliacaoPage() {
  await requireSession();
  const competencias = await carregarFormularioNovaAvaliacao();
  return (
    <>
      <TopBar titulo="Nova avaliação" subtitulo="Avaliação de desempenho" />
      <div className="space-y-6 p-6">
        <NovaAvaliacaoWizard competencias={competencias} />
      </div>
    </>
  );
}
