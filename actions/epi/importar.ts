'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import type { EpiLinhaInput } from '@/lib/epi/tipos';

const STATUS_OK = new Set(['REGULAR', 'TROCAR', 'SEM_EMPRESTIMO']);
const MAX_LOTE = 1000;

/** 1) abre um lote novo (ainda invisível para o dashboard). */
export async function iniciarImportEpi(arquivoNome: string): Promise<string> {
  const s = await requireSession('admin');
  const [imp] = await db
    .insert(schema.epiImports)
    .values({ arquivoNome: arquivoNome.slice(0, 200), importadoPorNome: s.nome ?? s.usuario })
    .returning({ id: schema.epiImports.id });
  return imp!.id;
}

/** 2) grava um pedaço das linhas no lote. Chamado várias vezes (a hospedagem limita o corpo da requisição). */
export async function enviarLoteEpi(importId: string, linhas: EpiLinhaInput[]): Promise<number> {
  await requireSession('admin');
  if (linhas.length === 0) return 0;
  if (linhas.length > MAX_LOTE) throw new Error(`lote grande demais (máx. ${MAX_LOTE})`);
  const imp = await db.query.epiImports.findFirst({ where: eq(schema.epiImports.id, importId) });
  if (!imp || imp.concluida) throw new Error('lote de importação inválido');

  const filiais = await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo }).from(schema.filiais);
  const porCodigo = new Map(filiais.map((f) => [normalizarCodigoFilial(f.codigo), f.id]));

  const valores = linhas.map((l) => {
    if (!STATUS_OK.has(l.status)) throw new Error(`status inválido: ${l.status}`);
    return {
      importId,
      filialId: porCodigo.get(normalizarCodigoFilial(l.filialCodigo)) ?? null,
      filialCodigo: normalizarCodigoFilial(l.filialCodigo),
      regional: l.regional,
      bandeira: l.bandeira,
      secao: l.secao,
      chapa: l.chapa,
      nome: l.nome,
      funcao: l.funcao,
      dataAdmissao: l.dataAdmissao,
      codsituacao: l.codsituacao,
      itemRisco: l.itemRisco,
      codEpi: l.codEpi,
      epi: l.epi,
      durabilidade: l.durabilidade,
      diasAVencer: l.diasAVencer,
      dataEmprestimo: l.dataEmprestimo,
      status: l.status,
      tst: l.tst,
    };
  });
  await db.insert(schema.epiLinhas).values(valores);
  return valores.length;
}

/** 3) conclui: o lote passa a valer e os anteriores são apagados (troca atômica). */
export async function concluirImportEpi(importId: string, totalLinhas: number): Promise<void> {
  await requireSession('admin');
  await db
    .update(schema.epiImports)
    .set({ concluida: true, totalLinhas })
    .where(eq(schema.epiImports.id, importId));
  await db.delete(schema.epiImports).where(and(ne(schema.epiImports.id, importId)));
  revalidatePath('/epi');
  revalidatePath('/epi/importar');
}

/** Cancela um lote incompleto (erro no meio do envio). */
export async function descartarImportEpi(importId: string): Promise<void> {
  await requireSession('admin');
  const imp = await db.query.epiImports.findFirst({ where: eq(schema.epiImports.id, importId) });
  if (imp && !imp.concluida) await db.delete(schema.epiImports).where(eq(schema.epiImports.id, importId));
}
