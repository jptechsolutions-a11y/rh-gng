import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';
import { listarPessoas, listarFiliaisParaSelect, type ListarPessoasFiltros } from '@/actions/avaliacao-admin';
import { PessoasTable } from './PessoasTable';
import { ImportarCsv } from './ImportarCsv';

export const dynamic = 'force-dynamic';

type SP = { busca?: string; filialId?: string; tipo?: string; ativo?: string };

export default async function PessoasAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSession('admin');
  const sp = await searchParams;

  const filtros: ListarPessoasFiltros = {
    busca: sp.busca || undefined,
    filialId: sp.filialId || undefined,
    tipo: (sp.tipo as ListarPessoasFiltros['tipo']) || undefined,
    ativo: sp.ativo === 'true' ? true : sp.ativo === 'false' ? false : undefined,
  };

  const [pessoas, filiais] = await Promise.all([
    listarPessoas(filtros),
    listarFiliaisParaSelect(),
  ]);

  return (
    <>
      <TopBar titulo="Pessoas" subtitulo="Cadastro de colaboradores e gestores" badge="ADMIN" />
      <div className="p-6 space-y-4">
        <Link href="/admin/config" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para configurações
        </Link>

        <Card>
          <CardContent className="p-5">
            <ImportarCsv filiais={filiais} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <PessoasTable
              pessoas={pessoas}
              filiais={filiais}
              filtrosIniciais={{
                busca: sp.busca ?? '',
                filialId: sp.filialId ?? '',
                tipo: sp.tipo ?? '',
                ativo: sp.ativo ?? '',
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
