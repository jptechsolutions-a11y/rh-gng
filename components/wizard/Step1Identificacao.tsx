'use client';
import { TextField } from './fields';
import { CpfDuplicateAlert } from './CpfDuplicateAlert';

export function Step1Identificacao({ entrevistaIdAtual }: { entrevistaIdAtual?: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Identificação do candidato</h3>
        <p className="text-sm text-perlog-slate">Dados pessoais e entrevistador.</p>
      </div>
      <CpfDuplicateAlert entrevistaIdAtual={entrevistaIdAtual} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField name="nome" label="Nome completo" required />
        <TextField name="cpf" label="CPF" required placeholder="000.000.000-00" />
        <TextField name="dataNasc" label="Data de nascimento" type="date" />
        <TextField name="recrutador" label="Entrevistador(a)" required placeholder="Nome de quem está entrevistando" />
      </div>
    </div>
  );
}
