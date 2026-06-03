import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilial } from '@/actions/entrevistas';
import { getCargosAtivos, getCriterios } from '@/db/queries/config';
import { CargoSelect } from './CargoSelect';

export const dynamic = 'force-dynamic';

function fmt(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default async function CompararPage({ searchParams }: { searchParams: Promise<{ cargo?: string }> }) {
  const s = await requireSession('filial');
  const sp = await searchParams;

  const [cargos, entrevistas, criterios] = await Promise.all([
    getCargosAtivos(),
    listarEntrevistasFilial(),
    getCriterios(),
  ]);

  const cargoSel = sp.cargo ?? cargos[0]?.nome ?? '';
  const filtradas = cargoSel
    ? entrevistas
        .filter((e) => e.cargoPretendido === cargoSel)
        .slice(0, 6) // até 6 lado a lado
    : [];

  return (
    <>
      <TopBar
        titulo="Comparar candidatos"
        subtitulo={`Mesmo cargo · ${filtradas.length} candidato(s)`}
        badge={`Filial ${s.filialCodigo}`}
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/historico" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>

          <CargoSelect cargos={cargos.map((c) => c.nome)} atual={cargoSel} />
          <span className="text-xs text-perlog-slate">Mostra até 6 candidatos lado a lado</span>
        </div>

        {filtradas.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-perlog-slate">
              <Scale className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="font-medium text-perlog-navy">Sem candidatos para esse cargo</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="text-sm border-collapse min-w-full">
                <thead>
                  <tr className="border-b-2 border-perlog-navy">
                    <th className="px-3 py-3 text-left text-xs uppercase tracking-wide text-perlog-slate bg-slate-50 w-44 sticky left-0">Atributo</th>
                    {filtradas.map((e) => (
                      <th key={e.id} className="px-3 py-3 text-left min-w-[180px]">
                        <Link href={`/entrevista/${e.id}`} className="font-semibold text-perlog-navy hover:text-perlog-orange">
                          {e.nome.split(' ').slice(0, 2).join(' ')}
                        </Link>
                        <div className="text-[11px] text-perlog-slate font-normal">{fmt(e.dataHora)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="Status" cells={filtradas.map((e) => <Badge key={e.id} variant={statusVariant(e.status)}>{e.status}</Badge>)} />
                  <Row label="Entrevistador" cells={filtradas.map((e) => e.recrutador ?? '—')} />
                  <Row label="Gestor aprovador" cells={filtradas.map((e) => e.gestorAprovador ?? '—')} />
                  <Row label="Cidade" cells={filtradas.map((e) => e.cidade ?? '—')} />
                  <Row label="Escolaridade" cells={filtradas.map((e) => e.escolaridade ?? '—')} />
                  <Row label="CNH" cells={filtradas.map((e) => e.possuiCnh ?? '—')} />
                  <Row label="Pretensão" cells={filtradas.map((e) => e.pretensaoSalarial ? `R$ ${Number(e.pretensaoSalarial).toLocaleString('pt-BR')}` : '—')} />
                  <Row label="Turnos" cells={filtradas.map((e) => (e.disponibilidadeTurnos ?? []).join(' · ') || '—')} />
                  <Row label="Avaliado pelo G&G" cells={filtradas.map((e) => e.aprovadoPeloGg ? '✓' : '—')} />

                  <tr><td colSpan={filtradas.length + 1} className="px-3 py-2 text-[10px] uppercase tracking-wider text-perlog-slate bg-slate-50 border-t-2 border-perlog-orange/30">Critérios</td></tr>
                  {criterios.map((c) => (
                    <Row
                      key={c.id}
                      label={c.nome}
                      cells={filtradas.map((e) => {
                        const notas = (e.notasCriterios ?? {}) as Record<string, number>;
                        const v = notas[c.id];
                        if (v === undefined) return <span key={e.id} className="text-perlog-slate">—</span>;
                        return (
                          <div key={e.id} className="flex items-center gap-1.5">
                            <span className="font-semibold tabular-nums">{v}</span>
                            <span className="text-[10px] text-perlog-slate">/{c.escalaMax}</span>
                          </div>
                        );
                      })}
                    />
                  ))}
                  <Row
                    label="Média geral"
                    bold
                    cells={filtradas.map((e) => {
                      const notas = (e.notasCriterios ?? {}) as Record<string, number>;
                      const arr = Object.values(notas).map(Number).filter((n) => !Number.isNaN(n) && n > 0);
                      const media = arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '—';
                      return <span key={e.id} className="font-bold text-perlog-orange tabular-nums">{media}</span>;
                    })}
                  />
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function Row({ label, cells, bold }: { label: string; cells: React.ReactNode[]; bold?: boolean }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-2 text-xs font-medium text-perlog-slate bg-slate-50 sticky left-0">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className={`px-3 py-2 ${bold ? 'font-bold' : ''}`}>{c}</td>
      ))}
    </tr>
  );
}
