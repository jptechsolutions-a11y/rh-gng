import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { ImportVagasPreview } from '@/components/vagas/ImportVagasPreview';

export const dynamic = 'force-dynamic';

export default async function ImportarVagasPage() {
  await requireSession('admin');
  return (
    <>
      <TopBar
        titulo="Quadro de Vagas — Importar"
        subtitulo="Upload da planilha · preview antes de aplicar"
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <ImportVagasPreview />
      </div>
    </>
  );
}
