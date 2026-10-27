import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { carregarResponsaveis } from '@/lib/ic/buscar';
import { IcResponsaveisEditor } from '@/components/ic/IcResponsaveisEditor';

export const dynamic = 'force-dynamic';

export default async function IcResponsaveisPage() {
  await requireSession('admin');
  const rs = await carregarResponsaveis();
  return (
    <>
      <TopBar titulo="IC — Responsáveis" subtitulo="Quem cuida de quais filiais (cada um é um cavalo da corrida)" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <IcResponsaveisEditor inicial={rs.map((r) => ({ id: r.id, nome: r.nome, cor: r.cor, imagem: r.imagem, filiais: r.filiais }))} />
      </div>
    </>
  );
}
