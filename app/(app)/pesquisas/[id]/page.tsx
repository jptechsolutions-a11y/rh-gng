import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { carregarIndicadores } from '@/lib/pesquisas/dados';
import { cotaPorFilial } from '@/actions/pesquisas/publico';
import { db, schema } from '@/db/client';
import { PesquisaIndicadores } from '@/components/pesquisas/PesquisaIndicadores';

export const dynamic = 'force-dynamic';

export default async function PesquisaIndicadoresPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession('admin');
  const { id } = await params;
  const dados = await carregarIndicadores(id);
  if (!dados) notFound();
  const { pesquisa, perguntas, respostas, alvo } = dados;

  // Pesquisa anônima: o "alvo" é a cota por filial (colaboradores ativos do QLP).
  let cotas: { filialCodigo: string; cota: number; respondidas: number }[] = [];
  if (pesquisa.anonima) {
    const [cs, fs] = await Promise.all([
      cotaPorFilial(pesquisa.id),
      db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo }).from(schema.filiais),
    ]);
    const cod = new Map(fs.map((f) => [f.id, f.codigo]));
    cotas = cs.map((c) => ({ filialCodigo: cod.get(c.filialId) ?? '?', cota: c.cota, respondidas: c.respondidas }));
  }

  return (
    <>
      <TopBar
        titulo={`Pesquisa — ${pesquisa.titulo}`}
        subtitulo={`${respostas.length} respostas · ${pesquisa.anonima ? 'anônima' : 'identificada'} · ${pesquisa.status}`}
        badge="ADMIN"
      />
      <div className="p-4 lg:p-6">
        <PesquisaIndicadores
          pesquisa={{ id: pesquisa.id, slug: pesquisa.slug, titulo: pesquisa.titulo, anonima: pesquisa.anonima, status: pesquisa.status }}
          perguntas={perguntas.map((q) => ({
            id: q.id,
            texto: q.texto,
            tipo: q.tipo as 'unica' | 'multipla' | 'texto' | 'nota',
            opcoes: q.opcoes,
          }))}
          respostas={respostas}
          alvo={pesquisa.anonima ? [] : alvo}
          cotas={cotas}
        />
      </div>
    </>
  );
}
