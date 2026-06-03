import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Settings, Users, ClipboardList, Star, ListChecks, ArrowRight } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export default async function ConfigPage() {
  await requireSession('admin');
  const items = [
    { icon: Users,         title: 'Filiais e senhas', desc: 'Trocar senhas e ativar/desativar filiais.', href: '/admin/config/filiais' },
    { icon: ClipboardList, title: 'Cargos',           desc: 'Gerenciar cargos disponíveis para entrevistas.', href: '/admin/config/cargos' },
    { icon: Star,          title: 'Critérios',        desc: 'Critérios de avaliação, escalas e pesos.', href: '/admin/config/criterios' },
    { icon: ListChecks,    title: 'Roteiro',          desc: 'Perguntas por cargo (texto, sim/não, escala, seleção).', href: '/admin/config/roteiro' },
    { icon: Settings,      title: 'Opções de listas', desc: 'Escolaridade, turnos, CNH, status, etc.', href: '/admin/config/opcoes' },
  ];
  return (
    <>
      <TopBar titulo="Configuração" subtitulo="Parâmetros do sistema" badge="ADMIN" />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(({ icon: Icon, title, desc, href }) => (
          <Link key={title} href={href} className="group">
            <Card className="h-full transition-all group-hover:shadow-elev group-hover:border-perlog-orange/40">
              <CardContent className="p-5">
                <div className="grid place-items-center h-10 w-10 rounded-lg bg-perlog-orange/10 text-perlog-orange mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base mb-1 flex items-center gap-2">
                  {title}
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-perlog-orange" />
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
