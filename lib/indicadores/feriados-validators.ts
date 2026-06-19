import { z } from 'zod';

export const FeriadosRowSchema = z.object({
  regional:  z.string().nullable(),
  bandeira:  z.string().nullable(),
  codfilial: z.string().min(1),
  chapa:     z.string().min(1),
  nome:      z.string().min(1),
  funcao:    z.string().nullable(),
  secao:     z.string().nullable(),
  codsecao:  z.string().nullable(),
  pendencia: z.string().nullable(),
  dataFeriado: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  valor:     z.number(),
  dsr:       z.number(),
  encargos:  z.number(),
  total:     z.number(),
  abaOrigem: z.string().nullable(),
});
export type FeriadosRow = z.infer<typeof FeriadosRowSchema>;

export type FeriadosParseResult = {
  rows: FeriadosRow[];
  warnings: Array<{ aba?: string; linha?: number; motivo: string }>;
  abasProcessadas: string[];
  totalLidoBruto: number;
  totalNaoPerlog: number;
};
