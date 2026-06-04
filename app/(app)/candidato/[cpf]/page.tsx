import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus, ClipboardList, CheckCircle2, XCircle, Hourglass, FileText, Printer } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/historico"><ArrowLeft className="h-4 w-4" />Voltar ao histórico</Link>
          </Button>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-3 text-xs">
            <Stat icon={ClipboardList} label="Entrevistas" value={totais.total} />
            <Stat icon={CheckCircle2} label="Aprovadas" value={totais.aprovadas} color="emerald" />
            <Stat icon={XCircle} label="Reprovadas" value={totais.reprovadas} color="red" />
            <Stat icon={Hourglass} label="Pendentes" value={totais.pendentes} color="amber" />
          </div>
          <Button asChild size="sm">
            <Link href={`/entrevista/nova?cpf=${digits}`}><Plus className="h-4 w-4" />Nova entrevista</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-perlog-slate mb-4">Linha do tempo</h2>

            <ol className="relative border-l-2 border-perlog-orange/30 ml-4 space-y-6">
              {rows.map((e) => {
                const ret = retornoDe(e.status);
                return (
                  <li key={e.id} className="relative pl-6">
                    <span className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white shadow ${
                      ret === 'Aprovado' ? 'bg-emerald-500' :
                      ret === 'Reprovado' ? 'bg-red-500' :
                      'bg-amber-500'
                    }`} />
                    <div className="flex flex-wrap items-start gap-3 justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/entrevista/${e.id}`} className="text-base font-semibold text-perlog-navy hover:text-perlog-orange">
                            {e.cargoPretendido ?? 'Cargo não informado'}
                          </Link>
                          <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                        </div>
                        <div className="text-xs text-perlog-slate mt-1">
                          Entrevista em {fmt(e.dataHora)} · por <span className="text-perlog-navy">{e.recrutador ?? '—'}</span>
                        </div>
                        {(e.status === 'Aprovado' || e.status === 'Reprovado') && e.decisaoEm && (
                          <div className="text-xs mt-1">
                            <span className={ret === 'Aprovado' ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                              {e.status} por {e.gestorAprovador ?? '—'} em {fmt(e.decisaoEm)}
                            </span>
                          </div>
                        )}
                        {e.aprovadoPeloGg && (
                          <div className="text-[11px] text-perlog-slate italic mt-0.5">Avaliado pelo G&amp;G</div>
                        )}
                        {e.motivoDecisao && (
                          <p className="text-xs text-perlog-navy/70 mt-2 max-w-xl">{e.motivoDecisao}</p>
                        )}
                        {(logsPorEntrevista.get(e.id) ?? []).length > 1 && (
                          <details className="mt-2 max-w-xl">
                            <summary className="text-[11px] text-perlog-slate cursor-pointer hover:text-perlog-orange select-none">
                              Ver histórico de status ({(logsPorEntrevista.get(e.id) ?? []).length} mudança(s))
                            </summary>
                            <ul className="mt-1.5 space-y-0.5 text-[11px] pl-3 border-l border-slate-200">
                              {(logsPorEntrevista.get(e.id) ?? []).map((log) => (
                                <li key={log.id} className="text-perlog-slate">
                                  <span className="text-perlog-navy font-medium">{fmt(log.dataHora)}</span>
                                  {' · '}
                                  {log.deStatus ? <>de <span className="font-medium">{log.deStatus}</span> para </> : 'criada como '}
                                  <span className="font-medium">{log.paraStatus}</span>
                                  {log.motivo && <> · <em>{log.motivo}</em></>}
                                  <span className="text-perlog-slate/70"> · por {log.usuario}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <Link href={`/entrevista/${e.id}/imprimir`} title="Visualizar / imprimir" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50">
                          <Printer className="h-3.5 w-3.5" />
                        </Link>
                        <a href={`/api/entrevista/${e.id}/docx`} title="Baixar Word" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50">
                          <FileText className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value, color = 'navy' }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number; color?: 'navy' | 'emerald' | 'red' | 'amber';
}) {
  const colorMap = {
    navy: 'bg-perlog-navy/10 text-perlog-navy',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  } as const;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-medium ${colorMap[color]}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}
