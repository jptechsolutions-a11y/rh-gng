'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, UserCircle, Star, MessageSquare } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import { CompetenciaCard } from '@/components/avaliacao/CompetenciaCard';
import { FatorRatingRow } from '@/components/avaliacao/FatorRatingRow';
import { ProgressoAvaliacao } from '@/components/avaliacao/ProgressoAvaliacao';
import { ResultadoCard } from '@/components/avaliacao/ResultadoCard';
import { calcularPontuacao, classificar } from '@/lib/avaliacao/calculos';
import { buscarPessoaPorMatricula, salvarAvaliacao } from '@/actions/avaliacao';

type Competencia = {
  id: string;
  nome: string;
  fatores: { id: string; texto: string; ordem: number }[];
};
type Pessoa = {
  id: string;
  matricula: string;
  nome: string;
  funcao: string | null;
  filialId: string | null;
  regional: string | null;
} | null;

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-lg border border-conecta-primary/15 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-conecta-accent/25 focus:border-conecta-accent ${className}`}
    />
  );
}

const STEPS = [
  { id: 1 as const, label: 'Identificação', icon: UserCircle },
  { id: 2 as const, label: 'Avaliação', icon: Star },
  { id: 3 as const, label: 'Feedback', icon: MessageSquare },
];

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = step === s.id;
        const done = step > s.id;
        return (
          <div key={s.id} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-display font-semibold transition-all overflow-hidden',
                active
                  ? 'text-white shadow-[0_8px_22px_-8px_rgba(232,98,26,0.55)]'
                  : done
                    ? 'bg-conecta-accent/12 text-conecta-accent border border-conecta-accent/25'
                    : 'bg-white text-conecta-muted border border-conecta-primary/10',
              )}
              style={active ? { background: '#E8621A' } : undefined}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{ background: '#FF8C42' }}
                />
              )}
              <span
                className={cn(
                  'grid place-items-center h-5 w-5 rounded-full text-[10px] font-extrabold shrink-0',
                  active
                    ? 'bg-white text-conecta-accent'
                    : done
                      ? 'bg-conecta-accent text-white'
                      : 'bg-conecta-primary/8 text-conecta-muted',
                )}
              >
                {done ? <CheckCircle2 className="h-3 w-3" /> : s.id}
              </span>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap text-[13px]">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-4 sm:w-8 transition-colors',
                  done ? 'bg-conecta-accent/40' : 'bg-conecta-primary/15',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NovaAvaliacaoWizard({ competencias }: { competencias: Competencia[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, start] = useTransition();
  const [matAv, setMatAv] = useState('');
  const [matGe, setMatGe] = useState('');
  const [avaliado, setAvaliado] = useState<Pessoa>(null);
  const [gestor, setGestor] = useState<Pessoa>(null);
  const totalFatores = useMemo(
    () => competencias.reduce((a, c) => a + c.fatores.length, 0),
    [competencias],
  );
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [pontosFortes, setPontosFortes] = useState('');
  const [oportunidades, setOportunidades] = useState('');
  const [comentarios, setComentarios] = useState('');

  const feito = Object.keys(notas).length;
  const completo = feito === totalFatores && totalFatores > 0;
  const notasArr = useMemo(
    () => Object.entries(notas).map(([fatorId, nota]) => ({ fatorId, nota })),
    [notas],
  );
  const pontuacao = completo ? calcularPontuacao(notasArr.map((n) => n.nota)) : 0;
  const classif = completo ? classificar(pontuacao) : ('PRECISA MELHORAR' as const);

  function buscar(tipo: 'colaborador' | 'gestor') {
    const mat = (tipo === 'colaborador' ? matAv : matGe).trim();
    if (!mat) return;
    start(async () => {
      const p = await buscarPessoaPorMatricula(mat, tipo);
      if (!p) {
        toast.error(`Matrícula não encontrada para ${tipo}`);
        return;
      }
      if (tipo === 'colaborador') setAvaliado(p);
      else setGestor(p);
    });
  }

  function salvar() {
    if (!avaliado || !gestor || !completo) return;
    start(async () => {
      try {
        const id = await salvarAvaliacao({
          avaliadoId: avaliado.id,
          gestorId: gestor.id,
          dataAvaliacao: new Date(),
          notas: notasArr,
          pontosFortes,
          oportunidades,
          comentarios,
        });
        toast.success('Avaliação salva');
        router.push(`/avaliacao/${id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
      }
    });
  }

  const inputClass =
    'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

  return (
    <div className="space-y-5">
      <Stepper step={step} />

      {step === 1 && (
        <ConectaCard>
          <SectionHeader label="Identificação" icon={UserCircle} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <Label className="font-display text-conecta-primary">
                Matrícula do avaliado *
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={matAv}
                  onChange={(e) => setMatAv(e.target.value)}
                  onBlur={() => buscar('colaborador')}
                  className={inputClass}
                />
                <Button
                  type="button"
                  variant="conecta-outline"
                  onClick={() => buscar('colaborador')}
                  disabled={pending}
                >
                  Buscar
                </Button>
              </div>
              {avaliado && (
                <p className="mt-2 text-xs text-conecta-muted bg-conecta-accent/8 border border-conecta-accent/20 rounded-md px-2 py-1.5">
                  <strong className="text-conecta-primary">{avaliado.nome}</strong>
                  {avaliado.funcao ? ` — ${avaliado.funcao}` : ''}
                </p>
              )}
            </div>
            <div>
              <Label className="font-display text-conecta-primary">
                Matrícula do gestor *
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={matGe}
                  onChange={(e) => setMatGe(e.target.value)}
                  onBlur={() => buscar('gestor')}
                  className={inputClass}
                />
                <Button
                  type="button"
                  variant="conecta-outline"
                  onClick={() => buscar('gestor')}
                  disabled={pending}
                >
                  Buscar
                </Button>
              </div>
              {gestor && (
                <p className="mt-2 text-xs text-conecta-muted bg-conecta-accent/8 border border-conecta-accent/20 rounded-md px-2 py-1.5">
                  <strong className="text-conecta-primary">{gestor.nome}</strong>
                  {gestor.funcao ? ` — ${gestor.funcao}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button
              type="button"
              variant="conecta"
              size="conecta"
              onClick={() => setStep(2)}
              disabled={!avaliado || !gestor || avaliado.id === gestor.id}
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </ConectaCard>
      )}

      {step === 2 && (
        <>
          <ProgressoAvaliacao feito={feito} total={totalFatores} />
          {competencias.map((c) => (
            <CompetenciaCard key={c.id} titulo={c.nome}>
              {c.fatores.map((f) => (
                <FatorRatingRow
                  key={f.id}
                  fatorId={f.id}
                  texto={f.texto}
                  ordem={f.ordem}
                  value={notas[f.id] ?? null}
                  onChange={(n) => setNotas((prev) => ({ ...prev, [f.id]: n }))}
                />
              ))}
            </CompetenciaCard>
          ))}
          <div className="flex justify-between">
            <Button type="button" variant="conecta-outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="button"
              variant="conecta"
              size="conecta"
              onClick={() => setStep(3)}
              disabled={!completo}
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <ConectaCard>
            <SectionHeader label="Feedback" icon={MessageSquare} />
            <div className="mt-5 space-y-4">
              <div>
                <Label className="font-display text-conecta-primary">Pontos fortes</Label>
                <Textarea
                  rows={4}
                  value={pontosFortes}
                  onChange={(e) => setPontosFortes(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="font-display text-conecta-primary">
                  Oportunidades de desenvolvimento
                </Label>
                <Textarea
                  rows={4}
                  value={oportunidades}
                  onChange={(e) => setOportunidades(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="font-display text-conecta-primary">Comentários gerais</Label>
                <Textarea
                  rows={4}
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </ConectaCard>
          <ResultadoCard pontuacao={pontuacao} classificacao={classif} />
          <div className="flex justify-between">
            <Button type="button" variant="conecta-outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="button"
              variant="conecta"
              size="conecta"
              onClick={salvar}
              disabled={pending || !completo}
            >
              {pending ? <Save className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
              {pending ? 'Salvando...' : 'Salvar avaliação'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
