import { z } from 'zod';

// Cabeçalho esperado da planilha "TREINAMENTOS OBRIGATÓRIOS".
// "Nome da Origem" é ignorada (índice 0).
export const CURSOS_HEADER = [
  'NOME DA ORIGEM', 'REGIONAL', 'BANDEIRA', 'LOJA', 'CHAPA', 'NOME',
  'DESC_FUNCAO', 'DESC_SECAO', 'CODSITUACAO', 'TIPO', 'DATA',
  'CONTAGEM', 'PENDENCIA', 'BP NACIONAL3', 'BP REGIONAL4',
] as const;

export const CursosRowSchema = z.object({
  regional:  z.string().nullable(),
  bandeira:  z.string().nullable(),
  codfilial: z.string().min(1),
  chapa:     z.string().min(1),
  nome:      z.string().min(1),
  funcao:    z.string().nullable(),
  secao:     z.string().nullable(),
  codsituacao: z.string().nullable(),
  tipo:      z.string().nullable(),
  dataTreinamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  contagem:  z.number().int().nonnegative(),
  pendencia: z.string().nullable(),
  bpNacional: z.string().nullable(),
  bpRegional: z.string().nullable(),
});
export type CursosRow = z.infer<typeof CursosRowSchema>;

export type CursosParseResult = {
  rows: CursosRow[];
  warnings: Array<{ linha: number; motivo: string }>;
};
