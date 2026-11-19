'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import type { ExpLinhaInput } from '@/lib/experiencia/tipos';

const MAX_LOTE = 1000;

/** 1) abre um lote (invisível até concluir). */
export async function iniciarImportExp(arquivoNome: string, dataRef: string): Promise<string> {
  const s = await requireSession('admin');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataRef)) throw new Error('data da extração inválida');
  const [imp] = await db
    .insert(schema.expImports)
    .values({ dataRef, arquivoNome: arquivoNome.slice(0, 200), importadoPorNome: s.nome ?? s.usuario })
    .returning({ id: schema.expImports.id });
  return imp!.id;
}

/** 2) grava um pedaço dos colaboradores. */
export async function enviarLoteExp(importId: string, linhas: ExpLinhaInput[]): Promise<number> {
  await requireSession('admin');
  if (linhas.length === 0) return 0;
  if (linhas.length > MAX_LOTE) throw new Error(`lote grande demais (máx. ${MAX_LOTE})`);
  const imp = await db.query.expImports.findFirst({ where: eq(schema.expImports.id, importId) });
  if (!imp || imp.concluida) throw new Error('lote de importação inválido');
  await db.insert(schema.expLinhas).values(linhas.map((l) => ({ ...l, importId })));
  return linhas.length;
}

/** 3) conclui e substitui a foto anterior DA MESMA DATA (datas diferentes ficam no histórico). */
export async function concluirImportExp(importId: string, total: number): Promise<void> {
  await requireSession('admin');
  const imp = await db.query.expImports.findFirst({ where: eq(schema.expImports.id, importId) });
  if (!imp || imp.concluida) throw new Error('lote de importação inválido');
  await db.update(schema.expImports).set({ concluida: true, totalColaboradores: total }).where(eq(schema.expImports.id, importId));
  await db
    .delete(schema.expImports)
    .where(and(eq(schema.expImports.dataRef, imp.dataRef), ne(schema.expImports.id, importId)));
  revalidatePath('/experiencia');
  revalidatePath('/experiencia/importar');
}

export async function descartarImportExp(importId: string): Promise<void> {
  await requireSession('admin');
  const imp = await db.query.expImports.findFirst({ where: eq(schema.expImports.id, importId) });
  if (imp && !imp.concluida) await db.delete(schema.expImports).where(eq(schema.expImports.id, importId));
}
