import { requireSession } from '@/lib/auth/session';
import { carregarRoteiro, carregarPilares } from '@/lib/escuta/data';
import { EscutaHeader } from '@/components/escuta/EscutaHeader';
import { EscutaTabs, parseTab } from '@/components/escuta/EscutaTabs';
import { RoteiroView } from '@/components/escuta/RoteiroView';
import { FormularioImpressao } from '@/components/escuta/FormularioImpressao';
import { PercepcaoForm } from '@/components/escuta/PercepcaoForm';

export const dynamic = 'force-dynamic';

export default async function EscutaPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  await requireSession();
  const { tab } = await searchParams;
  const active = parseTab(tab);

  const [roteiro, pilares] = await Promise.all([carregarRoteiro(), carregarPilares()]);

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <EscutaHeader />
      <EscutaTabs active={active} />

      {active === 'roteiro' && <RoteiroView {...roteiro} />}
      {active === 'formulario' && <FormularioImpressao pilares={pilares} />}
      {active === 'percepcao' && <PercepcaoForm pilares={pilares} />}
    </div>
  );
}
