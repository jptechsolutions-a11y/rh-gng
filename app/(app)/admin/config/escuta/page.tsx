import { requireSession } from '@/lib/auth/session';
import { carregarRoteiro, carregarPilares } from '@/lib/escuta/data';
import { EscutaHeader } from '@/components/escuta/EscutaHeader';
import { ConfigEscutaForm } from './ConfigEscutaForm';

export const dynamic = 'force-dynamic';

export default async function ConfigEscutaPage() {
  await requireSession('admin');
  const [roteiro, pilares] = await Promise.all([carregarRoteiro(), carregarPilares()]);
  return (
    <div className="space-y-5 p-4 lg:p-6">
      <EscutaHeader subtitulo="Configuração · Roteiro e Pilares" />
      <ConfigEscutaForm roteiroInicial={roteiro} pilaresIniciais={pilares} />
    </div>
  );
}
