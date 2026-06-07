import { requireSession } from '@/lib/auth/session';
import { carregarFormularioNovaAvaliacao } from '@/actions/avaliacao';
import { NovaAvaliacaoWizard } from './NovaAvaliacaoWizard';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function NovaAvaliacaoPage() {
  const s = await requireSession();
  const competencias = await carregarFormularioNovaAvaliacao();
  return (
    <>
      <TopBar
        titulo="Nova avaliação"
        subtitulo={s.perfil === 'filial' ? s.filialNome : 'Avaliação de desempenho'}
        badge={s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN'}
      />
      <div className="space-y-6 p-6">
        <NovaAvaliacaoWizard competencias={competencias} />
      </div>
    </>
  );
}
