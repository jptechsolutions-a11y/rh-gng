import { z } from 'zod';

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .refine((cpf) => cpf.length === 11, 'CPF deve ter 11 dígitos')
  .refine((cpf) => !/^(\d)\1{10}$/.test(cpf), 'CPF inválido');

export const loginSchema = z.object({
  usuario: z.string().trim().optional(),
  filial: z.string().trim().optional(),
  senha: z.string().min(1, 'Senha obrigatória').max(200),
});

// Converte "" → null (campos opcionais vindo de inputs HTML)
const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

const optDateStr = z.preprocess(emptyToNull, z.string().date().nullable().optional());
const optStr = z.preprocess(emptyToNull, z.string().nullable().optional());
const optBool = z.preprocess((v) => (v === '' ? null : v), z.boolean().nullable().optional());

export const entrevistaInputSchema = z.object({
  cpf: cpfSchema,
  nome: z.string().trim().min(3).max(200),
  dataNasc: optDateStr,
  cargoPretendido: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
  experiencias: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
  disponibilidadeTurnos: z.array(z.string()).optional().nullable(),
  respostasRoteiro: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .default({}),
  notasCriterios: z
    .record(z.string(), z.enum(['sim', 'parcial', 'nao']))
    .optional()
    .default({}),
  parecer: z
    .enum(['Aprovado', 'Banco de talentos', 'Reavaliar em outra oportunidade', 'Não aderente à vaga'])
    .nullable()
    .optional(),
  observacoes: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
  status: z.enum(['Em análise', 'Aprovado', 'Reprovado', 'Banco de Talentos', 'Contratado']).optional(),
  motivoDecisao: optStr,
  dataRetorno: optDateStr,
  recrutador: z.string().trim().min(2, 'Informe o entrevistador').max(120),
  gestorAprovador: optStr,
  aprovadoPeloGg: optBool,
  consentimentoLgpd: z.boolean().refine((v) => v === true, 'Consentimento LGPD obrigatório'),
}).superRefine((data, ctx) => {
  if ((data.status === 'Aprovado' || data.status === 'Reprovado') && (!data.gestorAprovador || data.gestorAprovador.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gestorAprovador'],
      message: 'Informe o gestor que aprovou/reprovou',
    });
  }
});

export type EntrevistaInput = z.infer<typeof entrevistaInputSchema>;

export const atualizarStatusSchema = z.object({
  entrevistaId: z.string().uuid(),
  novoStatus: z.string().min(1).max(50),
  motivo: z.string().max(1000).optional(),
});
