import { PilarIcone } from './PilarIcone';

export function PilarPercepcaoCard({
  ordem, nome, icone, value, onChange,
}: {
  ordem: number; nome: string; icone: string;
  value: string; onChange: (v: string) => void;
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
      <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1.5">
        Percepção do grupo
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="O que a turma compartilhou sobre este pilar?"
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-conecta-text placeholder-conecta-muted/60 focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25 transition-colors"
        maxLength={2000}
      />
    </div>
  );
}
