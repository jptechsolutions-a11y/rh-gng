import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { filiaisPermitidas } from '@/lib/comite/acesso';
import { buscarLancamento } from '@/lib/comite/buscar';
import { ComiteForm } from '@/components/comite/ComiteForm';

export const dynamic = 'force-dynamic';

export default async function ComiteEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const l = await buscarLancamento(s, id);
  if (!l) notFound();
  const filiais = await filiaisPermitidas(s);
  return (
    <>
      <TopBar titulo="Comitê de Desligamento — Editar" subtitulo={l.nome} />
      <div className="p-4 lg:p-6">
        <ComiteForm filiais={filiais} lancamento={l} />
      </div>
    </>
  );
}
