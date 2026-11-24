import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { carregarAta, dataBrDeIso } from '@/lib/comite/ata';
import { fmtTempo, nomeMes, rotuloDecisao } from '@/lib/comite/tipos';
import { PrintBar } from './PrintBar';

export const dynamic = 'force-dynamic';

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;

/** Ata pronta para imprimir (o navegador salva como PDF). */
export default async function AtaImprimirPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const s = await requireSession();
  if (s.perfil !== 'admin') redirect('/comite');
  const { mes } = await searchParams;
  const d = await carregarAta(s, mes);

  return (
    <>
      <PrintBar mes={d.mes} />
      <div className="print-doc mx-auto my-6 max-w-[820px] bg-white shadow-elev print:shadow-none print:my-0 print:max-w-none">
        <header className="px-12 pt-10 pb-5 border-b-2 border-perlog-orange print:px-8">
          <div className="flex items-start justify-between gap-6">
            <PerlogLogo className="h-10 w-auto" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-perlog-slate">Gente &amp; Gestão</div>
              <div className="text-base font-semibold text-perlog-navy">Ata do Comitê de Desligamento</div>
            </div>
          </div>
        </header>

        <main className="px-12 py-7 print:px-8 space-y-6 text-[12px] leading-relaxed text-perlog-navy">
          <table className="w-full border-collapse">
            <tbody>
              <Linha l="Mês de referência" v={nomeMes(d.mes)} />
              <Linha l="Data do comitê" v={dataBrDeIso(d.dataComite)} />
              <Linha
                l="Pedidos analisados"
                v={`${d.resumo.total} — ${d.resumo.aprovados} aprovado(s), ${d.resumo.naoAprovados} não aprovado(s), ${d.resumo.pendentes} pendente(s)`}
              />
            </tbody>
          </table>

          <section>
            <Titulo t="Participantes" />
            {d.participantes.length > 0 ? (
              <ol className="list-decimal pl-6 columns-2 gap-8">
                {d.participantes.map((p) => <li key={p}>{p}</li>)}
              </ol>
            ) : (
              <p className="italic text-perlog-slate">Nenhum participante informado.</p>
            )}
          </section>

          <section>
            <Titulo t="Pedidos e decisões" />
            <div className="space-y-4">
              {d.lancamentos.map((l, i) => (
                <article key={l.id} className="break-inside-avoid">
                  <h3 className="mb-1 text-[13px] font-semibold text-perlog-orange">{i + 1}. {l.nome}</h3>
                  <table className="w-full border-collapse">
                    <tbody>
                      <Linha l="Matrícula / Filial" v={`${l.chapa} · filial ${l.filial}`} />
                      <Linha l="Função / Seção" v={`${l.funcao} (${l.secao})`} />
                      <Linha l="Turno / Tempo de empresa" v={`${l.turno} · ${fmtTempo(l.tempoMeses)}`} />
                      <Linha l="Medidas disciplinares" v={`${l.suspensoes} suspensão(ões) · ${l.advertencias} advertência(s)`} />
                      <Linha l="Justificativa do pedido" v={l.justificativa} pre />
                      <Linha
                        l="Decisão do comitê"
                        v={l.decisao ? `${rotuloDecisao(l.decisao)}${l.decididoPor ? ` por ${l.decididoPor}` : ''}` : 'Pendente (sem decisão registrada)'}
                        bold
                      />
                      {l.decisao === 'nao_aprovado' && <Linha l="Motivo da não aprovação" v={l.decisaoMotivo ?? '—'} pre />}
                      {l.historico.length > 0 && (
                        <tr>
                          <td className="border border-slate-300 bg-amber-50 px-3 py-1.5 font-medium align-top w-[28%]">Pedidos anteriores não aprovados</td>
                          <td className="border border-slate-300 bg-amber-50 px-3 py-1.5">
                            <ul className="space-y-2">
                              {l.historico.map((p) => (
                                <li key={p.id}>
                                  <div className="font-semibold">
                                    Solicitado {dataBr(p.solicitadoEm) ? `em ${dataBr(p.solicitadoEm)} ` : ''}— comitê de {nomeMes(p.mes)}
                                  </div>
                                  <div><span className="font-medium">Motivo da solicitação:</span> <span className="whitespace-pre-wrap">{p.justificativa}</span></div>
                                  <div>
                                    <span className="font-medium">Não aprovado{dataBr(p.decididoEm) ? ` em ${dataBr(p.decididoEm)}` : ''}{p.decididoPor ? ` por ${p.decididoPor}` : ''}:</span>{' '}
                                    <span className="whitespace-pre-wrap">{p.motivoReprovacao}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </article>
              ))}
              {d.lancamentos.length === 0 && <p className="italic text-perlog-slate">Nenhum pedido neste mês.</p>}
            </div>
          </section>

        </main>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 12mm 16mm 12mm; }
          body { background: white !important; }
          .print-doc { box-shadow: none !important; }
        }
      `}</style>
    </>
  );
}

function Titulo({ t }: { t: string }) {
  return <h2 className="mb-2 rounded-sm bg-perlog-navy px-3 py-1.5 text-[13px] font-semibold text-white">{t}</h2>;
}

function Linha({ l, v, pre, bold }: { l: string; v: string; pre?: boolean; bold?: boolean }) {
  return (
    <tr>
      <td className="w-[28%] border border-slate-300 bg-slate-50 px-3 py-1.5 align-top font-medium">{l}</td>
      <td className={`border border-slate-300 px-3 py-1.5 ${bold ? 'font-semibold' : ''} ${pre ? 'whitespace-pre-wrap' : ''}`}>{v}</td>
    </tr>
  );
}
