import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarFiliaisAdmin } from '@/actions/admin';
import { FiliaisClient } from './FiliaisClient';

export const dynamic = 'force-dynamic';

export default async function FiliaisAdminPage() {
  await requireSession('admin');
  const filiais = await listarFiliaisAdmin();

  return (
    <>
      <TopBar titulo="Filiais e senhas" subtitulo="Gerenciar acessos das filiais" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>
        <Card>
          <CardContent className="p-0">
            <FiliaisClient filiais={filiais} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
