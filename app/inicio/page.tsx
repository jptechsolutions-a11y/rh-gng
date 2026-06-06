import Link from 'next/link';
import {
  ClipboardList,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Settings,
  FileText,
  MessagesSquare,
} from 'lucide-react';
import { ConectaLogo } from '@/components/brand/ConectaLogo';
import { ConectaSymbol } from '@/components/brand/ConectaSymbol';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  const s = await requireSession();

  const nome = s.perfil === 'filial' ? s.filialNome : (s.nome ?? 'Administrador');
  const sub = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : `@${s.usuario}`;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white text-conecta-text flex flex-col">
      {/* ===== Camada de fundo: branco + sombras animadas azul/laranja ===== */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="cg-blob cg-blob-orange-soft absolute -top-40 -left-32 h-[560px] w-[560px] rounded-full" />
        <div className="cg-blob cg-blob-navy-soft absolute top-1/4 -right-32 h-[520px] w-[520px] rounded-full" />
        <div className="cg-blob cg-blob-orange-mini absolute bottom-[-120px] left-1/3 h-[420px] w-[420px] rounded-full" />
        <div className="cg-blob cg-blob-navy-soft absolute top-1/2 left-[-100px] h-[360px] w-[360px] rounded-full" />
      </div>

      {/* Linha decorativa lateral laranja */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 z-10"
        style={{ background: 'linear-gradient(180deg, #E8621A 0%, #FF8C42 100%)' }}
      />

      {/* ===== Topbar minimal ===== */}
      <header className="relative z-20 px-6 lg:px-10 py-4 flex items-center justify-between gap-3 shrink-0">
        <ConectaLogo variant="full" withSubtitle={false} className="scale-90 origin-left" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-display font-semibold leading-tight text-conecta-primary">{nome}</div>
            <div className="text-[11px] text-conecta-muted">{sub}</div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* ===== Hero (compacto, sem rolagem) ===== */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-2 min-h-0">
        <div className="text-center mb-5 flex flex-col items-center gap-1.5">
          <ConectaSymbol className="w-14 lg:w-16 mb-0.5" />

          <p className="font-display text-[10px] uppercase tracking-[0.4em] text-conecta-accent">
            Bem-vindo de volta · {nome.split(' ')[0]}
          </p>

          <h1 className="font-display text-3xl lg:text-[40px] font-extrabold tracking-tight leading-[1.02] text-conecta-primary">
            Para onde você quer ir{' '}
            <span className="text-conecta-accent">hoje?</span>
          </h1>

          <div className="flex items-center gap-3">
            <span className="h-[2px] w-10 bg-conecta-accent/70" />
            <span className="font-display text-[11px] uppercase tracking-[0.32em] text-conecta-muted">
              Conecta G&amp;G · Perlog
            </span>
            <span className="h-[2px] w-10 bg-conecta-accent/70" />
          </div>
        </div>

        {/* ===== Cards de módulos ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
          {/* Entrevistas */}
          <Link
            href={s.perfil === 'admin' ? '/admin' : '/painel'}
            className="cg-module-card group relative rounded-2xl bg-white text-conecta-text p-5 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-12px_rgba(13,43,107,0.45)]"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: '#E8621A' }}
            />
            <div className="absolute top-4 right-4 h-24 w-24 bg-conecta-accent/10 rounded-full blur-3xl group-hover:bg-conecta-accent/20 transition-colors" />
            <div className="relative flex items-start gap-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-xl text-white shrink-0"
                style={{
                  background: '#E8621A',
                  boxShadow: '0 10px 22px -8px rgba(232,98,26,0.5)',
                }}
              >
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[20px] font-extrabold text-conecta-primary tracking-tight leading-tight">
                  Entrevistas
                </h2>
                <p className="text-[13px] text-conecta-muted mt-1 leading-snug">
                  Entrevistas guiadas, banco de talentos e geração de documentos.
                </p>
                <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold text-conecta-accent group-hover:gap-3 transition-all mt-3">
                  Acessar
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Avaliação */}
          <Link
            href="/avaliacao"
            className="cg-module-card group relative rounded-2xl bg-white text-conecta-text p-5 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-12px_rgba(13,43,107,0.45)]"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: '#0D2B6B' }}
            />
            <div className="absolute top-4 right-4 h-24 w-24 bg-conecta-primary/10 rounded-full blur-3xl group-hover:bg-conecta-primary/20 transition-colors" />
            <div className="relative flex items-start gap-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-xl text-white shrink-0"
                style={{
                  background: '#0D2B6B',
                  boxShadow: '0 10px 22px -8px rgba(13,43,107,0.5)',
                }}
              >
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[20px] font-extrabold text-conecta-primary tracking-tight leading-tight">
                  Avaliação de Desempenho
                </h2>
                <p className="text-[13px] text-conecta-muted mt-1 leading-snug">
                  Avalie por competências, registre feedback e PDI.
                </p>
                <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold text-conecta-primary group-hover:gap-3 transition-all mt-3">
                  Acessar
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Escuta G&G */}
          <Link
            href="/escuta"
            className="cg-module-card group relative rounded-2xl bg-white text-conecta-text p-5 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-12px_rgba(13,43,107,0.45)]"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: '#E8621A' }}
            />
            <div className="absolute top-4 right-4 h-24 w-24 bg-conecta-accent/10 rounded-full blur-3xl group-hover:bg-conecta-accent/20 transition-colors" />
            <div className="relative flex items-start gap-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-xl text-white shrink-0"
                style={{
                  background: '#E8621A',
                  boxShadow: '0 10px 22px -8px rgba(232,98,26,0.5)',
                }}
              >
                <MessagesSquare className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[20px] font-extrabold text-conecta-primary tracking-tight leading-tight">
                  Escuta G&amp;G
                </h2>
                <p className="text-[13px] text-conecta-muted mt-1 leading-snug">
                  Reunião periódica de escuta com a turma: roteiro, formulário e percepção.
                </p>
                <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold text-conecta-accent group-hover:gap-3 transition-all mt-3">
                  Acessar
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Acessos admin */}
        {s.perfil === 'admin' && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-display uppercase tracking-[0.22em] text-conecta-muted/70 text-[10px] mr-2">
              Admin
            </span>
            {[
              { href: '/admin/config', icon: Settings, label: 'Configurações' },
              { href: '/admin/relatorios', icon: FileText, label: 'Relatórios' },
              { href: '/admin/seguranca', icon: ShieldCheck, label: 'Segurança' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-conecta-accent/10 text-conecta-muted hover:text-conecta-accent border border-conecta-primary/15 hover:border-conecta-accent/40 transition-colors"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ===== Barra inferior fina ===== */}
      <footer
        className="relative z-20 mt-4 mx-6 lg:mx-12 mb-6 rounded-xl flex items-center justify-between gap-4 px-6 py-3 backdrop-blur-sm text-[11px]"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          border: '1px solid rgba(13, 43, 107, 0.12)',
        }}
      >
        <span className="font-display uppercase tracking-[0.22em] text-conecta-primary/70">
          Conexão que gera valor · Pessoas que movem a nossa jornada
        </span>
        <span className="text-conecta-muted hidden sm:inline">
          © {new Date().getFullYear()} Conecta G&amp;G · Perlog · Desenvolvido por{' '}
          <span className="font-semibold text-conecta-accent">Juliano Patrick</span>
        </span>
      </footer>
    </div>
  );
}
