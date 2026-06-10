import { z } from 'zod';

export const INCONSIST_HEADER = [
  'REGIONAL', 'BANDEIRA', 'CODFILIAL', 'CHAPA', 'NOME',
  'FUNCAO', 'DESC_SECAO', 'TIPO', 'DATA', 'CODSITUACAO', 'TOTAL GERAL',
] as const;

export const InconsistRowSchema = z.object({
  regional:  z.string().nullable(),
  bandeira:  z.string().nullable(),
  codfilial: z.string().min(1),
  chapa:     z.string().min(1),
  nome:      z.string().min(1),
  funcao:    z.string().nullable(),
  secao:     z.string().nullable(),
  tipo:      z.string().min(1),
  dataOcorrencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  codsituacao: z.string().nullable(),
});
export type InconsistRow = z.infer<typeof InconsistRowSchema>;

export type InconsistParseResult = {
  rows: InconsistRow[];
  warnings: Array<{ linha: number; motivo: string }>;
};
