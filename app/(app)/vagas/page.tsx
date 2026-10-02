import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { VagasView } from '@/components/vagas/VagasView';
import { buscarQuadroVagas } from '@/lib/vagas/buscar-quadro';

export const dynamic = 'force-dynamic';

export default async function VagasPage() {
  const s = await requireSession();
  const { rows, statusOptions } = await buscarQuadroVagas(s);

  const podeEditar = s.perfil === 'admin' || s.perfil === 'filial';
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar titulo="Quadro de Vagas" subtitulo={`${rows.length} vagas ativas`} badge={badge} />
      <div className="p-4 lg:p-6">
        <VagasView
          rows={rows}
          statusOptions={statusOptions}
          podeEditar={podeEditar}
        />
      </div>
    </>
  );
}
