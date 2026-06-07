import { TopBar } from '@/components/layout/TopBar';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  FileLock2,
  Activity,
  ScrollText,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export default async function SegurancaPage() {
  await requireSession('admin');
  const items = [
    { icon: KeyRound, title: 'Hash de senha', status: 'argon2id' },
    { icon: Lock, title: 'Sessão', status: 'Cookie HttpOnly + Secure' },
    { icon: ShieldCheck, title: 'RLS no banco', status: 'Ativa em todas as tabelas' },
    {
      icon: FileLock2,
      title: 'Storage',
      status: 'Buckets privados + URLs assinadas',
    },
    { icon: Activity, title: 'Rate limit login', status: '5/15min por IP' },
    {
      icon: ScrollText,
      title: 'Logs append-only',
      status: 'UPDATE/DELETE bloqueados',
    },
  ];
  return (
    <>
      <TopBar
        titulo="Segurança"
        subtitulo="Postura de segurança do sistema"
        badge="ADMIN"
      />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(({ icon: Icon, title, status }) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-xl bg-white border border-conecta-primary/8 p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.10)' }}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 h-full w-1 bg-emerald-500"
            />
            <div
              className="grid place-items-center h-11 w-11 rounded-xl shrink-0 text-white"
              style={{
                background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
                boxShadow: '0 10px 22px -8px rgba(4,120,87,0.4)',
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-extrabold text-conecta-primary text-[15px]">
                {title}
              </h4>
              <Badge variant="green" className="mt-1.5">
                {status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
