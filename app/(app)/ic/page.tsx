import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { buscarIc } from '@/lib/ic/buscar';
import { IcDashboard } from '@/components/ic/IcDashboard';

export const dynamic = 'force-dynamic';

export default async function IcPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const s = await requireSession();
  const { semana } = await searchParams;
  const d = await buscarIc(s, semana);
  const badge = s.perfil === 'admin' ? 'ADMIN' : s.perfil === 'visualizador' ? (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL') : '';

  return (
    <>
      <TopBar titulo="IC — Regularizações pendentes" subtitulo="Corrida dos responsáveis · bandeira PERLOG" badge={badge} />
      <div className="p-4 lg:p-6">
        <IcDashboard
          rows={d.rows}
          headcount={d.headcount}
          responsaveis={d.responsaveis}
          semanas={d.semanas}
          semanaAtual={d.semanaAtual}
          evolucao={d.evolucao}
        />
      </div>
    </>
  );
}
