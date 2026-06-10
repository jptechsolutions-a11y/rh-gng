'use client';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Sun, Sunset, Moon } from 'lucide-react';
import { SelectField, TextareaField } from './fields';
import type { EntrevistaInput } from '@/lib/validators';

const TURNOS = [
  { value: 'Manhã', label: 'Manhã', icon: Sun },
  { value: 'Tarde', label: 'Tarde', icon: Sunset },
  { value: 'Noturno', label: 'Noturno', icon: Moon },
] as const;

function TurnoMultiSelect() {
  const { watch, setValue } = useFormContext<EntrevistaInput>();
  const turnos = (watch('disponibilidadeTurnos') as string[] | null | undefined) ?? [];

  const toggle = (v: string) => {
    const set = new Set(turnos);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    setValue('disponibilidadeTurnos', Array.from(set), { shouldDirty: true });
  };

  return (
    <div className="sm:col-span-2 space-y-1.5">
      <Label>Preferência de turno</Label>
      <div className="flex flex-wrap gap-2">
        {TURNOS.map(({ value, label, icon: Icon }) => {
          const active = turnos.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                active
                  ? 'bg-perlog-orange text-white border-perlog-orange shadow-sm'
                  : 'bg-white text-perlog-slate border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-perlog-slate">Selecione um ou mais turnos em que o candidato pode trabalhar.</p>
    </div>
  );
}

export function Step2Perfil({ cargos }: { cargos: string[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Perfil profissional</h3>
        <p className="text-sm text-perlog-slate">Cargo pretendido, disponibilidade de turno e experiências.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField name="cargoPretendido" label="Cargo pretendido" options={cargos} required />
        <TurnoMultiSelect />
      </div>
      <TextareaField name="experiencias" label="Experiências profissionais" rows={5} />
    </div>
  );
}
