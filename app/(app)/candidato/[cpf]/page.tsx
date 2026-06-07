import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus, ClipboardList, CheckCircle2, XCircle, Hourglass, FileText, Printer, History as HistoryIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { and, desc, eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function fmt(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
}
function maskCpf(c: string) {
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function retornoDe(status: string) {
  if (status === 'Aprovado') return 'Aprovado';
  if (status === 'Reprovado') return 'Reprovado';
  return 'Pendente';
}

export default async function CandidatoPage({ params }: { params: Promise<{ cpf: string }> }) {
  const s = await requireSession('filial');
  const { cpf: cpfParam } = await params;
  const digits = cpfParam.replace(/\D/g, '');
  if (digits.length !== 11) notFound();

  const rows = await db.select()
    .from(schema.entrevistas)
    .where(and(eq(schema.entrevistas.cpf, digits), eq(schema.entrevistas.filialId, s.filialId)))
    .orderBy(desc(schema.entrevistas.dataHora));

  if (rows.length === 0) notFound();

  // Busca histórico de mudanças de status para todas as entrevistas
  const ids = rows.map((r) => r.id);
  const logs = await db.select()
    .from(schema.logHistorico)
    .where(inArray(schema.logHistorico.entrevistaId, ids))
    .orderBy(desc(schema.logHistorico.dataHora));
  const logsPorEntrevista = new Map<string, typeof logs>();
  for (const l of logs) {
    if (!logsPorEntrevista.has(l.entrevistaId)) logsPorEntrevista.set(l.entrevistaId, []);
    logsPorEntrevista.get(l.entrevistaId)!.push(l);
  }

  const candidato = rows[0]!;
  const totais = {
    total: rows.length,
    aprovadas: rows.filter((r) => r.status === 'Aprovado').length,
    reprovadas: rows.filter((r) => r.status === 'Reprovado').length,
    pendentes: rows.filter((r) => r.status !== 'Aprovado' && r.status !== 'Reprovado').length,
  };

  return (
    <>
      <TopBar
        titulo={candidato.nome}
        subtitulo={`Histórico do candidato · CPF ${maskCpf(digits)}`}
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/historico"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-display font-medium border border-conecta-primary/15 text-conecta-primary bg-white hover:border-conecta-accent/40 hover:text-conecta-accent hover:bg-conecta-accent/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
          </Link>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Stat icon={ClipboardList} label="Entrevistas" value={totais.total} color="navy" />
            <Stat icon={CheckCircle2} label="Aprovadas" value={totais.aprovadas} color="emerald" />
            <Stat icon={XCircle} label="Reprovadas" value={totais.reprovadas} color="red" />
            <Stat icon={Hourglass} label="Pendentes" value={totais.pendentes} color="amber" />
          </div>
          <Link
            href={`/entrevista/nova?cpf=${digits}`}
            className="conecta-btn-primary text-sm"
          >
            <Plus className="h-4 w-4" /> Nova entrevista
          </Link>
        </div>

        <ConectaCard>
          <SectionHeader label="Linha do tempo" icon={HistoryIcon} />
          <ol
            className="relative ml-4 mt-6 space-y-6"
            style={{ borderLeft: '2px solid rgba(232, 98, 26, 0.35)' }}
          >
            {rows.map((e) => {
              const ret = retornoDe(e.status);
              const dotColor =
                ret === 'Aprovado'
                  ? 'bg-emerald-500'
                  : ret === 'Reprovado'
                    ? 'bg-red-500'
                    : 'bg-conecta-accent';
              return (
                <li key={e.id} className="relative pl-6">
                  <span
                    className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white shadow ${dotColor}`}
                  />
                  <div className="flex flex-wrap items-start gap-3 justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/entrevista/${e.id}`}
                          className="font-display text-base font-extrabold text-conecta-primary hover:text-conecta-accent transition-colors"
                        >
                          {e.cargoPretendido ?? 'Cargo não informado'}
                        </Link>
                        <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                      </div>
                      <div className="text-xs text-conecta-muted mt-1">
                        Entrevista em {fmt(e.dataHora)} · por{' '}
                        <span className="text-conecta-primary font-display font-semibold">
                          {e.recrutador ?? '—'}
                        </span>
                      </div>
                      {(e.status === 'Aprovado' || e.status === 'Reprovado') &&
                        e.decisaoEm && (
                          <div className="text-xs mt-1">
                            <span
                              className={
                                ret === 'Aprovado'
                                  ? 'text-emerald-700 font-display font-semibold'
                                  : 'text-red-700 font-display font-semibold'
                              }
                            >
                              {e.status} por {e.gestorAprovador ?? '—'} em{' '}
                              {fmt(e.decisaoEm)}
                            </span>
                          </div>
                        )}
                      {e.aprovadoPeloGg && (
                        <div className="text-[11px] text-conecta-accent italic mt-0.5">
                          Avaliado pelo G&amp;G
                        </div>
                      )}
                      {e.motivoDecisao && (
                        <p className="text-xs text-conecta-text mt-2 max-w-xl bg-conecta-primary/4 px-2 py-1.5 rounded-md">
                          {e.motivoDecisao}
                        </p>
                      )}
                      {(logsPorEntrevista.get(e.id) ?? []).length > 1 && (
                        <details className="mt-2 max-w-xl">
                          <summary className="text-[11px] text-conecta-muted cursor-pointer hover:text-conecta-accent select-none font-display">
                            Ver histórico de status (
                            {(logsPorEntrevista.get(e.id) ?? []).length} mudança(s))
                          </summary>
                          <ul
                            className="mt-1.5 space-y-0.5 text-[11px] pl-3"
                            style={{ borderLeft: '1px solid rgba(13,43,107,0.15)' }}
                          >
                            {(logsPorEntrevista.get(e.id) ?? []).map((log) => (
                              <li key={log.id} className="text-conecta-muted">
                                <span className="text-conecta-primary font-display font-semibold">
                                  {fmt(log.dataHora)}
                                </span>
                                {' · '}
                                {log.deStatus ? (
                                  <>
                                    de{' '}
                                    <span className="font-display font-semibold">
                                      {log.deStatus}
                                    </span>{' '}
                                    para{' '}
                                  </>
                                ) : (
                                  'criada como '
                                )}
                                <span className="font-display font-semibold">
                                  {log.paraStatus}
                                </span>
                                {log.motivo && (
                                  <>
                                    {' · '}
                                    <em>{log.motivo}</em>
                                  </>
                                )}
                                <span className="text-conecta-muted/70">
                                  {' '}· por {log.usuario}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Link
                        href={`/entrevista/${e.id}/imprimir`}
                        title="Visualizar / imprimir"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-conecta-primary/15 text-conecta-muted hover:border-conecta-accent/40 hover:text-conecta-accent hover:bg-conecta-accent/5 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Link>
                      <a
                        href={`/api/entrevista/${e.id}/docx`}
                        title="Baixar Word"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-conecta-primary/15 text-conecta-muted hover:border-conecta-accent/40 hover:text-conecta-accent hover:bg-conecta-accent/5 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </ConectaCard>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'navy' | 'emerald' | 'red' | 'amber';
}) {
  const colorMap = {
    navy: 'bg-conecta-primary/8 text-conecta-primary border-conecta-primary/15',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
  } as const;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold border ${colorMap[color]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{value}</span>
      <span className="opacity-80 normal-case font-normal">{label}</span>
    </div>
  );
}
