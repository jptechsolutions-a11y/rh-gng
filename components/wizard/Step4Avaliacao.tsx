'use client';
import { useFormContext } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { SelectField, TextField, TextareaField } from './fields';
import type { EntrevistaInput } from '@/lib/validators';

const COMPORTAMENTOS: Array<{ slug: string; label: string }> = [
  { slug: 'comunicacao', label: 'Boa comunicação' },
  { slug: 'interesse_vaga', label: 'Interesse pela vaga' },
  { slug: 'postura', label: 'Postura profissional' },
  { slug: 'pontualidade', label: 'Pontualidade' },
  { slug: 'clareza', label: 'Clareza nas respostas' },
  { slug: 'estabilidade_emocional', label: 'Estabilidade emocional' },
  { slug: 'energia', label: 'Energia / disposição' },
  { slug: 'comprometimento', label: 'Comprometimento' },
  { slug: 'equipe', label: 'Facilidade para trabalho em equipe' },
];

const PARECERES = [
  'Aprovado',
  'Banco de talentos',
  'Reavaliar em outra oportunidade',
  'Não aderente à vaga',
] as const;

const NIVEIS: Array<{ value: 'sim' | 'parcial' | 'nao'; label: string }> = [
  { value: 'sim', label: 'Sim' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'nao', label: 'Não' },
];

export function Step4Avaliacao({ opcoes }: { opcoes: Record<string, string[]> }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<EntrevistaInput>();
  const notas = (watch('notasCriterios') ?? {}) as Record<string, 'sim' | 'parcial' | 'nao'>;
  const parecer = watch('parecer');
  const consent = watch('consentimentoLgpd');
  const statusAtual = watch('status');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Comportamento e parecer</h3>
        <p className="text-sm text-perlog-slate">Avaliação dos 9 comportamentos observados durante a entrevista, parecer final e decisão.</p>
      </div>

      <div className="space-y-2">
        <Label>Durante a entrevista, o candidato demonstrou:</Label>
        <div className="rounded-lg border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_auto] items-center bg-slate-50 px-4 py-2 text-xs font-semibold text-perlog-slate uppercase tracking-wide">
            <span>Comportamento</span>
            <div className="flex gap-1.5">
              {NIVEIS.map((n) => (
                <span key={n.value} className="w-16 sm:w-20 text-center">{n.label}</span>
              ))}
            </div>
          </div>
          {COMPORTAMENTOS.map((c) => (
            <div key={c.slug} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_auto] items-center px-4 py-2 border-t border-slate-100">
              <span className="text-sm text-perlog-navy">{c.label}</span>
              <div className="flex gap-1.5">
                {NIVEIS.map((n) => {
                  const active = notas[c.slug] === n.value;
                  return (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => setValue(`notasCriterios.${c.slug}` as const, n.value, { shouldDirty: true })}
                      className={`w-16 sm:w-20 h-8 rounded-md text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-perlog-orange text-white border-perlog-orange'
                          : 'bg-white text-perlog-slate border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Parecer final do entrevistador</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PARECERES.map((p) => {
            const active = parecer === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setValue('parecer', p, { shouldDirty: true })}
                className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors text-left ${
                  active
                    ? 'bg-perlog-orange text-white border-perlog-orange'
                    : 'bg-white text-perlog-navy border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField name="status" label="Status final" options={opcoes.status ?? []} required />
        <TextField name="dataRetorno" label="Data de retorno" type="date" placeholder="Quando dar retorno ao candidato" />
      </div>

      <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer">
        <input type="checkbox" {...register('aprovadoPeloGg')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40" />
        <span className="text-sm text-perlog-navy">
          <span className="font-semibold block">Avaliado pelo Gente &amp; Gestão</span>
          <span className="text-xs text-perlog-slate">Marque se o G&amp;G já fez a avaliação inicial — aguardando decisão do gestor.</span>
        </span>
      </label>

      {(statusAtual === 'Aprovado' || statusAtual === 'Reprovado') && (
        <div className="rounded-lg border border-perlog-orange/30 bg-perlog-orange/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-perlog-navy">Decisão final — {statusAtual.toLowerCase()}</p>
          <TextField name="gestorAprovador" label={statusAtual === 'Aprovado' ? 'Gestor que aprovou' : 'Gestor que reprovou'} required placeholder="Nome do gestor responsável pela decisão" />
        </div>
      )}

      <TextareaField name="motivoDecisao" label="Motivo da decisão" rows={3} />
      <TextareaField name="observacoes" label="Observações gerais" rows={3} />

      <label className="flex gap-3 rounded-lg border border-perlog-orange/20 bg-perlog-orange/5 p-4 cursor-pointer">
        <input type="checkbox" {...register('consentimentoLgpd')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40" />
        <span className="text-sm text-perlog-navy">
          <span className="font-semibold flex items-center gap-1.5 mb-0.5">
            <ShieldCheck className="h-4 w-4 text-perlog-orange" />
            Consentimento LGPD
          </span>
          O candidato autoriza o tratamento dos dados pessoais informados para fins de processo seletivo, conforme a Lei 13.709/2018. Dados são acessíveis apenas pela filial e pelo RH central.
        </span>
      </label>
      {!consent && errors.consentimentoLgpd && (
        <p className="text-xs text-red-600">{errors.consentimentoLgpd.message as string}</p>
      )}
    </div>
  );
}
