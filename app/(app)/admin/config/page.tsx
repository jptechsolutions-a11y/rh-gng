import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import {
  Settings,
  Users,
  ClipboardList,
  ListChecks,
  ArrowRight,
  UserCog,
  Target,
  MessagesSquare,
  ShieldCheck,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export default async function ConfigPage() {
  await requireSession('admin');
  const items = [
    {
      icon: Users,
      title: 'Filiais e senhas',
      desc: 'Trocar senhas e ativar/desativar filiais.',
      href: '/admin/config/filiais',
    },
    {
      icon: ClipboardList,
      title: 'Cargos',
      desc: 'Gerenciar cargos disponíveis para entrevistas.',
      href: '/admin/config/cargos',
    },
    {
      icon: ListChecks,
      title: 'Roteiro',
      desc: 'Perguntas por cargo (texto, sim/não, escala, seleção).',
      href: '/admin/config/roteiro',
    },
    {
      icon: Settings,
      title: 'Opções de listas',
      desc: 'Escolaridade, turnos, CNH, status, etc.',
      href: '/admin/config/opcoes',
    },
    {
      icon: UserCog,
      title: 'Pessoas',
      desc: 'Cadastro de colaboradores/gestores para avaliação.',
      href: '/admin/config/pessoas',
    },
    {
      icon: Target,
      title: 'Competências e fatores',
      desc: 'Catálogo de competências e fatores avaliados.',
      href: '/admin/config/competencias',
    },
    {
      icon: MessagesSquare,
      title: 'Roteiro Escuta G&G',
      desc: 'Editar hero, etapas e perguntas dos 5 pilares.',
      href: '/admin/config/escuta',
    },
    {
      icon: ShieldCheck,
      title: 'Usuários personalizados',
      desc: 'Criar acessos regionais/nacionais (só leitura) para indicadores.',
      href: '/admin/config/usuarios',
    },
  ];
  return (
    <>
      <TopBar titulo="Configuração" subtitulo="Parâmetros do sistema" badge="ADMIN" />

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(({ icon: Icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="group relative overflow-hidden rounded-xl bg-white border border-conecta-primary/8 p-5 transition-all hover:-translate-y-0.5 hover:border-conecta-accent/30 hover:shadow-[0_20px_44px_-12px_rgba(13,43,107,0.20)]"
            style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: '#E8621A' }}
            />
            <div
              className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-conecta-accent/8 blur-2xl group-hover:bg-conecta-accent/15 transition-colors"
              aria-hidden
            />
            <div className="relative flex flex-col gap-3">
              <div
                className="grid place-items-center h-11 w-11 rounded-xl text-white"
                style={{
                  background: '#E8621A',
                  boxShadow: '0 10px 22px -8px rgba(232,98,26,0.45)',
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-[16px] font-extrabold text-conecta-primary tracking-tight flex items-center gap-2">
                  {title}
                  <ArrowRight className="h-4 w-4 text-conecta-accent opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-[13px] text-conecta-muted leading-snug mt-1">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
