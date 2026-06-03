'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, count, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';

export async function dashboardStats() {
  await requireSession('admin');

  const seteDias = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const totalRow = await db.select({ n: count() }).from(schema.entrevistas);
  const semanaRow = await db.select({ n: count() })
    .from(schema.entrevistas)
    .where(gte(schema.entrevistas.dataHora, seteDias));

  const porStatus = await db.select({
    status: schema.entrevistas.status,
    n: count(),
  }).from(schema.entrevistas).groupBy(schema.entrevistas.status);

  const porFilial = await db.execute<{ codigo: string; nome: string; n: number }>(sql`
    select f.codigo, f.nome, count(e.id)::int as n
    from filiais f
    left join entrevistas e on e.filial_id = f.id
    group by f.id, f.codigo, f.nome
    order by f.codigo
  `);

  return {
    total: Number(totalRow[0]?.n ?? 0),
    semana: Number(semanaRow[0]?.n ?? 0),
    porStatus,
    porFilial: porFilial as unknown as Array<{ codigo: string; nome: string; n: number }>,
  };
}

export async function trocarSenhaFilial(filialCodigo: string, novaSenha: string) {
  await requireSession('admin');
  if (novaSenha.length < 6) throw new Error('Senha mínima de 6 caracteres');
  const hash = await hashPassword(novaSenha);
  await db.update(schema.filiais).set({ senhaHash: hash }).where(eq(schema.filiais.codigo, filialCodigo));
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// FILIAIS
// ────────────────────────────────────────────────────────────────

export async function listarFiliaisAdmin() {
  await requireSession('admin');
  return db.select({
    id: schema.filiais.id,
    codigo: schema.filiais.codigo,
    nome: schema.filiais.nome,
    ativa: schema.filiais.ativa,
  }).from(schema.filiais).orderBy(asc(schema.filiais.codigo));
}

export async function alternarFilialAtiva(id: string, ativa: boolean) {
  await requireSession('admin');
  await db.update(schema.filiais).set({ ativa }).where(eq(schema.filiais.id, id));
  revalidatePath('/admin/config/filiais');
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// CARGOS
// ────────────────────────────────────────────────────────────────

export async function listarCargosAdmin() {
  await requireSession('admin');
  return db.select().from(schema.cargos).orderBy(asc(schema.cargos.nome));
}

export async function criarCargo(nome: string) {
  await requireSession('admin');
  const n = nome.trim();
  if (n.length < 2) throw new Error('Nome muito curto');
  await db.insert(schema.cargos).values({ nome: n, ativo: true });
  revalidatePath('/admin/config/cargos');
  return { ok: true };
}

export async function atualizarCargo(id: string, nome: string, ativo: boolean) {
  await requireSession('admin');
  const n = nome.trim();
  if (n.length < 2) throw new Error('Nome muito curto');
  await db.update(schema.cargos).set({ nome: n, ativo }).where(eq(schema.cargos.id, id));
  revalidatePath('/admin/config/cargos');
  return { ok: true };
}

export async function removerCargo(id: string) {
  await requireSession('admin');
  await db.delete(schema.cargos).where(eq(schema.cargos.id, id));
  revalidatePath('/admin/config/cargos');
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// CRITÉRIOS
// ────────────────────────────────────────────────────────────────

export async function listarCriteriosAdmin() {
  await requireSession('admin');
  return db.select().from(schema.criterios).orderBy(asc(schema.criterios.ordem), asc(schema.criterios.nome));
}

export async function criarCriterio(input: { nome: string; escalaMax: number; peso: number; ordem: number }) {
  await requireSession('admin');
  if (input.nome.trim().length < 2) throw new Error('Nome muito curto');
  if (input.escalaMax < 2 || input.escalaMax > 10) throw new Error('Escala entre 2 e 10');
  await db.insert(schema.criterios).values({
    nome: input.nome.trim(),
    escalaMax: input.escalaMax,
    peso: String(input.peso),
    ordem: input.ordem,
    ativo: true,
  });
  revalidatePath('/admin/config/criterios');
  return { ok: true };
}

export async function atualizarCriterio(id: string, input: { nome: string; escalaMax: number; peso: number; ordem: number; ativo: boolean }) {
  await requireSession('admin');
  if (input.nome.trim().length < 2) throw new Error('Nome muito curto');
  await db.update(schema.criterios).set({
    nome: input.nome.trim(),
    escalaMax: input.escalaMax,
    peso: String(input.peso),
    ordem: input.ordem,
    ativo: input.ativo,
  }).where(eq(schema.criterios.id, id));
  revalidatePath('/admin/config/criterios');
  return { ok: true };
}

export async function removerCriterio(id: string) {
  await requireSession('admin');
  await db.delete(schema.criterios).where(eq(schema.criterios.id, id));
  revalidatePath('/admin/config/criterios');
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// ROTEIRO (perguntas)
// ────────────────────────────────────────────────────────────────

export async function listarRoteiroAdmin() {
  await requireSession('admin');
  return db.select().from(schema.roteiro).orderBy(asc(schema.roteiro.cargo), asc(schema.roteiro.ordem));
}

export async function criarPergunta(input: { cargo: string; ordem: number; pergunta: string; tipo: string; opcoes?: string[] }) {
  await requireSession('admin');
  if (input.pergunta.trim().length < 3) throw new Error('Pergunta muito curta');
  if (!['texto', 'sim-nao', 'escala', 'select'].includes(input.tipo)) throw new Error('Tipo inválido');
  if (input.tipo === 'select' && (!input.opcoes || input.opcoes.length === 0)) throw new Error('Tipo select exige opções');
  await db.insert(schema.roteiro).values({
    cargo: input.cargo || 'TODOS',
    ordem: input.ordem,
    pergunta: input.pergunta.trim(),
    tipo: input.tipo,
    opcoes: input.tipo === 'select' ? input.opcoes! : null,
    ativo: true,
  });
  revalidatePath('/admin/config/roteiro');
  return { ok: true };
}

export async function atualizarPergunta(id: string, input: { cargo: string; ordem: number; pergunta: string; tipo: string; opcoes?: string[]; ativo: boolean }) {
  await requireSession('admin');
  if (input.pergunta.trim().length < 3) throw new Error('Pergunta muito curta');
  if (!['texto', 'sim-nao', 'escala', 'select'].includes(input.tipo)) throw new Error('Tipo inválido');
  await db.update(schema.roteiro).set({
    cargo: input.cargo || 'TODOS',
    ordem: input.ordem,
    pergunta: input.pergunta.trim(),
    tipo: input.tipo,
    opcoes: input.tipo === 'select' ? (input.opcoes ?? null) : null,
    ativo: input.ativo,
  }).where(eq(schema.roteiro.id, id));
  revalidatePath('/admin/config/roteiro');
  return { ok: true };
}

export async function removerPergunta(id: string) {
  await requireSession('admin');
  await db.delete(schema.roteiro).where(eq(schema.roteiro.id, id));
  revalidatePath('/admin/config/roteiro');
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// OPÇÕES DE LISTAS
// ────────────────────────────────────────────────────────────────

export async function listarOpcoesAdmin() {
  await requireSession('admin');
  return db.select().from(schema.opcoes).orderBy(asc(schema.opcoes.chave));
}

export async function salvarOpcoes(chave: string, valores: string[]) {
  await requireSession('admin');
  if (!chave.trim()) throw new Error('Chave obrigatória');
  const k = chave.trim().toLowerCase();
  const v = valores.map((x) => x.trim()).filter(Boolean);
  // upsert manual
  const existente = await db.select().from(schema.opcoes).where(eq(schema.opcoes.chave, k)).limit(1);
  if (existente.length > 0) {
    await db.update(schema.opcoes).set({ valores: v, updatedAt: new Date() }).where(eq(schema.opcoes.chave, k));
  } else {
    await db.insert(schema.opcoes).values({ chave: k, valores: v });
  }
  revalidatePath('/admin/config/opcoes');
  return { ok: true };
}

export async function removerOpcao(chave: string) {
  await requireSession('admin');
  await db.delete(schema.opcoes).where(eq(schema.opcoes.chave, chave));
  revalidatePath('/admin/config/opcoes');
  return { ok: true };
}
