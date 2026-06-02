import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export default async function RelatoriosPage() {
  await requireSession('admin');
  return (
    <>
      <TopBar titulo="Relatórios" subtitulo="Exportações e indicadores" badge="ADMIN" />
      <div className="p-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="grid place-items-center h-12 w-12 rounded-lg bg-perlog-orange/10 text-perlog-orange">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-perlog-navy">Exportar todas as entrevistas (CSV)</h3>
              <p className="text-sm text-perlog-slate">Inclui todos os campos e logs de mudança de status.</p>
            </div>
            <Button asChild>
              <a href="/api/export/csv"><Download className="h-4 w-4" />Baixar CSV</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
