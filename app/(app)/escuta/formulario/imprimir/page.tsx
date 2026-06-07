import { requireSession } from '@/lib/auth/session';
import { carregarPilares } from '@/lib/escuta/data';
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

      <div className="print-doc mx-auto my-6 max-w-[820px] bg-white shadow-elev print:shadow-none print:my-0 print:max-w-none text-[10px] leading-snug text-[#1E1E2E]">
        {/* ===== Cabeçalho ===== */}
        <header className="px-8 pt-6 pb-3 border-b-[3px] border-[#E8621A] print:px-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/perlog-logo.png" alt="Perlog" className="h-9 w-auto" />
            <div className="leading-tight">
              <div className="text-[8px] uppercase tracking-[0.22em] text-[#6B7280] font-semibold">
                Conecta+ G&amp;G · Gente e Gestão
              </div>
              <div className="text-[15px] font-extrabold text-[#0D2B6B] tracking-tight">
                FORMULÁRIO CONECTA G&amp;G
              </div>
            </div>
          </div>
          <div className="text-right text-[8px] text-[#6B7280]">
            Documento gerado em<br />
            <span className="font-semibold text-[#0D2B6B]">{fmtDateTime(new Date())}</span>
          </div>
        </header>

        <main className="px-8 py-3 print:px-6 space-y-3">
          {/* ===== 1. Identificação (linha única) ===== */}
          <section>
            <SectionBar n="1" title="Identificação" />
            <div className="grid grid-cols-12 gap-x-2 gap-y-1.5 mt-1">
              <FieldBlank label="Nome do avaliado" span={6} />
              <FieldBlank label="Função"            span={3} />
              <FieldBlank label="Data"              span={3} />
              <FieldBlank label="Responsável pela condução" span={6} />
              <FieldBlank label="Turma / Filial"            span={6} />
            </div>
          </section>

          {/* ===== 2. Pilares em 2 colunas ===== */}
          <section>
            <SectionBar n="2" title="Pilares de avaliação" />
            <div className="grid grid-cols-2 gap-2 mt-1">
              {pilares.map((p) => (
                <div key={p.id} className="border border-[#0D2B6B33] rounded-sm break-inside-avoid">
                  <div
                    className="px-2 py-1 text-white text-[10px] font-bold tracking-tight flex items-center gap-1.5"
                    style={{ background: '#0D2B6B' }}
                  >
                    <span
                      className="grid place-items-center h-4 w-4 rounded-full text-[8px] font-extrabold"
                      style={{ background: '#E8621A' }}
                    >
                      {p.ordem}
                    </span>
                    <span className="truncate">{p.nome.toUpperCase()}</span>
                  </div>
                  <ul className="px-2 py-1.5 space-y-1.5">
                    {p.perguntas.map((q, i) => (
                      <li key={i} className="break-inside-avoid">
                        <div className="text-[9px] text-[#1E1E2E]">
                          <span className="font-bold text-[#E8621A]">
                            {String(i + 1).padStart(2, '0')}.
                          </span>{' '}
                          {q}
                        </div>
                        <div className="mt-0.5 border-b border-dashed border-[#0D2B6B66] h-3" />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ===== 3. Percepção Final ===== */}
          <section>
            <SectionBar n="3" title="Percepção Final da G&G" accent />
            <div
              className="border border-[#E8621A66] rounded-sm px-3 py-2 mt-1 break-inside-avoid"
              style={{ background: '#FFF7F1' }}
            >
              {Array.from({ length: 4 }).map((_, n) => (
                <div key={n} className="border-b border-dashed border-[#0D2B6B55] h-4" />
              ))}
            </div>
          </section>

          {/* ===== Assinaturas compactas ===== */}
          <section className="grid grid-cols-2 gap-6 pt-1 break-inside-avoid">
            <div className="text-center">
              <div className="border-t border-[#0D2B6B] pt-1 text-[8px] text-[#6B7280] uppercase tracking-[0.18em]">
                Responsável pela condução
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-[#0D2B6B] pt-1 text-[8px] text-[#6B7280] uppercase tracking-[0.18em]">
                Gente &amp; Gestão
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200 px-8 py-2 print:px-6 flex items-center justify-between text-[8px] text-[#6B7280]">
          <span>Grupo Perlog — Conecta+ G&amp;G · Gente e Gestão</span>
          <span>Acolher · Ouvir · Identificar · Agir</span>
        </footer>
      </div>

      <style>{`
        /* Força impressão das cores de fundo (Chrome/Edge/Firefox/Safari). */
        .print-doc, .print-doc * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        @media print {
          @page { size: A4; margin: 8mm 10mm 8mm 10mm; }
          body { background: white !important; }
          .print-doc { box-shadow: none !important; }
        }
      `}</style>
    </>
  );
}

function SectionBar({ n, title, accent }: { n: string; title: string; accent?: boolean }) {
  return (
    <div
      className="text-white text-[11px] font-bold px-2.5 py-1 rounded-sm flex items-center gap-2"
      style={{ background: accent ? '#E8621A' : '#0D2B6B' }}
    >
      <span
        className="grid place-items-center h-4 w-4 rounded-full text-[8px] font-extrabold"
        style={{ background: 'rgba(255,255,255,0.22)' }}
      >
        {n}
      </span>
      <span className="tracking-wide uppercase">{title}</span>
    </div>
  );
}

function FieldBlank({ label, span }: { label: string; span: number }) {
  const spanCls: Record<number, string> = {
    3: 'col-span-3',
    4: 'col-span-4',
    6: 'col-span-6',
    8: 'col-span-8',
    12: 'col-span-12',
  };
  return (
    <div className={spanCls[span] ?? 'col-span-6'}>
      <div className="text-[8px] uppercase tracking-[0.14em] font-bold text-[#0D2B6B] mb-0.5">
        {label}
      </div>
      <div className="h-5 border-b border-[#0D2B6B66]" />
    </div>
  );
}
