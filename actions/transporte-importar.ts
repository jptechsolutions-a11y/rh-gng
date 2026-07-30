'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession, type Session } from '@/lib/auth/session';
import { hasModuleAccess } from '@/lib/modules/permissions';
import { parseListaPassageiros } from '@/lib/transporte/xls-parser';
import { computeDiffPassageiros, type DiffPassageiros } from '@/lib/transporte/sync-diff';

async function requireTransporte(): Promise<Session> {
  const s = await requireSession();
  if (!(await hasModuleAccess(s, 'transporte'))) throw new Error('FORBIDDEN');
  return s;
}

function getFilialId(s: Session, filialIdParam?: string): string {
  if (s.perfil === 'admin') {
    if (!filialIdParam) throw new Error('filialId obrigatório para admin');
    return filialIdParam;
  }
  if (s.perfil !== 'filial') throw new Error('FORBIDDEN');
  return s.filialId;
}

async function lerDiff(formData: FormData, filialId: string): Promise<DiffPassageiros> {
  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File)) throw new Error('Arquivo não enviado');
  const buf = Buffer.from(await arquivo.arrayBuffer());
  const linhas = parseListaPassageiros(buf);
  if (linhas.length === 0) throw new Error('Nenhuma linha válida encontrada na planilha');

  const atual = await db
    .select({
      id: schema.transportePassageiros.id,
      chapa: schema.transportePassageiros.chapa,
      nome: schema.transportePassageiros.nome,
      cidade: schema.transportePassageiros.cidade,
      rotaId: schema.transportePassageiros.rotaId,
    })
    .from(schema.transportePassageiros)
    .where(and(
      eq(schema.transportePassageiros.filialId, filialId),
      eq(schema.transportePassageiros.ativo, true),
    ));

  return computeDiffPassageiros(atual, linhas);
}

export interface PreviewImportPassageiros {
  totalLinhas: number;
  novos: number;
  atualizados: number;
  mantidos: number;
  desligados: number;
  amostras: {
    novos: { chapa: string; nome: string; cidade: string | null }[];
    atualizados: { chapa: string; nome: string; cidade: string | null }[];
    desligados: { chapa: string | null; nome: string }[];
  };
}

export async function previewImportPassageiros(
  formData: FormData,
  filialIdParam?: string,
): Promise<PreviewImportPassageiros> {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);
  const diff = await lerDiff(formData, filialId);

  return {
    totalLinhas: diff.novos.length + diff.atualizados.length + diff.mantidos,
    novos: diff.novos.length,
    atualizados: diff.atualizados.length,
    mantidos: diff.mantidos,
    desligados: diff.desligados.length,
    amostras: {
      novos: diff.novos.slice(0, 15),
      atualizados: diff.atualizados.slice(0, 15),
      desligados: diff.desligados.slice(0, 15).map((d) => ({ chapa: d.chapa, nome: d.nome })),
    },
  };
}

export async function aplicarImportPassageiros(formData: FormData, filialIdParam?: string) {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);
  const diff = await lerDiff(formData, filialId);

  if (diff.novos.length > 0) {
    await db.insert(schema.transportePassageiros).values(
      diff.novos.map((n) => ({
        filialId,
        rotaId: null,
        nome: n.nome,
        chapa: n.chapa,
        cidade: n.cidade,
      })),
    );
  }

  for (const a of diff.atualizados) {
    await db.update(schema.transportePassageiros)
      .set({ nome: a.nome, cidade: a.cidade })
      .where(eq(schema.transportePassageiros.id, a.id));
  }

  if (diff.desligados.length > 0) {
    await db.update(schema.transportePassageiros)
      .set({ ativo: false })
      .where(inArray(schema.transportePassageiros.id, diff.desligados.map((d) => d.id)));
  }

  revalidatePath('/transporte');
  revalidatePath('/transporte/passageiros');
  revalidatePath('/admin/config/transporte');

  return {
    novos: diff.novos.length,
    atualizados: diff.atualizados.length,
    mantidos: diff.mantidos,
    desligados: diff.desligados.length,
  };
}
