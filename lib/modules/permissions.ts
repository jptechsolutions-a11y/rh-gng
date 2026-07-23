import 'server-only';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';

export const GATED_MODULES = ['transporte'] as const;
export type GatedModule = (typeof GATED_MODULES)[number];

export async function getFilialModulos(filialId: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ slug: schema.filiaisModulos.moduloSlug })
      .from(schema.filiaisModulos)
      .where(and(
        eq(schema.filiaisModulos.filialId, filialId),
        eq(schema.filiaisModulos.ativo, true),
      ));
    return rows.map(r => r.slug);
  } catch {
    return [];
  }
}

export async function hasModuleAccess(session: Session, slug: string): Promise<boolean> {
  if (session.perfil === 'admin') return true;
  if (session.perfil !== 'filial') return false;
  return (await getFilialModulos(session.filialId)).includes(slug);
}
