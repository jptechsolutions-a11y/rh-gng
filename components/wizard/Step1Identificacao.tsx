'use client';
import { TextField } from './fields';

export function Step1Identificacao() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-perlog-navy">Identificação do candidato</h3>
        <p className="text-sm text-perlog-slate">Dados pessoais e contato.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField name="nome" label="Nome completo" required />
        <TextField name="cpf" label="CPF" required placeholder="000.000.000-00" />
        <TextField name="dataNasc" label="Data de nascimento" type="date" />
        <TextField name="rg" label="RG" />
        <TextField name="telefone" label="Telefone" placeholder="(00) 00000-0000" />
        <TextField name="email" label="E-mail" type="email" />
        <TextField name="cidade" label="Cidade" />
        <TextField name="linkedin" label="LinkedIn" type="url" />
      </div>
    </div>
  );
}
