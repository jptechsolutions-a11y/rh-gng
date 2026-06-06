import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { carregarReuniao, urlsAssinadasFotos } from '@/actions/escuta';
import { carregarPilares } from '@/lib/escuta/data';
import { EscutaHeader } from '@/components/escuta/EscutaHeader';
import { ReuniaoLeitura } from './ReuniaoLeitura';

export const dynamic = 'force-dynamic';

export default async function ReuniaoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const reuniao = await carregarReuniao(id);
  if (!reuniao) notFound();

  const [pilares, fotoUrls] = await Promise.all([
    carregarPilares(),
    urlsAssinadasFotos((reuniao.fotos as Array<{ path: string }>).map((f) => f.path)),
  ]);

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <EscutaHeader subtitulo={`Reunião · ${new Date(reuniao.dataReuniao).toLocaleDateString('pt-BR')}`} />
      <div className="flex items-center justify-between">
        <Link href="/escuta/historico"
              className="inline-flex items-center gap-2 text-sm text-conecta-muted hover:text-conecta-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
        </Link>
        {ok && (
          <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-1.5">
            Reunião salva com sucesso.
          </div>
        )}
      </div>
      <ReuniaoLeitura
        reuniao={{
          turma: reuniao.turma,
          dataReuniao: reuniao.dataReuniao,
          responsavel: reuniao.responsavel,
          filialNome: reuniao.filialNome,
          filialCodigo: reuniao.filialCodigo,
          percepcoes: (reuniao.percepcoes ?? {}) as Record<string, string>,
          percepcaoFinal: reuniao.percepcaoFinal,
          presenca: (reuniao.presenca ?? []) as Array<{ nome: string; funcao: string; presente: boolean }>,
        }}
        pilares={pilares}
        fotoUrls={fotoUrls}
      />
    </div>
  );
}
