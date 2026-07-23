import { TopBar } from '@/components/layout/TopBar';
import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { eq, and, asc, sql, isNull } from 'drizzle-orm';
import { Bus, Users, MapPin, AlertTriangle } from 'lucide-react';
import { TransporteOverviewClient } from '@/components/transporte/TransporteOverviewClient';

export const dynamic = 'force-dynamic';

export default async function TransportePage() {
  const s = await requireSession();
  const isAdmin = s.perfil === 'admin';
  const badge = s.perfil === 'filial' ? `FILIAL ${s.filialCodigo}` : 'ADMIN';

  let filiais: { id: string; codigo: string; nome: string }[] = [];

  if (isAdmin) {
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
        .orderBy(asc(schema.filiais.codigo));
    } catch {
      filiais = [];
    }
  }

  return (
    <>
      <TopBar titulo="Transporte" subtitulo="Rotas de van e ocupação" badge={badge} />
      <TransporteOverviewClient
        perfil={s.perfil}
        filialId={s.perfil === 'filial' ? s.filialId : undefined}
        filiais={filiais}
      />
    </>
  );
}
