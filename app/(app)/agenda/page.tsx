import Link from 'next/link';
import { CalendarClock, AlertTriangle, Calendar } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilial } from '@/actions/entrevistas';

export const dynamic = 'force-dynamic';

function isoDate(d: Date | string | null | undefined) {
  if (!d) return null;
  return new Date(d).toISOString().slice(0, 10);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function fmtDay(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default async function AgendaPage() {
  const s = await requireSession('filial');
  const all = await listarEntrevistasFilial();

  const hojeIni = startOfDay(new Date());

  // Apenas entrevistas com data de retorno definida E sem decisão final
  const pendentes = all.filter((e) =>
    e.dataRetorno &&
    e.status !== 'Aprovado' &&
    e.status !== 'Reprovado' &&
    e.status !== 'Contratado'
  );

  // Agrupa por dataRetorno (YYYY-MM-DD)
  const grupos = new Map<string, typeof pendentes>();
  for (const e of pendentes) {
    const key = isoDate(e.dataRetorno)!;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(e);
  }

  const dias = Array.from(grupos.keys()).sort();
  const atrasados = dias.filter((d) => new Date(d + 'T23:59:59').getTime() < hojeIni);
  const hoje = dias.filter((d) => {
    const ts = new Date(d + 'T12:00:00').getTime();
    return ts >= hojeIni && ts < hojeIni + 86400000;
  });
  const futuros = dias.filter((d) => new Date(d + 'T12:00:00').getTime() >= hojeIni + 86400000);

  return (
    <>
      <TopBar
        titulo="Agenda de retornos"
        subtitulo={`${pendentes.length} retorno(s) pendente(s)`}
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 space-y-6">
        {atrasados.length > 0 && (
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="p-5">
              <CardDescription className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Retornos atrasados
              </CardDescription>
              <Dias dias={atrasados} grupos={grupos} tone="red" />
            </CardContent>
          </Card>
        )}

        {hoje.length > 0 && (
          <Card className="border-perlog-orange/30 bg-perlog-orange/5">
            <CardContent className="p-5">
              <CardDescription className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-perlog-orange">
                <CalendarClock className="h-3.5 w-3.5" /> Para hoje
              </CardDescription>
              <Dias dias={hoje} grupos={grupos} tone="orange" />
            </CardContent>
          </Card>
        )}

        {futuros.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <CardDescription className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-perlog-slate">
                <Calendar className="h-3.5 w-3.5" /> Próximos dias
              </CardDescription>
              <Dias dias={futuros} grupos={grupos} tone="navy" />
            </CardContent>
          </Card>
        )}

        {pendentes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-perlog-slate">
              <Calendar className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="font-medium text-perlog-navy">Nenhum retorno pendente</p>
              <p className="text-sm">Quando você marcar uma data de retorno em uma entrevista, ela aparece aqui.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function Dias({ dias, grupos, tone }: {
  dias: string[];
  grupos: Map<string, Array<{
    id: string; nome: string; cargoPretendido: string | null; status: string; recrutador: string | null;
  }>>;
  tone: 'red' | 'orange' | 'navy';
}) {
  const dotMap = { red: 'bg-red-500', orange: 'bg-perlog-orange', navy: 'bg-perlog-navy' } as const;
  return (
    <ol className="space-y-3">
      {dias.map((dia) => (
        <li key={dia}>
          <div className="flex items-center gap-2 text-xs font-semibold text-perlog-navy uppercase mb-1">
            <span className={`h-2 w-2 rounded-full ${dotMap[tone]}`} />
            <span>{fmtDay(dia)}</span>
            <span className="text-perlog-slate font-normal normal-case">· {grupos.get(dia)!.length} candidato(s)</span>
          </div>
          <ul className="space-y-1 ml-4">
            {grupos.get(dia)!.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-slate-50">
                <Link href={`/entrevista/${e.id}`} className="font-medium text-perlog-navy hover:text-perlog-orange">
                  {e.nome}
                </Link>
                <span className="text-perlog-slate text-xs">· {e.cargoPretendido ?? '—'}</span>
                <span className="text-perlog-slate text-xs">· entrevistado por {e.recrutador ?? '—'}</span>
                <span className="ml-auto"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
