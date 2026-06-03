import { z } from 'zod';

export const NovaAvaliacaoSchema = z.object({
  avaliadoId: z.string().uuid(),
  gestorId: z.string().uuid(),
  dataAvaliacao: z.coerce.date().max(new Date(), { message: 'Não pode ser futura' }),
  notas: z.array(z.object({
    fatorId: z.string().uuid(),
    nota: z.number().int().min(1).max(5),
  })).min(1),
  pontosFortes: z.string().max(2000).optional().nullable(),
  oportunidades: z.string().max(2000).optional().nullable(),
  comentarios: z.string().max(2000).optional().nullable(),
}).refine((d) => d.avaliadoId !== d.gestorId, {
  message: 'Avaliado e gestor não podem ser a mesma pessoa',
  path: ['gestorId'],
});
export type NovaAvaliacaoInput = z.infer<typeof NovaAvaliacaoSchema>;

export const AtualizarPdiSchema = z.object({
  avaliacaoId: z.string().uuid(),
  planoDesenvolvimento: z.string().max(5000),
});

export const PessoaSchema = z.object({
  matricula: z.string().min(1).max(40),
  nome: z.string().min(1).max(200),
  funcao: z.string().max(200).optional().nullable(),
  filialId: z.string().uuid().optional().nullable(),
  regional: z.string().max(40).optional().nullable(),
  isColaborador: z.boolean(),
  isGestor: z.boolean(),
  ativo: z.boolean().default(true),
});
export type PessoaInput = z.infer<typeof PessoaSchema>;

export const CompetenciaSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(2000).optional().nullable(),
  ordem: z.number().int().min(0),
  peso: z.coerce.number().min(0).max(10).default(1),
  ativo: z.boolean().default(true),
});

export const FatorSchema = z.object({
  competenciaId: z.string().uuid(),
  ordem: z.number().int().min(0),
  texto: z.string().min(1).max(500),
  escalaMax: z.number().int().min(2).max(10).default(5),
  ativo: z.boolean().default(true),
});
