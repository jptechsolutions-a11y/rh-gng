/**
 * Normaliza um código de filial para comparação: remove zeros à esquerda
 * (mantendo pelo menos um dígito). "020" e "20" devem casar com a mesma
 * filial — a planilha às vezes exporta com zero à esquerda, o cadastro nem
 * sempre foi salvo do mesmo jeito.
 */
export function normalizarCodigoFilial(codigo: string): string {
  return codigo.replace(/^0+(?=\d)/, '');
}
