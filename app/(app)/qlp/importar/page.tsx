import { requireSession } from '@/lib/auth/session';
import { ImportPreview } from '@/components/qlp/ImportPreview';

export const dynamic = 'force-dynamic';

export default async function ImportarPage() {
  await requireSession('admin');
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Importar quadro Perlog</h1>
        <p className="text-sm text-slate-500 mt-1">
          Faça o upload do XLS atual; o sistema compara contra a base e mostra um preview antes de aplicar.
        </p>
      </header>
      <ImportPreview />
    </div>
  );
}
