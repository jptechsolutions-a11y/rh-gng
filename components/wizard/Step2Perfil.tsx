'use client';
import { TextField, SelectField, TextareaField } from './fields';

export function Step2Perfil({ cargos, opcoes }: { cargos: string[]; opcoes: Record<string, string[]> }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Perfil profissional</h3>
        <p className="text-sm text-perlog-slate">Cargo pretendido, formação e disponibilidade.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField name="cargoPretendido" label="Cargo pretendido" options={cargos} required />
        <TextField name="pretensaoSalarial" label="Pretensão salarial (R$)" type="number" />
        <SelectField name="escolaridade" label="Escolaridade" options={opcoes.escolaridade ?? []} />
        <SelectField name="estadoCivil" label="Estado civil" options={opcoes.estado_civil ?? []} />
        <SelectField name="possuiCnh" label="CNH" options={opcoes.cnh ?? []} />
        <TextField name="disponibilidadeInicio" label="Disponibilidade início" type="date" />
      </div>
      <TextareaField name="experiencias" label="Experiências profissionais" rows={5} />
    </div>
  );
}
