'use client';
import { Printer } from 'lucide-react';
import { ConectaLogo } from '@/components/brand/ConectaLogo';
import { PilarIcone } from './PilarIcone';

type Pilar = { id: number; ordem: number; nome: string; icone: string; perguntas: string[] };

export function FormularioImpressao({ pilares }: { pilares: Pilar[] }) {
  return (
    <section className="space-y-5">
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="conecta-btn-primary"
        >
          <Printer className="h-4 w-4" />
          Imprimir Formulário
        </button>
      </div>

      <div id="escuta-print-area"
           className="bg-white rounded-2xl border border-conecta-primary/10 p-6 print:border-0 print:p-0 print:rounded-none">
        <header className="flex items-start justify-between gap-4 pb-4 border-b border-conecta-primary/20">
          <ConectaLogo variant="full" withSubtitle className="scale-90 origin-left" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/perlog-logo.png" alt="Perlog" className="h-10 w-auto" />
        </header>

        <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
          {['Nome do Avaliado', 'Função', 'Data'].map((l) => (
            <div key={l}>
              <div className="text-conecta-primary font-display font-semibold uppercase tracking-[0.14em] text-[10px]">{l}</div>
              <div className="mt-1 h-7 border-b border-conecta-primary/40" />
            </div>
          ))}
        </div>

        <h2 className="text-center font-display text-xl font-extrabold text-conecta-primary mt-6 tracking-tight">
          FORMULÁRIO CONECTA G&amp;G
        </h2>

        <div className="mt-4 space-y-4">
          {pilares.map((p) => (
            <div key={p.id} className="rounded-xl border border-conecta-primary/15 p-4 break-inside-avoid">
              <div className="flex items-center gap-3 mb-2">
                <span className="grid place-items-center h-9 w-9 rounded-lg bg-conecta-primary text-white">
                  <PilarIcone chave={p.icone} className="h-4 w-4" />
                </span>
                <div className="font-display font-extrabold text-conecta-primary tracking-tight">
                  {p.ordem}. {p.nome}
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                {p.perguntas.map((q, i) => (
                  <li key={i}>
                    <div className="text-conecta-text">{q}</div>
                    <div className="mt-1 border-b border-dashed border-conecta-primary/30 h-5" />
                    <div className="mt-1 border-b border-dashed border-conecta-primary/30 h-5" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-conecta-accent/40 p-4 break-inside-avoid">
          <div className="font-display font-extrabold text-conecta-accent uppercase tracking-[0.14em] text-xs">
            Percepção Final da G&amp;G
          </div>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="mt-3 border-b border-dashed border-conecta-primary/30 h-5" />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body > *:not(:has(#escuta-print-area)) { display: none !important; }
          #escuta-print-area { display: block !important; box-shadow: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </section>
  );
}
