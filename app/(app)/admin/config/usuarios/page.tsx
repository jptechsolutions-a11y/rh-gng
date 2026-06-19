import { TopBar } from '@/components/layout/TopBar';
import { requireSession } from '@/lib/auth/session';
import { listarFiliais, listarUsuariosAcesso } from '@/actions/usuarios-acesso';
import { UsuariosAcessoClient } from './UsuariosAcessoClient';

export const dynamic = 'force-dynamic';

export default async function UsuariosAcessoPage() {
  await requireSession('admin');
  const [usuarios, filiais] = await Promise.all([listarUsuariosAcesso(), listarFiliais()]);
  return (
    <>
      <TopBar
        titulo="Usuários personalizados"
        subtitulo="Acessos regionais e nacionais (somente leitura)"
        badge="ADMIN"
      />
      <div className="p-4 lg:p-6">
        <UsuariosAcessoClient usuariosInicial={usuarios} filiais={filiais} />
      </div>
    </>
  );
}
