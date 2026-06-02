import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, text, boolean, timestamp, integer, numeric, jsonb, date,
  bigserial, primaryKey, index, check,
} from 'drizzle-orm/pg-core';

export const filiais = pgTable('filiais', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  codigo: text('codigo').notNull().unique(),
  nome: text('nome').notNull(),
  senhaHash: text('senha_hash').notNull(),
  ativa: boolean('ativa').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  usuario: text('usuario').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  nome: text('nome'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessoes = pgTable('sessoes', {
  token: text('token').primaryKey(),
  perfil: text('perfil').notNull(),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'cascade' }),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'cascade' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ expIdx: index('sessoes_expira_idx').on(t.expiraEm) }));

export const cargos = pgTable('cargos', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  nome: text('nome').notNull().unique(),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roteiro = pgTable('roteiro', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cargo: text('cargo').notNull().default('TODOS'),
  ordem: integer('ordem').notNull(),
  pergunta: text('pergunta').notNull(),
  tipo: text('tipo').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const criterios = pgTable('criterios', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  nome: text('nome').notNull(),
  escalaMax: integer('escala_max').notNull().default(5),
  peso: numeric('peso', { precision: 4, scale: 2 }).notNull().default('1'),
  ativo: boolean('ativo').notNull().default(true),
  ordem: integer('ordem').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const opcoes = pgTable('opcoes', {
  chave: text('chave').primaryKey(),
  valores: text('valores').array().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const entrevistas = pgTable('entrevistas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'restrict' }),
  dataHora: timestamp('data_hora', { withTimezone: true }).notNull().defaultNow(),
  cpf: text('cpf').notNull(),
  nome: text('nome').notNull(),
  dataNasc: date('data_nasc'),
  rg: text('rg'),
  telefone: text('telefone'),
  email: text('email'),
  cidade: text('cidade'),
  cargoPretendido: text('cargo_pretendido'),
  pretensaoSalarial: numeric('pretensao_salarial', { precision: 10, scale: 2 }),
  experiencias: text('experiencias'),
  linkedin: text('linkedin'),
  escolaridade: text('escolaridade'),
  estadoCivil: text('estado_civil'),
  temFilhos: boolean('tem_filhos'),
  possuiCnh: text('possui_cnh'),
  veiculoProprio: boolean('veiculo_proprio'),
  disponibilidadeTurnos: text('disponibilidade_turnos').array(),
  disponibilidadeInicio: date('disponibilidade_inicio'),
  disponibilidadeViagem: boolean('disponibilidade_viagem'),
  pcd: boolean('pcd'),
  pcdTipo: text('pcd_tipo'),
  pcdLaudoUrl: text('pcd_laudo_url'),
  indicacao: boolean('indicacao'),
  indicadoPorNome: text('indicado_por_nome'),
  indicadoPorCargo: text('indicado_por_cargo'),
  fumante: boolean('fumante'),
  jaTrabalhouGrupo: boolean('ja_trabalhou_grupo'),
  jaTrabalhouQuando: text('ja_trabalhou_quando'),
  curriculoUrl: text('curriculo_url'),
  respostasRoteiro: jsonb('respostas_roteiro').notNull().default(sql`'{}'::jsonb`),
  notasCriterios: jsonb('notas_criterios').notNull().default(sql`'{}'::jsonb`),
  observacoes: text('observacoes'),
  notaGeral: numeric('nota_geral', { precision: 3, scale: 2 }),
  status: text('status').notNull().default('Em análise'),
  motivoDecisao: text('motivo_decisao'),
  proximaEtapa: text('proxima_etapa'),
  dataRetorno: date('data_retorno'),
  recrutador: text('recrutador'),
  consentimentoLgpdEm: timestamp('consentimento_lgpd_em', { withTimezone: true }),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: text('atualizado_por'),
}, (t) => ({
  filialStatusIdx: index('entrevistas_filial_status_idx').on(t.filialId, t.status),
  cpfIdx: index('entrevistas_cpf_idx').on(t.cpf),
  dataIdx: index('entrevistas_data_idx').on(t.dataHora),
}));

export const logHistorico = pgTable('log_historico', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  entrevistaId: uuid('entrevista_id').notNull().references(() => entrevistas.id, { onDelete: 'cascade' }),
  dataHora: timestamp('data_hora', { withTimezone: true }).notNull().defaultNow(),
  deStatus: text('de_status'),
  paraStatus: text('para_status').notNull(),
  usuario: text('usuario').notNull(),
  motivo: text('motivo'),
});

export const logAcessos = pgTable('log_acessos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  dataHora: timestamp('data_hora', { withTimezone: true }).notNull().defaultNow(),
  usuario: text('usuario').notNull(),
  acao: text('acao').notNull(),
  detalhe: text('detalhe'),
  ip: text('ip'),
  userAgent: text('user_agent'),
});

export const rateLimits = pgTable('rate_limits', {
  chave: text('chave').notNull(),
  janelaIni: timestamp('janela_ini', { withTimezone: true }).notNull(),
  contagem: integer('contagem').notNull().default(1),
}, (t) => ({ pk: primaryKey({ columns: [t.chave, t.janelaIni] }) }));
