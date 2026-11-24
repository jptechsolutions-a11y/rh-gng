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

/**
 * Quantos colaboradores trabalham em cada dia da semana (índice 0 = domingo ... 6 = sábado),
 * somando as escalas. Quem está sem escala não entra na conta.
 */
export function contarPorDia(escalas: ReadonlyArray<{ dias: unknown; qtd: number }>): number[] {
  const total = [0, 0, 0, 0, 0, 0, 0];
  for (const e of escalas) {
    for (const d of normalizarDias(e.dias)) total[d] = (total[d] ?? 0) + e.qtd;
  }
  return total;
}

export interface LinhaCruzamento {
  chave: string;
  /** id da escala; null = colaborador sem escala. */
  escalaId: string | null;
  qtd: number;
}

export interface LinhaPivot {
  chave: string;
  total: number;
  semEscala: number;
  /** quantidade por id de escala. */
  porEscala: Record<string, number>;
}

/**
 * Agrupa linhas (chave × escala) em uma linha por chave, ordenada pelo total (desc) e
 * depois pelo nome. `ordem` fixa a posição de certas chaves (ex.: Manhã, Tarde, Noturno);
 * as que não estão nela vão depois, na ordem normal. `limite` corta a lista; `resto`
 * traz o que ficou de fora.
 */
export function pivotar(
  linhas: ReadonlyArray<LinhaCruzamento>,
  limite?: number,
  ordem?: readonly string[],
): { linhas: LinhaPivot[]; resto: number } {
  const mapa = new Map<string, LinhaPivot>();
  for (const l of linhas) {
    let p = mapa.get(l.chave);
    if (!p) {
      p = { chave: l.chave, total: 0, semEscala: 0, porEscala: {} };
      mapa.set(l.chave, p);
    }
    p.total += l.qtd;
    if (l.escalaId === null) p.semEscala += l.qtd;
    else p.porEscala[l.escalaId] = (p.porEscala[l.escalaId] ?? 0) + l.qtd;
  }
  const posicao = (chave: string) => {
    const i = ordem?.indexOf(chave) ?? -1;
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const todas = Array.from(mapa.values()).sort(
    (a, b) =>
      posicao(a.chave) - posicao(b.chave) ||
      b.total - a.total ||
      a.chave.localeCompare(b.chave, 'pt-BR'),
  );
  if (limite === undefined || todas.length <= limite) return { linhas: todas, resto: 0 };
  const cortadas = todas.slice(limite);
  return { linhas: todas.slice(0, limite), resto: cortadas.reduce((s, p) => s + p.total, 0) };
}

/** Rótulo curto para o filtro/células: "Segunda a Sexta (Seg–Sex)". */
export function rotuloEscala(nome: string | null | undefined, dias: unknown): string {
  if (!nome) return 'Não definida';
  const resumo = formatarDias(dias);
  return resumo === '—' ? nome : `${nome} (${resumo})`;
}
