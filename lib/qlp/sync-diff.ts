import type { Classificacao } from './autoclassify';

export interface EstadoAtual {
  chapa: string;
  nome: string;
  codfilial: number;
  funcao: string;
  tier: string;
  situacao: string;
}

export interface LinhaNova {
  chapa: string;
  nome: string;
  codfilial: number;
  funcao: string;
  situacao: string;
}

export interface DiffResult {
  novos: LinhaNova[];
  atualizadosSemQuebra: { antes: EstadoAtual; depois: LinhaNova }[];
  mudancaTier: { antes: EstadoAtual; depois: LinhaNova; tierAntigo: string; tierNovo: string }[];
  mudancaFilial: { antes: EstadoAtual; depois: LinhaNova }[];
  desligados: EstadoAtual[];
}

export function computeDiff(
  atual: EstadoAtual[],
  novas: LinhaNova[],
  classify: (funcao: string) => Classificacao,
): DiffResult {
  const atualMap = new Map(atual.map((c) => [c.chapa, c]));
  const novasMap = new Map(novas.map((l) => [l.chapa, l]));

  const result: DiffResult = {
    novos: [],
    atualizadosSemQuebra: [],
    mudancaTier: [],
    mudancaFilial: [],
    desligados: [],
  };

  for (const linha of novas) {
    const antes = atualMap.get(linha.chapa);
    if (!antes) {
      result.novos.push(linha);
      continue;
    }
    if (antes.codfilial !== linha.codfilial) {
      result.mudancaFilial.push({ antes, depois: linha });
      continue;
    }
    const tierNovo = classify(linha.funcao).tier;
    if (antes.tier !== tierNovo) {
      result.mudancaTier.push({ antes, depois: linha, tierAntigo: antes.tier, tierNovo });
      continue;
    }
    if (
      antes.funcao !== linha.funcao ||
      antes.situacao !== linha.situacao ||
      antes.nome !== linha.nome
    ) {
      result.atualizadosSemQuebra.push({ antes, depois: linha });
    }
  }

  for (const c of atual) {
    if (!novasMap.has(c.chapa)) result.desligados.push(c);
  }
  return result;
}
