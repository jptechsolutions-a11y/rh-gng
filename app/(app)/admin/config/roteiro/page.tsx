import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarRoteiroAdmin, listarCargosAdmin } from '@/actions/admin';
import { RoteiroClient } from './RoteiroClient';

export const dynamic = 'force-dynamic';

export default async function RoteiroAdminPage() {
  await requireSession('admin');
  const [perguntas, cargos] = await Promise.all([listarRoteiroAdmin(), listarCargosAdmin()]);
  return (
    <>
      <TopBar titulo="Roteiro de entrevista" subtitulo="Perguntas exibidas no Step 3 do wizard" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>
        <Card>
          <CardContent className="p-5">
            <RoteiroClient
              perguntas={perguntas.map((p) => ({
                id: p.id, cargo: p.cargo, ordem: p.ordem, pergunta: p.pergunta,
                tipo: p.tipo, opcoes: p.opcoes ?? null, ativo: p.ativo,
              }))}
              cargos={['TODOS', ...cargos.filter((c) => c.ativo).map((c) => c.nome)]}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
