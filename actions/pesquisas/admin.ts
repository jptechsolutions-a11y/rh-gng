'use server';

import { revalidatePath } from 'next/cache';
import { and, count, eq, notInArray } from 'drizzle-orm';
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

export async function editarPesquisa(
  id: string,
  input: {
    titulo: string;
    descricao: string;
    anonima: boolean;
    perguntas: (PerguntaInput & { id?: string })[];
  },
): Promise<void> {
  await requireSession('admin');
  const atual = await db.query.pesquisas.findFirst({ where: eq(schema.pesquisas.id, id) });
  if (!atual) throw new Error('pesquisa não encontrada');
  const titulo = input.titulo.trim();
  if (!titulo) throw new Error('informe o título da pesquisa');
  const validas = validarPerguntas(input.perguntas);

  const [{ total }] = (await db
    .select({ total: count() })
    .from(schema.pesquisaRespostas)
    .where(eq(schema.pesquisaRespostas.pesquisaId, id))) as [{ total: number }];
  const temRespostas = total > 0;
  if (temRespostas && input.anonima !== atual.anonima) {
    throw new Error('não dá para trocar entre anônima e identificada depois que há respostas');
  }

  const existentes = await db
    .select()
    .from(schema.pesquisaPerguntas)
    .where(eq(schema.pesquisaPerguntas.pesquisaId, id));
  const porId = new Map(existentes.map((q) => [q.id, q]));

  const novas = validas.map((q, i) => ({ ...q, id: input.perguntas[i]!.id, ordem: i + 1 }));
  for (const q of novas) {
    if (!q.id) continue;
    const antiga = porId.get(q.id);
    if (!antiga) throw new Error('pergunta inexistente na pesquisa');
    if (temRespostas && antiga.tipo !== q.tipo) {
      throw new Error(`"${antiga.texto}": não dá para mudar o tipo de uma pergunta que já tem respostas`);
    }
  }

  const manterIds = novas.filter((q) => q.id).map((q) => q.id!);
  if (manterIds.length > 0) {
    await db
      .delete(schema.pesquisaPerguntas)
      .where(and(eq(schema.pesquisaPerguntas.pesquisaId, id), notInArray(schema.pesquisaPerguntas.id, manterIds)));
  } else {
    await db.delete(schema.pesquisaPerguntas).where(eq(schema.pesquisaPerguntas.pesquisaId, id));
  }

  for (const q of novas) {
    if (q.id) {
      await db
        .update(schema.pesquisaPerguntas)
        .set({ ordem: q.ordem, texto: q.texto, tipo: q.tipo, obrigatoria: q.obrigatoria, opcoes: q.opcoes })
        .where(eq(schema.pesquisaPerguntas.id, q.id));
    } else {
      await db.insert(schema.pesquisaPerguntas).values({
        pesquisaId: id, ordem: q.ordem, texto: q.texto, tipo: q.tipo, obrigatoria: q.obrigatoria, opcoes: q.opcoes,
      });
    }
  }

  await db
    .update(schema.pesquisas)
    .set({ titulo, descricao: input.descricao.trim() || null, anonima: !!input.anonima })
    .where(eq(schema.pesquisas.id, id));
  revalidatePath('/pesquisas');
  revalidatePath(`/pesquisas/${id}`);
  revalidatePath(`/p/${atual.slug}`);
}
