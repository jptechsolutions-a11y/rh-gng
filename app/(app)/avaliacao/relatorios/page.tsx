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
  const s = await requireSession();
  const [porFilial, porComp, top, bottom] = await Promise.all([
    relatorioPorFilial(),
    relatorioPorCompetencia(),
    relatorioRanking('top', 10),
    relatorioRanking('bottom', 10),
  ]);
  return (
    <>
      <TopBar
        titulo="Relatórios"
        subtitulo={s.perfil === 'filial' ? s.filialNome : 'Avaliação de desempenho'}
        badge={s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN'}
      />
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
