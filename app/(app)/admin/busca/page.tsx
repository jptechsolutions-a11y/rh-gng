import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard } from '@/components/ui/conecta-card';
import { BuscaGlobalClient } from './BuscaGlobalClient';
import { requireSession } from '@/lib/auth/session';

export default async function BuscaPage() {
  await requireSession('admin');
  return (
    <>
      <TopBar
        titulo="Busca global"
        subtitulo="Pesquise candidatos em todas as filiais"
        badge="ADMIN"
      />
      <div className="p-6">
        <ConectaCard>
          <BuscaGlobalClient />
        </ConectaCard>
      </div>
    </>
  );
}
