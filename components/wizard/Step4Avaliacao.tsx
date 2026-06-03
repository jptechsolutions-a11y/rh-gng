'use client';
import { useFormContext } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { SelectField, TextField, TextareaField } from './fields';
import type { EntrevistaInput } from '@/lib/validators';

type Criterio = { id: string; nome: string; escalaMax: number };

export function Step4Avaliacao({
  criterios, opcoes,
}: { criterios: Criterio[]; opcoes: Record<string, string[]> }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<EntrevistaInput>();
  const notas = watch('notasCriterios') ?? {};
  const consent = watch('consentimentoLgpd');
  const statusAtual = watch('status');

  const media = (() => {
    const ns = Object.values(notas).map((v) => Number(v)).filter((n) => !Number.isNaN(n) && n > 0);
    if (ns.length === 0) return 0;
    return (ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(2);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Avaliação e decisão</h3>
        <p className="text-sm text-perlog-slate">Atribua notas, defina status e registre o consentimento LGPD.</p>
      </div>

      <div className="space-y-3">
        <Label>Notas por critério</Label>
        <div className="space-y-2">
          {criterios.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-4 py-3">
              <span className="text-sm font-medium text-perlog-navy">{c.nome}</span>
              <div className="flex gap-1.5">
                {Array.from({ length: c.escalaMax }).map((_, i) => {
                  const n = i + 1;
                  const active = Number(notas[c.id]) === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue(`notasCriterios.${c.id}` as const, n, { shouldDirty: true })}
                      className={`h-8 w-8 rounded-md text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-perlog-orange text-white border-perlog-orange'
                          : 'bg-white text-perlog-slate border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {criterios.length === 0 && <p className="text-sm text-perlog-slate">Nenhum critério configurado.</p>}
        </div>
        <div className="text-sm text-perlog-slate">Média atual: <span className="font-semibold text-perlog-navy tabular-nums">{media}</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField name="status" label="Status final" options={opcoes.status ?? []} required />
        <TextField
          name="dataRetorno"
          label="Data de retorno"
          type="date"
          placeholder="Quando dar retorno ao candidato"
        />
      </div>

      <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer">
        <input
          type="checkbox"
          {...register('aprovadoPeloGg')}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40"
        />
        <span className="text-sm text-perlog-navy">
          <span className="font-semibold block">Avaliado pelo Gente &amp; Gestão</span>
          <span className="text-xs text-perlog-slate">Marque se o G&amp;G já fez a avaliação inicial — aguardando decisão do gestor.</span>
        </span>
      </label>

      {(statusAtual === 'Aprovado' || statusAtual === 'Reprovado') && (
        <div className="rounded-lg border border-perlog-orange/30 bg-perlog-orange/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-perlog-navy">
            Decisão final — {statusAtual.toLowerCase()}
          </p>
          <TextField
            name="gestorAprovador"
            label={statusAtual === 'Aprovado' ? 'Gestor que aprovou' : 'Gestor que reprovou'}
            required
            placeholder="Nome do gestor responsável pela decisão"
          />
        </div>
      )}

      <TextareaField name="motivoDecisao" label="Motivo da decisão" rows={3} />
      <TextareaField name="observacoes" label="Observações gerais" rows={3} />

      <label className="flex gap-3 rounded-lg border border-perlog-orange/20 bg-perlog-orange/5 p-4 cursor-pointer">
        <input
          type="checkbox"
          {...register('consentimentoLgpd')}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40"
        />
        <span className="text-sm text-perlog-navy">
          <span className="font-semibold flex items-center gap-1.5 mb-0.5">
            <ShieldCheck className="h-4 w-4 text-perlog-orange" />
            Consentimento LGPD
          </span>
          O candidato autoriza o tratamento dos dados pessoais informados para fins de processo seletivo,
          conforme a Lei 13.709/2018. Dados são acessíveis apenas pela filial e pelo RH central.
        </span>
      </label>
      {!consent && errors.consentimentoLgpd && (
        <p className="text-xs text-red-600">{errors.consentimentoLgpd.message as string}</p>
      )}
    </div>
  );
}
