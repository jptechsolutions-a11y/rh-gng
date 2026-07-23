import { TopBar } from '@/components/layout/TopBar';
import { requireSession } from '@/lib/auth/session';
import { listarFiliaisComModulos } from '@/actions/modulos';
import { ModulosClient } from './ModulosClient';

export const dynamic = 'force-dynamic';

export default async function ModulosPage() {
  await requireSession('admin');
  const { filiais, modulosDisponiveis } = await listarFiliaisComModulos();

  return (
    <>
      <TopBar titulo="Módulos por filial" subtitulo="Ativar/desativar módulos para cada filial" badge="ADMIN" />
      <ModulosClient filiais={filiais} modulosDisponiveis={modulosDisponiveis} />
    </>
  );
}
