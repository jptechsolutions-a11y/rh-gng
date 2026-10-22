import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { listarPesquisasComContagem } from '@/lib/pesquisas/dados';
import { PesquisaCard } from '@/components/pesquisas/PesquisaCard';

export const dynamic = 'force-dynamic';

export default async function PesquisasPage() {
  await requireSession('admin');
  const todas = await listarPesquisasComContagem();
  const abertas = todas.filter((p) => p.status === 'aberta');
  const encerradas = todas.filter((p) => p.status !== 'aberta');

  return (
    <>
      <TopBar
        titulo="Pesquisas"
        subtitulo={`${abertas.length} em aberto`}
        badge="ADMIN"
      />
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex justify-end">
          <Link
            href="/pesquisas/nova"
            className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-4 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova pesquisa
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">Em aberto</h2>
          {abertas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-conecta-primary/15 p-8 text-center text-sm text-conecta-muted">
              Nenhuma pesquisa em aberto. Crie a primeira em &ldquo;Nova pesquisa&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {abertas.map((p) => (
                <PesquisaCard
                  key={p.id}
                  p={{
                    id: p.id,
                    slug: p.slug,
                    titulo: p.titulo,
                    descricao: p.descricao,
                    anonima: p.anonima,
                    status: p.status,
                    respondidas: p.respondidas,
                    alvo: p.alvo,
                    criadaPorNome: p.criadaPorNome,
                    createdAt: p.createdAt.toISOString(),
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {encerradas.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-muted font-semibold">Encerradas</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {encerradas.map((p) => (
                <PesquisaCard
                  key={p.id}
                  p={{
                    id: p.id,
                    slug: p.slug,
                    titulo: p.titulo,
                    descricao: p.descricao,
                    anonima: p.anonima,
                    status: p.status,
                    respondidas: p.respondidas,
                    alvo: p.alvo,
                    criadaPorNome: p.criadaPorNome,
                    createdAt: p.createdAt.toISOString(),
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
