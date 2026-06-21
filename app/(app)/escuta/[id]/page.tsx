import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { carregarReuniao, urlsAssinadasFotos } from '@/actions/escuta';
import { requireSession } from '@/lib/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { ReuniaoLeitura } from './ReuniaoLeitura';
import { AdminReuniaoActions } from '@/components/escuta/AdminReuniaoActions';

export const dynamic = 'force-dynamic';

export default async function ReuniaoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const s = await requireSession();
  const { id } = await params;
  const { ok } = await searchParams;
  const reuniao = await carregarReuniao(id);
  if (!reuniao) notFound();

  const fotoUrls = await urlsAssinadasFotos(
    (reuniao.fotos as Array<{ path: string }>).map((f) => f.path),
  );

  const badge = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN';
  const subtitulo = `Reunião · ${new Date(reuniao.dataReuniao).toLocaleDateString('pt-BR')}`;

  return (
    <>
      <TopBar titulo="Escuta G&G" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/escuta/historico"
              className="inline-flex items-center gap-2 text-sm text-conecta-muted hover:text-conecta-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          {ok && (
            <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-1.5">
              Reunião salva com sucesso.
            </div>
          )}
          {s.perfil === 'admin' && (
            <AdminReuniaoActions reuniaoId={id} redirectApos="/escuta/historico" />
          )}
        </div>
      </div>
      <ReuniaoLeitura
        reuniao={{
          turma: reuniao.turma,
          dataReuniao: reuniao.dataReuniao,
          responsavel: reuniao.responsavel,
          filialNome: reuniao.filialNome,
          filialCodigo: reuniao.filialCodigo,
          percepcaoFinal: reuniao.percepcaoFinal,
          presenca: (reuniao.presenca ?? []) as Array<{ nome: string; funcao: string; presente: boolean }>,
        }}
        fotoUrls={fotoUrls}
      />
      </div>
    </>
  );
}
