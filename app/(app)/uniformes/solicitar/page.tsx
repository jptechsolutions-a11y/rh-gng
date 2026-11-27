import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { filiaisPermitidas, nomeUsuario } from '@/lib/comite/acesso';
import { UniformeForm } from '@/components/uniformes/UniformeForm';

export const dynamic = 'force-dynamic';

export default async function UniformeSolicitarPage() {
  const s = await requireSession();
  const filiais = await filiaisPermitidas(s);
  return (
    <>
      <TopBar titulo="Uniformes — Solicitar" subtitulo="Informe a matrícula e escolha o item, o tamanho e o motivo" />
      <div className="p-4 lg:p-6">
        {filiais.length === 0 ? (
          <p className="text-sm text-conecta-muted">Seu acesso não tem nenhuma filial habilitada.</p>
        ) : (
          <UniformeForm filiais={filiais} solicitante={nomeUsuario(s)} />
        )}
      </div>
    </>
  );
}
