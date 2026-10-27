import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { IcImportar } from '@/components/ic/IcImportar';

export const dynamic = 'force-dynamic';

export default async function IcImportarPage() {
  await requireSession('admin');
  const ws = await db.select().from(schema.icImports).where(eq(schema.icImports.concluida, true)).orderBy(desc(schema.icImports.semanaRef));
  return (
    <>
      <TopBar titulo="IC — Importar" subtitulo="Atualize a base com a planilha semanal" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <IcImportar
          semanas={ws.map((w) => ({ semanaRef: w.semanaRef, arquivo: w.arquivoNome, por: w.importadoPorNome, em: w.createdAt.toISOString(), total: w.totalPendencias }))}
        />
      </div>
    </>
  );
}
