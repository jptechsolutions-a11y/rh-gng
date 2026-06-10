import { requireSession } from '@/lib/auth/session';
import { getDadosBH } from '@/actions/indicadores/bh';
import { IndicadoresTabs } from './IndicadoresTabs';

export const dynamic = 'force-dynamic';

export default async function IndicadoresPage() {
  const s = await requireSession();
  const dados = await getDadosBH();
  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Indicadores</h1>
      <IndicadoresTabs dados={dados} perfil={s.perfil} />
    </main>
  );
}
