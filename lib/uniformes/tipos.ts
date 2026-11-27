/** Catálogo e regras do módulo Uniformes (espelha o antigo formulário do Google). */

export const ITENS_UNIFORME = [
  'CAMISETA - TREINAMENTO (AMARELA)',
  'CAMISETA - OPERAÇÃO (AZUL)',
  'CAMISETA - OPERADOR (VERMELHA)',
  'CAMISETA - MANUTENÇÃO (CINZA)',
  'CAMISETA - LIMPEZA (PRETA)',
  'CAMISETA - COZINHA (BRANCA)',
  'CAMISETA - PREVENÇÃO (CINZA ESCURO)',
  'CAMISETA - ADM (POLO)',
] as const;

export const TAMANHOS_UNIFORME = ['P', 'M', 'G', 'GG', 'EXG', 'EXGG'] as const;
export const QUANTIDADES_UNIFORME = [1, 2] as const;

export const MOTIVOS_UNIFORME = [
  { valor: 'troca_funcao', rotulo: 'Troca de função (mediante devolução)' },
  { valor: 'danificado', rotulo: 'Uniforme danificado (mediante devolução)' },
  { valor: 'outro', rotulo: 'Outro motivo' },
] as const;
export type MotivoUniforme = (typeof MOTIVOS_UNIFORME)[number]['valor'];

export const rotuloMotivo = (m: string, outro?: string | null): string => {
  if (m === 'outro') return outro ? `Outro: ${outro}` : 'Outro motivo';
  return MOTIVOS_UNIFORME.find((x) => x.valor === m)?.rotulo.replace(' (mediante devolução)', '') ?? m;
};

/** Troca e dano pedem devolução do uniforme antigo; "outro" o Gente e Gestão decide. */
export const exigeDevolucaoPadrao = (m: MotivoUniforme): boolean => m !== 'outro';

export type StatusUniforme = 'solicitado' | 'aprovado' | 'pronto' | 'entregue' | 'recusado';

export const STATUS_UNIFORME: { valor: StatusUniforme; rotulo: string }[] = [
  { valor: 'solicitado', rotulo: 'Solicitado' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'pronto', rotulo: 'Pronto para retirar' },
  { valor: 'entregue', rotulo: 'Entregue' },
  { valor: 'recusado', rotulo: 'Recusado' },
];

export const rotuloStatus = (s: string): string => STATUS_UNIFORME.find((x) => x.valor === s)?.rotulo ?? s;

export const COR_STATUS: Record<StatusUniforme, string> = {
  solicitado: 'bg-amber-50 text-amber-800 ring-amber-200',
  aprovado: 'bg-sky-50 text-sky-800 ring-sky-200',
  pronto: 'bg-violet-50 text-violet-800 ring-violet-200',
  entregue: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  recusado: 'bg-rose-50 text-rose-800 ring-rose-200',
};

/** Prazo de entrega: 48 horas após a solicitação. */
export const PRAZO_HORAS = 48;
export const prazoEntrega = (criadoEm: Date | string): Date =>
  new Date(new Date(criadoEm).getTime() + PRAZO_HORAS * 3600_000);

export interface SolicitacaoUniforme {
  id: string;
  criadoEm: string;
  solicitanteNome: string;
  solicitanteUsuario: string;
  filial: string;
  chapa: string;
  colaboradorNome: string;
  funcao: string | null;
  secao: string | null;
  item: string;
  tamanho: string;
  quantidade: number;
  motivo: string;
  motivoOutro: string | null;
  status: StatusUniforme;
  motivoRecusa: string | null;
  decididoPor: string | null;
  decididoEm: string | null;
  prontoEm: string | null;
  dataEntrega: string | null; // yyyy-mm-dd
  entreguePor: string | null;
  exigeDevolucao: boolean;
  devolvidoEm: string | null; // yyyy-mm-dd
  devolucaoObs: string | null;
  observacao: string | null;
}

/** Devolução do uniforme antigo ainda pendente? (só vale enquanto o pedido não foi recusado) */
export const devolucaoPendente = (s: Pick<SolicitacaoUniforme, 'exigeDevolucao' | 'devolvidoEm' | 'status'>): boolean =>
  s.exigeDevolucao && !s.devolvidoEm && s.status !== 'recusado';

/** Atrasado: passou das 48 h e ainda não foi entregue nem recusado. */
export const estaAtrasado = (s: Pick<SolicitacaoUniforme, 'criadoEm' | 'status'>, agora = new Date()): boolean =>
  s.status !== 'entregue' && s.status !== 'recusado' && prazoEntrega(s.criadoEm) < agora;

export interface ColaboradorUniforme {
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  filialCodigo: string;
  filialNome: string;
}
