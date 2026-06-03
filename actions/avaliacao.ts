'use server';

import { db, schema } from '@/db/client';
import { and, eq, asc } from 'drizzle-orm';
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
