'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';

export async function listarStatusVagas() {
  await requireSession();
  return db.select().from(schema.vagasStatus).orderBy(schema.vagasStatus.ordem);
}

export async function criarStatusVaga(nome: string) {
  await requireSession('admin');
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error('nome do status é obrigatório');

  const existente = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.nome, nomeLimpo) });
  if (existente) throw new Error('já existe um status com esse nome');

  const max = await db
    .select({ ordem: schema.vagasStatus.ordem })
    .from(schema.vagasStatus)
    .orderBy(desc(schema.vagasStatus.ordem))
    .limit(1);
  const ordem = (max[0]?.ordem ?? 0) + 1;

  const inserido = await db
    .insert(schema.vagasStatus)
    .values({ nome: nomeLimpo, ordem, sistema: false, ativo: true })
    .returning();
  revalidatePath('/vagas/status');
  revalidatePath('/vagas');
  return inserido[0]!;
}

export async function editarStatusVaga(id: string, nome: string, ordem: number) {
  await requireSession('admin');
  const atual = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, id) });
  if (!atual) throw new Error('status não encontrado');
  if (atual.sistema) throw new Error('status "Em aberto" não pode ser renomeado');

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error('nome do status é obrigatório');

  const existente = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.nome, nomeLimpo) });
  if (existente && existente.id !== id) throw new Error('já existe um status com esse nome');

  await db.update(schema.vagasStatus).set({ nome: nomeLimpo, ordem }).where(eq(schema.vagasStatus.id, id));
  revalidatePath('/vagas/status');
  revalidatePath('/vagas');
}

export async function alternarAtivoStatusVaga(id: string, ativo: boolean) {
  await requireSession('admin');
  const atual = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, id) });
  if (!atual) throw new Error('status não encontrado');
  if (atual.sistema && !ativo) throw new Error('status "Em aberto" não pode ser desativado');

  if (!ativo) {
    const emUso = await db
      .select({ id: schema.vagas.id })
      .from(schema.vagas)
      .where(eq(schema.vagas.statusId, id))
      .limit(1);
    if (emUso.length > 0) {
      throw new Error('status em uso por vagas — não é possível desativar enquanto houver vagas com esse status');
    }
  }

  await db.update(schema.vagasStatus).set({ ativo }).where(eq(schema.vagasStatus.id, id));
  revalidatePath('/vagas/status');
  revalidatePath('/vagas');
}

export async function excluirStatusVaga(id: string) {
  await requireSession('admin');
  const atual = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, id) });
  if (!atual) throw new Error('status não encontrado');
  if (atual.sistema) throw new Error('status "Em aberto" não pode ser excluído');

  const emUso = await db
    .select({ id: schema.vagas.id })
    .from(schema.vagas)
    .where(eq(schema.vagas.statusId, id))
    .limit(1);
  if (emUso.length > 0) {
    throw new Error('status em uso por vagas — desative em vez de excluir');
  }

  await db.delete(schema.vagasStatus).where(eq(schema.vagasStatus.id, id));
  revalidatePath('/vagas/status');
}
