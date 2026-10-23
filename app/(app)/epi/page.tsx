import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { buscarEpi } from '@/lib/epi/buscar';
import { EpiDashboard } from '@/components/epi/EpiDashboard';

export const dynamic = 'force-dynamic';

export default async function EpiPage() {
  const s = await requireSession();
  const { imp, rows } = await buscarEpi(s);
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar titulo="EPI — Empréstimo" subtitulo="Cobertura e vencimento de EPI nas filiais PERLOG" badge={badge} />
      <div className="p-4 lg:p-6">
        <EpiDashboard rows={rows} atualizadoEm={imp ? imp.createdAt.toISOString() : null} />
      </div>
    </>
  );
}
