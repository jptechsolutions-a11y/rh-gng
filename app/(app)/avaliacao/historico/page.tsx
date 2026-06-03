import { requireSession } from '@/lib/auth/session';
import { listarHistorico, statsHistorico } from '@/actions/avaliacao';
import { HistoricoTable } from './HistoricoTable';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | undefined>;

export default async function Historico({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireSession();
  const sp = (await searchParams) ?? {};
  const [lista, stats] = await Promise.all([
    listarHistorico({
      classificacao: sp.classificacao,
      filialId: sp.filialId,
      dataInicio: sp.dataInicio,
      dataFim: sp.dataFim,
      nomeAvaliado: sp.nomeAvaliado,
      nomeGestor: sp.nomeGestor,
      evolucao: sp.evolucao as 'positiva' | 'negativa' | 'estavel' | 'primeira' | '' | undefined,
      page: Number(sp.page ?? 1),
    }),
    statsHistorico(),
  ]);
  return (
    <>
      <TopBar titulo="Histórico de avaliações" subtitulo="Avaliação de desempenho" />
      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-perlog-slate">Total</p>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-perlog-slate">Média</p>
              <p className="text-2xl font-bold">{stats?.media ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-perlog-slate">Excelentes</p>
              <p className="text-2xl font-bold text-emerald-600">{stats?.excelentes ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-perlog-slate">Precisam melhorar</p>
              <p className="text-2xl font-bold text-rose-600">{stats?.precisam_melhorar ?? 0}</p>
            </CardContent>
          </Card>
        </div>
        <HistoricoTable lista={lista} filtros={sp} />
      </div>
    </>
  );
}
