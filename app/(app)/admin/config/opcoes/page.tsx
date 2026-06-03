import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarOpcoesAdmin } from '@/actions/admin';
import { OpcoesClient } from './OpcoesClient';

export const dynamic = 'force-dynamic';

export default async function OpcoesAdminPage() {
  await requireSession('admin');
  const rows = await listarOpcoesAdmin();
  return (
    <>
      <TopBar titulo="Opções de listas" subtitulo="Valores usados em dropdowns (escolaridade, status, CNH, etc.)" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>
        <Card>
          <CardContent className="p-5">
            <OpcoesClient opcoes={rows.map((r) => ({ chave: r.chave, valores: r.valores }))} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
