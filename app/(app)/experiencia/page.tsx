import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { buscarExperiencia } from '@/lib/experiencia/buscar';
import { ExpDashboard } from '@/components/experiencia/ExpDashboard';

export const dynamic = 'force-dynamic';

export default async function ExperienciaPage({ searchParams }: { searchParams: Promise<{ base?: string }> }) {
  const s = await requireSession();
  const { base } = await searchParams;
  const d = await buscarExperiencia(s, base);
  const badge =
    s.perfil === 'admin' ? 'ADMIN' :
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL';

  return (
    <>
      <TopBar titulo="Avaliação de Experiência" subtitulo="Pendências de 35 e 70 dias por filial e gestor · bandeira PERLOG" badge={badge} />
      <div className="p-4 lg:p-6">
        <ExpDashboard
          pendencias={d.pendencias}
          totalColab={d.totalColab}
          hoje={d.hoje}
          dataRef={d.dataRef}
          imports={d.imports}
          atualId={d.atualId}
          evolucao={d.evolucao}
        />
      </div>
    </>
  );
}
