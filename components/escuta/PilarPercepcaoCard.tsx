import { PilarIcone } from './PilarIcone';

export function PilarPercepcaoCard({
  ordem, nome, icone, perguntas,
}: {
  ordem: number;
  nome: string;
  icone: string;
  perguntas: string[];
}) {
  return (
    <div className="relative rounded-2xl bg-white border border-conecta-primary/10 p-5 overflow-hidden">
      <span aria-hidden className="absolute top-0 left-0 right-0 h-[2px] bg-conecta-accent" />
      <div className="flex items-center gap-3 mb-3">
        <span className="grid place-items-center h-10 w-10 rounded-lg bg-conecta-primary text-white">
          <PilarIcone chave={icone} className="h-5 w-5" />
        </span>
        <div>
          <div className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-accent">
            Pilar {ordem}
          </div>
          <div className="font-display font-extrabold text-conecta-primary tracking-tight">
            {nome}
          </div>
        </div>
      </div>
      {perguntas.length > 0 && (
        <ul className="space-y-1.5 text-sm text-conecta-text/85 list-disc pl-5 marker:text-conecta-accent">
          {perguntas.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
