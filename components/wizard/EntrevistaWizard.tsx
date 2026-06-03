'use client';

import { useState, useTransition } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, UserCircle, Briefcase, MessageSquare, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { entrevistaInputSchema, type EntrevistaInput } from '@/lib/validators';
import { salvarEntrevista } from '@/actions/entrevistas';
import { Step1Identificacao } from './Step1Identificacao';
import { Step2Perfil } from './Step2Perfil';
import { Step3Roteiro } from './Step3Roteiro';
import { Step4Avaliacao } from './Step4Avaliacao';

type Criterio = { id: string; nome: string; escalaMax: number; peso: string; ativo: boolean; ordem: number };
type RoteiroItem = { id: string; cargo: string; ordem: number; pergunta: string; tipo: string; opcoes?: string[] | null; ativo: boolean };
type Inicial = Record<string, unknown> | null;

const STEPS = [
  { id: 1, label: 'Identificação', icon: UserCircle },
  { id: 2, label: 'Perfil',        icon: Briefcase },
  { id: 3, label: 'Roteiro',       icon: MessageSquare },
  { id: 4, label: 'Avaliação',     icon: Star },
] as const;

export function EntrevistaWizard({
  inicial, cargos, roteiro, criterios, opcoes,
}: {
  inicial: Inicial;
  cargos: string[];
  roteiro: RoteiroItem[];
  criterios: Criterio[];
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
      notasCriterios: (inicial?.notasCriterios as Record<string, number>) ?? {},
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

        <Card>
          <CardContent className="p-6">
            {step === 1 && <Step1Identificacao entrevistaIdAtual={(inicial?.id as string | undefined)} />}
            {step === 2 && <Step2Perfil cargos={cargos} opcoes={opcoes} />}
            {step === 3 && <Step3Roteiro roteiro={roteiro} />}
            {step === 4 && <Step4Avaliacao criterios={criterios} opcoes={opcoes} />}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Avançar
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
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
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = step === s.id;
        const done = step > s.id;
        return (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
              active && 'bg-perlog-orange text-white border-perlog-orange shadow-sm',
              done && 'bg-perlog-orange/10 text-perlog-orange border-perlog-orange/20',
              !active && !done && 'bg-white text-perlog-slate border-slate-200',
            )}>
              <Icon className="h-4 w-4" />
              <span className="font-medium whitespace-nowrap">{s.id}. {s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px w-6 sm:w-12', done ? 'bg-perlog-orange/40' : 'bg-slate-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
