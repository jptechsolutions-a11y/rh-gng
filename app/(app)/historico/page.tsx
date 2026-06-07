import Link from 'next/link';
import { History, Plus, FileSpreadsheet, Scale } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard } from '@/components/ui/conecta-card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilialSlim } from '@/actions/entrevistas';
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
  const [all, cargos] = await Promise.all([listarEntrevistasFilialSlim(), getCargosAtivos()]);

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

      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FiltrosHistorico initial={sp} cargos={cargos.map((c) => c.nome)} />
          <div className="flex gap-2">
            <Link
              href={`/comparar${sp.cargo ? `?cargo=${encodeURIComponent(sp.cargo)}` : ''}`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-display font-medium border border-conecta-primary/15 text-conecta-primary bg-white hover:border-conecta-accent/40 hover:text-conecta-accent hover:bg-conecta-accent/5 transition-colors"
            >
              <Scale className="h-4 w-4" /> Comparar
            </Link>
            <a
              href={`/api/historico/export?${exportQs.toString()}`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-display font-medium border border-conecta-primary/15 text-conecta-primary bg-white hover:border-conecta-accent/40 hover:text-conecta-accent hover:bg-conecta-accent/5 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </a>
            <Link
              href="/entrevista/nova"
              className="conecta-btn-primary text-sm"
            >
              <Plus className="h-4 w-4" /> Nova
            </Link>
          </div>
        </div>

        <ConectaCard noPadding>
          {filtradas.length === 0 ? (
            <div className="p-12 text-center">
              <History className="mx-auto h-10 w-10 text-conecta-primary/20 mb-3" />
              <p className="font-display font-semibold text-conecta-primary">
                Nenhuma entrevista corresponde aos filtros
              </p>
              <p className="text-sm text-conecta-muted mt-1">
                Ajuste a busca ou crie uma nova entrevista.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="conecta-table">
                <thead>
                  <tr>
                    <th>Candidato</th>
                    <th>Cargo proposto</th>
                    <th>Entrevistador</th>
                    <th>Status</th>
                    <th>Retorno</th>
                    <th>Entrevista</th>
                    <th>Decisão</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((e) => {
                    const ret = retornoDe(e);
                    return (
                      <tr key={e.id}>
                        <td>
                          <Link
                            href={`/entrevista/${e.id}`}
                            className="font-display font-semibold text-conecta-primary hover:text-conecta-accent transition-colors"
                          >
                            {e.nome}
                          </Link>
                          <div className="text-xs text-conecta-muted font-mono mt-0.5">
                            {maskCpf(e.cpf)}
                          </div>
                          <Link
                            href={`/candidato/${e.cpf}`}
                            className="text-[11px] text-conecta-accent hover:underline"
                          >
                            timeline
                          </Link>
                        </td>
                        <td className="text-conecta-text">{e.cargoPretendido ?? '—'}</td>
                        <td className="text-conecta-muted text-xs">{e.recrutador ?? '—'}</td>
                        <td>
                          <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-display font-semibold ${
                              ret === 'Aprovado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ret === 'Reprovado'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ret}
                          </span>
                        </td>
                        <td className="text-conecta-muted text-xs">{fmt(e.dataHora)}</td>
                        <td className="text-conecta-muted text-xs">
                          {(e.status === 'Aprovado' || e.status === 'Reprovado') &&
                          e.decisaoEm ? (
                            <>
                              <div>{fmt(e.decisaoEm)}</div>
                              <div className="text-[11px] text-conecta-primary/70">
                                por {e.gestorAprovador ?? '—'}
                              </div>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-right">
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
        </ConectaCard>
      </div>
    </>
  );
}
