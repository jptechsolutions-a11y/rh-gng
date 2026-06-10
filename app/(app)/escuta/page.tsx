import { requireSession } from '@/lib/auth/session';
import { carregarRoteiro, carregarPilares } from '@/lib/escuta/data';
import {
  listarReunioesAlbum,
  listarPercepcoesNuvem,
  listarFiliaisComPercepcoes,
} from '@/actions/escuta';
import { TopBar } from '@/components/layout/TopBar';
import { parseTab } from '@/components/escuta/escuta-tabs.shared';
import { RoteiroView } from '@/components/escuta/RoteiroView';
import { FormularioImpressao } from '@/components/escuta/FormularioImpressao';
import { PercepcaoForm } from '@/components/escuta/PercepcaoForm';
import { AlbumReunioes } from '@/components/escuta/AlbumReunioes';
import { NuvemPercepcoes } from '@/components/escuta/NuvemPercepcoes';

export const dynamic = 'force-dynamic';

export default async function EscutaPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requireSession();
  const { tab } = await searchParams;
  const active = parseTab(tab);
  const ehAdmin = s.perfil === 'admin';

  const [roteiro, pilares, album, percepcoes, filiais] = await Promise.all([
    carregarRoteiro(),
    carregarPilares(),
    active === 'reunioes' ? listarReunioesAlbum() : Promise.resolve([]),
    active === 'nuvem' ? listarPercepcoesNuvem() : Promise.resolve([]),
    active === 'nuvem' && ehAdmin ? listarFiliaisComPercepcoes() : Promise.resolve([]),
  ]);

  const badge = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN';
  const subtitulo = s.perfil === 'filial' ? s.filialNome : 'Gente e Gestão · Perlog';

  return (
    <>
      <TopBar titulo="Escuta G&G" subtitulo={subtitulo} badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">
        {active === 'roteiro' && (
          <RoteiroView
            {...roteiro}
            diasSugeridos={(roteiro as { diasSugeridos?: string[] }).diasSugeridos ?? []}
          />
        )}
        {active === 'formulario' && <FormularioImpressao pilares={pilares} />}
        {active === 'percepcao' && <PercepcaoForm pilares={pilares} />}
        {active === 'reunioes' && <AlbumReunioes itens={album} />}
        {active === 'nuvem' && (
          <NuvemPercepcoes
            percepcoes={percepcoes}
            filiais={filiais}
            ehAdmin={ehAdmin}
          />
        )}
      </div>
    </>
  );
}
