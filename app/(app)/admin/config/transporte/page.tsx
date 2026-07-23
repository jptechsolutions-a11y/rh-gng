import { TopBar } from '@/components/layout/TopBar';
import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { eq, and } from 'drizzle-orm';
import { RotasClient } from './RotasClient';

export const dynamic = 'force-dynamic';

export default async function TransporteConfigPage() {
  await requireSession('admin');

  let filiais: { id: string; codigo: string; nome: string }[] = [];
  try {
    filiais = await db
      .select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
      .from(schema.filiais)
      .innerJoin(
        schema.filiaisModulos,
        and(
          eq(schema.filiaisModulos.filialId, schema.filiais.id),
          eq(schema.filiaisModulos.moduloSlug, 'transporte'),
          eq(schema.filiaisModulos.ativo, true),
        ),
      )
      .orderBy(schema.filiais.codigo);
  } catch {
    // table may not exist yet
  }

  return (
    <>
      <TopBar titulo="Transporte — Rotas" subtitulo="Gerenciar rotas de van por filial" badge="ADMIN" />
      <RotasClient filiais={filiais} />
    </>
  );
}
