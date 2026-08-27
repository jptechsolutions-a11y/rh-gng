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

export type VagasDetalheCD = {
  filialId: string;
  codigo: string;
  nome: string;
  contratarPorClassificacao: Record<Classificacao, number>; // nº de vagas em aberto (contratar)
  aprov: number;          // Σ limite (quadro aprovado)
  ativo: number;          // Σ alocados
  totalAbertas: number;   // total de vagas em aberto no sistema
  porStatus: Record<string, number>;
};
