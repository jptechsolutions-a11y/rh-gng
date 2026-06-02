import Link from 'next/link';
import { Plus, Search, Users, ClipboardList, TrendingUp } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilial } from '@/actions/entrevistas';

export const dynamic = 'force-dynamic';

export default async function PainelPage() {
  const s = await requireSession('filial');
  const entrevistas = await listarEntrevistasFilial();

  const total = entrevistas.length;
  const ultimaSemana = entrevistas.filter((e) => e.dataHora.getTime() > Date.now() - 7 * 86400000).length;
  const aprovados = entrevistas.filter((e) => e.status === 'Aprovado' || e.status === 'Contratado').length;
  const recentes = entrevistas.slice(0, 8);

  return (
    <>
      <TopBar
        titulo={`Painel — ${s.filialNome}`}
        subtitulo="Visão geral das entrevistas da sua filial"
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={ClipboardList} label="Total de entrevistas" value={total} />
          <StatCard icon={TrendingUp} label="Últimos 7 dias" value={ultimaSemana} />
          <StatCard icon={Users} label="Aprovados/Contratados" value={aprovados} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-perlog-slate">
            Entrevistas recentes
          </h2>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/banco-talentos"><Search className="h-4 w-4" />Banco de talentos</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/entrevista/nova"><Plus className="h-4 w-4" />Nova entrevista</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {recentes.length === 0 ? (
              <div className="p-12 text-center text-perlog-slate">
                <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="font-medium text-perlog-navy">Nenhuma entrevista ainda</p>
                <p className="text-sm">Clique em &ldquo;Nova entrevista&rdquo; para começar.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
                    <th scope="col" className="px-6 py-3 font-medium">Candidato</th>
                    <th scope="col" className="px-6 py-3 font-medium">Cargo</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/entrevista/${e.id}`} className="font-medium text-perlog-navy hover:text-perlog-orange">
                          {e.nome}
                        </Link>
                        <div className="text-xs text-perlog-slate">{maskCpf(e.cpf)}</div>
                      </td>
                      <td className="px-6 py-3 text-perlog-slate">{e.cargoPretendido ?? '—'}</td>
                      <td className="px-6 py-3"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                      <td className="px-6 py-3 text-perlog-slate">{formatDate(e.dataHora)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

function maskCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '');
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}
