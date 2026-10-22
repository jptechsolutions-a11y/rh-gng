import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { ConectaLogo } from '@/components/brand/ConectaLogo';
import { PesquisaPublica } from '@/components/pesquisas/PesquisaPublica';
import { cotaPorFilial } from '@/actions/pesquisas/publico';

// Página PÚBLICA (sem login): /p/[slug]. O middleware libera o prefixo /p/.
export const dynamic = 'force-dynamic';

export default async function PesquisaPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.query.pesquisas.findFirst({ where: eq(schema.pesquisas.slug, slug) });
  if (!p) notFound();

  const perguntas = await db
    .select()
    .from(schema.pesquisaPerguntas)
    .where(eq(schema.pesquisaPerguntas.pesquisaId, p.id))
    .orderBy(schema.pesquisaPerguntas.ordem);

  let filiais: { id: string; codigo: string; nome: string; restante: number }[] = [];
  if (p.anonima && p.status === 'aberta') {
    const cotas = await cotaPorFilial(p.id);
    const fs = await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome }).from(schema.filiais);
    const mapa = new Map(fs.map((f) => [f.id, f]));
    filiais = cotas
      .map((c) => {
        const f = mapa.get(c.filialId);
        return f ? { ...f, restante: Math.max(0, c.cota - c.respondidas) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <ConectaLogo variant="full" withSubtitle={false} className="scale-90 origin-left" />
        </div>
        <div aria-hidden className="h-[3px]" style={{ background: 'linear-gradient(90deg, #E8621A 0%, #FF8C42 100%)' }} />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <PesquisaPublica
          slug={p.slug}
          titulo={p.titulo}
          descricao={p.descricao}
          anonima={p.anonima}
          encerrada={p.status !== 'aberta'}
          filiais={filiais}
          perguntas={perguntas.map((q) => ({
            id: q.id,
            texto: q.texto,
            tipo: q.tipo as 'unica' | 'multipla' | 'texto' | 'nota',
            obrigatoria: q.obrigatoria,
            opcoes: q.opcoes,
          }))}
        />
      </main>
    </div>
  );
}
