import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard } from '@/components/ui/conecta-card';
import { EscalasEditor } from '@/components/qlp/EscalasEditor';
import { EscalasFiltro } from '@/components/qlp/EscalasFiltro';
import { EscalasIndicadores } from '@/components/qlp/EscalasIndicadores';
import { getIndicadoresEscalas, listarFiliaisAtivas } from '@/db/queries/qlp-escalas';
import { SEM_TURNO, rotuloTurno, turnoDeParametro } from '@/lib/qlp/turno';

export const dynamic = 'force-dynamic';

export default async function EscalasPage({
  searchParams,
}: {
  searchParams: Promise<{ filial?: string; turno?: string }>;
}) {
  await requireSession('admin');
  const sp = await searchParams;

  const filiais = await listarFiliaisAtivas();
  // Só aceita um id que exista na lista; qualquer outro valor vira "todas".
  const filial = filiais.find((f) => f.id === sp.filial) ?? null;
  const filialId = filial?.id ?? null;
  // Só aceita turnos conhecidos; qualquer outro valor vira "todos".
  const turno = turnoDeParametro(sp.turno);

  const dados = await getIndicadoresEscalas(filialId, turno);

  return (
    <>
      <TopBar
        titulo="QLP — Escalas"
        subtitulo="Crie e personalize as escalas de trabalho · a atribuição é feita no Quadro"
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <ConectaCard>
          <EscalasFiltro filiais={filiais} filialId={filialId} turno={turno ?? ''} />
        </ConectaCard>

        <EscalasIndicadores
          dados={dados}
          filialNome={filial ? `${filial.codigo} · ${filial.nome}` : null}
          turnoRotulo={turno === null ? null : turno === 'sem' ? SEM_TURNO : rotuloTurno(turno)}
        />

        <EscalasEditor escalas={dados.escalas} />
      </div>
    </>
  );
}
