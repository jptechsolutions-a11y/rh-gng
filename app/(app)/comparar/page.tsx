import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard } from '@/components/ui/conecta-card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { listarPorCargoFilial } from '@/actions/entrevistas';
import { getCargosAtivos } from '@/db/queries/config';
import { CargoSelect } from './CargoSelect';

export const dynamic = 'force-dynamic';

function fmt(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ cargo?: string }>;
}) {
  const s = await requireSession('filial');
  const sp = await searchParams;

  // Resolvemos cargos primeiro; só então pedimos os candidatos do cargo selecionado
  // (filtro vai pro SQL — antes puxávamos 500 linhas e filtrávamos em JS).
  const [cargos] = await Promise.all([getCargosAtivos()]);
  const cargoSel = sp.cargo ?? cargos[0]?.nome ?? '';
  const filtradas = cargoSel ? await listarPorCargoFilial(cargoSel, 6) : [];

  return (
    <>
      <TopBar
        titulo="Comparar candidatos"
        subtitulo={`Mesmo cargo · ${filtradas.length} candidato(s)`}
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/historico"
            className="inline-flex items-center gap-2 text-sm font-display text-conecta-muted hover:text-conecta-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <CargoSelect cargos={cargos.map((c) => c.nome)} atual={cargoSel} />
          <span className="text-xs text-conecta-muted">
            Mostra até 6 candidatos lado a lado
          </span>
        </div>

        {filtradas.length === 0 ? (
          <ConectaCard>
            <div className="py-10 text-center">
              <Scale className="mx-auto h-10 w-10 text-conecta-primary/20 mb-3" />
              <p className="font-display font-semibold text-conecta-primary">
                Sem candidatos para esse cargo
              </p>
            </div>
          </ConectaCard>
        ) : (
          <ConectaCard noPadding>
            <div className="overflow-x-auto">
              <table className="conecta-table min-w-full">
                <thead>
                  <tr>
                    <th className="w-44 sticky left-0 z-10">Atributo</th>
                    {filtradas.map((e) => (
                      <th key={e.id} className="min-w-[180px]">
                        <Link
                          href={`/entrevista/${e.id}`}
                          className="text-white hover:text-conecta-accentLight transition-colors"
                        >
                          {e.nome.split(' ').slice(0, 2).join(' ')}
                        </Link>
                        <div className="text-[10px] text-white/65 font-normal mt-0.5 normal-case tracking-normal">
                          {fmt(e.dataHora)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label="Status"
                    cells={filtradas.map((e) => (
                      <Badge key={e.id} variant={statusVariant(e.status)}>
                        {e.status}
                      </Badge>
                    ))}
                  />
                  <Row
                    label="Parecer"
                    cells={filtradas.map((e) =>
                      e.parecer ? (
                        <span
                          key={e.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-perlog-orange/10 text-perlog-orange ring-1 ring-perlog-orange/30"
                        >
                          {e.parecer}
                        </span>
                      ) : (
                        <span key={e.id} className="text-conecta-muted">—</span>
                      ),
                    )}
                  />
                  <Row
                    label="Entrevistador"
                    cells={filtradas.map((e) => e.recrutador ?? '—')}
                  />
                  <Row
                    label="Gestor aprovador"
                    cells={filtradas.map((e) => e.gestorAprovador ?? '—')}
                  />
                  <Row
                    label="Turnos"
                    cells={filtradas.map(
                      (e) => (e.disponibilidadeTurnos ?? []).join(' · ') || '—',
                    )}
                  />
                  <Row
                    label="Avaliado pelo G&G"
                    cells={filtradas.map((e) => (e.aprovadoPeloGg ? '✓' : '—'))}
                  />
                </tbody>
              </table>
            </div>
          </ConectaCard>
        )}
      </div>
    </>
  );
}

function Row({
  label,
  cells,
  bold,
}: {
  label: string;
  cells: React.ReactNode[];
  bold?: boolean;
}) {
  return (
    <tr>
      <td className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-conecta-primary bg-conecta-primary/5 sticky left-0 z-10 border-r border-conecta-primary/10">
        {label}
      </td>
      {cells.map((c, i) => (
        <td key={i} className={bold ? 'font-display font-bold' : ''}>
          {c}
        </td>
      ))}
    </tr>
  );
}
