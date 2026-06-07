import { requireSession } from '@/lib/auth/session';
import { carregarRoteiro, carregarPilares } from '@/lib/escuta/data';
import { TopBar } from '@/components/layout/TopBar';
import { EscutaTabs } from '@/components/escuta/EscutaTabs';
import { parseTab } from '@/components/escuta/escuta-tabs.shared';
import { RoteiroView } from '@/components/escuta/RoteiroView';
import { FormularioImpressao } from '@/components/escuta/FormularioImpressao';
import { PercepcaoForm } from '@/components/escuta/PercepcaoForm';

export const dynamic = 'force-dynamic';

export default async function EscutaPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requireSession();
  const { tab } = await searchParams;
  const active = parseTab(tab);

  const [roteiro, pilares] = await Promise.all([carregarRoteiro(), carregarPilares()]);

  const badge = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN';
  const subtitulo = s.perfil === 'filial' ? s.filialNome : 'Gente e Gestão · Perlog';

  return (
    <>
      <TopBar titulo="Escuta G&G" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
        <EscutaTabs active={active} />

        {active === 'roteiro' && <RoteiroView {...roteiro} />}
        {active === 'formulario' && <FormularioImpressao pilares={pilares} />}
        {active === 'percepcao' && <PercepcaoForm pilares={pilares} />}
      </div>
    </>
  );
}
