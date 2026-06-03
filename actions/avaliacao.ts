'use server';

import { db, schema } from '@/db/client';
import { and, eq, asc, desc, sql } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import {
  NovaAvaliacaoSchema,
  AtualizarPdiSchema,
  type NovaAvaliacaoInput,
} from '@/lib/avaliacao/validators';
import { calcularPontuacao, classificar } from '@/lib/avaliacao/calculos';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function logAcao(usuario: string, acao: string, detalhe?: string) {
  const h = await headers();
  await db.insert(schema.logAcessos).values({
    usuario,
    acao,
    detalhe: detalhe ?? null,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent') ?? null,
  });
}

export async function buscarPessoaPorMatricula(matricula: string, tipo: 'colaborador' | 'gestor') {
  const s = await requireSession();
  const wheres = [eq(schema.pessoas.matricula, matricula.trim()), eq(schema.pessoas.ativo, true)];
  if (tipo === 'colaborador') wheres.push(eq(schema.pessoas.isColaborador, true));
  if (tipo === 'gestor') wheres.push(eq(schema.pessoas.isGestor, true));
  const [p] = await db.select().from(schema.pessoas).where(and(...wheres)).limit(1);
  if (!p) return null;
  if (tipo === 'colaborador' && s.perfil === 'filial' && p.filialId !== s.filialId) return null;
  return p;
}

export async function carregarFormularioNovaAvaliacao() {
  await requireSession();
  const competencias = await db
    .select()
    .from(schema.competencias)
    .where(eq(schema.competencias.ativo, true))
    .orderBy(asc(schema.competencias.ordem));
  const fatores = await db
    .select()
    .from(schema.fatoresAvaliacao)
    .where(eq(schema.fatoresAvaliacao.ativo, true))
    .orderBy(asc(schema.fatoresAvaliacao.ordem));
  return competencias.map((c) => ({ ...c, fatores: fatores.filter((f) => f.competenciaId === c.id) }));
}

export async function salvarAvaliacao(input: NovaAvaliacaoInput) {
  const s = await requireSession();
  const data = NovaAvaliacaoSchema.parse(input);

  // Rate limit por sessão para evitar abuso de criação em massa.
  const chaveRl = s.perfil === 'admin' ? `avaliacao.criar:admin:${s.adminId}` : `avaliacao.criar:filial:${s.filialId}`;
  const rl = await checkRateLimit(chaveRl);
  if (!rl.ok) throw new Error('Muitas avaliações em pouco tempo. Aguarde alguns minutos.');

  const [avaliado] = await db
    .select()
    .from(schema.pessoas)
    .where(eq(schema.pessoas.id, data.avaliadoId))
    .limit(1);
  const [gestor] = await db
    .select()
    .from(schema.pessoas)
    .where(eq(schema.pessoas.id, data.gestorId))
    .limit(1);
  if (!avaliado || !avaliado.isColaborador || !avaliado.ativo) throw new Error('Avaliado inválido');
  if (!gestor || !gestor.isGestor || !gestor.ativo) throw new Error('Gestor inválido');
  if (!avaliado.filialId) throw new Error('Avaliado sem filial — corrija no cadastro');
  if (s.perfil === 'filial' && avaliado.filialId !== s.filialId) {
    throw new Error('Avaliado não pertence à sua filial');
  }

  const fatoresAtivos = await db
    .select({ id: schema.fatoresAvaliacao.id, competenciaId: schema.fatoresAvaliacao.competenciaId })
    .from(schema.fatoresAvaliacao)
    .where(eq(schema.fatoresAvaliacao.ativo, true));
  const setAtivos = new Set(fatoresAtivos.map((f) => f.id));
  const setInput = new Set(data.notas.map((n) => n.fatorId));
  if (setAtivos.size !== setInput.size || ![...setAtivos].every((id) => setInput.has(id))) {
    throw new Error(`Você precisa avaliar todos os ${setAtivos.size} fatores ativos.`);
  }

  const pontuacao = calcularPontuacao(data.notas.map((n) => n.nota));
  const classificacao = classificar(pontuacao);
  const criadaPor = s.perfil === 'admin' ? `admin:${s.usuario}` : `filial:${s.filialCodigo}`;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.avaliacoesDesempenho)
      .values({
        filialId: avaliado.filialId!,
        avaliadoId: data.avaliadoId,
        gestorId: data.gestorId,
        dataAvaliacao: data.dataAvaliacao.toISOString().slice(0, 10),
        pontuacaoFinal: pontuacao.toFixed(2),
        classificacao,
        pontosFortes: data.pontosFortes ?? null,
        oportunidades: data.oportunidades ?? null,
        comentarios: data.comentarios ?? null,
        criadaPor,
      })
      .returning({ id: schema.avaliacoesDesempenho.id });
    if (!row) throw new Error('Falha ao inserir avaliação');
    const fatorToComp = new Map(fatoresAtivos.map((f) => [f.id, f.competenciaId]));
    await tx.insert(schema.avaliacoesDetalhes).values(
      data.notas.map((n) => ({
        avaliacaoId: row.id,
        fatorId: n.fatorId,
        competenciaId: fatorToComp.get(n.fatorId)!,
        nota: n.nota,
      })),
    );
    return row.id;
  });

  await logAcao(criadaPor, 'avaliacao.criar', `${id}|${avaliado.matricula}|${pontuacao}`);
  revalidatePath('/avaliacao');
  revalidatePath('/avaliacao/historico');
  return id;
}

export async function atualizarPlanoDesenvolvimento(input: unknown) {
  const s = await requireSession();
  const { avaliacaoId, planoDesenvolvimento } = AtualizarPdiSchema.parse(input);
  const [av] = await db
    .select()
    .from(schema.avaliacoesDesempenho)
    .where(eq(schema.avaliacoesDesempenho.id, avaliacaoId))
    .limit(1);
  if (!av) throw new Error('Avaliação não encontrada');
  if (s.perfil === 'filial' && av.filialId !== s.filialId) throw new Error('Sem permissão');
  await db
    .update(schema.avaliacoesDesempenho)
    .set({ planoDesenvolvimento, updatedAt: new Date() })
    .where(eq(schema.avaliacoesDesempenho.id, avaliacaoId));
  const usuario = s.perfil === 'admin' ? `admin:${s.usuario}` : `filial:${s.filialCodigo}`;
  await logAcao(usuario, 'avaliacao.atualizar_pdi', avaliacaoId);
  revalidatePath(`/avaliacao/${avaliacaoId}`);
}

export async function obterAvaliacao(id: string) {
  const s = await requireSession();
  const av = await db
    .select({
      av: schema.avaliacoesDesempenho,
      avaliado: schema.pessoas,
    })
    .from(schema.avaliacoesDesempenho)
    .leftJoin(schema.pessoas, eq(schema.pessoas.id, schema.avaliacoesDesempenho.avaliadoId))
    .where(eq(schema.avaliacoesDesempenho.id, id))
    .limit(1);
  if (!av[0]) return null;
  if (s.perfil === 'filial' && av[0].av.filialId !== s.filialId) {
    throw new Error('Sem permissão');
  }
  const [gestor] = await db
    .select()
    .from(schema.pessoas)
    .where(eq(schema.pessoas.id, av[0].av.gestorId))
    .limit(1);
  const [filial] = await db
    .select()
    .from(schema.filiais)
    .where(eq(schema.filiais.id, av[0].av.filialId))
    .limit(1);
  const detalhes = await db
    .select({
      d: schema.avaliacoesDetalhes,
      fator: schema.fatoresAvaliacao,
      competencia: schema.competencias,
    })
    .from(schema.avaliacoesDetalhes)
    .leftJoin(
      schema.fatoresAvaliacao,
      eq(schema.fatoresAvaliacao.id, schema.avaliacoesDetalhes.fatorId),
    )
    .leftJoin(
      schema.competencias,
      eq(schema.competencias.id, schema.avaliacoesDetalhes.competenciaId),
    )
    .where(eq(schema.avaliacoesDetalhes.avaliacaoId, id))
    .orderBy(asc(schema.competencias.ordem), asc(schema.fatoresAvaliacao.ordem));

  const anteriores = await db
    .select({ p: schema.avaliacoesDesempenho.pontuacaoFinal })
    .from(schema.avaliacoesDesempenho)
    .where(
      and(
        eq(schema.avaliacoesDesempenho.avaliadoId, av[0].av.avaliadoId),
        sql`${schema.avaliacoesDesempenho.dataAvaliacao} < ${av[0].av.dataAvaliacao}`,
      ),
    )
    .orderBy(desc(schema.avaliacoesDesempenho.dataAvaliacao))
    .limit(1);
  const anterior = anteriores[0]?.p ? Number(anteriores[0].p) : null;

  return {
    avaliacao: av[0].av,
    avaliado: av[0].avaliado,
    gestor: gestor ?? null,
    filial: filial ?? null,
    detalhes,
    anterior,
  };
}

export type HistoricoFiltros = {
  classificacao?: string;
  filialId?: string;
  dataInicio?: string;
  dataFim?: string;
  nomeAvaliado?: string;
  nomeGestor?: string;
  evolucao?: 'positiva' | 'negativa' | 'estavel' | 'primeira' | '';
  page?: number;
  perPage?: number;
};

export type HistoricoRow = {
  id: string;
  data_avaliacao: string;
  pontuacao_final: string | null;
  classificacao: string | null;
  anterior: string | null;
  avaliado_nome: string | null;
  avaliado_matricula: string | null;
  gestor_nome: string | null;
  gestor_matricula: string | null;
  filial_codigo: string | null;
  filial_nome: string | null;
};

export async function listarHistorico(f: HistoricoFiltros = {}): Promise<HistoricoRow[]> {
  const s = await requireSession();
  const perPage = Math.min(f.perPage ?? 25, 100);
  const page = Math.max(f.page ?? 1, 1);

  const filialScopeSql =
    s.perfil === 'filial' && s.filialId ? sql`AND filial_id = ${s.filialId}` : sql``;
  const filialFilterSql =
    f.filialId && s.perfil === 'admin' ? sql`AND filial_id = ${f.filialId}` : sql``;
  const classifSql = f.classificacao
    ? sql`AND classificacao = ${f.classificacao}`
    : sql``;
  const dataIniSql = f.dataInicio
    ? sql`AND data_avaliacao >= ${f.dataInicio}::date`
    : sql``;
  const dataFimSql = f.dataFim ? sql`AND data_avaliacao <= ${f.dataFim}::date` : sql``;
  const nomeAvSql = f.nomeAvaliado
    ? sql`AND avaliado_nome ILIKE ${'%' + f.nomeAvaliado + '%'}`
    : sql``;
  const nomeGeSql = f.nomeGestor
    ? sql`AND gestor_nome ILIKE ${'%' + f.nomeGestor + '%'}`
    : sql``;

  const rows = await db.execute(sql`
    WITH base AS (
      SELECT a.*,
             av.nome AS avaliado_nome, av.matricula AS avaliado_matricula,
             g.nome AS gestor_nome,    g.matricula AS gestor_matricula,
             f.codigo AS filial_codigo, f.nome AS filial_nome,
             LAG(a.pontuacao_final) OVER (PARTITION BY a.avaliado_id ORDER BY a.data_avaliacao) AS anterior
      FROM avaliacoes_desempenho a
      LEFT JOIN pessoas av ON av.id = a.avaliado_id
      LEFT JOIN pessoas g  ON g.id  = a.gestor_id
      LEFT JOIN filiais f  ON f.id  = a.filial_id
    )
    SELECT * FROM base
    WHERE 1=1
      ${filialScopeSql}
      ${filialFilterSql}
      ${classifSql}
      ${dataIniSql}
      ${dataFimSql}
      ${nomeAvSql}
      ${nomeGeSql}
    ORDER BY data_avaliacao DESC, created_at DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `);

  let lista = rows as unknown as HistoricoRow[];
  if (f.evolucao) {
    lista = lista.filter((r) => {
      const ant = r.anterior !== null ? Number(r.anterior) : null;
      const atual = Number(r.pontuacao_final ?? 0);
      if (ant === null) return f.evolucao === 'primeira';
      const d = atual - ant;
      if (f.evolucao === 'positiva') return d >= 0.3;
      if (f.evolucao === 'negativa') return d <= -0.3;
      return Math.abs(d) < 0.3;
    });
  }
  return lista;
}

export async function statsHistorico() {
  const s = await requireSession();
  const filialFilter =
    s.perfil === 'filial' && s.filialId ? sql`WHERE filial_id = ${s.filialId}` : sql``;
  const res = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      ROUND(AVG(pontuacao_final)::numeric, 2) AS media,
      SUM(CASE WHEN classificacao = 'EXCELENTE' THEN 1 ELSE 0 END)::int AS excelentes,
      SUM(CASE WHEN classificacao = 'PRECISA MELHORAR' THEN 1 ELSE 0 END)::int AS precisam_melhorar
    FROM avaliacoes_desempenho ${filialFilter}
  `);
  return (res as unknown as Array<Record<string, unknown>>)[0] as unknown as {
    total: number;
    media: string | null;
    excelentes: number;
    precisam_melhorar: number;
  };
}
