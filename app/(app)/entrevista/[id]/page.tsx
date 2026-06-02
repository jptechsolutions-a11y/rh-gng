import { notFound } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { EntrevistaWizard } from '@/components/wizard/EntrevistaWizard';
import { requireSession } from '@/lib/auth/session';
import { getEntrevista } from '@/actions/entrevistas';
import { getCargosAtivos, getRoteiro, getCriterios, getOpcoes } from '@/db/queries/config';

export const dynamic = 'force-dynamic';

export default async function EntrevistaPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('filial');
  const { id } = await params;

  let inicial = null;
  if (id !== 'nova') {
    inicial = await getEntrevista(id);
    if (!inicial) notFound();
  }

  const [cargos, criterios, opcoes] = await Promise.all([
    getCargosAtivos(),
    getCriterios(),
    getOpcoes(),
  ]);
  const cargoInicial = inicial?.cargoPretendido ?? cargos[0]?.nome ?? 'TODOS';
  const roteiro = await getRoteiro(cargoInicial);

  return (
    <>
      <TopBar
        titulo={inicial ? 'Editar entrevista' : 'Nova entrevista'}
        subtitulo={s.filialNome}
        badge={`Filial ${s.filialCodigo}`}
      />
      <div className="p-6">
        <EntrevistaWizard
          inicial={inicial}
          cargos={cargos.map((c) => c.nome)}
          roteiro={roteiro}
          criterios={criterios}
          opcoes={opcoes}
        />
      </div>
    </>
  );
}
