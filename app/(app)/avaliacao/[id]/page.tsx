import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { obterAvaliacao } from '@/actions/avaliacao';
import { DetalheAvaliacao } from './DetalheAvaliacao';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const dados = await obterAvaliacao(id);
  if (!dados) notFound();
  return (
    <>
      <TopBar titulo="Detalhe da avaliação" subtitulo="Avaliação de desempenho" />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <Link href={`/avaliacao/${id}/imprimir`}>
            <Button variant="outline">
              <Printer className="mr-1 h-4 w-4" />
              Imprimir laudo
            </Button>
          </Link>
        </div>
        <DetalheAvaliacao dados={dados} />
      </div>
    </>
  );
}
