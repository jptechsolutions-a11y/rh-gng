import Link from 'next/link';
import { History, Plus, FileSpreadsheet, Scale } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilial } from '@/actions/entrevistas';
import { getCargosAtivos } from '@/db/queries/config';
import { FiltrosHistorico } from './FiltrosHistorico';
import { EditarDecisaoButton } from './EditarDecisaoButton';

export const dynamic = 'force-dynamic';

type SP = { status?: string; retorno?: string; q?: string; cargo?: string; periodo?: string };

function retornoDe(e: { status: string }) {
  if (e.status === 'Aprovado') return 'Aprovado';
  if (e.status === 'Reprovado') return 'Reprovado';
  return 'Pendente';
}

function fmt(d: Date | string | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

function maskCpf(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const s = await requireSession('filial');
  const sp = await searchParams;
  const [all, cargos] = await Promise.all([listarEntrevistasFilial(), getCargosAtivos()]);

  const q = (sp.q ?? '').trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const periodoDias = sp.periodo ? Number(sp.periodo) : 0;
  const periodoCutoff = periodoDias > 0 ? Date.now() - periodoDias * 86400000 : 0;

  const filtradas = all.filter((e) => {
    if (sp.status && sp.status !== 'Todos' && e.status !== sp.status) return false;
    const ret = retornoDe(e);
    if (sp.retorno && sp.retorno !== 'Todos' && ret !== sp.retorno) return false;
    if (sp.cargo && (e.cargoPretendido ?? '') !== sp.cargo) return false;
    if (periodoCutoff && e.dataHora.getTime() < periodoCutoff) return false;
    if (q) {
      const hitNome = e.nome.toLowerCase().includes(q);
      const hitCpf = qDigits.length >= 3 && e.cpf.includes(qDigits);
      const hitEmail = (e.email ?? '').toLowerCase().includes(q);
      if (!hitNome && !hitCpf && !hitEmail) return false;
    }
    return true;
  });

  // Repassa os filtros atuais para o link de download
  const exportQs = new URLSearchParams();
  for (const k of ['status', 'retorno', 'q', 'cargo', 'periodo'] as const) {
    if (sp[k]) exportQs.set(k, sp[k]!);
  }

  return (
    <>
      <TopBar
        titulo="Histórico de entrevistas"
        subtitulo={`${filtradas.length} de ${all.length} entrevistas`}
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FiltrosHistorico initial={sp} cargos={cargos.map((c) => c.nome)} />
          <div className="flex gap-2">
            <Link
              href={`/comparar${sp.cargo ? `?cargo=${encodeURIComponent(sp.cargo)}` : ''}`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium border border-slate-200 hover:bg-slate-50"
            >
              <Scale className="h-4 w-4" /> Comparar
            </Link>
            <a
              href={`/api/historico/export?${exportQs.toString()}`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium border border-slate-200 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </a>
            <Button asChild size="sm">
              <Link href="/entrevista/nova"><Plus className="h-4 w-4" />Nova</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {filtradas.length === 0 ? (
              <div className="p-12 text-center text-perlog-slate">
                <History className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="font-medium text-perlog-navy">Nenhuma entrevista corresponde aos filtros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
                      <th className="px-4 py-3 font-medium">Candidato</th>
                      <th className="px-4 py-3 font-medium">Cargo proposto</th>
                      <th className="px-4 py-3 font-medium">Entrevistador</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Retorno</th>
                      <th className="px-4 py-3 font-medium">Entrevista</th>
                      <th className="px-4 py-3 font-medium">Decisão</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((e) => {
                      const ret = retornoDe(e);
                      return (
                        <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <Link href={`/entrevista/${e.id}`} className="font-medium text-perlog-navy hover:text-perlog-orange">{e.nome}</Link>
                            <div className="text-xs text-perlog-slate font-mono">{maskCpf(e.cpf)}</div>
                            <Link href={`/candidato/${e.cpf}`} className="text-[11px] text-perlog-slate underline hover:text-perlog-orange">timeline</Link>
                          </td>
                          <td className="px-4 py-3 text-perlog-slate">{e.cargoPretendido ?? '—'}</td>
                          <td className="px-4 py-3 text-perlog-slate text-xs">{e.recrutador ?? '—'}</td>
                          <td className="px-4 py-3"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              ret === 'Aprovado' ? 'bg-emerald-100 text-emerald-800' :
                              ret === 'Reprovado' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>{ret}</span>
                          </td>
                          <td className="px-4 py-3 text-perlog-slate text-xs">{fmt(e.dataHora)}</td>
                          <td className="px-4 py-3 text-perlog-slate text-xs">
                            {(e.status === 'Aprovado' || e.status === 'Reprovado') && e.decisaoEm ? (
                              <>
                                <div>{fmt(e.decisaoEm)}</div>
                                <div className="text-[11px] text-perlog-navy/70">por {e.gestorAprovador ?? '—'}</div>
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <EditarDecisaoButton
                              entrevistaId={e.id}
                              candidatoNome={e.nome}
                              status={e.status}
                              gestorAprovador={e.gestorAprovador}
                              motivoDecisao={e.motivoDecisao}
                              dataRetorno={e.dataRetorno}
                              aprovadoPeloGg={e.aprovadoPeloGg}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
