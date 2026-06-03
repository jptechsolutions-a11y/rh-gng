import Link from 'next/link';
import { ClipboardList, BarChart3, ArrowRight, Wrench, ShieldCheck, Settings } from 'lucide-react';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  const s = await requireSession();

  const nome = s.perfil === 'filial' ? s.filialNome : (s.nome ?? 'Administrador');
  const sub = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : `@${s.usuario}`;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-perlog-navy via-perlog-navy to-[#0a1530] text-white flex flex-col">
      {/* Topbar minimal */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PerlogLogo className="h-8 w-auto" />
          <div className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-white/50">
            Gente &amp; Gestão
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold leading-tight">{nome}</div>
            <div className="text-xs text-white/60">{sub}</div>
          </div>
          <div className="[&>form>button]:bg-white/10 [&>form>button]:text-white [&>form>button]:border-white/20 [&>form>button:hover]:bg-white/20 [&>form>button:hover]:text-white">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-3xl text-center mb-12 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-perlog-orange">Bem-vindo de volta</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Para onde você quer ir?
          </h1>
          <p className="text-white/70 max-w-xl mx-auto">
            Selecione o módulo do sistema que deseja acessar agora.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-4xl">
          {/* Entrevistas — funcional */}
          <Link
            href={s.perfil === 'admin' ? '/admin' : '/painel'}
            className="group relative rounded-2xl bg-white text-perlog-navy p-8 hover:shadow-2xl transition-all hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-perlog-orange/15 rounded-full blur-3xl group-hover:bg-perlog-orange/25 transition-colors" />
            <div className="relative space-y-4">
              <div className="grid place-items-center h-14 w-14 rounded-xl bg-perlog-orange text-white shadow-md">
                <ClipboardList className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Entrevistas</h2>
                <p className="text-sm text-perlog-slate mt-1">Conduza entrevistas guiadas, gerencie o banco de talentos e gere documentos profissionais.</p>
              </div>
              <ul className="text-xs text-perlog-slate space-y-1 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-perlog-orange" /> Wizard de 4 etapas com roteiro por cargo</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-perlog-orange" /> Histórico, agenda de retornos e banco de talentos</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-perlog-orange" /> Geração de Word e impressão</li>
              </ul>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-perlog-orange group-hover:gap-3 transition-all pt-2">
                Acessar entrevistas <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          {/* Avaliação de Desempenho — em desenvolvimento */}
          <Link
            href="/avaliacao"
            className="group relative rounded-2xl bg-white/5 text-white border border-white/15 p-8 hover:bg-white/8 transition-all overflow-hidden"
          >
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30">
              <Wrench className="h-3 w-3" /> Em desenvolvimento
            </span>
            <div className="space-y-4">
              <div className="grid place-items-center h-14 w-14 rounded-xl bg-white/10 text-white/70 border border-white/15">
                <BarChart3 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white/85">Avaliação de Desempenho</h2>
                <p className="text-sm text-white/60 mt-1">Avalie colaboradores ativos por competências, metas e feedback 360°.</p>
              </div>
              <ul className="text-xs text-white/55 space-y-1 pt-2 border-t border-white/10">
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/40" /> Ciclos trimestrais / semestrais / anuais</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/40" /> Metas SMART, competências e feedback do gestor</li>
                <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/40" /> Plano de Desenvolvimento Individual (PDI)</li>
              </ul>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 group-hover:gap-3 transition-all pt-2">
                Em breve <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Admin extras */}
        {s.perfil === 'admin' && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-white/50">Acessos administrativos:</span>
            <Link href="/admin/config" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white">
              <Settings className="h-3 w-3" /> Configurações
            </Link>
            <Link href="/admin/relatorios" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white">
              <BarChart3 className="h-3 w-3" /> Relatórios
            </Link>
            <Link href="/admin/seguranca" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white">
              <ShieldCheck className="h-3 w-3" /> Segurança
            </Link>
          </div>
        )}
      </main>

      <footer className="px-6 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Grupo Perlog · Gente &amp; Gestão · Desenvolvido por Juliano Patrick
      </footer>
    </div>
  );
}
