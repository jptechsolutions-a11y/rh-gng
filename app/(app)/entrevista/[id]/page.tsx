import { notFound, redirect } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { EntrevistaWizard } from '@/components/wizard/EntrevistaWizard';
import { requireSession } from '@/lib/auth/session';
import { getEntrevista } from '@/actions/entrevistas';
import { getCargosAtivos, getRoteiro, getCriterios, getOpcoes } from '@/db/queries/config';

export const dynamic = 'force-dynamic';

export default async function EntrevistaPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cpf?: string }>;
}) {
  const s = await requireSession('filial');
  const { id } = await params;
  const sp = await searchParams;

  // Entrevistas existentes não podem ser editadas — apenas decisão/status.
  // Redireciona para a visualização (impressão), onde fica o botão "Editar decisão".
  if (id !== 'nova') {
    const existente = await getEntrevista(id);
    if (!existente) notFound();
    redirect(`/entrevista/${id}/imprimir`);
  }

  // Pré-preenchimento de CPF via ?cpf= ao vir do alerta de duplicata
  let inicial: Record<string, unknown> | null = null;
  if (sp.cpf) {
    const cpfDigits = sp.cpf.replace(/\D/g, '').slice(0, 11);
    if (cpfDigits.length === 11) inicial = { cpf: cpfDigits } as Record<string, unknown>;
  }

  const [cargos, criterios, opcoes] = await Promise.all([
    getCargosAtivos(),
    getCriterios(),
    getOpcoes(),
  ]);
  const cargoInicial = (inicial?.cargoPretendido as string | undefined) ?? cargos[0]?.nome ?? 'TODOS';
  const roteiro = await getRoteiro(cargoInicial);

  return (
    <>
      <TopBar
        titulo="Nova entrevista"
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
