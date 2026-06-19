import { requireSession } from '@/lib/auth/session';
import { getDadosBH } from '@/actions/indicadores/bh';
import { getDadosInconsist } from '@/actions/indicadores/inconsist';
import { getDadosCursos } from '@/actions/indicadores/cursos';
import { getDadosFeriados } from '@/actions/indicadores/feriados';
import { getRankings } from '@/actions/indicadores/rankings';
import { TopBar } from '@/components/layout/TopBar';
import { BancoHorasView } from './bh/BancoHorasView';
import { InconsistView } from './inconsist/InconsistView';
import { CursosView } from './cursos/CursosView';
import { FeriadosView } from './feriados/FeriadosView';
import { InicioView } from './inicio/InicioView';

export const dynamic = 'force-dynamic';

type Tab = 'inicio' | 'banco-horas' | 'inconsistencias' | 'cursos' | 'feriados';
function parseTab(v: string | undefined): Tab {
  if (v === 'banco-horas') return 'banco-horas';
  if (v === 'inconsistencias') return 'inconsistencias';
  if (v === 'cursos') return 'cursos';
  if (v === 'feriados') return 'feriados';
  return 'inicio';
}

export default async function IndicadoresPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requireSession();
  const { tab } = await searchParams;
  const active = parseTab(tab);

  const badge = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN';
  const subtitulo = s.perfil === 'filial' ? s.filialNome : 'Gente e Gestão · Perlog';

  const dadosInicio = active === 'inicio' ? await getRankings() : null;
  const dadosBH = active === 'banco-horas' ? await getDadosBH() : null;
  const dadosInc = active === 'inconsistencias' ? await getDadosInconsist() : null;
  const dadosCursos = active === 'cursos' ? await getDadosCursos() : null;
  const dadosFeriados = active === 'feriados' ? await getDadosFeriados() : null;

  return (
    <>
      <TopBar titulo="Indicadores" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
        {active === 'inicio' && dadosInicio && (
          <InicioView dados={dadosInicio} />
        )}
        {active === 'banco-horas' && dadosBH && (
          <BancoHorasView dados={dadosBH} perfil={s.perfil} />
        )}
        {active === 'inconsistencias' && dadosInc && (
          <InconsistView dados={dadosInc} perfil={s.perfil} />
        )}
        {active === 'cursos' && dadosCursos && (
          <CursosView dados={dadosCursos} perfil={s.perfil} />
        )}
        {active === 'feriados' && dadosFeriados && (
          <FeriadosView dados={dadosFeriados} perfil={s.perfil} />
        )}
      </div>
    </>
  );
}
