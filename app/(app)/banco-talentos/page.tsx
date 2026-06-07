import { TopBar } from '@/components/layout/TopBar';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilialSlim } from '@/actions/entrevistas';
import { BancoTalentosClient } from './BancoTalentosClient';

export const dynamic = 'force-dynamic';

export default async function BancoTalentosPage() {
  const s = await requireSession('filial');
  const rows = await listarEntrevistasFilialSlim('Banco de Talentos');

  const lite = rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    cpf: r.cpf,
    telefone: r.telefone,
    cargoPretendido: r.cargoPretendido,
    status: r.status,
    cidade: r.cidade,
    dataHora: r.dataHora.toISOString(),
  }));

  return (
    <>
      <TopBar titulo="Banco de talentos" subtitulo={s.filialNome} badge={`Filial ${s.filialCodigo}`} />
      <div className="p-6">
        <BancoTalentosClient rows={lite} />
      </div>
    </>
  );
}
