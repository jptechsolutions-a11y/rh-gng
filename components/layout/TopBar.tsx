import { Building2 } from 'lucide-react';
import { LogoutButton } from './LogoutButton';

export function TopBar({ titulo, subtitulo, badge }: { titulo: string; subtitulo?: string; badge?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-perlog-navy tracking-tight truncate">{titulo}</h1>
        {subtitulo && <p className="text-sm text-perlog-slate truncate">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <div className="flex items-center gap-2 text-xs font-medium text-perlog-navy bg-perlog-navy/5 px-3 py-1.5 rounded-full border border-perlog-navy/10">
            <Building2 className="h-3.5 w-3.5" />
            {badge}
          </div>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
