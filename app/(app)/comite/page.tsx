import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { buscarComite } from '@/lib/comite/buscar';
import { listarGestoresDecisao } from '@/lib/comite/gestores';
import { ComiteDashboard } from '@/components/comite/ComiteDashboard';

export const dynamic = 'force-dynamic';

export default async function ComitePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const s = await requireSession();
  const { mes } = await searchParams;
  const d = await buscarComite(s, mes);
  const podeDecidir = s.perfil === 'admin';
  const gestores = podeDecidir ? await listarGestoresDecisao() : [];
  const badge =
    s.perfil === 'admin' ? 'ADMIN' :
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL';
  return (
    <>
      <TopBar titulo="Comitê de Desligamento" subtitulo="Apresentação mensal dos colaboradores lançados" badge={badge} />
      <div className="p-4 lg:p-6">
        <ComiteDashboard lancamentos={d.lancamentos} mes={d.mes} meses={d.meses} anteriorPorFilial={d.anteriorPorFilial} podeDecidir={podeDecidir} gestores={gestores} />
      </div>
    </>
  );
}
