import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarCriteriosAdmin } from '@/actions/admin';
import { CriteriosClient } from './CriteriosClient';

export const dynamic = 'force-dynamic';

export default async function CriteriosAdminPage() {
  await requireSession('admin');
  const rows = await listarCriteriosAdmin();
  return (
    <>
      <TopBar titulo="Critérios de avaliação" subtitulo="Notas atribuídas no Step 4 do wizard" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>
        <Card>
          <CardContent className="p-5">
            <CriteriosClient
              criterios={rows.map((r) => ({
                id: r.id, nome: r.nome, escalaMax: r.escalaMax,
                peso: Number(r.peso), ordem: r.ordem, ativo: r.ativo,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
