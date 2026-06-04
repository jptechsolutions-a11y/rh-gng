import { requireSession } from '@/lib/auth/session';
import {
  relatorioPorFilial,
  relatorioPorCompetencia,
  relatorioRanking,
} from '@/actions/avaliacao';
import { RelatoriosCharts } from './RelatoriosChartsLazy';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function Relatorios() {
  await requireSession();
  const [porFilial, porComp, top, bottom] = await Promise.all([
    relatorioPorFilial(),
    relatorioPorCompetencia(),
    relatorioRanking('top', 10),
    relatorioRanking('bottom', 10),
  ]);
  return (
    <>
      <TopBar titulo="Relatórios" subtitulo="Avaliação de desempenho" />
      <div className="space-y-6 p-6">
        <RelatoriosCharts
          porFilial={porFilial}
          porComp={porComp}
          top={top}
          bottom={bottom}
        />
      </div>
    </>
  );
}
