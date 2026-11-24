import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { AtaEditor } from '@/components/comite/AtaEditor';
import { carregarAta } from '@/lib/comite/ata';

export const dynamic = 'force-dynamic';

export default async function AtaComitePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const s = await requireSession();
  if (s.perfil !== 'admin') redirect('/comite');
  const { mes } = await searchParams;
  const d = await carregarAta(s, mes);
  return (
    <>
      <TopBar titulo="Comitê de Desligamento — Ata" subtitulo="Informe a data e os participantes e exporte em Word ou PDF" badge="ADMIN" />
      <div className="p-4 lg:p-6">
        <AtaEditor
          // A chave refaz o estado do formulário ao trocar de mês.
          key={d.mes}
          mes={d.mes}
          meses={d.meses}
          dataInicial={d.dataComite}
          participantesIniciais={d.participantes}
          atualizadoPor={d.atualizadoPor}
          resumo={d.resumo}
          lancamentos={d.lancamentos}
        />
      </div>
    </>
  );
}
