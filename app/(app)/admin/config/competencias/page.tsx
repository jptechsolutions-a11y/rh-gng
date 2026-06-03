import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarCompetenciasComFatores } from '@/actions/avaliacao-admin';
import { CompetenciasEditor } from './CompetenciasEditor';

export const dynamic = 'force-dynamic';

export default async function CompetenciasAdminPage() {
  await requireSession('admin');
  const competencias = await listarCompetenciasComFatores();

  return (
    <>
      <TopBar titulo="Competências e fatores" subtitulo="Configuração da avaliação de desempenho" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>

        <Card>
          <CardContent className="p-5">
            <CompetenciasEditor competencias={competencias} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
