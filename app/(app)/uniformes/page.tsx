import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { listarSolicitacoesUniforme } from '@/lib/uniformes/buscar';
import { UniformeLista } from '@/components/uniformes/UniformeLista';

export const dynamic = 'force-dynamic';

export default async function UniformesPage() {
  const s = await requireSession();
  const admin = s.perfil === 'admin';
  const solicitacoes = await listarSolicitacoesUniforme(s);
  return (
    <>
      <TopBar
        titulo={admin ? 'Uniformes — Solicitações' : 'Uniformes — Acompanhar'}
        subtitulo={admin ? 'Aprove, avise que está pronto, registre a entrega e a devolução' : 'Acompanhe o andamento dos pedidos de uniforme'}
        badge={admin ? 'ADMIN' : undefined}
      />
      <div className="p-3 sm:p-4 lg:p-6">
        <UniformeLista solicitacoes={solicitacoes} admin={admin} />
      </div>
    </>
  );
}
