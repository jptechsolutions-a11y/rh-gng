/** Pendência (uma linha por colaborador × documento/regularização pendente), já filtrada para PERLOG. */
export interface IcPendenciaInput {
  filialCodigo: string;
  regional: string | null;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  codsituacao: string | null;
  categoria: string;
  tipo: string | null;
  dataPend: string | null; // yyyy-mm-dd
}

export interface IcHeadcountInput {
  filialCodigo: string;
  qtd: number;
}

/** Linha enxuta que vai para o dashboard (cliente). */
export interface IcRow {
  filial: string;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string;
  sit: string;
  categoria: string;
  tipo: string;
  data: string | null;
  resp: string; // nome do responsável (grupo) ou 'Sem responsável'
  /** true = filial fora do escopo da sessão: só entra nas contagens/ranking, sem nome nem matrícula reais. */
  restrito: boolean;
}

export interface IcResponsavelView {
  id: string;
  nome: string;
  cor: string;
  imagem: string | null;
  filiais: string[];
}

export interface IcSemana {
  id: string;
  semanaRef: string; // yyyy-mm-dd
  total: number;
}

/** Pendências por responsável em cada semana — base da evolução e das setas de posição. */
export interface IcEvolucaoPonto {
  semanaRef: string;
  porResp: Record<string, number>; // nome do responsável → pendências
  porFilial: Record<string, number>; // filial → pendências
}

export const SEM_RESP = 'Sem responsável';

/** UF (SC, SP, RS, MT, MS, DF…) de cada filial — escolhe o cavalo com a bandeira do estado. */
export type IcUfPorFilial = Record<string, string>;

export interface IcResponsavelInput {
  id?: string;
  nome: string;
  cor: string;
  imagem: string | null;
  filiais: string[];
}
