import { notFound } from 'next/navigation';
import { count, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { PesquisaBuilder } from '@/components/pesquisas/PesquisaBuilder';

export const dynamic = 'force-dynamic';

export default async function EditarPesquisaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession('admin');
  const { id } = await params;
  const p = await db.query.pesquisas.findFirst({ where: eq(schema.pesquisas.id, id) });
  if (!p) notFound();
  const [perguntas, resp] = await Promise.all([
    db.select().from(schema.pesquisaPerguntas).where(eq(schema.pesquisaPerguntas.pesquisaId, id)).orderBy(schema.pesquisaPerguntas.ordem),
    db.select({ total: count() }).from(schema.pesquisaRespostas).where(eq(schema.pesquisaRespostas.pesquisaId, id)),
  ]);

  return (
    <>
      <TopBar titulo={`Pesquisas — Editar`} subtitulo={p.titulo} badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <PesquisaBuilder
          inicial={{
            id: p.id,
            titulo: p.titulo,
            descricao: p.descricao ?? '',
            anonima: p.anonima,
            temRespostas: (resp[0]?.total ?? 0) > 0,
            perguntas: perguntas.map((q) => ({
              id: q.id,
              texto: q.texto,
              tipo: q.tipo as 'unica' | 'multipla' | 'texto' | 'nota',
              obrigatoria: q.obrigatoria,
              opcoes: q.opcoes,
            })),
          }}
        />
      </div>
    </>
  );
}
