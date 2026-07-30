import type { LinhaPassageiro } from './xls-parser';

export interface PassageiroAtual {
  id: string;
  chapa: string | null;
  nome: string;
  cidade: string | null;
  rotaId: string | null;
}

export interface PassageiroAtualizado {
  id: string;
  chapa: string;
  nome: string;
  cidade: string | null;
}

export interface DiffPassageiros {
  novos: LinhaPassageiro[];
  atualizados: PassageiroAtualizado[];
  mantidos: number;
  desligados: PassageiroAtual[];
}

export function computeDiffPassageiros(
  atual: PassageiroAtual[],
  novos: LinhaPassageiro[],
): DiffPassageiros {
  const atualMap = new Map(atual.filter((a) => a.chapa).map((a) => [a.chapa as string, a]));
  const novasMap = new Map(novos.map((n) => [n.chapa, n]));

  const result: DiffPassageiros = { novos: [], atualizados: [], mantidos: 0, desligados: [] };

  for (const linha of novos) {
    const antes = atualMap.get(linha.chapa);
    if (!antes) {
      result.novos.push(linha);
      continue;
    }
    if (antes.nome !== linha.nome || antes.cidade !== linha.cidade) {
      result.atualizados.push({ id: antes.id, chapa: linha.chapa, nome: linha.nome, cidade: linha.cidade });
    } else {
      result.mantidos++;
    }
  }

  for (const a of atual) {
    if (!a.chapa || !novasMap.has(a.chapa)) result.desligados.push(a);
  }

  return result;
}
