export interface VagaAbertaExistente {
  id: string;
  createdAt: Date;
}

export interface PlanoReconciliacao {
  criar: number;
  fecharIds: string[];
}

/**
 * Calcula o que fazer para que o nº de vagas "Em aberto" de uma combinação
 * (filial+função+seção) bata com `targetEmAberto` (valor vindo da planilha
 * importada).
 *
 * - target > atual  → cria o delta com status "Em aberto".
 * - target < atual  → fecha as vagas "Em aberto" MAIS ANTIGAS primeiro
 *   (nunca inclui vagas com outro status — quem chama só deve passar as
 *   que já estão "Em aberto").
 * - target === atual → nada a fazer.
 */
export function planejarReconciliacao(
  abertasAtuais: VagaAbertaExistente[],
  targetEmAberto: number,
): PlanoReconciliacao {
  const delta = targetEmAberto - abertasAtuais.length;
  if (delta > 0) return { criar: delta, fecharIds: [] };
  if (delta === 0) return { criar: 0, fecharIds: [] };

  const maisAntigasPrimeiro = [...abertasAtuais].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const fecharIds = maisAntigasPrimeiro.slice(0, -delta).map((v) => v.id);
  return { criar: 0, fecharIds };
}
