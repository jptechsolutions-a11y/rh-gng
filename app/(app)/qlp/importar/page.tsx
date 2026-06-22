import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { ImportPreview } from '@/components/qlp/ImportPreview';

export const dynamic = 'force-dynamic';

export default async function ImportarPage() {
  await requireSession('admin');
  return (
    <>
      <TopBar
        titulo="QLP — Importar quadro Perlog"
        subtitulo="Upload do XLS · diff antes de aplicar"
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <ImportPreview />
      </div>
    </>
  );
}
