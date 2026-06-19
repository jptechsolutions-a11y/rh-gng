import { sql } from 'drizzle-orm';
import {
  pgTable, uuid, text, boolean, timestamp, integer, numeric, jsonb, date,
  bigserial, primaryKey, index, check, smallint,
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
  opcoes: text('opcoes').array(),
  ativo: boolean('ativo').notNull().default(true),
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
  cargoPretendido: text('cargo_pretendido'),
  parecer: text('parecer'),
  experiencias: text('experiencias'),
  linkedin: text('linkedin'),
  estadoCivil: text('estado_civil'),
  temFilhos: boolean('tem_filhos'),
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
  // notasCriterios agora armazena { [comportamentoSlug]: 'sim'|'parcial'|'nao' } — 9 comportamentos fixos do modelo G&G.
  notasCriterios: jsonb('notas_criterios').notNull().default(sql`'{}'::jsonb`),
  observacoes: text('observacoes'),
  notaGeral: numeric('nota_geral', { precision: 3, scale: 2 }),
  status: text('status').notNull().default('Em análise'),
  motivoDecisao: text('motivo_decisao'),
  proximaEtapa: text('proxima_etapa'),
  dataRetorno: date('data_retorno'),
  recrutador: text('recrutador'),
  gestorAprovador: text('gestor_aprovador'),
  aprovadoPeloGg: boolean('aprovado_pelo_gg').default(false),
  decisaoEm: timestamp('decisao_em', { withTimezone: true }),
  decisaoPor: text('decisao_por'),
  consentimentoLgpdEm: timestamp('consentimento_lgpd_em', { withTimezone: true }),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: text('atualizado_por'),
}, (t) => ({
  filialStatusIdx: index('entrevistas_filial_status_idx').on(t.filialId, t.status),
  cpfIdx: index('entrevistas_cpf_idx').on(t.cpf),
  dataIdx: index('entrevistas_data_idx').on(t.dataHora),
  // Suporta a query do painel: filial fixa, ordenação por data desc.
  filialDataIdx: index('entrevistas_filial_data_idx').on(t.filialId, t.dataHora.desc()),
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

// ==================== AVALIAÇÃO DE DESEMPENHO ====================

export const pessoas = pgTable('pessoas', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  matricula: text('matricula').notNull().unique(),
  nome: text('nome').notNull(),
  funcao: text('funcao'),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'set null' }),
  regional: text('regional'),
  isColaborador: boolean('is_colaborador').notNull().default(true),
  isGestor: boolean('is_gestor').notNull().default(false),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  filialIdx: index('pessoas_filial_idx').on(t.filialId),
  matriculaIdx: index('pessoas_matricula_idx').on(t.matricula),
}));

export const competencias = pgTable('competencias', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  nome: text('nome').notNull().unique(),
  descricao: text('descricao'),
  ordem: integer('ordem').notNull().default(0),
  peso: numeric('peso', { precision: 4, scale: 2 }).notNull().default('1'),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fatoresAvaliacao = pgTable('fatores_avaliacao', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  competenciaId: uuid('competencia_id').notNull().references(() => competencias.id, { onDelete: 'cascade' }),
  ordem: integer('ordem').notNull(),
  texto: text('texto').notNull(),
  escalaMax: integer('escala_max').notNull().default(5),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  competenciaOrdemIdx: index('fatores_competencia_ordem_idx').on(t.competenciaId, t.ordem),
}));

export const avaliacoesDesempenho = pgTable('avaliacoes_desempenho', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').notNull().references(() => filiais.id, { onDelete: 'restrict' }),
  avaliadoId: uuid('avaliado_id').notNull().references(() => pessoas.id, { onDelete: 'restrict' }),
  gestorId: uuid('gestor_id').notNull().references(() => pessoas.id, { onDelete: 'restrict' }),
  dataAvaliacao: date('data_avaliacao').notNull().default(sql`current_date`),
  pontuacaoFinal: numeric('pontuacao_final', { precision: 4, scale: 2 }),
  classificacao: text('classificacao'),
  pontosFortes: text('pontos_fortes'),
  oportunidades: text('oportunidades'),
  comentarios: text('comentarios'),
  planoDesenvolvimento: text('plano_desenvolvimento'),
  criadaPor: text('criada_por'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  filialDataIdx: index('avaliacoes_desempenho_filial_data_idx').on(t.filialId, t.dataAvaliacao),
  avaliadoDataIdx: index('avaliacoes_desempenho_avaliado_data_idx').on(t.avaliadoId, t.dataAvaliacao),
  uniqDia: index('avaliacoes_desempenho_uniq_dia').on(t.avaliadoId, t.gestorId, t.dataAvaliacao),
}));

export const avaliacoesDetalhes = pgTable('avaliacoes_detalhes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  avaliacaoId: uuid('avaliacao_id').notNull().references(() => avaliacoesDesempenho.id, { onDelete: 'cascade' }),
  fatorId: uuid('fator_id').notNull().references(() => fatoresAvaliacao.id, { onDelete: 'restrict' }),
  competenciaId: uuid('competencia_id').notNull().references(() => competencias.id, { onDelete: 'restrict' }),
  nota: integer('nota').notNull(),
}, (t) => ({
  avaliacaoIdx: index('avaliacoes_detalhes_avaliacao_idx').on(t.avaliacaoId),
  uniqFator: index('avaliacoes_detalhes_uniq_fator').on(t.avaliacaoId, t.fatorId),
  notaCheck: check('avaliacoes_detalhes_nota_check', sql`nota BETWEEN 1 AND 5`),
}));

// ============================================================
// Escuta G&G
// ============================================================

export type EscutaEtapa = { ordem: number; titulo: string; descricao: string };
export type EscutaPergunta = string;
export type EscutaFoto = { path: string; size: number };
export type EscutaPresencaItem = { nome: string; funcao: string; presente: boolean };
export type EscutaPercepcoes = Record<string, string>;

export const escutaRoteiro = pgTable('escuta_roteiro', {
  id:            smallint('id').primaryKey().default(1),
  heroTitulo:    text('hero_titulo').notNull().default('Gente e Gestão'),
  heroSubtitulo: text('hero_subtitulo').notNull().default('SUA ORGANIZAÇÃO FAZ TODA A DIFERENÇA'),
  heroFrase:     text('hero_frase').notNull(),
  bannerTexto:   text('banner_texto').notNull(),
  etapas:        jsonb('etapas').$type<EscutaEtapa[]>().notNull().default([]),
  diasSugeridos: jsonb('dias_sugeridos').$type<string[]>().notNull().default(['Quinta','Sexta']),
  atualizadoEm:  timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: text('atualizado_por'),
});

export const escutaPilares = pgTable('escuta_pilares', {
  id:        smallint('id').primaryKey(),
  ordem:     smallint('ordem').notNull(),
  nome:      text('nome').notNull(),
  icone:     text('icone').notNull(),
  perguntas: jsonb('perguntas').$type<EscutaPergunta[]>().notNull().default([]),
});

export const escutaReunioes = pgTable('escuta_reunioes', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialCodigo:    text('filial_codigo').notNull(),
  filialNome:      text('filial_nome'),
  turma:           text('turma').notNull(),
  dataReuniao:     date('data_reuniao').notNull(),
  responsavel:     text('responsavel').notNull(),
  percepcoes:      jsonb('percepcoes').$type<EscutaPercepcoes>().notNull().default({}),
  percepcaoFinal:  text('percepcao_final').notNull(),
  fotos:           jsonb('fotos').$type<EscutaFoto[]>().notNull().default([]),
  presenca:        jsonb('presenca').$type<EscutaPresencaItem[]>().notNull().default([]),
  criadoEm:        timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  criadoPor:       text('criado_por'),
}, (t) => ({
  filialDataIdx: index('escuta_reunioes_filial_data_idx').on(t.filialCodigo, t.dataReuniao),
}));

// =====================================================
// Indicadores — Banco de Horas
// =====================================================

const bhSnapshotColumns = {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'restrict' }),
  codfilialOrigem: text('codfilial_origem').notNull(),
  chapa: text('chapa').notNull(),
  nome: text('nome').notNull(),
  funcao: text('funcao'),
  secao: text('secao'),
  regional: text('regional'),
  bandeira: text('bandeira'),
  horasDecimal: numeric('horas_decimal', { precision: 10, scale: 2 }).notNull(),
  valorPgto: numeric('valor_pgto', { precision: 12, scale: 2 }).notNull().default('0'),
  situacao: text('situacao'),
} as const;

export const bhSnapshotAtual = pgTable('bh_snapshot_atual', bhSnapshotColumns, (t) => ({
  filialIdx: index('bh_atual_filial_idx').on(t.filialId),
  chapaIdx:  index('bh_atual_chapa_idx').on(t.chapa),
  secaoIdx:  index('bh_atual_secao_idx').on(t.secao),
  funcaoIdx: index('bh_atual_funcao_idx').on(t.funcao),
}));

export const bhSnapshotAnterior = pgTable('bh_snapshot_anterior', bhSnapshotColumns, (t) => ({
  chapaIdx: index('bh_anterior_chapa_idx').on(t.chapa),
}));

export const bhMeta = pgTable('bh_meta', {
  id: text('id').primaryKey(),
  ultimaAtualizacao: timestamp('ultima_atualizacao', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: uuid('atualizado_por').references(() => admins.id, { onDelete: 'set null' }),
  totalLinhas: integer('total_linhas').notNull().default(0),
  totalFiliais: integer('total_filiais').notNull().default(0),
}, (t) => ({
  singleton: check('bh_meta_singleton', sql`${t.id} = 'singleton'`),
}));

// =====================================================
// Indicadores — Inconsistências (substitui a cada import; sem anterior)
// =====================================================

export const inconsistSnapshot = pgTable('inconsist_snapshot', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'restrict' }),
  codfilialOrigem: text('codfilial_origem').notNull(),
  chapa: text('chapa').notNull(),
  nome: text('nome').notNull(),
  funcao: text('funcao'),
  secao: text('secao'),
  regional: text('regional'),
  bandeira: text('bandeira'),
  tipo: text('tipo').notNull(),
  dataOcorrencia: date('data_ocorrencia'),
  codsituacao: text('codsituacao'),
}, (t) => ({
  filialIdx: index('inconsist_filial_idx').on(t.filialId),
  chapaIdx:  index('inconsist_chapa_idx').on(t.chapa),
  secaoIdx:  index('inconsist_secao_idx').on(t.secao),
  funcaoIdx: index('inconsist_funcao_idx').on(t.funcao),
}));

export const inconsistMeta = pgTable('inconsist_meta', {
  id: text('id').primaryKey(),
  ultimaAtualizacao: timestamp('ultima_atualizacao', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: uuid('atualizado_por').references(() => admins.id, { onDelete: 'set null' }),
  totalLinhas: integer('total_linhas').notNull().default(0),
  totalFiliais: integer('total_filiais').notNull().default(0),
}, (t) => ({
  singleton: check('inconsist_meta_singleton', sql`${t.id} = 'singleton'`),
}));

// =====================================================
// Indicadores — Cursos Obrigatórios (atual + anterior + meta)
// =====================================================

const cursosSnapshotColumns = {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'restrict' }),
  codfilialOrigem: text('codfilial_origem').notNull(),
  chapa: text('chapa').notNull(),
  nome: text('nome').notNull(),
  funcao: text('funcao'),
  secao: text('secao'),
  regional: text('regional'),
  bandeira: text('bandeira'),
  codsituacao: text('codsituacao'),
  tipo: text('tipo'),
  dataTreinamento: date('data_treinamento'),
  contagem: integer('contagem').notNull().default(0),
  pendencia: text('pendencia'),
  bpNacional: text('bp_nacional'),
  bpRegional: text('bp_regional'),
} as const;

export const cursosSnapshotAtual = pgTable('cursos_snapshot_atual', cursosSnapshotColumns, (t) => ({
  filialIdx: index('cursos_atual_filial_idx').on(t.filialId),
  chapaIdx:  index('cursos_atual_chapa_idx').on(t.chapa),
  funcaoIdx: index('cursos_atual_funcao_idx').on(t.funcao),
  secaoIdx:  index('cursos_atual_secao_idx').on(t.secao),
}));

export const cursosSnapshotAnterior = pgTable('cursos_snapshot_anterior', cursosSnapshotColumns, (t) => ({
  chapaIdx: index('cursos_anterior_chapa_idx').on(t.chapa),
}));

export const cursosMeta = pgTable('cursos_meta', {
  id: text('id').primaryKey(),
  ultimaAtualizacao: timestamp('ultima_atualizacao', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: uuid('atualizado_por').references(() => admins.id, { onDelete: 'set null' }),
  totalLinhas: integer('total_linhas').notNull().default(0),
  totalFiliais: integer('total_filiais').notNull().default(0),
}, (t) => ({
  singleton: check('cursos_meta_singleton', sql`${t.id} = 'singleton'`),
}));

// =====================================================
// Indicadores — Feriados Pendentes (substitui a cada import; sem anterior)
// =====================================================

export const feriadosSnapshot = pgTable('feriados_snapshot', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  filialId: uuid('filial_id').references(() => filiais.id, { onDelete: 'restrict' }),
  codfilialOrigem: text('codfilial_origem').notNull(),
  chapa: text('chapa').notNull(),
  nome: text('nome').notNull(),
  funcao: text('funcao'),
  secao: text('secao'),
  codsecao: text('codsecao'),
  regional: text('regional'),
  bandeira: text('bandeira'),
  pendencia: text('pendencia'),
  dataFeriado: date('data_feriado'),
  valor: numeric('valor', { precision: 12, scale: 2 }).notNull().default('0'),
  dsr: numeric('dsr', { precision: 12, scale: 2 }).notNull().default('0'),
  encargos: numeric('encargos', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
  abaOrigem: text('aba_origem'),
}, (t) => ({
  filialIdx: index('feriados_filial_idx').on(t.filialId),
  chapaIdx:  index('feriados_chapa_idx').on(t.chapa),
  funcaoIdx: index('feriados_funcao_idx').on(t.funcao),
  secaoIdx:  index('feriados_secao_idx').on(t.secao),
}));

export const feriadosMeta = pgTable('feriados_meta', {
  id: text('id').primaryKey(),
  ultimaAtualizacao: timestamp('ultima_atualizacao', { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: uuid('atualizado_por').references(() => admins.id, { onDelete: 'set null' }),
  totalLinhas: integer('total_linhas').notNull().default(0),
  totalFiliais: integer('total_filiais').notNull().default(0),
}, (t) => ({
  singleton: check('feriados_meta_singleton', sql`${t.id} = 'singleton'`),
}));
