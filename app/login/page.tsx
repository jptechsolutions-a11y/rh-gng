import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { LoginForm } from './LoginForm';
import { ShieldCheck, Lock, LayoutGrid } from 'lucide-react';

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect('/inicio');

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* lado esquerdo institucional */}
      <aside className="hidden lg:flex relative overflow-hidden bg-perlog-navy text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,#F37021,transparent_60%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(135deg,transparent_60%,#F37021_60%,#F37021_62%,transparent_62%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <PerlogLogo className="h-12 w-auto" />
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50">Gente & Gestão</div>
          </div>

          <div className="space-y-8 max-w-md">
            <div>
              <h2 className="text-3xl font-semibold leading-tight">
                Sistema de Gente &amp; Gestão <br />
                <span className="text-perlog-orange">do Grupo Perlog.</span>
              </h2>
              <p className="mt-3 text-white/70">
                Plataforma corporativa única para os processos de RH do grupo —
                entrevistas, banco de talentos e avaliação de desempenho.
              </p>
            </div>

            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-center gap-3">
                <span className="grid place-items-center h-8 w-8 rounded-lg bg-white/10">
                  <LayoutGrid className="h-4 w-4 text-perlog-orange" />
                </span>
                Módulos integrados de Entrevistas e Avaliação
              </li>
              <li className="flex items-center gap-3">
                <span className="grid place-items-center h-8 w-8 rounded-lg bg-white/10">
                  <Lock className="h-4 w-4 text-perlog-orange" />
                </span>
                Autenticação por filial com sessão segura
              </li>
              <li className="flex items-center gap-3">
                <span className="grid place-items-center h-8 w-8 rounded-lg bg-white/10">
                  <ShieldCheck className="h-4 w-4 text-perlog-orange" />
                </span>
                Conformidade LGPD e logs imutáveis
              </li>
            </ul>
          </div>

          <div className="text-xs text-white/40">
            © {new Date().getFullYear()} Grupo Perlog — Todos os direitos reservados
          </div>
        </div>
      </aside>

      {/* lado direito form */}
      <section className="flex items-center justify-center px-6 py-12 bg-perlog-bg">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <PerlogLogo className="h-10 w-auto" />
          </div>
          <div className="bg-white rounded-2xl shadow-elev border border-slate-100 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-perlog-navy tracking-tight">Bem-vindo de volta</h1>
              <p className="mt-1 text-sm text-perlog-slate">
                Acesse o sistema de Gente &amp; Gestão Perlog. Filiais usam a senha da unidade; administradores informam o usuário.
              </p>
            </div>
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-perlog-slate">
            Em caso de problemas, contate o RH central.
          </p>
        </div>
      </section>
    </div>
  );
}
