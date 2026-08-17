export function formatCpf(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return digits || null;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatRotaLabel(rota: { ordem: number; nome: string; turno: string }): string {
  return `Nº${rota.ordem} - ${rota.nome} (${rota.turno})`;
}
