import type { Classificacao } from './classificacao-secao';

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
  vagasDetalhe: VagasDetalheCD[];   // ordenado por totalAbertas desc
  statusVagas: string[];            // nomes dos status ativos, na ordem de vagasStatus.ordem
};

// ---------- Vagas: detalhe por CD (classificação + status) ----------

export type VagasClassifLinha = {
  classificacao: Classificacao;
  aprov: number;    // Σ limite das linhas do quadro dessa classificação
  ativo: number;    // Σ alocados
  contratar: number; // max(0, aprov - ativo)  — igual à imagem do quadro
  abertas: number;  // nº de vagas em aberto (registros na tabela `vagas`) dessa classificação
};

export type VagasDetalheCD = {
  filialId: string;
  codigo: string;
  nome: string;
  porClassificacao: VagasClassifLinha[]; // só classificações que têm linha no quadro OU vaga em aberto
  totalAprov: number;
  totalAtivo: number;
  totalContratar: number;   // Σ contratar das linhas exibidas
  totalAbertas: number;
  porStatus: Record<string, number>;
};
