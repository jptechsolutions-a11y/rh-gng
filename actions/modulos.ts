'use server';

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { GATED_MODULES } from '@/lib/modules/permissions';

export async function listarFiliaisComModulos() {
  await requireSession('admin');

  const filiais = await db
    .select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome, ativa: schema.filiais.ativa })
    .from(schema.filiais)
    .orderBy(schema.filiais.codigo);

  let modulos: { filialId: string; slug: string; ativo: boolean }[] = [];
  try {
    modulos = await db
      .select({
        filialId: schema.filiaisModulos.filialId,
        slug: schema.filiaisModulos.moduloSlug,
        ativo: schema.filiaisModulos.ativo,
      })
      .from(schema.filiaisModulos);
  } catch {
    // table may not exist yet
  }

  const modulosPorFilial = new Map<string, Set<string>>();
  for (const m of modulos) {
    if (!m.ativo) continue;
    if (!modulosPorFilial.has(m.filialId)) modulosPorFilial.set(m.filialId, new Set());
    modulosPorFilial.get(m.filialId)!.add(m.slug);
  }

  return {
    filiais: filiais.map(f => ({
      ...f,
      modulos: GATED_MODULES.filter(slug => modulosPorFilial.get(f.id)?.has(slug)),
    })),
    modulosDisponiveis: [...GATED_MODULES],
  };
}

export async function toggleModuloFilial(filialId: string, moduloSlug: string, ativo: boolean) {
  await requireSession('admin');

  if (!(GATED_MODULES as readonly string[]).includes(moduloSlug)) {
    throw new Error('Módulo inválido');
  }

  const existing = await db
    .select()
    .from(schema.filiaisModulos)
    .where(and(
      eq(schema.filiaisModulos.filialId, filialId),
      eq(schema.filiaisModulos.moduloSlug, moduloSlug),
    ))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.filiaisModulos)
      .set({ ativo })
      .where(and(
        eq(schema.filiaisModulos.filialId, filialId),
        eq(schema.filiaisModulos.moduloSlug, moduloSlug),
      ));
  } else if (ativo) {
    await db.insert(schema.filiaisModulos).values({ filialId, moduloSlug, ativo: true });
  }

  revalidatePath('/admin/config/modulos');
  revalidatePath('/inicio');
  return { ok: true };
}
