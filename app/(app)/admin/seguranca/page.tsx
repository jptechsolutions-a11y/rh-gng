import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, KeyRound, FileLock2, Activity, ScrollText } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export default async function SegurancaPage() {
  await requireSession('admin');
  const items = [
    { icon: KeyRound,   title: 'Hash de senha',  status: 'argon2id', variant: 'green' as const },
    { icon: Lock,       title: 'Sessão',         status: 'Cookie HttpOnly + Secure', variant: 'green' as const },
    { icon: ShieldCheck, title: 'RLS no banco', status: 'Ativa em todas as tabelas', variant: 'green' as const },
    { icon: FileLock2,  title: 'Storage',        status: 'Buckets privados + URLs assinadas', variant: 'green' as const },
    { icon: Activity,   title: 'Rate limit login', status: '5/15min por IP', variant: 'green' as const },
    { icon: ScrollText, title: 'Logs append-only', status: 'UPDATE/DELETE bloqueados', variant: 'green' as const },
  ];
  return (
    <>
      <TopBar titulo="Segurança" subtitulo="Postura de segurança do sistema" badge="ADMIN" />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(({ icon: Icon, title, status, variant }) => (
          <Card key={title}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="grid place-items-center h-11 w-11 rounded-lg bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-perlog-navy">{title}</h4>
                <Badge variant={variant} className="mt-1">{status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
