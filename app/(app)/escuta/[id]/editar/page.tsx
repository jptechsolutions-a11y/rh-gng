import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { carregarReuniao } from '@/actions/escuta';
import { carregarPilares } from '@/lib/escuta/data';
import { TopBar } from '@/components/layout/TopBar';
import { PercepcaoForm } from '@/components/escuta/PercepcaoForm';
import type { EscutaPresencaItem } from '@/db/schema';

export const dynamic = 'force-dynamic';

export default async function EditarReuniaoPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  if (s.perfil !== 'admin') redirect('/escuta');
  const { id } = await params;
  const [reuniao, pilares] = await Promise.all([
    carregarReuniao(id),
    carregarPilares(),
  ]);
  if (!reuniao) notFound();

  const fotosSeed = ((reuniao.fotos as Array<{ path: string; size: number }> | null) ?? []).map((f) => ({
    path: f.path,
    size: f.size ?? 0,
    previewUrl: `/api/escuta/foto?path=${encodeURIComponent(f.path)}`,
  }));

  return (
    <>
      <TopBar
        titulo="Editar reunião"
        subtitulo={`${reuniao.filialNome ?? reuniao.filialCodigo} · ${new Date(reuniao.dataReuniao).toLocaleDateString('pt-BR')}`}
        badge="ADMIN"
      />
      <div className="space-y-5 p-4 lg:p-6">
        <Link
          href={`/escuta/${id}`}
          className="inline-flex items-center gap-2 text-sm text-conecta-muted hover:text-conecta-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à reunião
        </Link>
        <PercepcaoForm
          pilares={pilares}
          editar={{
            id,
            turma: reuniao.turma,
            dataReuniao: reuniao.dataReuniao,
            responsavel: reuniao.responsavel,
            percepcaoFinal: reuniao.percepcaoFinal,
            fotos: fotosSeed,
            presenca: (reuniao.presenca ?? []) as EscutaPresencaItem[],
          }}
        />
      </div>
    </>
  );
}
