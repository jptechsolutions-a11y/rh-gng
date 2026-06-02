import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { BuscaGlobalClient } from './BuscaGlobalClient';
import { requireSession } from '@/lib/auth/session';

export default async function BuscaPage() {
  await requireSession('admin');
  return (
    <>
      <TopBar titulo="Busca global" subtitulo="Pesquise candidatos em todas as filiais" badge="ADMIN" />
      <div className="p-6">
        <Card><CardContent className="p-6"><BuscaGlobalClient /></CardContent></Card>
      </div>
    </>
  );
}
