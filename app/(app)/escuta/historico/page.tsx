import { requireSession } from '@/lib/auth/session';
import { listarReunioes } from '@/actions/escuta';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { HistoricoEscutaTable } from './HistoricoEscutaTable';

export const dynamic = 'force-dynamic';

export default async function HistoricoEscutaPage({
  searchParams,
}: { searchParams: Promise<{ filial?: string; de?: string; ate?: string }> }) {
  const s = await requireSession();
  const params = await searchParams;
  const linhas = await listarReunioes({
    filialCodigo: s.perfil === 'admin' ? params.filial : undefined,
    de: params.de, ate: params.ate,
  });

  const badge = s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : 'ADMIN';

  return (
    <>
      <TopBar titulo="Escuta G&G — Histórico" subtitulo="Reuniões registradas" badge={badge} />
      <div className="space-y-5 p-4 lg:p-6">

      {s.perfil === 'admin' && (
        <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white border border-conecta-primary/10 p-4">
          <FieldText name="filial" label="Filial (código)" defaultValue={params.filial} />
          <FieldText name="de"     label="De"  type="date" defaultValue={params.de} />
          <FieldText name="ate"    label="Até" type="date" defaultValue={params.ate} />
          <Button type="submit" variant="conecta" size="conecta">Filtrar</Button>
        </form>
      )}

        <HistoricoEscutaTable
          linhas={linhas}
          mostrarFilial={s.perfil === 'admin'}
          ehAdmin={s.perfil === 'admin'}
        />
      </div>
    </>
  );
}

function FieldText({
  name, label, type = 'text', defaultValue,
}: { name: string; label: string; type?: string; defaultValue?: string }) {
  return (
    <label className="text-xs">
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">{label}</div>
      <input
        name={name} type={type} defaultValue={defaultValue ?? ''}
        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25"
      />
    </label>
  );
}
