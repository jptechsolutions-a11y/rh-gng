'use client';
import { useState, useTransition } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { EscutaPresencaItem } from '@/db/schema';
import { salvarReuniao } from '@/actions/escuta';
import { PilarPercepcaoCard } from './PilarPercepcaoCard';
import { PresencaDigitada } from './PresencaDigitada';
import { EvidenciaUploader, type FotoEnviada } from './EvidenciaUploader';

type Pilar = { id: number; ordem: number; nome: string; icone: string; perguntas: string[] };

const hoje = () => new Date().toISOString().slice(0, 10);

export function PercepcaoForm({ pilares }: { pilares: Pilar[] }) {
  const [turma, setTurma] = useState('');
  const [data, setData] = useState(hoje());
  const [responsavel, setResponsavel] = useState('');
  const [percepcaoFinal, setPercepcaoFinal] = useState('');
  const [fotos, setFotos] = useState<FotoEnviada[]>([]);
  const [presenca, setPresenca] = useState<EscutaPresencaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setErro(null);
    if (!turma.trim()) return setErro('Informe a turma.');
    if (!responsavel.trim()) return setErro('Informe o responsável.');
    if (!percepcaoFinal.trim()) return setErro('Preencha a Percepção Final.');
    if (fotos.length < 1) return setErro('Envie ao menos 1 foto.');
    const presValida = presenca.filter((p) => p.nome.trim().length > 0);
    if (presValida.length === 0) return setErro('Adicione ao menos 1 pessoa à lista de presença.');

    start(async () => {
      try {
        await salvarReuniao({
          turma, dataReuniao: data, responsavel,
          percepcoes: {},
          percepcaoFinal,
          fotos: fotos.map((f) => ({ path: f.path, size: f.size })),
          presenca: presValida,
        });
      } catch (e: unknown) {
        // redirect() lança NEXT_REDIRECT — silenciamos só esse.
        const msg = e instanceof Error ? e.message : 'Erro ao salvar';
        if (!msg.includes('NEXT_REDIRECT')) setErro(msg);
      }
    });
  }

  return (
    <section className="space-y-6">
      {/* Seção 1: informações */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Turma" required>
          <input value={turma} onChange={(e) => setTurma(e.target.value)}
                 maxLength={120} className={inputCls} placeholder="Ex.: Turma A — Logística" />
        </Field>
        <Field label="Data da reunião" required>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                 className={inputCls} />
        </Field>
        <Field label="Responsável pela condução" required>
          <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)}
                 maxLength={120} className={inputCls} placeholder="Nome de quem conduziu" />
        </Field>
      </div>

      {/* Seção 2: pilares (referência informativa) */}
      <div>
        <SectionTitle>Pilares de avaliação</SectionTitle>
        <p className="text-xs text-conecta-muted mt-1">
          Referência das perguntas conduzidas em cada pilar. A síntese da turma vai no campo <strong>Percepção Final</strong> abaixo.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
          {pilares.map((p) => (
            <PilarPercepcaoCard key={p.id}
              ordem={p.ordem} nome={p.nome} icone={p.icone}
              perguntas={p.perguntas} />
          ))}
        </div>
      </div>

      {/* Seção 3: percepção final */}
      <div className="rounded-2xl bg-white border border-conecta-accent/30 p-5">
        <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-accent mb-2">
          Percepção Final da G&amp;G *
        </label>
        <textarea
          rows={5}
          value={percepcaoFinal}
          onChange={(e) => setPercepcaoFinal(e.target.value)}
          maxLength={4000}
          placeholder="Registre aqui a percepção geral e os principais pontos levantados na reunião..."
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-conecta-text placeholder-conecta-muted/60 focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25 transition-colors"
        />
      </div>

      {/* Seção 4: evidências */}
      <div>
        <SectionTitle>Evidências fotográficas</SectionTitle>
        <div className="mt-3">
          <EvidenciaUploader fotos={fotos} onChange={setFotos} />
        </div>
      </div>

      {/* Seção 5: presença */}
      <div>
        <SectionTitle>Lista de presença</SectionTitle>
        <div className="mt-3">
          <PresencaDigitada rows={presenca} onChange={setPresenca} />
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="conecta-btn-primary disabled:opacity-70 disabled:cursor-wait"
        >
          {pending ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
          {pending ? 'Salvando…' : 'Salvar Percepção'}
        </button>
      </div>
    </section>
  );
}

const inputCls =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-conecta-text placeholder-conecta-muted/60 focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25 transition-colors';

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">
        {label} {required && <span className="text-conecta-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-[2px] w-6 bg-conecta-accent" />
      <h2 className="font-display text-[11px] uppercase tracking-[0.22em] font-semibold text-conecta-primary">
        {children}
      </h2>
    </div>
  );
}
