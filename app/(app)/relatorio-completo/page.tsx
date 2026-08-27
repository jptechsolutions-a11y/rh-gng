import { and, asc, eq, inArray } from 'drizzle-orm';
import { requireSession, getFiliaisVisiveis } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { TopBar } from '@/components/layout/TopBar';
import { RelatorioCompletoClient } from '@/components/relatorio-completo/RelatorioCompletoClient';

export const dynamic = 'force-dynamic';

export default async function RelatorioCompletoPage() {
  const s = await requireSession('admin');
  const escopo = getFiliaisVisiveis(s);

  const cond = [eq(schema.filiais.ativa, true)];
  if (escopo) cond.push(inArray(schema.filiais.id, escopo));
  const filiais = await db
    .select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(and(...cond))
    .orderBy(asc(schema.filiais.codigo));

  return (
    <>
      <TopBar titulo="Relatório Completo" subtitulo="Gente & Gestão · Perlog" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <RelatorioCompletoClient filiais={filiais} />
      </div>
    </>
  );
}
