import { Building2 } from 'lucide-react';

export function TopBar({ titulo, subtitulo, badge }: { titulo: string; subtitulo?: string; badge?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-perlog-navy tracking-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-perlog-slate">{subtitulo}</p>}
      </div>
      {badge && (
        <div className="flex items-center gap-2 text-xs font-medium text-perlog-navy bg-perlog-navy/5 px-3 py-1.5 rounded-full border border-perlog-navy/10">
          <Building2 className="h-3.5 w-3.5" />
          {badge}
        </div>
      )}
    </header>
  );
}
