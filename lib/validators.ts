import { z } from 'zod';

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .refine((cpf) => cpf.length === 11, 'CPF deve ter 11 dígitos')
  .refine((cpf) => !/^(\d)\1{10}$/.test(cpf), 'CPF inválido')
  .refine((cpf) => {
    let s = 0;
    for (let i = 0; i < 9; i++) s += Number(cpf[i]) * (10 - i);
    let d1 = (s * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== Number(cpf[9])) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += Number(cpf[i]) * (11 - i);
    let d2 = (s * 10) % 11;
    if (d2 === 10) d2 = 0;
    return d2 === Number(cpf[10]);
  }, 'CPF inválido');

export const loginSchema = z.object({
  usuario: z.string().trim().optional(),
  senha: z.string().min(1, 'Senha obrigatória').max(200),
});

export const entrevistaInputSchema = z.object({
  cpf: cpfSchema,
  nome: z.string().trim().min(3).max(200),
  dataNasc: z.string().date().optional().nullable(),
  rg: z.string().max(30).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  cidade: z.string().max(120).optional().nullable(),
  cargoPretendido: z.string().max(120).optional().nullable(),
  pretensaoSalarial: z.number().nonnegative().optional().nullable(),
  experiencias: z.string().max(5000).optional().nullable(),
  linkedin: z.string().url().optional().nullable().or(z.literal('')),
  escolaridade: z.string().optional().nullable(),
  estadoCivil: z.string().optional().nullable(),
  temFilhos: z.boolean().optional().nullable(),
  possuiCnh: z.string().optional().nullable(),
  veiculoProprio: z.boolean().optional().nullable(),
  disponibilidadeTurnos: z.array(z.string()).optional().nullable(),
  disponibilidadeInicio: z.string().date().optional().nullable(),
  disponibilidadeViagem: z.boolean().optional().nullable(),
  pcd: z.boolean().optional().nullable(),
  pcdTipo: z.string().optional().nullable(),
  indicacao: z.boolean().optional().nullable(),
  indicadoPorNome: z.string().optional().nullable(),
  indicadoPorCargo: z.string().optional().nullable(),
  fumante: z.boolean().optional().nullable(),
  jaTrabalhouGrupo: z.boolean().optional().nullable(),
  jaTrabalhouQuando: z.string().optional().nullable(),
  respostasRoteiro: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().default({}),
  notasCriterios: z.record(z.string(), z.number().min(0).max(10)).optional().default({}),
  observacoes: z.string().max(5000).optional().nullable(),
  notaGeral: z.number().min(0).max(10).optional().nullable(),
  status: z.string().optional(),
  motivoDecisao: z.string().optional().nullable(),
  proximaEtapa: z.string().optional().nullable(),
  dataRetorno: z.string().date().optional().nullable(),
  recrutador: z.string().optional().nullable(),
  consentimentoLgpd: z.literal(true, { message: 'Consentimento LGPD obrigatório' }),
});

export type EntrevistaInput = z.infer<typeof entrevistaInputSchema>;

export const atualizarStatusSchema = z.object({
  entrevistaId: z.string().uuid(),
  novoStatus: z.string().min(1).max(50),
  motivo: z.string().max(1000).optional(),
});
