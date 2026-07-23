import { TopBar } from '@/components/layout/TopBar';
import { requireSession } from '@/lib/auth/session';
import { listarRotas } from '@/actions/transporte';
import { ChamadaClient } from '@/components/transporte/ChamadaClient';

export const dynamic = 'force-dynamic';

export default async function ChamadaPage() {
  const s = await requireSession();
  const badge = s.perfil === 'filial' ? `FILIAL ${s.filialCodigo}` : 'ADMIN';

  const rotas = s.perfil === 'filial'
    ? (await listarRotas()).filter(r => r.ativo)
    : [];

  return (
    <>
      <TopBar titulo="Chamada Diária" subtitulo="Controle de presença nas rotas de transporte" badge={badge} />
      <div className="p-6">
        {rotas.length > 0 ? (
          <ChamadaClient rotas={rotas.map(r => ({ id: r.id, nome: r.nome, turno: r.turno, lugares: r.lugares }))} />
        ) : (
          <div className="bg-white rounded-xl border border-conecta-primary/8 p-8 text-center text-conecta-muted">
            <p className="text-sm">Nenhuma rota ativa encontrada.</p>
          </div>
        )}
      </div>
    </>
  );
}
