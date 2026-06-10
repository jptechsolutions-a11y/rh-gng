import { z } from 'zod';

export const BH_HEADER = [
  'REGIONAL', 'BANDEIRA', 'CODFILIAL', 'CHAPA', 'NOME',
  'FUNCAO', 'SECAO', 'TOTAL_EM_HORA', 'TOTAL_NEGATIVO',
  'VAL_PGTO_BHS', 'SITUACAO',
] as const;

export const BHRowSchema = z.object({
  regional: z.string().nullable(),
  bandeira: z.string().nullable(),
  codfilial: z.string().min(1),
  chapa: z.string().min(1),
  nome: z.string().min(1),
  funcao: z.string().nullable(),
  secao: z.string().nullable(),
  horasDecimal: z.number().nonnegative(),
  valorPgto: z.number().nonnegative(),
  situacao: z.string().nullable(),
});
export type BHRow = z.infer<typeof BHRowSchema>;

export type BHParseResult = {
  rows: BHRow[];
  warnings: Array<{ linha: number; motivo: string }>;
};
