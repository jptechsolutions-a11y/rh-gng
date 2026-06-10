import { requireSession } from '@/lib/auth/session';
import { getDadosBH } from '@/actions/indicadores/bh';
import { TopBar } from '@/components/layout/TopBar';
import { BancoHorasView } from './bh/BancoHorasView';

export const dynamic = 'force-dynamic';

type Tab = 'banco-horas';
function parseTab(v: string | undefined): Tab {
  // Por enquanto só existe banco-horas; futuros indicadores entram aqui.
  return v === 'banco-horas' ? 'banco-horas' : 'banco-horas';
}

export default async function IndicadoresPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requireSession();
  const { tab } = await searchParams;
  const active = parseTab(tab);

  const badge = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN';
  const subtitulo = s.perfil === 'filial' ? s.filialNome : 'Gente e Gestão · Perlog';

  const dados = active === 'banco-horas' ? await getDadosBH() : null;

  return (
    <>
      <TopBar titulo="Indicadores" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
        {active === 'banco-horas' && dados && (
          <BancoHorasView dados={dados} perfil={s.perfil} />
        )}
      </div>
    </>
  );
}
