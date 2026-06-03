import Link from 'next/link';
import { Plus, Search, Users, ClipboardList, TrendingUp, History, BookmarkCheck } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilial } from '@/actions/entrevistas';
import { PainelRecentesBusca, WeeklyChart } from './PainelClient';

export const dynamic = 'force-dynamic';

export default async function PainelPage() {
  const s = await requireSession('filial');
  const entrevistas = await listarEntrevistasFilial();

  const total = entrevistas.length;
  const ultimaSemana = entrevistas.filter((e) => e.dataHora.getTime() > Date.now() - 7 * 86400000).length;
  const aprovados = entrevistas.filter((e) => e.status === 'Aprovado' || e.status === 'Contratado').length;
  const bancoTalentos = entrevistas.filter((e) => e.status === 'Banco de Talentos').length;

  // Gráfico — entrevistas por semana (últimas 8)
  const chartData: Array<{ label: string; value: number; date: string }> = [];
  const now = Date.now();
  const fmtDM = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
  for (let i = 7; i >= 0; i--) {
    const inicio = now - (i + 1) * 7 * 86400000;
    const fim = now - i * 7 * 86400000;
    const count = entrevistas.filter((e) => e.dataHora.getTime() >= inicio && e.dataHora.getTime() < fim).length;
    const semanaLabel = i === 0 ? 'esta' : `−${i}s`;
    const ini = fmtDM.format(new Date(inicio));
    const f = fmtDM.format(new Date(fim - 86400000));
    chartData.push({ label: semanaLabel, value: count, date: `${ini}–${f}` });
  }

  return (
    <>
      <TopBar
        titulo={`Painel — ${s.filialNome}`}
        subtitulo="Visão geral das entrevistas da sua filial"
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} label="Total de entrevistas" value={total} />
          <StatCard icon={TrendingUp} label="Últimos 7 dias" value={ultimaSemana} />
          <StatCard icon={Users} label="Aprovados/Contratados" value={aprovados} />
          <StatCard icon={BookmarkCheck} label="Banco de talentos" value={bancoTalentos} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <CardDescription className="text-xs uppercase tracking-wider mb-2">Entrevistas por semana</CardDescription>
              <WeeklyChart data={chartData} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex flex-col gap-2">
              <CardDescription className="text-xs uppercase tracking-wider">Atalhos</CardDescription>
              <Button asChild className="w-full justify-start" size="sm">
                <Link href="/entrevista/nova"><Plus className="h-4 w-4" />Nova entrevista</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href="/historico"><History className="h-4 w-4" />Histórico</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href="/banco-talentos"><Search className="h-4 w-4" />Banco de talentos</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href="/agenda"><BookmarkCheck className="h-4 w-4" />Agenda de retornos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-perlog-slate">
            Entrevistas recentes
          </h2>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            {entrevistas.length === 0 ? (
              <div className="p-12 text-center text-perlog-slate">
                <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="font-medium text-perlog-navy">Nenhuma entrevista ainda</p>
                <p className="text-sm">Clique em &ldquo;Nova entrevista&rdquo; para começar.</p>
              </div>
            ) : (
              <PainelRecentesBusca entrevistas={entrevistas} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="grid place-items-center h-12 w-12 rounded-lg bg-perlog-orange/10 text-perlog-orange shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardDescription className="text-xs uppercase tracking-wider">{label}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        </div>
      </CardContent>
    </Card>
  );
}

