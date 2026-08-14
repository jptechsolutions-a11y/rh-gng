import type { LinhaQuadro } from './xls-parser';

/** Subconjunto de qlp_colaboradores relevante para detectar mudanças no import. */
export interface ColaboradorAtual {
  chapa: string;
  nome: string;
  regional: string | null;
  bandeira: string | null;
  codfilial: number;
  funcao: string;
  secao: string | null;
  horario: string | null;
  nacionalidade: string | null;
  dtAdmissao: string | null;
  mesNasc: number | null;
  idade: number | null;
  situacao: string | null;
  tierResolvido: string | null;
}

export interface MudancasDetectadas {
  algoMudou: boolean;
  tierMudou: boolean;
  filialMudou: boolean;
}

/**
 * Compara o estado atual do colaborador (DB) com a linha do XLS e o tier
 * recém-classificado, campo a campo — cobrindo TODOS os campos que o patch
 * de UPDATE realmente grava. Antes só comparava funcao/nome/situacao/tier/
 * filial, então mudanças isoladas de seção, horário, regional etc. eram
 * calculadas no patch mas o UPDATE nunca era disparado (algoMudou ficava
 * false) — colaborador ficava com dado desatualizado após o import.
 */
export function detectarMudancas(
  antes: ColaboradorAtual,
  linha: LinhaQuadro,
  tierNovo: string,
): MudancasDetectadas {
  const tierMudou = (antes.tierResolvido ?? 'base') !== tierNovo;
  const filialMudou = antes.codfilial !== linha.codfilial;
  const algoMudou =
    tierMudou ||
    filialMudou ||
    antes.funcao !== linha.funcao ||
    antes.nome !== linha.nome ||
    antes.situacao !== linha.situacao ||
    antes.secao !== linha.secao ||
    antes.regional !== (linha.regional || null) ||
    antes.bandeira !== (linha.bandeira || null) ||
    antes.horario !== linha.horario ||
    antes.nacionalidade !== linha.nacionalidade ||
    antes.dtAdmissao !== linha.dtAdmissao ||
    antes.mesNasc !== linha.mesNasc ||
    antes.idade !== linha.idade;

  return { algoMudou, tierMudou, filialMudou };
}
