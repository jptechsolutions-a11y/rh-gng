import { requireSession } from '@/lib/auth/session';
import { carregarPilares } from '@/lib/escuta/data';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { PilarIcone } from '@/components/escuta/PilarIcone';
import { PrintToolbar } from './PrintToolbar';

export const dynamic = 'force-dynamic';

export default async function ImprimirFormularioEscutaPage() {
  await requireSession();
  const pilares = await carregarPilares();

  const fmtDateTime = (d: Date) =>
    d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <>
      <PrintToolbar />

      <div className="print-doc mx-auto my-6 max-w-[820px] bg-white shadow-elev print:shadow-none print:my-0 print:max-w-none">
        <header className="px-12 pt-12 pb-6 border-b-2 border-conecta-accent print:px-10">
          <div className="flex items-start justify-between gap-6">
            <PerlogLogo className="h-10 w-auto" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-conecta-muted">
                Conecta+ G&amp;G · Gente e Gestão
              </div>
              <div className="text-sm font-semibold text-conecta-primary">
                Formulário Conecta G&amp;G
              </div>
              <div className="text-xs text-conecta-muted mt-1">
                Documento gerado em {fmtDateTime(new Date())}
              </div>
            </div>
          </div>
        </header>

        <main className="px-12 py-8 print:px-10 space-y-7 text-[12px] leading-relaxed text-conecta-primary">
          <section>
            <SectionTitle n="1" title="Identificação" />
            <table className="w-full border-collapse">
              <tbody>
                <RowBlank label="Nome do avaliado" />
                <RowBlank label="Função" />
                <RowBlank label="Data da reunião" />
                <RowBlank label="Responsável pela condução" />
                <RowBlank label="Turma / Filial" />
              </tbody>
            </table>
          </section>

          <section>
            <SectionTitle n="2" title="Pilares de avaliação" />
            <div className="space-y-4">
              {pilares.map((p) => (
                <div key={p.id} className="break-inside-avoid rounded border border-slate-300">
                  <div className="flex items-center gap-3 px-3 py-2 bg-conecta-primary text-white">
                    <span className="grid place-items-center h-7 w-7 rounded bg-white/10">
                      <PilarIcone chave={p.icone} className="h-3.5 w-3.5" />
                    </span>
                    <div className="text-[13px] font-semibold tracking-tight">
                      {p.ordem}. {p.nome}
                    </div>
                  </div>
                  <ul className="px-4 py-3 space-y-3">
                    {p.perguntas.map((q, i) => (
                      <li key={i} className="break-inside-avoid">
                        <div className="text-conecta-text font-medium">
                          <span className="text-conecta-accent font-bold">
                            {String(i + 1).padStart(2, '0')}.
                          </span>{' '}
                          {q}
                        </div>
                        <div className="mt-1 border-b border-dashed border-conecta-primary/40 h-5" />
                        <div className="mt-1 border-b border-dashed border-conecta-primary/40 h-5" />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle n="3" title="Percepção Final da G&G" />
            <div className="rounded border border-conecta-accent/50 p-4 break-inside-avoid">
              {Array.from({ length: 8 }).map((_, n) => (
                <div key={n} className="border-b border-dashed border-conecta-primary/40 h-6" />
              ))}
            </div>
          </section>

          <section className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 mt-8 break-inside-avoid">
            <div className="text-center">
              <div className="border-t border-conecta-primary pt-2 text-[11px] text-conecta-muted">
                Responsável pela condução
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-conecta-primary pt-2 text-[11px] text-conecta-muted">
                Gente &amp; Gestão
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200 px-12 py-4 print:px-10 flex items-center justify-between text-[10px] text-conecta-muted">
          <span>Grupo Perlog — Conecta+ G&amp;G · Gente e Gestão</span>
          <span>Acolher · Ouvir · Identificar · Agir</span>
        </footer>
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

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="bg-conecta-primary text-white text-[13px] font-semibold px-3 py-1.5 mb-2 rounded-sm">
      {n} — {title}
    </h2>
  );
}

function RowBlank({ label }: { label: string }) {
  return (
    <tr>
      <td className="border border-slate-300 px-3 py-1.5 bg-slate-50 font-medium w-[35%]">
        {label}
      </td>
      <td className="border border-slate-300 px-3 py-1.5 h-7" />
    </tr>
  );
}
