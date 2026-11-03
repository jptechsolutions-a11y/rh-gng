import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { buscarComparativoEpi } from '@/lib/epi/comparar';
import { EpiComparativo } from '@/components/epi/EpiComparativo';

export const dynamic = 'force-dynamic';

export default async function EpiComparativoPage({ searchParams }: { searchParams: Promise<{ atual?: string; anterior?: string }> }) {
  const s = await requireSession();
  const { atual, anterior } = await searchParams;
  const d = await buscarComparativoEpi(s, atual, anterior);
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar titulo="EPI — Comparativo" subtitulo="Atualização atual × anterior, por CD" badge={badge} />
      <div className="p-4 lg:p-6">
        <EpiComparativo
          atualizacoes={d.atualizacoes}
          atual={d.atual}
          anterior={d.anterior}
          cds={d.cds}
          movimentos={d.movimentos}
        />
      </div>
    </>
  );
}
