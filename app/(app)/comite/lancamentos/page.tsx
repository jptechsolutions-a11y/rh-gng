import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { buscarComite } from '@/lib/comite/buscar';
import { listarGestoresDecisao } from '@/lib/comite/gestores';
import { ComiteLista } from '@/components/comite/ComiteLista';

export const dynamic = 'force-dynamic';

export default async function ComiteLancamentosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const s = await requireSession();
  const { mes } = await searchParams;
  const d = await buscarComite(s, mes);
  const gestores = s.perfil === 'admin' ? await listarGestoresDecisao() : [];
  return (
    <>
      <TopBar titulo="Comitê de Desligamento — Lançamentos" subtitulo="Edite ou exclua os lançamentos do mês" />
      <div className="p-4 lg:p-6">
        <ComiteLista lancamentos={d.lancamentos} mes={d.mes} meses={d.meses} podeDecidir={s.perfil === 'admin'} gestores={gestores} />
      </div>
    </>
  );
}
