import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarCargosAdmin } from '@/actions/admin';
import { CargosClient } from './CargosClient';

export const dynamic = 'force-dynamic';

export default async function CargosAdminPage() {
  await requireSession('admin');
  const cargos = await listarCargosAdmin();
  return (
    <>
      <TopBar titulo="Cargos" subtitulo="Gerenciar cargos disponíveis" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>
        <Card>
          <CardContent className="p-5">
            <CargosClient cargos={cargos} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
