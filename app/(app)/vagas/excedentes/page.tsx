import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { VagasQuadroTable } from '@/components/vagas/VagasQuadroTable';
import { buscarQuadroVagas } from '@/lib/vagas/buscar-quadro';

export const dynamic = 'force-dynamic';

export default async function ExcedentesVagasPage() {
  const s = await requireSession();
  const { rows, statusOptions } = await buscarQuadroVagas(s);

  const podeEditar = s.perfil === 'admin' || s.perfil === 'filial';
  const badge =
    s.perfil === 'filial' ? `Filial ${s.filialCodigo}` :
    s.perfil === 'admin'  ? 'ADMIN' :
    (s.escopo === 'nacional' ? 'NACIONAL' : 'REGIONAL');

  return (
    <>
      <TopBar
        titulo="Quadro de Vagas — Excedentes"
        subtitulo="Vagas ativas acima do alvo da última planilha importada"
        badge={badge}
      />
      <div className="space-y-5 p-4 lg:p-6">
        <VagasQuadroTable rows={rows} statusOptions={statusOptions} podeEditar={podeEditar} apenasExcedentes />
      </div>
    </>
  );
}
