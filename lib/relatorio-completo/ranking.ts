export type TotalFilial = { filialId: string; valor: number };

/**
 * Posição da filial no ranking — menor valor é melhor (posição 1).
 * Dense rank: empates compartilham a posição. `posicao` é null quando o
 * conjunto tem menos de 2 filiais ou a filial não está nele.
 */
export function posicaoNoRanking(
  filialId: string,
  totais: TotalFilial[],
): { posicao: number | null; total: number } {
  const total = totais.length;
  const alvo = totais.find((t) => t.filialId === filialId);
  if (total < 2 || !alvo) return { posicao: null, total };

  const valoresUnicos = [...new Set(totais.map((t) => t.valor))].sort((a, b) => a - b);
  const posicao = valoresUnicos.indexOf(alvo.valor) + 1;
  return { posicao, total };
}
