'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import type { IcHeadcountInput, IcPendenciaInput } from '@/lib/ic/tipos';

const MAX_LOTE = 1000;

/** 1) abre um lote da semana (invisível até concluir). */
export async function iniciarImportIc(arquivoNome: string, semanaRef: string): Promise<string> {
  const s = await requireSession('admin');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semanaRef)) throw new Error('data da semana inválida');
  const [imp] = await db
    .insert(schema.icImports)
    .values({ semanaRef, arquivoNome: arquivoNome.slice(0, 200), importadoPorNome: s.nome ?? s.usuario })
    .returning({ id: schema.icImports.id });
  return imp!.id;
}

/** 2) grava um pedaço das pendências. */
export async function enviarLoteIc(importId: string, linhas: IcPendenciaInput[]): Promise<number> {
  await requireSession('admin');
  if (linhas.length === 0) return 0;
  if (linhas.length > MAX_LOTE) throw new Error(`lote grande demais (máx. ${MAX_LOTE})`);
  const imp = await db.query.icImports.findFirst({ where: eq(schema.icImports.id, importId) });
  if (!imp || imp.concluida) throw new Error('lote de importação inválido');
  await db.insert(schema.icPendencias).values(
    linhas.map((l) => ({
      importId,
      filialCodigo: l.filialCodigo,
      regional: l.regional,
      chapa: l.chapa,
      nome: l.nome,
      funcao: l.funcao,
      secao: l.secao,
      codsituacao: l.codsituacao,
      categoria: l.categoria,
      tipo: l.tipo,
      dataPend: l.dataPend,
    })),
  );
  return linhas.length;
}

/** 3) conclui: grava o total de funcionários por filial e substitui a foto anterior DA MESMA SEMANA. */
export async function concluirImportIc(importId: string, headcount: IcHeadcountInput[], totalPendencias: number): Promise<void> {
  await requireSession('admin');
  const imp = await db.query.icImports.findFirst({ where: eq(schema.icImports.id, importId) });
  if (!imp || imp.concluida) throw new Error('lote de importação inválido');
  if (headcount.length > 0) {
    await db.insert(schema.icHeadcount).values(headcount.map((h) => ({ importId, filialCodigo: h.filialCodigo, qtd: h.qtd })));
  }
  await db.update(schema.icImports).set({ concluida: true, totalPendencias }).where(eq(schema.icImports.id, importId));
  // Reimportar a mesma semana substitui; semanas diferentes ficam no histórico.
  await db
    .delete(schema.icImports)
    .where(and(eq(schema.icImports.semanaRef, imp.semanaRef), ne(schema.icImports.id, importId)));
  revalidatePath('/ic');
  revalidatePath('/ic/importar');
}

export async function descartarImportIc(importId: string): Promise<void> {
  await requireSession('admin');
  const imp = await db.query.icImports.findFirst({ where: eq(schema.icImports.id, importId) });
  if (imp && !imp.concluida) await db.delete(schema.icImports).where(eq(schema.icImports.id, importId));
}
