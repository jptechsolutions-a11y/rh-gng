// DE-PARA: DESC_SECAO (tabela do Quadro de Vagas) → classificação.
// Seções não mapeadas caem em "Área de Apoio".

export type Classificacao = 'Área de Apoio' | 'Operação' | 'Transporte' | 'Expansão';

/** Ordem de exibição nas tabelas. */
export const CLASSIFICACOES: Classificacao[] = ['Área de Apoio', 'Expansão', 'Operação', 'Transporte'];

const norm = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

const MAPA: Record<string, Classificacao> = {
  'ABASTECIMENTO (OPERACAO)': 'Área de Apoio',
  'GENTE E GESTAO': 'Área de Apoio',
  'OPERACIONAL (OPERACAO)': 'Operação',
  'TRANSPORTE (OPERACAO)': 'Transporte',
  'APOIO - JOVEM APRENDIZ': 'Área de Apoio',
  'GESTAO DE ESTOQUE (OPERACAO)': 'Área de Apoio',
  'FINANCEIRO (ADM)': 'Área de Apoio',
  'PREVENCAO DE PERDAS (ADM)': 'Área de Apoio',
  'SEPARACAO (OPERACAO)': 'Operação',
  'EXPEDICAO (OPERACAO)': 'Operação',
  'DEVOLUCAO (OPERACAO)': 'Área de Apoio',
  'RECEBIMENTO (OPERACAO)': 'Operação',
  'COZINHA': 'Área de Apoio',
  'LIMPEZA E CONSERVACAO': 'Área de Apoio',
  'MANUTENCAO (ADM)': 'Área de Apoio',
  'GERENCIA (OPERACAO)': 'Operação',
  'ARMAZENAGEM (OPERACAO)': 'Área de Apoio',
  'SEGURANCA/PORTARIA (ADM)': 'Área de Apoio',
  'PROMOTORES (INTEGRADO) - PERECIVEIS': 'Área de Apoio',
  'PROMOTORES (INTEGRADO)': 'Área de Apoio',
  'F.L.V. (OPERACAO)': 'Operação',
  'INFORMATICA (ADM)': 'Área de Apoio',
  'MOTORISTAS (OPERACAO)': 'Transporte',
  'SAC': 'Área de Apoio',
  'SORTER (OPERACAO)': 'Área de Apoio',
  'EXPANSAO': 'Expansão',
  'SAUDE E SEGURANCA NO TRABALHO': 'Área de Apoio',
  'DIVISAO PERLOG (OPERACOES)': 'Área de Apoio',
  'PREVENCAO PERLOG (OPERACAO)': 'Área de Apoio',
  'DIRETORIA PERLOG (OPERACOES)': 'Área de Apoio',
  'GERENCIA PERLOG (OPERACOES)': 'Área de Apoio',
  'OPERACAO DE ALIMENTOS (OP. PERLOG)': 'Área de Apoio',
  'CESTA BASICA (OPERACAO)': 'Operação',
  'DEPOSITO': 'Área de Apoio',
  'PREVENCAO': 'Área de Apoio',
  'MOTORISTAS': 'Área de Apoio',
  'PREVENCAO (PERLOG)': 'Área de Apoio',
  'NOVOS NEGOCIOS (OPERACOES)': 'Área de Apoio',
  'MONITORAMENTO PERLOG (OPERACOES)': 'Transporte',
  'GENTE E GESTAO PERLOG (OPERACOES)': 'Área de Apoio',
  'DIVISAO PERLOG (NEGOCIOS)': 'Área de Apoio',
  'ABASTECIMENTO PERLOG (OPERACOES)': 'Área de Apoio',
};

export function classificarSecao(secao: string | null | undefined): Classificacao {
  if (!secao) return 'Área de Apoio';
  return MAPA[norm(secao)] ?? 'Área de Apoio';
}
