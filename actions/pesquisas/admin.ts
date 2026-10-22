'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { gerarSlug, type PerguntaInput } from '@/lib/pesquisas/tipos';
import { validarPerguntas } from '@/lib/pesquisas/validar';

export async function criarPesquisa(input: {
  titulo: string;
  descricao: string;
  anonima: boolean;
  perguntas: PerguntaInput[];
}): Promise<{ id: string; slug: string }> {
  const s = await requireSession('admin');
  const titulo = input.titulo.trim();
  if (!titulo) throw new Error('informe o título da pesquisa');
  const perguntas = validarPerguntas(input.perguntas);

  const [p] = await db
    .insert(schema.pesquisas)
    .values({
      slug: gerarSlug(),
      titulo,
      descricao: input.descricao.trim() || null,
      anonima: !!input.anonima,
      criadaPorNome: s.nome ?? s.usuario,
    })
    .returning();
  try {
    await db.insert(schema.pesquisaPerguntas).values(
      perguntas.map((q, i) => ({ pesquisaId: p!.id, ordem: i + 1, ...q })),
    );
  } catch (e) {
    await db.delete(schema.pesquisas).where(eq(schema.pesquisas.id, p!.id));
    throw e;
  }
  revalidatePath('/pesquisas');
  return { id: p!.id, slug: p!.slug };
}

export async function alterarStatusPesquisa(id: string, status: 'aberta' | 'encerrada') {
  await requireSession('admin');
  await db
    .update(schema.pesquisas)
    .set({ status, encerradaEm: status === 'encerrada' ? new Date() : null })
    .where(eq(schema.pesquisas.id, id));
  revalidatePath('/pesquisas');
  revalidatePath(`/pesquisas/${id}`);
}

export async function excluirPesquisa(id: string) {
  await requireSession('admin');
  await db.delete(schema.pesquisas).where(eq(schema.pesquisas.id, id));
  revalidatePath('/pesquisas');
}
