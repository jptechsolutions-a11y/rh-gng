import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { ExpImportar } from '@/components/experiencia/ExpImportar';

export const dynamic = 'force-dynamic';

export default async function ExperienciaImportarPage() {
  await requireSession('admin');
  const ws = await db.select().from(schema.expImports).where(eq(schema.expImports.concluida, true)).orderBy(desc(schema.expImports.dataRef));
  return (
    <>
      <TopBar titulo="Experiência — Importar" subtitulo="Atualize a base com o arquivo de avaliações" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <ExpImportar
          bases={ws.map((w) => ({ dataRef: w.dataRef, arquivo: w.arquivoNome, por: w.importadoPorNome, em: w.createdAt.toISOString(), total: w.totalColaboradores }))}
        />
      </div>
    </>
  );
}
