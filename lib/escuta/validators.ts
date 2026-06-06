import { z } from 'zod';

export const PresencaItemSchema = z.object({
  nome:    z.string().min(1, 'Nome obrigatório').max(120),
  funcao:  z.string().max(120).default(''),
  presente: z.boolean(),
});

export const NovaReuniaoSchema = z.object({
  turma:        z.string().min(1, 'Turma é obrigatória').max(120),
  dataReuniao:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  responsavel:  z.string().min(1, 'Responsável é obrigatório').max(120),
  percepcoes:   z.record(z.string().max(2000)).default({}),
  percepcaoFinal: z.string().min(1, 'Percepção final é obrigatória').max(4000),
  fotos: z.array(z.object({
    path: z.string().min(1),
    size: z.number().int().positive(),
  })).min(1, 'Envie ao menos 1 foto').max(3, 'Máximo 3 fotos'),
  presenca: z.array(PresencaItemSchema).min(1, 'Adicione ao menos 1 pessoa na lista'),
});
export type NovaReuniaoInput = z.infer<typeof NovaReuniaoSchema>;

export const EtapaSchema = z.object({
  ordem: z.number().int().min(1).max(50),
  titulo: z.string().min(1).max(200),
  descricao: z.string().min(1).max(600),
});

export const ConfigRoteiroSchema = z.object({
  heroTitulo:    z.string().min(1).max(120),
  heroSubtitulo: z.string().min(1).max(200),
  heroFrase:     z.string().min(1).max(500),
  bannerTexto:   z.string().min(1).max(200),
  etapas:        z.array(EtapaSchema).min(1).max(20),
});
export type ConfigRoteiroInput = z.infer<typeof ConfigRoteiroSchema>;

export const ConfigPilarSchema = z.object({
  id: z.number().int().min(1).max(5),
  nome: z.string().min(1).max(120),
  perguntas: z.array(z.string().min(1).max(400)).min(1).max(20),
});

export const ConfigPilaresSchema = z.object({
  pilares: z.array(ConfigPilarSchema).length(5),
});
export type ConfigPilaresInput = z.infer<typeof ConfigPilaresSchema>;
