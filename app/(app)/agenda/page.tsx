import Link from 'next/link';
import { CalendarClock, AlertTriangle, Calendar } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilialSlim } from '@/actions/entrevistas';

export const dynamic = 'force-dynamic';

function isoDate(d: Date | string | null | undefined) {
  if (!d) return null;
  return new Date(d).toISOString().slice(0, 10);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function fmtDay(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export default async function AgendaPage() {
  const s = await requireSession('filial');
  const all = await listarEntrevistasFilialSlim();

  const hojeIni = startOfDay(new Date());

  const pendentes = all.filter(
    (e) =>
      e.dataRetorno &&
      e.status !== 'Aprovado' &&
      e.status !== 'Reprovado' &&
      e.status !== 'Contratado',
  );

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

      <div className="p-6 space-y-5">
        {atrasados.length > 0 && (
          <ConectaCard
            className="border-red-200"
            variant="orange"
            noPadding
          >
            <div className="p-5 bg-red-50/50">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-[2px] w-8 bg-red-500" />
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span className="font-display text-[10px] uppercase tracking-[0.32em] text-red-700 font-semibold">
                  Retornos atrasados
                </span>
                <span className="flex-1 h-px bg-red-200" />
              </div>
              <Dias dias={atrasados} grupos={grupos} tone="red" />
            </div>
          </ConectaCard>
        )}

        {hoje.length > 0 && (
          <ConectaCard variant="orange" noPadding>
            <div className="p-5 bg-conecta-accent/5">
              <SectionHeader label="Para hoje" icon={CalendarClock} />
              <div className="mt-4">
                <Dias dias={hoje} grupos={grupos} tone="orange" />
              </div>
            </div>
          </ConectaCard>
        )}

        {futuros.length > 0 && (
          <ConectaCard variant="navy">
            <SectionHeader label="Próximos dias" icon={Calendar} />
            <div className="mt-4">
              <Dias dias={futuros} grupos={grupos} tone="navy" />
            </div>
          </ConectaCard>
        )}

        {pendentes.length === 0 && (
          <ConectaCard>
            <div className="py-10 text-center">
              <Calendar className="mx-auto h-10 w-10 text-conecta-primary/20 mb-3" />
              <p className="font-display font-semibold text-conecta-primary">
                Nenhum retorno pendente
              </p>
              <p className="text-sm text-conecta-muted mt-1">
                Ao marcar uma data de retorno em uma entrevista, ela aparece aqui.
              </p>
            </div>
          </ConectaCard>
        )}
      </div>
    </>
  );
}

function Dias({
  dias,
  grupos,
  tone,
}: {
  dias: string[];
  grupos: Map<
    string,
    Array<{
      id: string;
      nome: string;
      cargoPretendido: string | null;
      status: string;
      recrutador: string | null;
    }>
  >;
  tone: 'red' | 'orange' | 'navy';
}) {
  const dotMap = {
    red: 'bg-red-500',
    orange: 'bg-conecta-accent',
    navy: 'bg-conecta-primary',
  } as const;
  return (
    <ol className="space-y-3">
      {dias.map((dia) => (
        <li key={dia}>
          <div className="flex items-center gap-2 font-display text-[11px] font-semibold text-conecta-primary uppercase tracking-[0.18em] mb-1.5">
            <span className={`h-2 w-2 rounded-full ${dotMap[tone]}`} />
            <span>{fmtDay(dia)}</span>
            <span className="text-conecta-muted font-normal normal-case tracking-normal">
              · {grupos.get(dia)!.length} candidato(s)
            </span>
          </div>
          <ul className="space-y-0.5 ml-4 border-l-2 border-conecta-primary/8 pl-3">
            {grupos.get(dia)!.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-2 text-sm py-1.5 px-2 rounded-md hover:bg-conecta-accent/8 transition-colors"
              >
                <Link
                  href={`/entrevista/${e.id}`}
                  className="font-display font-semibold text-conecta-primary hover:text-conecta-accent transition-colors"
                >
                  {e.nome}
                </Link>
                <span className="text-conecta-muted text-xs">
                  · {e.cargoPretendido ?? '—'}
                </span>
                <span className="text-conecta-muted text-xs">
                  · entrevistado por {e.recrutador ?? '—'}
                </span>
                <span className="ml-auto">
                  <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
