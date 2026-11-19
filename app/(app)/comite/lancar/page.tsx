import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { filiaisPermitidas } from '@/lib/comite/acesso';
import { ComiteForm } from '@/components/comite/ComiteForm';

export const dynamic = 'force-dynamic';

export default async function ComiteLancarPage() {
  const s = await requireSession();
  const filiais = await filiaisPermitidas(s);
  return (
    <>
      <TopBar titulo="Comitê de Desligamento — Lançar" subtitulo="Informe a matrícula, as medidas e a justificativa" />
      <div className="p-4 lg:p-6">
        {filiais.length === 0 ? (
          <p className="text-sm text-conecta-muted">Seu acesso não tem nenhuma filial habilitada.</p>
        ) : (
          <ComiteForm filiais={filiais} />
        )}
      </div>
    </>
  );
}
