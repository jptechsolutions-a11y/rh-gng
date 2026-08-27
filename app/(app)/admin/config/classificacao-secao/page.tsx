import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarMapeamentos, listarSecoesNaoMapeadas } from '@/actions/vagas/classificacao-secao';
import { CLASSIFICACOES } from '@/lib/relatorio-completo/classificacao-secao';
import { ClassificacaoSecaoClient } from './ClassificacaoSecaoClient';

export const dynamic = 'force-dynamic';

export default async function ClassificacaoSecaoPage() {
  await requireSession('admin');
  const [mapeamentos, naoMapeadas] = await Promise.all([listarMapeamentos(), listarSecoesNaoMapeadas()]);
  return (
    <>
      <TopBar titulo="Classificação de Seções" subtitulo="DE-PARA seção → classificação (Quadro de Vagas)" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>
        <Card>
          <CardContent className="p-5">
            <ClassificacaoSecaoClient
              mapeamentos={mapeamentos}
              naoMapeadas={naoMapeadas}
              classificacoes={CLASSIFICACOES}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
