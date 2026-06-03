import Link from 'next/link';
import { ClipboardList, History, BarChart3, Plus } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listarHistorico, statsHistorico } from '@/actions/avaliacao';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import type { Classificacao } from '@/lib/avaliacao/calculos';

export const dynamic = 'force-dynamic';

export default async function AvaliacaoHome() {
  await requireSession();
  const [stats, ultimas] = await Promise.all([
    statsHistorico(),
    listarHistorico({ perPage: 5 }),
  ]);
  return (
    <>
      <TopBar titulo="Avaliação de desempenho" subtitulo="Visão geral" />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <Link href="/avaliacao/nova">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Nova avaliação
            </Button>
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-perlog-slate">Total de avaliações</p>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-perlog-slate">Média geral</p>
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
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/avaliacao/nova">
            <Card className="h-full transition-shadow hover:shadow-elev">
              <CardContent className="flex items-center gap-3 pt-6">
                <ClipboardList className="h-5 w-5 text-perlog-orange" />
                <div>
                  <p className="font-medium">Nova avaliação</p>
                  <p className="text-xs text-perlog-slate">Wizard com as 6 competências</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/avaliacao/historico">
            <Card className="h-full transition-shadow hover:shadow-elev">
              <CardContent className="flex items-center gap-3 pt-6">
                <History className="h-5 w-5 text-perlog-orange" />
                <div>
                  <p className="font-medium">Histórico</p>
                  <p className="text-xs text-perlog-slate">Filtros + evolução</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/avaliacao/relatorios">
            <Card className="h-full transition-shadow hover:shadow-elev">
              <CardContent className="flex items-center gap-3 pt-6">
                <BarChart3 className="h-5 w-5 text-perlog-orange" />
                <div>
                  <p className="font-medium">Relatórios</p>
                  <p className="text-xs text-perlog-slate">Agregados por filial e competência</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="mb-3 text-base">Últimas avaliações</CardTitle>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-perlog-slate">
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Avaliado</th>
                  <th className="pb-2">Pontuação</th>
                  <th className="pb-2">Classificação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ultimas.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1 pr-2">{r.data_avaliacao}</td>
                    <td className="py-1 pr-2">{r.avaliado_nome}</td>
                    <td className="py-1 pr-2 font-semibold">
                      {Number(r.pontuacao_final ?? 0).toFixed(2)}
                    </td>
                    <td className="py-1 pr-2">
                      <ClassificacaoBadge
                        value={(r.classificacao ?? 'PRECISA MELHORAR') as Classificacao}
                      />
                    </td>
                    <td className="py-1">
                      <Link
                        className="text-perlog-orange underline"
                        href={`/avaliacao/${r.id}`}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ultimas.length === 0 && (
              <p className="py-4 text-center text-sm text-perlog-slate">
                Nenhuma avaliação ainda.{' '}
                <Link className="text-perlog-orange underline" href="/avaliacao/nova">
                  Crie a primeira
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
