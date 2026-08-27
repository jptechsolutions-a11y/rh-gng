export interface VagaAbertaExistente {
  id: string;
  createdAt: Date;
}

export interface PlanoReconciliacao {
  criar: number;
  fecharIds: string[];
}

/**
 * Calcula o que fazer para que o nº de vagas ATIVAS (qualquer status) de uma
 * combinação (filial+função+seção) bata com `targetEmAberto` (valor vindo da
 * planilha importada).
 *
 * - `totalAtivasAtual`: quantas vagas ativas já existem para essa combinação,
 *   **em qualquer status** (Em aberto, Em processo de documentação, um status
 *   customizado que o admin criou, etc.) — é contra esse total que o target é
 *   comparado, não só contra as que ainda estão literalmente "Em aberto".
 *   Sem isso, mover uma vaga para outro status faz ela "sumir" da contagem e
 *   cada reimport subsequente recria uma vaga nova para a mesma necessidade
 *   já em atendimento (bug: duplicação a cada reimport).
 * - `fechavelCandidatas`: as vagas que PODEM ser fechadas automaticamente —
 *   só as que ainda estão "Em aberto" (nunca uma vaga com outro status).
 *
 * Regras:
 * - target > total ativo  → cria o delta com status "Em aberto".
 * - target < total ativo  → fecha as vagas fecháveis MAIS ANTIGAS primeiro,
 *   até o limite do que existe em `fechavelCandidatas` — se não houver
 *   fecháveis suficientes para cobrir a redução (porque o restante já está
 *   em processo), fecha só o que pode e para por aí; o total pode ficar
 *   acima do target, o que é esperado (nunca mexemos em vaga fora de "Em
 *   aberto").
 * - target === total ativo → nada a fazer.
 */
export function planejarReconciliacao(
  totalAtivasAtual: number,
  fechavelCandidatas: VagaAbertaExistente[],
  targetEmAberto: number,
): PlanoReconciliacao {
  const delta = targetEmAberto - totalAtivasAtual;
  if (delta >= 0) return { criar: delta, fecharIds: [] };

  const aFechar = Math.min(-delta, fechavelCandidatas.length);
  if (aFechar <= 0) return { criar: 0, fecharIds: [] };

  const maisAntigasPrimeiro = [...fechavelCandidatas].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const fecharIds = maisAntigasPrimeiro.slice(0, aFechar).map((v) => v.id);
  return { criar: 0, fecharIds };
}
