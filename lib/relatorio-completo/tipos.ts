export type Tendencia = 'melhorou' | 'piorou' | 'neutro';

export type Variacao = { deltaPct: number | null; tendencia: Tendencia };

export type ChaveIndicador = 'bh' | 'inconsist' | 'cursos' | 'feriados' | 'vagas';

export type CDIndicador = {
  filialId: string;
  codigo: string;
  nome: string;
  valor: number;                 // valor atual do indicador (menor = melhor)
  valorFmt: string;
  variacao: Variacao | null;     // null quando o indicador não tem histórico
  posicao: number;               // 1 = melhor
};

export type RankingIndicador = {
  chave: ChaveIndicador;
  titulo: string;
  temHistorico: boolean;
  semDados: boolean;             // nenhum CD tem dado deste indicador
  cds: CDIndicador[];            // ordenado por posicao asc
  leitura: string;
};

export type DadosConsolidado = {
  geradoEm: string;             // ISO
  totalCDs: number;
  rankings: RankingIndicador[]; // ordem: bh, inconsist, cursos, feriados, vagas
};
