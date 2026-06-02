import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Settings, Users, ClipboardList, Star, ListChecks } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export default async function ConfigPage() {
  await requireSession('admin');
  const items = [
    { icon: Users,        title: 'Filiais e senhas',  desc: 'Trocar senhas de acesso das filiais.' },
    { icon: ClipboardList, title: 'Cargos',           desc: 'Gerenciar cargos disponíveis.' },
    { icon: Star,         title: 'Critérios',         desc: 'Configurar critérios de avaliação.' },
    { icon: ListChecks,   title: 'Roteiro',           desc: 'Perguntas por cargo.' },
    { icon: Settings,     title: 'Opções de listas',  desc: 'Escolaridade, turnos, CNH, status...' },
  ];
  return (
    <>
      <TopBar titulo="Configuração" subtitulo="Parâmetros do sistema" badge="ADMIN" />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-perlog-orange/10 text-perlog-orange mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base mb-1">{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
              <p className="text-xs text-perlog-mute mt-3">Em desenvolvimento.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
