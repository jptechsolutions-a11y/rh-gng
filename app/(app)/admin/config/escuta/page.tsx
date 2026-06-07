import { requireSession } from '@/lib/auth/session';
import { carregarRoteiro, carregarPilares } from '@/lib/escuta/data';
import { TopBar } from '@/components/layout/TopBar';
import { ConfigEscutaForm } from './ConfigEscutaForm';

export const dynamic = 'force-dynamic';

export default async function ConfigEscutaPage() {
  await requireSession('admin');
  const [roteiro, pilares] = await Promise.all([carregarRoteiro(), carregarPilares()]);
  return (
    <>
      <TopBar titulo="Escuta G&G — Configuração" subtitulo="Roteiro e Pilares" badge="ADMIN" />
      <div className="space-y-5 p-4 lg:p-6">
        <ConfigEscutaForm roteiroInicial={roteiro} pilaresIniciais={pilares} />
      </div>
    </>
  );
}
