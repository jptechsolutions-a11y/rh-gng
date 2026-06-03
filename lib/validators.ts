import { z } from 'zod';

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .refine((cpf) => cpf.length === 11, 'CPF deve ter 11 dígitos')
  .refine((cpf) => !/^(\d)\1{10}$/.test(cpf), 'CPF inválido');

export const loginSchema = z.object({
  usuario: z.string().trim().optional(),
  senha: z.string().min(1, 'Senha obrigatória').max(200),
});

// Converte "" → null (campos opcionais vindo de inputs HTML)
const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);
// Converte string/number → number|null (inputs type=number retornam string)
const toNumberOrNull = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && !Number.isNaN(n) ? n : null;
};

const optDateStr = z.preprocess(emptyToNull, z.string().date().nullable().optional());
const optStr = z.preprocess(emptyToNull, z.string().nullable().optional());
const optNumber = z.preprocess(toNumberOrNull, z.number().nullable().optional());
const optBool = z.preprocess((v) => (v === '' ? null : v), z.boolean().nullable().optional());

export const entrevistaInputSchema = z.object({
  cpf: cpfSchema,
  nome: z.string().trim().min(3).max(200),
  dataNasc: optDateStr,
  rg: z.preprocess(emptyToNull, z.string().max(30).nullable().optional()),
  telefone: z.preprocess(emptyToNull, z.string().max(30).nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  cidade: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
  cargoPretendido: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
  pretensaoSalarial: z.preprocess(toNumberOrNull, z.number().nonnegative().nullable().optional()),
  experiencias: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
  linkedin: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  escolaridade: optStr,
  estadoCivil: optStr,
  temFilhos: optBool,
  possuiCnh: optStr,
  veiculoProprio: optBool,
  disponibilidadeTurnos: z.array(z.string()).optional().nullable(),
  disponibilidadeInicio: optDateStr,
  disponibilidadeViagem: optBool,
  pcd: optBool,
  pcdTipo: optStr,
  indicacao: optBool,
  indicadoPorNome: optStr,
  indicadoPorCargo: optStr,
  fumante: optBool,
  jaTrabalhouGrupo: optBool,
  jaTrabalhouQuando: optStr,
  respostasRoteiro: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().default({}),
  notasCriterios: z.record(z.string(), z.number().min(0).max(10)).optional().default({}),
  observacoes: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
  notaGeral: optNumber,
  status: z.enum(['Em análise', 'Aprovado', 'Reprovado', 'Banco de Talentos', 'Contratado']).optional(),
  motivoDecisao: optStr,
  proximaEtapa: optStr,
  dataRetorno: optDateStr,
  recrutador: z.string().trim().min(2, 'Informe o entrevistador').max(120),
  gestorAprovador: optStr,
  aprovadoPeloGg: optBool,
  consentimentoLgpd: z.boolean().refine((v) => v === true, 'Consentimento LGPD obrigatório'),
}).superRefine((data, ctx) => {
  // Se status é Aprovado ou Reprovado, gestorAprovador é obrigatório
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
