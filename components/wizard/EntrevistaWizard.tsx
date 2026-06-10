'use client';

import { useState, useTransition } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, UserCircle, Briefcase, MessageSquare, ClipboardCheck } from 'lucide-react';
import { ConectaCard } from '@/components/ui/conecta-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { entrevistaInputSchema, type EntrevistaInput } from '@/lib/validators';
import { salvarEntrevista } from '@/actions/entrevistas';
import { Step1Identificacao } from './Step1Identificacao';
import { Step2Perfil } from './Step2Perfil';
import { Step3Roteiro } from './Step3Roteiro';
import { Step4Avaliacao } from './Step4Avaliacao';

type RoteiroItem = { id: string; cargo: string; ordem: number; pergunta: string; tipo: string; opcoes?: string[] | null; ativo: boolean };
type Inicial = Record<string, unknown> | null;

const STEPS = [
  { id: 1, label: 'Identificação', icon: UserCircle },
  { id: 2, label: 'Perfil',        icon: Briefcase },
  { id: 3, label: 'Roteiro',       icon: MessageSquare },
  { id: 4, label: 'Comportamento', icon: ClipboardCheck },
] as const;

export function EntrevistaWizard({
  inicial, cargos, roteiro, opcoes,
}: {
  inicial: Inicial;
  cargos: string[];
  roteiro: RoteiroItem[];
  opcoes: Record<string, string[]>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();

  const methods = useForm<EntrevistaInput>({
    resolver: zodResolver(entrevistaInputSchema),
    mode: 'onBlur',
    defaultValues: {
      cpf: (inicial?.cpf as string) ?? '',
      nome: (inicial?.nome as string) ?? '',
      recrutador: (inicial?.recrutador as string) ?? '',
      gestorAprovador: (inicial?.gestorAprovador as string) ?? '',
      aprovadoPeloGg: Boolean(inicial?.aprovadoPeloGg),
      respostasRoteiro: (inicial?.respostasRoteiro as Record<string, string | number | boolean>) ?? {},
      notasCriterios: (inicial?.notasCriterios as Record<string, 'sim' | 'parcial' | 'nao'>) ?? {},
      parecer: (inicial?.parecer as EntrevistaInput['parecer']) ?? null,
      consentimentoLgpd: Boolean(inicial?.id),
      status: (inicial?.status as EntrevistaInput['status']) ?? 'Em análise',
    } as Partial<EntrevistaInput>,
  });

  const goNext = async () => {
    const fieldsByStep: Record<number, (keyof EntrevistaInput)[]> = {
      1: ['cpf', 'nome', 'recrutador'],
      2: ['cargoPretendido'],
      3: [],
      4: ['consentimentoLgpd', 'gestorAprovador'],
    };
    const ok = await methods.trigger(fieldsByStep[step]);
    if (ok) setStep((s) => Math.min(4, s + 1));
  };

  const onSubmit = methods.handleSubmit(
    (data) => {
      startTransition(async () => {
        try {
          const idExistente = (inicial?.id as string | undefined);
          const res = await salvarEntrevista(data, idExistente);
          toast.success(idExistente ? 'Entrevista atualizada' : 'Entrevista salva');
          router.push(`/entrevista/${res.id}`);
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
        }
      });
    },
    (errors) => {
      // Validação falhou — mostra ao usuário em qual campo
      const first = Object.entries(errors)[0];
      if (first) {
        const [campo, err] = first;
        const msg = (err as { message?: string })?.message ?? 'Verifique os campos preenchidos';
        toast.error(`${campo}: ${msg}`);
      } else {
        toast.error('Verifique os campos preenchidos');
      }
    },
  );

  // Bloqueia submit via Enter exceto no último step (evita salvar entrevista incompleta).
  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && step < 4 && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="space-y-6">
        <Stepper step={step} />

        <ConectaCard>
          {step === 1 && <Step1Identificacao entrevistaIdAtual={(inicial?.id as string | undefined)} />}
          {step === 2 && <Step2Perfil cargos={cargos} />}
          {step === 3 && <Step3Roteiro roteiro={roteiro} />}
          {step === 4 && <Step4Avaliacao opcoes={opcoes} />}
        </ConectaCard>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="conecta-outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          {step < 4 ? (
            <Button type="button" variant="conecta" size="conecta" onClick={goNext}>
              Avançar
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" variant="conecta" size="conecta" disabled={pending}>
              {pending ? <Save className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
              {pending ? 'Salvando...' : 'Salvar entrevista'}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

function Stepper({ step }: { step: number }) {
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
              style={
                active
                  ? { background: '#E8621A' }
                  : undefined
              }
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
