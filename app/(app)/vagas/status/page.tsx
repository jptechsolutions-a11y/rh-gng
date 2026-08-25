import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { TopBar } from '@/components/layout/TopBar';
import { StatusCatalogoManager } from '@/components/vagas/StatusCatalogoManager';

export const dynamic = 'force-dynamic';

export default async function StatusVagasPage() {
  await requireSession('admin');
  const status = await db.select().from(schema.vagasStatus).orderBy(schema.vagasStatus.ordem);
  return (
    <>
      <TopBar titulo="Quadro de Vagas — Status" subtitulo="Catálogo de status das vagas" badge="ADMIN" />
      <div className="space-y-5 p-4 lg:p-6">
        <StatusCatalogoManager statusInicial={status} />
      </div>
    </>
  );
}
