'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { parseQuadroVagas } from '@/lib/vagas/xls-parser';
import { previewImportVagas, aplicarImportVagas, type ImportSummaryVagas } from '@/lib/vagas/import-sync';

export async function previewImportVagasAction(formData: FormData): Promise<ImportSummaryVagas> {
  await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroVagas(buf);
  return previewImportVagas(linhas);
}

export async function aplicarImportVagasAction(formData: FormData): Promise<ImportSummaryVagas> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo') as File | null;
  if (!file) throw new Error('arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const linhas = parseQuadroVagas(buf);
  const summary = await aplicarImportVagas(linhas, {
    arquivoNome: file.name,
    importadoPorNome: s.nome ?? s.usuario,
  });
  revalidatePath('/vagas');
  revalidatePath('/vagas/importar');
  return summary;
}
