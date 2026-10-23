import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { EpiImportar } from '@/components/epi/EpiImportar';

export const dynamic = 'force-dynamic';

export default async function EpiImportarPage() {
  await requireSession('admin');
  const imp = await db.query.epiImports.findFirst({
    where: eq(schema.epiImports.concluida, true),
    orderBy: desc(schema.epiImports.createdAt),
  });
  return (
    <>
      <TopBar titulo="EPI — Importar" subtitulo="Atualize a base a partir do painel do TOTVS" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <EpiImportar
          ultima={imp ? { arquivo: imp.arquivoNome, por: imp.importadoPorNome, em: imp.createdAt.toISOString(), linhas: imp.totalLinhas } : null}
        />
      </div>
    </>
  );
}
