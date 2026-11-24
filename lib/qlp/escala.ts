/** Dias da semana de uma escala: 0 = domingo ... 6 = sábado. */
export const DIAS_SEMANA = [
  { valor: 0, curto: 'Dom', longo: 'Domingo' },
  { valor: 1, curto: 'Seg', longo: 'Segunda' },
  { valor: 2, curto: 'Ter', longo: 'Terça' },
  { valor: 3, curto: 'Qua', longo: 'Quarta' },
  { valor: 4, curto: 'Qui', longo: 'Quinta' },
  { valor: 5, curto: 'Sex', longo: 'Sexta' },
  { valor: 6, curto: 'Sáb', longo: 'Sábado' },
] as const;

/** Valida e normaliza: só inteiros 0–6, sem repetição, em ordem crescente. */
export function normalizarDias(entrada: unknown): number[] {
  if (!Array.isArray(entrada)) return [];
  const set = new Set<number>();
  for (const d of entrada) {
    const n = Number(d);
    if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

const CURTO: string[] = DIAS_SEMANA.map((d) => d.curto);
const nomeDia = (d: number | undefined): string => (d === undefined ? '' : (CURTO[d] ?? ''));

/**
 * Resume os dias para exibição. Sequências de 3+ dias seguidos viram faixa
 * ("Seg–Sex"); o resto fica separado por vírgula ("Seg, Qua, Sex").
 */
export function formatarDias(dias: unknown): string {
  const lista = normalizarDias(dias);
  if (lista.length === 0) return '—';
  const partes: string[] = [];
  let i = 0;
  while (i < lista.length) {
    let j = i;
    while (j + 1 < lista.length && (lista[j + 1] ?? -1) === (lista[j] ?? -2) + 1) j++;
    const tamanho = j - i + 1;
    if (tamanho >= 3) partes.push(`${nomeDia(lista[i])}–${nomeDia(lista[j])}`);
    else for (let k = i; k <= j; k++) partes.push(nomeDia(lista[k]));
    i = j + 1;
  }
  return partes.join(', ');
}

/** Rótulo curto para o filtro/células: "Segunda a Sexta (Seg–Sex)". */
export function rotuloEscala(nome: string | null | undefined, dias: unknown): string {
  if (!nome) return 'Não definida';
  const resumo = formatarDias(dias);
  return resumo === '—' ? nome : `${nome} (${resumo})`;
}
